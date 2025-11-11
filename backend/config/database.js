import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const config = {
  server: 'localhost',
  database: 'POS_DB',
  user: 'sa',
  password: '123',
  port: parseInt('1433'),
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

let pool = null;

export const getConnection = async () => {
  try {
    if (pool) {
      return pool;
    }
    pool = await sql.connect(config);
    console.log('Connected to MS SQL Server');
    return pool;
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
};

export const closeConnection = async () => {
  try {
    if (pool) {
      await pool.close();
      pool = null;
      console.log('Database connection closed');
    }
  } catch (error) {
    console.error('Error closing database connection:', error);
  }
};

export default sql;

