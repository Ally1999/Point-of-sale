import pkg from 'pg';
import dotenv from 'dotenv';

const {
  Pool
} = pkg;
dotenv.config();

const config = {
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_DATABASE || 'POS_DB',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123',
  port: parseInt(process.env.DB_PORT || '5432'),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

let pool = null;

export const getConnection = async () => {
  try {
    if (pool) {
      return pool;
    }
    pool = new Pool(config);
    // Test the connection
    const client = await pool.connect();
    client.release();
    console.log('Connected to PostgreSQL');
    return pool;
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
};

export const closeConnection = async () => {
  try {
    if (pool) {
      await pool.end();
      pool = null;
      console.log('Database connection closed');
    }
  } catch (error) {
    console.error('Error closing database connection:', error);
  }
};

export default pool;