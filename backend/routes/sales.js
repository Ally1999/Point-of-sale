import express from 'express';
import { getConnection } from '../config/database.js';
import sql from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Get all sales
router.get('/', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT s.*, pt.PaymentName 
      FROM Sales s
      LEFT JOIN PaymentTypes pt ON s.PaymentTypeID = pt.PaymentTypeID
      ORDER BY s.SaleDate DESC
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching sales:', error);
    res.status(500).json({ error: 'Failed to fetch sales' });
  }
});

// Get sale by ID with items
router.get('/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    
    // Get sale details
    const saleResult = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`
        SELECT s.*, pt.PaymentName 
        FROM Sales s
        LEFT JOIN PaymentTypes pt ON s.PaymentTypeID = pt.PaymentTypeID
        WHERE s.SaleID = @id
      `);
    
    if (saleResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    
    // Get sale items
    const itemsResult = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT * FROM SaleItems WHERE SaleID = @id');
    
    res.json({
      ...saleResult.recordset[0],
      items: itemsResult.recordset
    });
  } catch (error) {
    console.error('Error fetching sale:', error);
    res.status(500).json({ error: 'Failed to fetch sale' });
  }
});

// Generate printable thermal receipt for a sale
router.post('/:id/print-thermal-receipt', async (req, res) => {
  try {
    const saleId = Number.parseInt(req.params.id, 10);

    if (!Number.isInteger(saleId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid sale id is required to generate a receipt.'
      });
    }

    const { width = 300, selectedPrintType = null } = req.body ?? {};

    const pool = await getConnection();

    const saleResult = await pool.request()
      .input('id', sql.Int, saleId)
      .query(`
        SELECT s.*, pt.PaymentName 
        FROM Sales s
        LEFT JOIN PaymentTypes pt ON s.PaymentTypeID = pt.PaymentTypeID
        WHERE s.SaleID = @id
      `);

    if (saleResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found.'
      });
    }

    const itemsResult = await pool.request()
      .input('id', sql.Int, saleId)
      .query(`
        SELECT * 
        FROM SaleItems 
        WHERE SaleID = @id
        ORDER BY SaleItemID ASC
      `);

    const sale = saleResult.recordset[0];
    const items = itemsResult.recordset ?? [];

    const { htmlContent, estimatedHeight } = generateThermalReceipt({
      sale,
      items,
      width
    });

    res.status(200).json({
      success: true,
      message: 'Thermal receipt generated successfully.',
      payload: {
        htmlContent,
        printType: 'direct',
        selectedPrintType,
        width,
        estimatedHeight,
        printerSettings: {
          paperSize: 'thermal',
          margins: 'none',
          orientation: 'portrait'
        }
      }
    });
  } catch (error) {
    console.error('Receipt generation error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while generating the receipt.',
      details: error.message
    });
  }
});

