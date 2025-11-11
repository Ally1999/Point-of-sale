import express from 'express';
import { getConnection } from '../config/database.js';
import sql from '../config/database.js';

const router = express.Router();

// Get all categories
router.get('/', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query('SELECT * FROM Categories ORDER BY CategoryName');
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Create category
router.post('/', async (req, res) => {
  try {
    const { CategoryName, Description } = req.body;
    const pool = await getConnection();
    const result = await pool.request()
      .input('CategoryName', sql.NVarChar, CategoryName)
      .input('Description', sql.NVarChar, Description || null)
      .query(`
        INSERT INTO Categories (CategoryName, Description)
        OUTPUT INSERTED.*
        VALUES (@CategoryName, @Description)
      `);
    
    res.status(201).json(result.recordset[0]);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

export default router;

