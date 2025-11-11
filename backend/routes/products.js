import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { getConnection } from '../config/database.js';
import sql from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/products');
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Ensure upload directory exists
import fs from 'fs';
const uploadDir = path.join(__dirname, '../uploads/products');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Get all products
router.get('/', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT p.*, c.CategoryName 
      FROM Products p
      LEFT JOIN Categories c ON p.CategoryID = c.CategoryID
      WHERE p.IsActive = 1
      ORDER BY p.ProductName
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get product by ID
router.get('/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`
        SELECT p.*, c.CategoryName 
        FROM Products p
        LEFT JOIN Categories c ON p.CategoryID = c.CategoryID
        WHERE p.ProductID = @id
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Get product by barcode
router.get('/barcode/:barcode', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('barcode', sql.NVarChar, req.params.barcode)
      .query(`
        SELECT p.*, c.CategoryName 
        FROM Products p
        LEFT JOIN Categories c ON p.CategoryID = c.CategoryID
        WHERE p.Barcode = @barcode AND p.IsActive = 1
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error fetching product by barcode:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Create product
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { ProductName, Barcode, SKU, Description, Price, Cost, IsVAT, VATRate, CategoryID, StockQuantity } = req.body;
    const imagePath = req.file ? `/uploads/products/${req.file.filename}` : null;
    
    const pool = await getConnection();
    const result = await pool.request()
      .input('ProductName', sql.NVarChar, ProductName)
      .input('Barcode', sql.NVarChar, Barcode || null)
      .input('SKU', sql.NVarChar, SKU || null)
      .input('Description', sql.NVarChar, Description || null)
      .input('Price', sql.Decimal(18, 2), parseFloat(Price))
      .input('Cost', sql.Decimal(18, 2), Cost ? parseFloat(Cost) : null)
      .input('IsVAT', sql.Bit, IsVAT === 'true' || IsVAT === true ? 1 : 0)
      .input('VATRate', sql.Decimal(5, 2), VATRate ? parseFloat(VATRate) : 0.00)
      .input('CategoryID', sql.Int, CategoryID || null)
      .input('ImagePath', sql.NVarChar, imagePath)
      .input('StockQuantity', sql.Int, StockQuantity ? parseInt(StockQuantity) : 0)
      .query(`
        INSERT INTO Products (ProductName, Barcode, SKU, Description, Price, Cost, IsVAT, VATRate, CategoryID, ImagePath, StockQuantity)
        OUTPUT INSERTED.*
        VALUES (@ProductName, @Barcode, @SKU, @Description, @Price, @Cost, @IsVAT, @VATRate, @CategoryID, @ImagePath, @StockQuantity)
      `);
    
    res.status(201).json(result.recordset[0]);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product', details: error.message });
  }
});

// Update product
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const { ProductName, Barcode, SKU, Description, Price, Cost, IsVAT, VATRate, CategoryID, StockQuantity } = req.body;
    
    // Get existing product to check for existing image
    const pool = await getConnection();
    const existing = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT ImagePath FROM Products WHERE ProductID = @id');
    
    let imagePath = existing.recordset[0]?.ImagePath || null;
    
    // If new image uploaded, use it; otherwise keep existing
    if (req.file) {
      imagePath = `/uploads/products/${req.file.filename}`;
    }
    
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('ProductName', sql.NVarChar, ProductName)
      .input('Barcode', sql.NVarChar, Barcode || null)
      .input('SKU', sql.NVarChar, SKU || null)
      .input('Description', sql.NVarChar, Description || null)
      .input('Price', sql.Decimal(18, 2), parseFloat(Price))
      .input('Cost', sql.Decimal(18, 2), Cost ? parseFloat(Cost) : null)
      .input('IsVAT', sql.Bit, IsVAT === 'true' || IsVAT === true ? 1 : 0)
      .input('VATRate', sql.Decimal(5, 2), VATRate ? parseFloat(VATRate) : 0.00)
      .input('CategoryID', sql.Int, CategoryID || null)
      .input('ImagePath', sql.NVarChar, imagePath)
      .input('StockQuantity', sql.Int, StockQuantity ? parseInt(StockQuantity) : 0)
      .query(`
        UPDATE Products 
        SET ProductName = @ProductName,
            Barcode = @Barcode,
            SKU = @SKU,
            Description = @Description,
            Price = @Price,
            Cost = @Cost,
            IsVAT = @IsVAT,
            VATRate = @VATRate,
            CategoryID = @CategoryID,
            ImagePath = @ImagePath,
            StockQuantity = @StockQuantity,
            UpdatedAt = GETDATE()
        WHERE ProductID = @id
        SELECT * FROM Products WHERE ProductID = @id
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product', details: error.message });
  }
});

// Delete product (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('UPDATE Products SET IsActive = 0 WHERE ProductID = @id');
    
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

export default router;