// Create new sale
router.post('/', async (req, res) => {
  const transaction = new sql.Transaction();
  
  try {
    const { items, paymentTypeID, amountPaid, notes, saleDiscount } = req.body;
    const pool = await getConnection();
    
    await transaction.begin();
    
    // Calculate totals with item-level discounts
    // First pass: calculate VAT-inclusive totals after item discounts
    let totalItemDiscounts = 0;
    const itemTotals = [];
    
    for (const item of items) {
      let lineTotal = item.quantity * item.unitPrice;
      let itemDiscountAmount = 0;
      
      // Calculate item-level discount
      if (item.discountType && item.discountValue > 0) {
        if (item.discountType === 'percentage') {
          itemDiscountAmount = lineTotal * (item.discountValue / 100);
        } else if (item.discountType === 'amount') {
          itemDiscountAmount = Math.min(item.discountValue, lineTotal);
        }
        lineTotal -= itemDiscountAmount;
        totalItemDiscounts += itemDiscountAmount;
      }
      
      itemTotals.push({
        lineTotal,
        isVAT: item.isVAT,
        vatRate: item.vatRate || 0,
        excludeVAT: item.excludeVAT || false
      });
    }
    
    // Calculate VAT-inclusive total before sale discount
    const vatInclusiveBeforeSaleDiscount = itemTotals.reduce((sum, item) => sum + item.lineTotal, 0);
    
    // Apply sale-level discount
    let saleDiscountAmount = 0;
    let saleDiscountType = null;
    let saleDiscountValue = 0;
    
    if (saleDiscount && saleDiscount.type && saleDiscount.value > 0) {
      saleDiscountType = saleDiscount.type;
      saleDiscountValue = saleDiscount.value;
      
      if (saleDiscount.type === 'percentage') {
        saleDiscountAmount = vatInclusiveBeforeSaleDiscount * (saleDiscount.value / 100);
      } else if (saleDiscount.type === 'amount') {
        saleDiscountAmount = Math.min(saleDiscount.value, vatInclusiveBeforeSaleDiscount);
      }
    }
    
    // Calculate subtotal (VAT-exclusive) and VAT by extracting from VAT-inclusive prices
    let subTotal = 0;
    let vatAmount = 0;
    
    for (const item of itemTotals) {
      let discountedLineTotal = item.lineTotal;
      
      // Apply proportional sale discount
      if (vatInclusiveBeforeSaleDiscount > 0 && saleDiscountAmount > 0) {
        const itemProportion = item.lineTotal / vatInclusiveBeforeSaleDiscount;
        discountedLineTotal -= saleDiscountAmount * itemProportion;
      }
      
      // Extract base price and VAT if VAT is included (and not excluded)
      if (item.isVAT && item.vatRate > 0 && !item.excludeVAT) {
        const vat = (discountedLineTotal * item.vatRate) / 100;
        const basePrice = discountedLineTotal - vat;
        subTotal += basePrice;
        vatAmount += vat;
      } else {
        // Non-VAT items or VAT excluded: price is already the base price
        subTotal += discountedLineTotal;
      }
    }
    
    // Total is the VAT-inclusive total after all discounts
    const totalAmount = vatInclusiveBeforeSaleDiscount - saleDiscountAmount;
    // Default amountPaid to totalAmount if not provided
    const finalAmountPaid = amountPaid !== undefined && amountPaid !== null ? amountPaid : totalAmount;
    const changeAmount = finalAmountPaid - totalAmount;
    const saleNumber = 'SALE-' + Date.now() + '-' + uuidv4().substring(0, 8).toUpperCase();
    
    // Create sale
    const saleRequest = new sql.Request(transaction);
    saleRequest.input('SaleNumber', sql.NVarChar, saleNumber);
    saleRequest.input('SubTotal', sql.Decimal(18, 2), subTotal); // Subtotal (VAT-exclusive) after all discounts
    saleRequest.input('DiscountType', sql.NVarChar, saleDiscountType);
    saleRequest.input('DiscountValue', sql.Decimal(18, 2), saleDiscountValue);
    saleRequest.input('DiscountAmount', sql.Decimal(18, 2), saleDiscountAmount);
    saleRequest.input('VATAmount', sql.Decimal(18, 2), vatAmount);
    saleRequest.input('TotalAmount', sql.Decimal(18, 2), totalAmount);
    saleRequest.input('PaymentTypeID', sql.Int, paymentTypeID);
    saleRequest.input('AmountPaid', sql.Decimal(18, 2), finalAmountPaid);
    saleRequest.input('ChangeAmount', sql.Decimal(18, 2), changeAmount);
    saleRequest.input('Notes', sql.NVarChar, notes || null);
    
    const saleResult = await saleRequest.query(`
      INSERT INTO Sales (SaleNumber, SubTotal, DiscountType, DiscountValue, DiscountAmount, VATAmount, TotalAmount, PaymentTypeID, AmountPaid, ChangeAmount, Notes)
      OUTPUT INSERTED.*
      VALUES (@SaleNumber, @SubTotal, @DiscountType, @DiscountValue, @DiscountAmount, @VATAmount, @TotalAmount, @PaymentTypeID, @AmountPaid, @ChangeAmount, @Notes)
    `);
    
    const saleID = saleResult.recordset[0].SaleID;
    
    // Create sale items
    for (const item of items) {
      const itemRequest = new sql.Request(transaction);
      let lineTotal = item.quantity * item.unitPrice;
      let itemDiscountAmount = 0;
      let itemDiscountType = null;
      let itemDiscountValue = 0;
      
      // Calculate item-level discount
      if (item.discountType && item.discountValue > 0) {
        itemDiscountType = item.discountType;
        itemDiscountValue = item.discountValue;
        if (item.discountType === 'percentage') {
          itemDiscountAmount = lineTotal * (item.discountValue / 100);
        } else if (item.discountType === 'amount') {
          itemDiscountAmount = Math.min(item.discountValue, lineTotal);
        }
        lineTotal -= itemDiscountAmount;
      }
      
      itemRequest.input('SaleID', sql.Int, saleID);
      itemRequest.input('ProductID', sql.Int, item.productID);
      itemRequest.input('ProductName', sql.NVarChar, item.productName);
      itemRequest.input('Barcode', sql.NVarChar, item.barcode || null);
      itemRequest.input('Quantity', sql.Int, item.quantity);
      itemRequest.input('UnitPrice', sql.Decimal(18, 2), item.unitPrice);
      itemRequest.input('DiscountType', sql.NVarChar, itemDiscountType);
      itemRequest.input('DiscountValue', sql.Decimal(18, 2), itemDiscountValue);
      itemRequest.input('DiscountAmount', sql.Decimal(18, 2), itemDiscountAmount);
      itemRequest.input('IsVAT', sql.Bit, item.isVAT ? 1 : 0);
      itemRequest.input('VATRate', sql.Decimal(5, 2), item.vatRate || 0);
      itemRequest.input('ExcludeVAT', sql.Bit, item.excludeVAT ? 1 : 0);
      itemRequest.input('LineTotal', sql.Decimal(18, 2), lineTotal);
      
      await itemRequest.query(`
        INSERT INTO SaleItems (SaleID, ProductID, ProductName, Barcode, Quantity, UnitPrice, DiscountType, DiscountValue, DiscountAmount, IsVAT, VATRate, ExcludeVAT, LineTotal)
        VALUES (@SaleID, @ProductID, @ProductName, @Barcode, @Quantity, @UnitPrice, @DiscountType, @DiscountValue, @DiscountAmount, @IsVAT, @VATRate, @ExcludeVAT, @LineTotal)
      `);
      
      // Update stock quantity
      const stockRequest = new sql.Request(transaction);
      stockRequest.input('ProductID', sql.Int, item.productID);
      stockRequest.input('Quantity', sql.Int, item.quantity);
      
      await stockRequest.query(`
        UPDATE Products 
        SET StockQuantity = StockQuantity - @Quantity
        WHERE ProductID = @ProductID
      `);
    }
    
    await transaction.commit();
    
    // Fetch complete sale with items
    const completeSale = await pool.request()
      .input('id', sql.Int, saleID)
      .query(`
        SELECT s.*, pt.PaymentName 
        FROM Sales s
        LEFT JOIN PaymentTypes pt ON s.PaymentTypeID = pt.PaymentTypeID
        WHERE s.SaleID = @id
      `);
    
    const saleItems = await pool.request()
      .input('id', sql.Int, saleID)
      .query('SELECT * FROM SaleItems WHERE SaleID = @id');
    
    res.status(201).json({
      ...completeSale.recordset[0],
      items: saleItems.recordset
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error creating sale:', error);
    res.status(500).json({ error: 'Failed to create sale', details: error.message });
  }
});

function generateThermalReceipt({ sale, items, width = 300 }) {
  const baseHeight = 400;
  const estimatedHeight = baseHeight + (items.length * 120);
  const paymentDate = formatDateTime(sale?.SaleDate);

  let htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=${width}, initial-scale=1.0">
      <title>Thermal Receipt</title>
      <style>
        @media print {
          @page {
            size: ${width}px auto;
            margin: 0;
            padding: 0;
          }

          body {
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          .no-print {
            display: none !important;
          }

          .receipt,
          .transaction {
            page-break-inside: avoid !important;
          }
        }

        body {
          font-family: 'Courier New', monospace;
          margin: 0;
          padding: 8px;
          background: white;
          font-size: 11px;
          line-height: 1.2;
          width: ${width}px;
          max-width: ${width}px;
          height: auto;
          min-height: ${estimatedHeight}px;
        }

        .receipt {
          width: 100%;
          max-width: ${width}px;
          height: auto;
          min-height: ${estimatedHeight}px;
          background: white;
        }

        .center { text-align: center; }

        .divider {
          border-top: 2px dashed #000;
          margin: 5px 0;
          height: 1px;
        }

        .header {
          text-align: center;
          margin-bottom: 10px;
        }

        .transaction {
          margin: 8px 0;
          border-bottom: 1px dashed #ccc;
          padding-bottom: 5px;
          page-break-inside: avoid;
          break-inside: avoid;
        }

        .row {
          display: flex;
          justify-content: space-between;
          margin: 2px 0;
        }

        .total-section {
          margin-top: 10px;
          border-top: 2px solid #000;
          border-bottom: 2px solid #000;
          padding: 8px 0;
          text-align: center;
          font-weight: bold;
          page-break-inside: avoid;
          break-inside: avoid;
        }

        * {
          page-break-inside: avoid;
          break-inside: avoid;
          box-sizing: border-box;
          font-weight: bold !important;
        }

        html, body {
          height: auto;
          min-height: auto;
          overflow: visible;
        }

        .print-controls {
          position: fixed;
          top: 10px;
          right: 10px;
          z-index: 1000;
          background: #007bff;
          color: white;
          padding: 10px 15px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 14px;
        }

        .print-controls:hover {
          background: #0056b3;
        }

        @media print {
          .print-controls {
            display: none !important;
          }
        }

        .muted {
          font-weight: normal !important;
        }
      </style>

      <script>
        function printReceipt() {
          const printWindow = window.open('', '_blank');
          printWindow.document.write(document.documentElement.outerHTML);
          printWindow.document.close();

          printWindow.onload = function() {
            printWindow.focus();
            printWindow.print();

            setTimeout(() => {
              printWindow.close();
            }, 1000);
          };
        }

        function autoPrint() {
          window.focus();
          window.print();
        }

        function thermalPrint() {
          const escPos = '\\\\x1B\\\\x40';
          const cutPaper = '\\\\x1D\\\\x56\\\\x00';
          console.log('Thermal print commands ready', escPos, cutPaper);
        }
      </script>
    </head>
    <body>
      <button class="print-controls no-print" onclick="printReceipt()">🖨️ Print Receipt</button>

      <div class="receipt">
  `;

  htmlContent += `
    <div class="header">
      <div>POINT OF SALE</div>
      <div>Demo Retail Store</div>
      <div>123 Market Street</div>
      <div>Port Louis</div>
      <div class="divider"></div>
      <div>TEL: +230 000 0000</div>
      <div>VAT No. 00000000</div>
      <div class="divider"></div>
      <div>PAYMENT RECEIPT</div>
      <div>Date: ${paymentDate}</div>
      <div>Receipt No: ${sale?.SaleNumber || 'N/A'}</div>
      <div class="divider"></div>
    </div>
  `;

  htmlContent += `
    <div>
      <div class="row">
        <span>Payment Type:</span>
        <span>${sale?.PaymentName || 'N/A'}</span>
      </div>
      <div class="row">
        <span>Amount Paid:</span>
        <span>Rs ${formatCurrency(sale?.AmountPaid)}</span>
      </div>
      <div class="row">
        <span>Change:</span>
        <span>Rs ${formatCurrency(sale?.ChangeAmount)}</span>
      </div>
      <div class="divider"></div>
    </div>
  `;

  if (items.length === 0) {
    htmlContent += `
      <div class="transaction">
        <div>No items found for this sale.</div>
      </div>
    `;
  } else {
    items.forEach((item, index) => {
      const discountAmount = Number(item?.DiscountAmount) || 0;
      const vatRate = Number(item?.VATRate) || 0;
      const isVAT = Boolean(item?.IsVAT);
      htmlContent += `
        <div class="transaction">
          <div>Item ${index + 1}: ${item?.ProductName || 'Item'}</div>
          <div class="row">
            <span>Qty:</span>
            <span>${item?.Quantity || 0}</span>
          </div>
          <div class="row">
            <span>Unit Price:</span>
            <span>Rs ${formatCurrency(item?.UnitPrice)}</span>
          </div>
          <div class="row">
            <span>Line Total:</span>
            <span>Rs ${formatCurrency(item?.LineTotal)}</span>
          </div>
          ${discountAmount > 0 ? `
            <div class="row">
              <span>Discount:</span>
              <span>Rs ${formatCurrency(discountAmount)}</span>
            </div>
          ` : ''}
          ${isVAT ? `
            <div class="row muted">
              <span>VAT Rate:</span>
              <span>${vatRate}%</span>
            </div>
          ` : ''}
          <div class="divider"></div>
        </div>
      `;
    });
  }

  htmlContent += `
    <div class="total-section">
      <div>SUBTOTAL: Rs ${formatCurrency(sale?.SubTotal)}</div>
      ${Number(sale?.DiscountAmount) > 0 ? `
        <div class="muted">Discount: Rs ${formatCurrency(sale?.DiscountAmount)}</div>
      ` : ''}
      ${Number(sale?.VATAmount) > 0 ? `
        <div class="muted">VAT: Rs ${formatCurrency(sale?.VATAmount)}</div>
      ` : ''}
      <div>TOTAL: Rs ${formatCurrency(sale?.TotalAmount)}</div>
    </div>

    <div class="center" style="margin-top: 15px;">
      <div>Thank you for your purchase!</div>
      <div>* * * * * * * * * *</div>
    </div>
  `;

  htmlContent += `
      </div>
    </body>
    </html>
  `;

  return { htmlContent, estimatedHeight };
}

function formatCurrency(value) {
  const numericValue = Number(value) || 0;
  return numericValue.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatDateTime(dateInput) {
  const date = dateInput ? new Date(dateInput) : new Date();
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const pad = (num) => String(num).padStart(2, '0');
  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

export default router;

