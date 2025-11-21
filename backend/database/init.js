import { getConnection } from '../config/database.js';

export const initializeDatabase = async () => {
  try {
    const pool = await getConnection();
    
    // Create Categories Table
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "Categories" (
          "CategoryID" SERIAL PRIMARY KEY,
          "CategoryName" VARCHAR(100) NOT NULL,
          "Description" VARCHAR(255),
          "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } catch (error) {
      console.error('Error creating Categories table:', error.message);
    }
    
    // Create Products Table
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "Products" (
          "ProductID" SERIAL PRIMARY KEY,
          "ProductName" VARCHAR(200) NOT NULL,
          "Barcode" VARCHAR(100) UNIQUE,
          "SKU" VARCHAR(50),
          "Description" VARCHAR(500),
          "Price" DECIMAL(18,2) NOT NULL,
          "Cost" DECIMAL(18,2),
          "IsVAT" BOOLEAN DEFAULT true,
          "VATRate" DECIMAL(5,2) DEFAULT 0.00,
          "CategoryID" INT,
          "ImageBase64" TEXT,
          "IsActive" BOOLEAN DEFAULT true,
          "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("CategoryID") REFERENCES "Categories"("CategoryID")
        )
      `);
    } catch (error) {
      console.error('Error creating Products table:', error.message);
    }
    
    // Create PaymentTypes Table
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "PaymentTypes" (
          "PaymentTypeID" SERIAL PRIMARY KEY,
          "PaymentName" VARCHAR(50) NOT NULL,
          "Description" VARCHAR(255),
          "IsActive" BOOLEAN DEFAULT true
        )
      `);
    } catch (error) {
      console.error('Error creating PaymentTypes table:', error.message);
    }
    
    // Create Sales Table
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "Sales" (
          "SaleID" SERIAL PRIMARY KEY,
          "SaleNumber" VARCHAR(50) UNIQUE NOT NULL,
          "SaleDate" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "SubTotal" DECIMAL(18,2) NOT NULL,
          "DiscountAmount" DECIMAL(18,2) DEFAULT 0.00,
          "VATAmount" DECIMAL(18,2) DEFAULT 0.00,
          "TotalAmount" DECIMAL(18,2) NOT NULL,
          "PaymentTypeID" INT,
          "AmountPaid" DECIMAL(18,2) NOT NULL,
          "ChangeAmount" DECIMAL(18,2) DEFAULT 0.00,
          "Notes" VARCHAR(500),
          "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("PaymentTypeID") REFERENCES "PaymentTypes"("PaymentTypeID")
        )
      `);
    } catch (error) {
      console.error('Error creating Sales table:', error.message);
    }
    
    // Add discount columns to Sales table if they don't exist
    try {
      const discountAmountCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'Sales' AND column_name = 'DiscountAmount'
      `);
      if (discountAmountCheck.rows.length === 0) {
        await pool.query('ALTER TABLE "Sales" ADD COLUMN "DiscountAmount" DECIMAL(18,2) DEFAULT 0.00');
      }
    } catch (error) {
      console.error('Error adding discount columns to Sales:', error.message);
    }
    
    // Add void columns to Sales table if they don't exist
    try {
      const isVoidedCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'Sales' AND column_name = 'IsVoided'
      `);
      if (isVoidedCheck.rows.length === 0) {
        await pool.query('ALTER TABLE "Sales" ADD COLUMN "IsVoided" BOOLEAN DEFAULT false');
      }
      
      const voidedAtCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'Sales' AND column_name = 'VoidedAt'
      `);
      if (voidedAtCheck.rows.length === 0) {
        await pool.query('ALTER TABLE "Sales" ADD COLUMN "VoidedAt" TIMESTAMP NULL');
      }
    } catch (error) {
      console.error('Error adding void columns to Sales:', error.message);
    }
    
    // Add return columns to Sales table if they don't exist
    try {
      const isReturnCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'Sales' AND column_name = 'IsReturn'
      `);
      if (isReturnCheck.rows.length === 0) {
        await pool.query('ALTER TABLE "Sales" ADD COLUMN "IsReturn" BOOLEAN DEFAULT false');
      }
      
      const originalSaleIdCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'Sales' AND column_name = 'OriginalSaleID'
      `);
      if (originalSaleIdCheck.rows.length === 0) {
        await pool.query('ALTER TABLE "Sales" ADD COLUMN "OriginalSaleID" INT NULL');
        await pool.query('ALTER TABLE "Sales" ADD CONSTRAINT "FK_Sales_OriginalSale" FOREIGN KEY ("OriginalSaleID") REFERENCES "Sales"("SaleID")');
      }
    } catch (error) {
      console.error('Error adding return columns to Sales:', error.message);
    }
    
    // Create SaleItems Table
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "SaleItems" (
          "SaleItemID" SERIAL PRIMARY KEY,
          "SaleID" INT NOT NULL,
          "ProductID" INT NOT NULL,
          "ProductName" VARCHAR(200) NOT NULL,
          "Barcode" VARCHAR(100),
          "Quantity" INT NOT NULL,
          "UnitPrice" DECIMAL(18,2) NOT NULL,
          "DiscountAmount" DECIMAL(18,2) DEFAULT 0.00,
          "IsVAT" BOOLEAN DEFAULT true,
          "VATRate" DECIMAL(5,2) DEFAULT 0.00,
          "ExcludeVAT" BOOLEAN DEFAULT false,
          "LineTotal" DECIMAL(18,2) NOT NULL,
          FOREIGN KEY ("SaleID") REFERENCES "Sales"("SaleID") ON DELETE CASCADE,
          FOREIGN KEY ("ProductID") REFERENCES "Products"("ProductID")
        )
      `);
    } catch (error) {
      console.error('Error creating SaleItems table:', error.message);
    }
    
    // Add discount columns to SaleItems table if they don't exist
    try {
      const saleItemsDiscountAmount = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'SaleItems' AND column_name = 'DiscountAmount'
      `);
      if (saleItemsDiscountAmount.rows.length === 0) {
        await pool.query('ALTER TABLE "SaleItems" ADD COLUMN "DiscountAmount" DECIMAL(18,2) DEFAULT 0.00');
      }
      
      const excludeVATCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'SaleItems' AND column_name = 'ExcludeVAT'
      `);
      if (excludeVATCheck.rows.length === 0) {
        await pool.query('ALTER TABLE "SaleItems" ADD COLUMN "ExcludeVAT" BOOLEAN DEFAULT false');
      }
    } catch (error) {
      console.error('Error adding discount columns to SaleItems:', error.message);
    }
    
    // Insert Default Payment Types
    try {
      const paymentCheck = await pool.query('SELECT COUNT(*) as count FROM "PaymentTypes"');
      if (parseInt(paymentCheck.rows[0].count) === 0) {
        await pool.query(`
          INSERT INTO "PaymentTypes" ("PaymentName", "Description") VALUES
          ('Cash', 'Cash payment'),
          ('Juice', 'Juice payment')
        `);
      }
    } catch (error) {
      console.error('Error inserting payment types:', error.message);
    }
    
    // Insert Sample Category
    try {
      const categoryCheck = await pool.query('SELECT COUNT(*) as count FROM "Categories"');
      if (parseInt(categoryCheck.rows[0].count) === 0) {
        await pool.query(`
          INSERT INTO "Categories" ("CategoryName", "Description") VALUES
          ('General', 'General products'),
          ('kitchen', 'Litchen products'),
          ('Wedding', 'Wedding products')
        `);
      }
    } catch (error) {
      console.error('Error inserting sample category:', error.message);
    }
    
    console.log('Database initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

