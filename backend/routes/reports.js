import express from 'express';
import { getConnection } from '../config/database.js';

const router = express.Router();

// Sales Summary Report (by date range)
router.get('/sales-summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const pool = await getConnection();
    
    let query = `
      SELECT 
        COUNT(*) as "TotalSales",
        SUM(TotalAmount) as "TotalRevenue",
        SUM(SubTotal) as "TotalSubtotal",
        SUM(VATAmount) as "TotalVAT",
        SUM(DiscountAmount) as "TotalDiscounts",
        SUM(AmountPaid) as "TotalAmountPaid",
        SUM(ChangeAmount) as "TotalChange"
      FROM Sales
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;
    
    if (startDate) {
      query += ` AND SaleDate >= $${paramIndex}`;
      params.push(new Date(startDate));
      paramIndex++;
    }
    
    if (endDate) {
      query += ` AND SaleDate <= $${paramIndex}`;
      params.push(new Date(endDate));
      paramIndex++;
    }
    
    const result = await pool.query(query, params);
    res.json(result.rows[0] || {});
  } catch (error) {
    console.error('Error fetching sales summary:', error);
    res.status(500).json({ error: 'Failed to fetch sales summary' });
  }
});

// Sales by Payment Method
router.get('/sales-by-payment', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const pool = await getConnection();
    
    let query = `
      SELECT 
        pt.PaymentName,
        COUNT(s.SaleID) as "SaleCount",
        SUM(s.TotalAmount) as "TotalRevenue",
        SUM(s.SubTotal) as "TotalSubtotal",
        SUM(s.VATAmount) as "TotalVAT"
      FROM Sales s
      LEFT JOIN PaymentTypes pt ON s.PaymentTypeID = pt.PaymentTypeID
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;
    
    if (startDate) {
      query += ` AND s.SaleDate >= $${paramIndex}`;
      params.push(new Date(startDate));
      paramIndex++;
    }
    
    if (endDate) {
      query += ` AND s.SaleDate <= $${paramIndex}`;
      params.push(new Date(endDate));
      paramIndex++;
    }
    
    query += ' GROUP BY pt.PaymentName ORDER BY "TotalRevenue" DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching sales by payment:', error);
    res.status(500).json({ error: 'Failed to fetch sales by payment' });
  }
});

// Top Selling Products
router.get('/top-products', async (req, res) => {
  try {
    const { startDate, endDate, limit = 10 } = req.query;
    const pool = await getConnection();
    
    let query = `
      SELECT 
        si.ProductName,
        SUM(si.Quantity) as "TotalQuantity",
        SUM(si.LineTotal) as "TotalRevenue",
        COUNT(DISTINCT si.SaleID) as "SaleCount"
      FROM SaleItems si
      INNER JOIN Sales s ON si.SaleID = s.SaleID
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;
    
    if (startDate) {
      query += ` AND s.SaleDate >= $${paramIndex}`;
      params.push(new Date(startDate));
      paramIndex++;
    }
    
    if (endDate) {
      query += ` AND s.SaleDate <= $${paramIndex}`;
      params.push(new Date(endDate));
      paramIndex++;
    }
    
    query += `
      GROUP BY si.ProductName
      ORDER BY "TotalRevenue" DESC
    `;
    
    if (limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(parseInt(limit));
    }
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching top products:', error);
    res.status(500).json({ error: 'Failed to fetch top products' });
  }
});

// Daily Sales Report
router.get('/daily-sales', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const pool = await getConnection();
    
    let query = `
      SELECT 
        DATE(SaleDate) as "SaleDate",
        COUNT(*) as "SaleCount",
        SUM(TotalAmount) as "TotalRevenue",
        SUM(SubTotal) as "TotalSubtotal",
        SUM(VATAmount) as "TotalVAT",
        SUM(DiscountAmount) as "TotalDiscounts"
      FROM Sales
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;
    
    if (startDate) {
      query += ` AND SaleDate >= $${paramIndex}`;
      params.push(new Date(startDate));
      paramIndex++;
    }
    
    if (endDate) {
      query += ` AND SaleDate <= $${paramIndex}`;
      params.push(new Date(endDate));
      paramIndex++;
    }
    
    query += ' GROUP BY DATE(SaleDate) ORDER BY "SaleDate" DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching daily sales:', error);
    res.status(500).json({ error: 'Failed to fetch daily sales' });
  }
});

