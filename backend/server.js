import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeDatabase } from './database/init.js';
import productRoutes from './routes/products.js';
import categoryRoutes from './routes/categories.js';
import saleRoutes from './routes/sales.js';
import paymentRoutes from './routes/payments.js';
import reportRoutes from './routes/reports.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Routes
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reports', reportRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'POS API is running' });
});

// Initialize database on startup
initializeDatabase().catch(console.error);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

