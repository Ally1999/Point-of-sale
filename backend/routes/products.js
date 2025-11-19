import express from 'express';
import { getConnection } from '../config/database.js';

const router = express.Router();

// Get all products
router.get('/', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.query(`
      SELECT p.*, c.CategoryName 
      FROM Products p
      LEFT JOIN Categories c ON p.CategoryID = c.CategoryID
      WHERE p.IsActive = true
      ORDER BY p.ProductName
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get product by ID
router.get('/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.query(`
      SELECT p.*, c.CategoryName 
      FROM Products p
      LEFT JOIN Categories c ON p.CategoryID = c.CategoryID
      WHERE p.ProductID = $1
    `, [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Get product by barcode
router.get('/barcode/:barcode', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.query(`
      SELECT p.*, c.CategoryName 
      FROM Products p
      LEFT JOIN Categories c ON p.CategoryID = c.CategoryID
      WHERE p.Barcode = $1 AND p.IsActive = true
    `, [req.params.barcode]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching product by barcode:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Create product
router.post('/', async (req, res) => {
  try {
    const { ProductName, Barcode, SKU, Description, Price, Cost, IsVAT, VATRate, CategoryID, ImageBase64 } = req.body;
    const imageBase64 = ImageBase64 && ImageBase64.trim() !== '' ? ImageBase64.trim() : null;
    
    const pool = await getConnection();
    const result = await pool.query(`
      INSERT INTO Products (ProductName, Barcode, SKU, Description, Price, Cost, IsVAT, VATRate, CategoryID, ImageBase64)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      ProductName,
      Barcode || null,
      SKU || null,
      Description || null,
      parseFloat(Price),
      Cost ? parseFloat(Cost) : null,
      IsVAT === 'true' || IsVAT === true,
      VATRate ? parseFloat(VATRate) : 0.00,
      CategoryID || null,
      imageBase64
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product', details: error.message });
  }
});

// Update product
router.put('/:id', async (req, res) => {
  try {
    const { ProductName, Barcode, SKU, Description, Price, Cost, IsVAT, VATRate, CategoryID, ImageBase64 } = req.body;
    
    // Get existing product to check for existing image
    const pool = await getConnection();
    const existing = await pool.query('SELECT ImageBase64 FROM Products WHERE ProductID = $1', [req.params.id]);
    
    let imageBase64 = existing.rows[0]?.imagebase64 || null;
    
    // If new image provided, use it; otherwise keep existing
    if (typeof ImageBase64 === 'string' && ImageBase64.trim() !== '') {
      imageBase64 = ImageBase64.trim();
    } else if (ImageBase64 === null || ImageBase64 === '') {
      imageBase64 = null;
    }
    
    const result = await pool.query(`
      UPDATE Products 
      SET ProductName = $1,
          Barcode = $2,
          SKU = $3,
          Description = $4,
          Price = $5,
          Cost = $6,
          IsVAT = $7,
          VATRate = $8,
          CategoryID = $9,
          ImageBase64 = $10,
          UpdatedAt = CURRENT_TIMESTAMP
      WHERE ProductID = $11
      RETURNING *
    `, [
      ProductName,
      Barcode || null,
      SKU || null,
      Description || null,
      parseFloat(Price),
      Cost ? parseFloat(Cost) : null,
      IsVAT === 'true' || IsVAT === true,
      VATRate ? parseFloat(VATRate) : 0.00,
      CategoryID || null,
      imageBase64,
      req.params.id
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product', details: error.message });
  }
});

// Delete product (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const productId = Number.parseInt(req.params.id, 10);

    if (!Number.isInteger(productId)) {
      return res.status(400).json({ error: 'A valid product id is required' });
    }

    const pool = await getConnection();
    const result = await pool.query(
      'UPDATE Products SET IsActive = false, UpdatedAt = CURRENT_TIMESTAMP WHERE ProductID = $1 RETURNING ProductID',
      [productId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

export default router;

