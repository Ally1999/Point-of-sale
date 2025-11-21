import express from 'express';
import { getConnection } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Get all sales
router.get('/', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.query(`
      SELECT s.*, pt."PaymentName" 
      FROM "Sales" s
      LEFT JOIN "PaymentTypes" pt ON s."PaymentTypeID" = pt."PaymentTypeID"
      ORDER BY s."SaleDate" DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching sales:', error);
    res.status(500).json({ error: 'Failed to fetch sales' });
  }
});

// Void a sale
router.post('/:id/void', async (req, res) => {
  const pool = await getConnection();
  const client = await pool.connect();
  
  try {
    const saleId = req.params.id;
    
    await client.query('BEGIN');
    
    // Check if sale exists and is not already voided
    const saleCheck = await client.query(`
      SELECT "IsVoided" 
      FROM "Sales" 
      WHERE "SaleID" = $1
    `, [saleId]);
    
    if (saleCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Sale not found' });
    }
    
    if (saleCheck.rows[0].IsVoided) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Sale is already voided' });
    }
    
    // Update sale to voided
    await client.query(`
      UPDATE "Sales" 
      SET "IsVoided" = true, 
          "VoidedAt" = CURRENT_TIMESTAMP
      WHERE "SaleID" = $1
    `, [saleId]);
    
    await client.query('COMMIT');
    
    // Fetch updated sale
    const updatedSale = await pool.query(`
      SELECT s.*, pt."PaymentName" 
      FROM "Sales" s
      LEFT JOIN "PaymentTypes" pt ON s."PaymentTypeID" = pt."PaymentTypeID"
      WHERE s."SaleID" = $1
    `, [saleId]);
    
    res.json({
      success: true,
      message: 'Sale voided successfully',
      sale: updatedSale.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error voiding sale:', error);
    res.status(500).json({ error: 'Failed to void sale', details: error.message });
  } finally {
    client.release();
  }
});

// Unvoid a sale
router.post('/:id/unvoid', async (req, res) => {
  const pool = await getConnection();
  const client = await pool.connect();
  
  try {
    const saleId = req.params.id;
    
    await client.query('BEGIN');
    
    // Check if sale exists and is voided
    const saleCheck = await client.query(`
      SELECT "IsVoided" 
      FROM "Sales" 
      WHERE "SaleID" = $1
    `, [saleId]);
    
    if (saleCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Sale not found' });
    }
    
    if (!saleCheck.rows[0].IsVoided) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Sale is not voided' });
    }
    
    // Update sale to unvoided
    await client.query(`
      UPDATE "Sales" 
      SET "IsVoided" = false, 
          "VoidedAt" = NULL
      WHERE "SaleID" = $1
    `, [saleId]);
    
    await client.query('COMMIT');
    
    // Fetch updated sale
    const updatedSale = await pool.query(`
      SELECT s.*, pt."PaymentName" 
      FROM "Sales" s
      LEFT JOIN "PaymentTypes" pt ON s."PaymentTypeID" = pt."PaymentTypeID"
      WHERE s."SaleID" = $1
    `, [saleId]);
    
    res.json({
      success: true,
      message: 'Sale unvoided successfully',
      sale: updatedSale.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error unvoiding sale:', error);
    res.status(500).json({ error: 'Failed to unvoid sale', details: error.message });
  } finally {
    client.release();
  }
});

// Create return sale
// Create standalone return (without original sale ID)
router.post('/return', async (req, res) => {
  const pool = await getConnection();
  const client = await pool.connect();
  
  try {
    const { items, paymentTypeID } = req.body;
    
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'No items to return' });
    }
    
    await client.query('BEGIN');
    
    // Calculate return totals (negative amounts)
    let totalItemDiscounts = 0;
    const itemTotals = [];
    
    for (const returnItem of items) {
      let lineTotal = returnItem.quantity * returnItem.unitPrice;
      let itemDiscountAmount = 0;
      
      // Calculate item-level discount if provided
      if (returnItem.discountValue > 0) {
        itemDiscountAmount = Math.min(returnItem.discountValue, lineTotal);
        lineTotal -= itemDiscountAmount;
        totalItemDiscounts += itemDiscountAmount;
      }
      
      itemTotals.push({
        lineTotal: -lineTotal, // Negative for return
        isVAT: returnItem.isVAT,
        vatRate: returnItem.vatRate || 0,
        excludeVAT: returnItem.excludeVAT || false
      });
    }
    
    // Calculate VAT-inclusive total before sale discount
    const vatInclusiveBeforeSaleDiscount = itemTotals.reduce((sum, item) => sum + Math.abs(item.lineTotal), 0);
    
    // Apply sale-level discount if provided
    let saleDiscountAmount = 0;
    if (req.body.saleDiscount && req.body.saleDiscount.value > 0) {
      saleDiscountAmount = -Math.min(req.body.saleDiscount.value, vatInclusiveBeforeSaleDiscount);
    }
    
    // Calculate subtotal and VAT (negative values)
    let subTotal = 0;
    let vatAmount = 0;
    
    for (const item of itemTotals) {
      let discountedLineTotal = Math.abs(item.lineTotal);
      
      // Apply proportional sale discount
      if (vatInclusiveBeforeSaleDiscount > 0 && Math.abs(saleDiscountAmount) > 0) {
        const itemProportion = discountedLineTotal / vatInclusiveBeforeSaleDiscount;
        discountedLineTotal -= Math.abs(saleDiscountAmount) * itemProportion;
      }
      
      // Extract base price and VAT if VAT is included (and not excluded)
      if (item.isVAT && item.vatRate > 0 && !item.excludeVAT) {
        const vat = (discountedLineTotal * item.vatRate) / 100;
        const basePrice = discountedLineTotal - vat;
        subTotal -= basePrice;
        vatAmount -= vat;
      } else {
        subTotal -= discountedLineTotal;
      }
    }
    
    // Total is negative for return
    const totalAmount = -(vatInclusiveBeforeSaleDiscount - Math.abs(saleDiscountAmount));
    const amountPaid = totalAmount; // Refund amount
    const changeAmount = 0;
    const saleNumber = 'RET-' + uuidv4().substring(0, 8).toUpperCase();
    
    // Create return sale
    const saleResult = await client.query(`
      INSERT INTO "Sales" ("SaleNumber", "SubTotal", "DiscountAmount", "VATAmount", "TotalAmount", "PaymentTypeID", "AmountPaid", "ChangeAmount", "IsReturn", "OriginalSaleID")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      saleNumber,
      subTotal,
      saleDiscountAmount,
      vatAmount,
      totalAmount,
      paymentTypeID,
      amountPaid,
      changeAmount,
      true,
      null // No original sale ID for standalone returns
    ]);
    
    const returnSaleID = saleResult.rows[0].SaleID;
    
    // Create return sale items (with negative quantities)
    for (const returnItem of items) {
      let lineTotal = returnItem.quantity * returnItem.unitPrice;
      let itemDiscountAmount = 0;
      
      // Calculate item-level discount
      if (returnItem.discountValue > 0) {
        itemDiscountAmount = Math.min(returnItem.discountValue, lineTotal);
        lineTotal -= itemDiscountAmount;
      }
      
      await client.query(`
        INSERT INTO "SaleItems" ("SaleID", "ProductID", "ProductName", "Barcode", "Quantity", "UnitPrice", "DiscountAmount", "IsVAT", "VATRate", "ExcludeVAT", "LineTotal")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        returnSaleID,
        returnItem.productID,
        returnItem.productName,
        returnItem.barcode,
        -returnItem.quantity, // Negative quantity
        returnItem.unitPrice,
        itemDiscountAmount,
        returnItem.isVAT ? true : false,
        returnItem.vatRate || 0,
        returnItem.excludeVAT ? true : false,
        -lineTotal // Negative line total
      ]);
    }
    
    await client.query('COMMIT');
    
    // Fetch complete return sale with items
    const completeSale = await pool.query(`
      SELECT s.*, pt."PaymentName" 
      FROM "Sales" s
      LEFT JOIN "PaymentTypes" pt ON s."PaymentTypeID" = pt."PaymentTypeID"
      WHERE s."SaleID" = $1
    `, [returnSaleID]);
    
    const saleItems = await pool.query('SELECT * FROM "SaleItems" WHERE "SaleID" = $1', [returnSaleID]);
    
    res.status(201).json({
      ...completeSale.rows[0],
      items: saleItems.rows
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating standalone return:', error);
    res.status(500).json({ error: 'Failed to create return', details: error.message });
  } finally {
    client.release();
  }
});

// Get sale by ID with items
router.get('/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    
    // Get sale details
    const saleResult = await pool.query(`
      SELECT s.*, pt."PaymentName" 
      FROM "Sales" s
      LEFT JOIN "PaymentTypes" pt ON s."PaymentTypeID" = pt."PaymentTypeID"
      WHERE s."SaleID" = $1
    `, [req.params.id]);
    
    if (saleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    
    // Get sale items
    const itemsResult = await pool.query('SELECT * FROM "SaleItems" WHERE "SaleID" = $1', [req.params.id]);
    
    res.json({
      ...saleResult.rows[0],
      items: itemsResult.rows
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

    const saleResult = await pool.query(`
      SELECT s.*, pt."PaymentName" 
      FROM "Sales" s
      LEFT JOIN "PaymentTypes" pt ON s."PaymentTypeID" = pt."PaymentTypeID"
      WHERE s."SaleID" = $1
    `, [saleId]);

    if (saleResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found.'
      });
    }

    const itemsResult = await pool.query(`
      SELECT * 
      FROM "SaleItems" 
      WHERE "SaleID" = $1
      ORDER BY "SaleItemID" ASC
    `, [saleId]);

    const sale = saleResult.rows[0];
    const items = itemsResult.rows ?? [];

    const { htmlContent, estimatedHeight } = generateThermalReceipt({
      sale,
      items,
      width
    });

    const escPosCommands = generateESCPOSCommands({ sale, items });

    res.status(200).json({
      success: true,
      message: 'Thermal receipt generated successfully.',
      payload: {
        htmlContent,
        escPosCommands,
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
  const pool = await getConnection();
  const client = await pool.connect();
  
  try {
    const { items, paymentTypeID, amountPaid, saleDiscount } = req.body;
    
    await client.query('BEGIN');
    
    // Calculate totals with item-level discounts
    // First pass: calculate VAT-inclusive totals after item discounts
    let totalItemDiscounts = 0;
    const itemTotals = [];
    
    for (const item of items) {
      let lineTotal = item.quantity * item.unitPrice;
      let itemDiscountAmount = 0;
      
      // Calculate item-level discount (always by amount)
      if (item.discountValue > 0) {
        itemDiscountAmount = Math.min(item.discountValue, lineTotal);
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
    
    // Apply sale-level discount (always by amount)
    let saleDiscountAmount = 0;
    
    if (saleDiscount && saleDiscount.value > 0) {
      saleDiscountAmount = Math.min(saleDiscount.value, vatInclusiveBeforeSaleDiscount);
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
    const saleNumber = 'SALE-' + uuidv4().substring(0, 8).toUpperCase();
    
    // Create sale
    const saleResult = await client.query(`
      INSERT INTO "Sales" ("SaleNumber", "SubTotal", "DiscountAmount", "VATAmount", "TotalAmount", "PaymentTypeID", "AmountPaid", "ChangeAmount")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      saleNumber,
      subTotal,
      saleDiscountAmount,
      vatAmount,
      totalAmount,
      paymentTypeID,
      finalAmountPaid,
      changeAmount
    ]);
    
    const saleID = saleResult.rows[0].SaleID;
    
    // Create sale items
    for (const item of items) {
      let lineTotal = item.quantity * item.unitPrice;
      let itemDiscountAmount = 0;
      
      // Calculate item-level discount (always by amount)
      if (item.discountValue > 0) {
        itemDiscountAmount = Math.min(item.discountValue, lineTotal);
        lineTotal -= itemDiscountAmount;
      }
      
      await client.query(`
        INSERT INTO "SaleItems" ("SaleID", "ProductID", "ProductName", "Barcode", "Quantity", "UnitPrice", "DiscountAmount", "IsVAT", "VATRate", "ExcludeVAT", "LineTotal")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        saleID,
        item.productID,
        item.productName,
        item.barcode,
        item.quantity,
        item.unitPrice,
        itemDiscountAmount,
        item.isVAT ? true : false,
        item.vatRate || 0,
        item.excludeVAT ? true : false,
        lineTotal
      ]);
      
    }
    
    await client.query('COMMIT');
    
    // Fetch complete sale with items
    const completeSale = await pool.query(`
      SELECT s.*, pt."PaymentName" 
      FROM "Sales" s
      LEFT JOIN "PaymentTypes" pt ON s."PaymentTypeID" = pt."PaymentTypeID"
      WHERE s."SaleID" = $1
    `, [saleID]);
    
    const saleItems = await pool.query('SELECT * FROM "SaleItems" WHERE "SaleID" = $1', [saleID]);
    
    res.status(201).json({
      ...completeSale.rows[0],
      items: saleItems.rows
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating sale:', error);
    res.status(500).json({ error: 'Failed to create sale', details: error.message });
  } finally {
    client.release();
  }
});

function generateESCPOSCommands({ sale, items }) {
  // ESC/POS command constants
  const ESC = '\x1B';
  const GS = '\x1D';
  const INIT = ESC + '@';
  const CENTER = ESC + 'a' + '\x01';
  const LEFT = ESC + 'a' + '\x00';
  const BOLD_ON = ESC + 'E' + '\x01';
  const BOLD_OFF = ESC + 'E' + '\x00';
  const CUT = GS + 'V' + '\x41' + '\x03';
  const FEED = '\n';
  const DIVIDER = '--------------------------------\n';

  let commands = INIT; // Initialize printer
  commands += CENTER; // Center align
  commands += BOLD_ON;
  commands += 'POINT OF SALE\n';
  commands += 'Demo Retail Store\n';
  commands += '123 Market Street\n';
  commands += 'Port Louis\n';
  commands += BOLD_OFF;
  commands += DIVIDER;
  commands += 'TEL: +230 000 0000\n';
  commands += 'VAT No. 00000000\n';
  commands += DIVIDER;
  if (sale?.IsReturn) {
    commands += 'RETURN RECEIPT\n';
  } else {
    commands += 'PAYMENT RECEIPT\n';
  }
  if (sale?.IsVoided) {
    commands += BOLD_ON;
    commands += '*** VOIDED SALE ***\n';
    commands += BOLD_OFF;
  }
  commands += `Date: ${formatDateTime(sale?.SaleDate)}\n`;
  commands += `Receipt No: ${sale?.SaleNumber || 'N/A'}\n`;
  if (sale?.IsVoided && sale?.VoidedAt) {
    commands += `Voided: ${formatDateTime(sale?.VoidedAt)}\n`;
  }
  commands += DIVIDER;
  commands += LEFT;

  // Payment info
  commands += `Payment Type: ${sale?.PaymentName || 'N/A'}\n`;
  commands += `Amount Paid: Rs ${formatCurrency(sale?.AmountPaid)}\n`;
  commands += `Change: Rs ${formatCurrency(sale?.ChangeAmount)}\n`;
  commands += DIVIDER;

  // Items
  if (items.length === 0) {
    commands += 'No items found for this sale.\n';
  } else {
    items.forEach((item, index) => {
      const discountAmount = Number(item?.DiscountAmount) || 0;
      const vatRate = Number(item?.VATRate) || 0;
      const isVAT = Boolean(item?.IsVAT);
      
      commands += `Item ${index + 1}: ${item?.ProductName || 'Item'}\n`;
      commands += `Qty: ${item?.Quantity || 0}\n`;
      commands += `Unit Price: Rs ${formatCurrency(item?.UnitPrice)}\n`;
      commands += `Line Total: Rs ${formatCurrency(item?.LineTotal)}\n`;
      if (discountAmount > 0) {
        commands += `Discount: Rs ${formatCurrency(discountAmount)}\n`;
      }
      if (isVAT) {
        commands += `VAT Rate: ${vatRate}%\n`;
      }
      commands += DIVIDER;
    });
  }

  // Totals
  commands += BOLD_ON;
  commands += `SUBTOTAL: Rs ${formatCurrency(sale?.SubTotal)}\n`;
  if (Number(sale?.DiscountAmount) > 0) {
    commands += `Discount: Rs ${formatCurrency(sale?.DiscountAmount)}\n`;
  }
  if (Number(sale?.VATAmount) > 0) {
    commands += `VAT: Rs ${formatCurrency(sale?.VATAmount)}\n`;
  }
  commands += `TOTAL: Rs ${formatCurrency(sale?.TotalAmount)}\n`;
  commands += BOLD_OFF;
  commands += FEED;
  commands += CENTER;
  commands += 'Thank you for your purchase!\n';
  commands += '* * * * * * * * * *\n';
  commands += FEED + FEED + FEED;
  commands += CUT; // Cut paper

  // Convert to base64 for transmission
  const encoder = new TextEncoder();
  const bytes = encoder.encode(commands);
  const base64 = Buffer.from(bytes).toString('base64');
  
  return base64;
}

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
      ${sale?.IsReturn ? '<div>RETURN RECEIPT</div>' : '<div>PAYMENT RECEIPT</div>'}
      ${sale?.IsVoided ? `
        <div style="background: #fff3cd; border: 2px solid #ffc107; padding: 8px; margin: 8px 0; border-radius: 4px;">
          <div style="font-weight: bold; color: #856404;">*** VOIDED SALE ***</div>
        </div>
      ` : ''}
      <div>Date: ${paymentDate}</div>
      <div>Receipt No: ${sale?.SaleNumber || 'N/A'}</div>
      ${sale?.IsVoided && sale?.VoidedAt ? `
        <div>Voided: ${formatDateTime(sale?.VoidedAt)}</div>
      ` : ''}
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