// VAT Report - Shows VAT collected vs VAT excluded
router.get('/vat-report', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const pool = await getConnection();
    
    let query = `
      SELECT 
        si.SaleItemID,
        si.SaleID,
        si.ProductName,
        si.Barcode,
        si.Quantity,
        si.UnitPrice,
        si.LineTotal,
        si.IsVAT,
        si.VATRate,
        s.SaleDate,
        s.SaleNumber,
        s.VATAmount as "SaleVATAmount"
      FROM SaleItems si
      INNER JOIN Sales s ON si.SaleID = s.SaleID
      WHERE si.IsVAT = true AND si.VATRate > 0
    `;
    const params = [];
    let paramIndex = 1;
    
    if (startDate) {
      query += ` AND s.SaleDate >= $${paramIndex}`;
      params.push(new Date(startDate));
      paramIndex++;
    }
    
    if (endDate) {
      query += ` AND s.SaleDate <= $${paramIndex}`;
      params.push(new Date(endDate));
      paramIndex++;
    }
    
    query += ' ORDER BY s.SaleDate DESC, si.ProductName';
    
    const result = await pool.query(query, params);
    
    // Group items by sale to calculate actual VAT allocation
    const itemsBySale = {};
    result.rows.forEach(item => {
      if (!itemsBySale[item.SaleID]) {
        itemsBySale[item.SaleID] = {
          saleVATAmount: parseFloat(item.SaleVATAmount || 0),
          items: []
        };
      }
      itemsBySale[item.SaleID].items.push(item);
    });
    
    // Process the data to calculate VAT collected vs excluded
    const processedData = result.rows.map(item => {
      const lineTotal = parseFloat(item.LineTotal);
      const vatRate = parseFloat(item.VATRate) / 100;
      
      // Calculate expected VAT based on VAT-inclusive price
      const expectedVAT = lineTotal * vatRate;
      const expectedBasePrice = lineTotal - expectedVAT;
      
      // Calculate actual VAT collected for this item
      // Allocate actual VAT from sale proportionally based on expected VAT
      const saleData = itemsBySale[item.SaleID];
      const saleItems = saleData.items;
      
      // Calculate total expected VAT for all VAT items in this sale
      let totalExpectedVATForSale = 0;
      saleItems.forEach(saleItem => {
        if (saleItem.IsVAT && saleItem.VATRate > 0) {
          const saleItemLineTotal = parseFloat(saleItem.LineTotal);
          const itemVATRate = parseFloat(saleItem.VATRate) / 100;
          const itemExpectedVAT = saleItemLineTotal * itemVATRate;
          totalExpectedVATForSale += itemExpectedVAT;
        }
      });
      
      // Allocate actual VAT proportionally
      let actualVAT = 0;
      let isVATExcluded = false;
      
      if (totalExpectedVATForSale > 0) {
        // Allocate actual VAT proportionally based on expected VAT
        const itemProportion = expectedVAT / totalExpectedVATForSale;
        actualVAT = saleData.saleVATAmount * itemProportion;
        
        // If actual VAT is significantly less than expected (more than 5% difference), VAT was excluded
        if (actualVAT < expectedVAT * 0.95) {
          isVATExcluded = true;
        }
      } else {
        // No expected VAT, so no actual VAT
        actualVAT = 0;
        isVATExcluded = true;
      }
      
      const excludedVAT = expectedVAT - actualVAT;
      
      return {
        ...item,
        ExpectedVAT: expectedVAT,
        ActualVAT: actualVAT,
        ExcludedVAT: excludedVAT,
        IsVATExcluded: isVATExcluded,
        BasePrice: expectedBasePrice
      };
    });
    
    // Calculate summary
    const summary = {
      TotalVATItems: processedData.length,
      TotalExpectedVAT: processedData.reduce((sum, item) => sum + item.ExpectedVAT, 0),
      TotalActualVAT: processedData.reduce((sum, item) => sum + item.ActualVAT, 0),
      TotalExcludedVAT: processedData.reduce((sum, item) => sum + item.ExcludedVAT, 0),
      ItemsWithVATExcluded: processedData.filter(item => item.IsVATExcluded).length,
      ItemsWithVATIncluded: processedData.filter(item => !item.IsVATExcluded).length
    };
    
    res.json({
      summary,
      details: processedData
    });
  } catch (error) {
    console.error('Error fetching VAT report:', error);
    res.status(500).json({ error: 'Failed to fetch VAT report' });
  }
});

