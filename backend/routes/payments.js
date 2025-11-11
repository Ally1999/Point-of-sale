import express from 'express';
import { getConnection } from '../config/database.js';

const router = express.Router();

// Get all payment types
router.get('/', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT * FROM PaymentTypes 
      WHERE IsActive = 1 
      ORDER BY PaymentName
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching payment types:', error);
    res.status(500).json({ error: 'Failed to fetch payment types' });
  }
});

export default router;

