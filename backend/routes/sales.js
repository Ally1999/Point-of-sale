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

// Create new sale
router.post('/', async (req, res) => {
  const transaction = new sql.Transaction();
  
  try {
    const { items, paymentTypeID, amountPaid, notes, saleDiscount } = req.body;
    const pool = await getConnection();
    
    await transaction.begin();
    
    // Calculate totals with item-level discounts
    let subTotal = 0;
    let totalItemDiscounts = 0;
    let vatAmount = 0;
    
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
      
      subTotal += lineTotal;
      
      // Calculate VAT on discounted amount
      if (item.isVAT) {
        const vatRate = item.vatRate || 0;
        vatAmount += lineTotal * (vatRate / 100);
      }
    }
    
    // Apply sale-level discount
    let saleDiscountAmount = 0;
    let saleDiscountType = null;
    let saleDiscountValue = 0;
    
    if (saleDiscount && saleDiscount.type && saleDiscount.value > 0) {
      saleDiscountType = saleDiscount.type;
      saleDiscountValue = saleDiscount.value;
      
      if (saleDiscount.type === 'percentage') {
        saleDiscountAmount = subTotal * (saleDiscount.value / 100);
      } else if (saleDiscount.type === 'amount') {
        saleDiscountAmount = Math.min(saleDiscount.value, subTotal);
      }
      subTotal -= saleDiscountAmount;
    }
    
    const totalAmount = subTotal + vatAmount;
    const changeAmount = amountPaid - totalAmount;
    const saleNumber = 'SALE-' + Date.now() + '-' + uuidv4().substring(0, 8).toUpperCase();
    
    // Store original subtotal (before sale discount, after item discounts)
    const originalSubtotal = subTotal + saleDiscountAmount;
    
    // Create sale
    const saleRequest = new sql.Request(transaction);
    saleRequest.input('SaleNumber', sql.NVarChar, saleNumber);
    saleRequest.input('SubTotal', sql.Decimal(18, 2), originalSubtotal); // Subtotal after item discounts, before sale discount
    saleRequest.input('DiscountType', sql.NVarChar, saleDiscountType);
    saleRequest.input('DiscountValue', sql.Decimal(18, 2), saleDiscountValue);
    saleRequest.input('DiscountAmount', sql.Decimal(18, 2), saleDiscountAmount);
    saleRequest.input('VATAmount', sql.Decimal(18, 2), vatAmount);
    saleRequest.input('TotalAmount', sql.Decimal(18, 2), totalAmount);
    saleRequest.input('PaymentTypeID', sql.Int, paymentTypeID);
    saleRequest.input('AmountPaid', sql.Decimal(18, 2), amountPaid);
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
      itemRequest.input('LineTotal', sql.Decimal(18, 2), lineTotal);
      
      await itemRequest.query(`
        INSERT INTO SaleItems (SaleID, ProductID, ProductName, Barcode, Quantity, UnitPrice, DiscountType, DiscountValue, DiscountAmount, IsVAT, VATRate, LineTotal)
        VALUES (@SaleID, @ProductID, @ProductName, @Barcode, @Quantity, @UnitPrice, @DiscountType, @DiscountValue, @DiscountAmount, @IsVAT, @VATRate, @LineTotal)
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

export default router;