// VAT Summary by Date
router.get('/vat-summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const pool = await getConnection();
    
    let query = `
      SELECT 
        DATE(s.SaleDate) as "SaleDate",
        COUNT(DISTINCT s.SaleID) as "SaleCount",
        SUM(s.VATAmount) as "TotalVATCollected",
        COUNT(CASE WHEN si.IsVAT = true AND si.VATRate > 0 THEN 1 END) as "VATItemCount"
      FROM Sales s
      LEFT JOIN SaleItems si ON s.SaleID = si.SaleID
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;
    
    if (startDate) {
      query += ` AND s.SaleDate >= $${paramIndex}`;
      params.push(new Date(startDate));
      paramIndex++;
    }
    
    if (endDate) {
      query += ` AND s.SaleDate <= $${paramIndex}`;
      params.push(new Date(endDate));
      paramIndex++;
    }
    
    query += ' GROUP BY DATE(s.SaleDate) ORDER BY "SaleDate" DESC';
    
    const result = await pool.query(query, params);
    
    // Calculate expected VAT for each day
    const processedResult = await Promise.all(result.rows.map(async (row) => {
      const dateQuery = `
        SELECT 
          si.LineTotal,
          si.VATRate
        FROM SaleItems si
        INNER JOIN Sales s ON si.SaleID = s.SaleID
        WHERE DATE(s.SaleDate) = $1
          AND si.IsVAT = true AND si.VATRate > 0
      `;
      
      const itemsResult = await pool.query(dateQuery, [row.SaleDate]);
      
      let totalExpectedVAT = 0;
      let totalExcludedVAT = 0;
      
      itemsResult.rows.forEach(item => {
        const vatRate = parseFloat(item.VATRate) / 100;
        const vatMultiplier = 1 + vatRate;
        const expectedBasePrice = parseFloat(item.LineTotal) / vatMultiplier;
        const expectedVAT = parseFloat(item.LineTotal) - expectedBasePrice;
        totalExpectedVAT += expectedVAT;
      });
      
      const excludedVAT = totalExpectedVAT - parseFloat(row.TotalVATCollected || 0);
      
      return {
        ...row,
        TotalExpectedVAT: totalExpectedVAT,
        TotalExcludedVAT: excludedVAT > 0 ? excludedVAT : 0
      };
    }));
    
    res.json(processedResult);
  } catch (error) {
    console.error('Error fetching VAT summary:', error);
    res.status(500).json({ error: 'Failed to fetch VAT summary' });
  }
});

// Product Sales Detail
router.get('/product-sales', async (req, res) => {
  try {
    const { startDate, endDate, productId } = req.query;
    const pool = await getConnection();
    
    let query = `
      SELECT 
        si.ProductName,
        si.Barcode,
        SUM(si.Quantity) as "TotalQuantity",
        AVG(si.UnitPrice) as "AvgUnitPrice",
        SUM(si.LineTotal) as "TotalRevenue",
        SUM(si.DiscountAmount) as "TotalDiscounts",
        COUNT(DISTINCT si.SaleID) as "SaleCount"
      FROM SaleItems si
      INNER JOIN Sales s ON si.SaleID = s.SaleID
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;
    
    if (productId) {
      query += ` AND si.ProductID = $${paramIndex}`;
      params.push(parseInt(productId));
      paramIndex++;
    }
    
    if (startDate) {
      query += ` AND s.SaleDate >= $${paramIndex}`;
      params.push(new Date(startDate));
      paramIndex++;
    }
    
    if (endDate) {
      query += ` AND s.SaleDate <= $${paramIndex}`;
      params.push(new Date(endDate));
      paramIndex++;
    }
    
    query += ' GROUP BY si.ProductName, si.Barcode ORDER BY "TotalRevenue" DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching product sales:', error);
    res.status(500).json({ error: 'Failed to fetch product sales' });
  }
});

export default router;

