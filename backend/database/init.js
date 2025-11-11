import { getConnection } from '../config/database.js';
import sql from '../config/database.js';

export const initializeDatabase = async () => {
  try {
    const pool = await getConnection();
    const request = pool.request();
    
    // Create Categories Table
    try {
      await request.query(`
        IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Categories]') AND type in (N'U'))
        CREATE TABLE Categories (
          CategoryID INT PRIMARY KEY IDENTITY(1,1),
          CategoryName NVARCHAR(100) NOT NULL,
          Description NVARCHAR(255),
          CreatedAt DATETIME DEFAULT GETDATE()
        )
      `);
    } catch (error) {
      if (!error.message.includes('already exists')) {
        console.error('Error creating Categories table:', error.message);
      }
    }
    
    // Create Products Table
    try {
      await request.query(`
        IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Products]') AND type in (N'U'))
        CREATE TABLE Products (
          ProductID INT PRIMARY KEY IDENTITY(1,1),
          ProductName NVARCHAR(200) NOT NULL,
          Barcode NVARCHAR(100) UNIQUE,
          SKU NVARCHAR(50),
          Description NVARCHAR(500),
          Price DECIMAL(18,2) NOT NULL,
          Cost DECIMAL(18,2),
          IsVAT BIT DEFAULT 1,
          VATRate DECIMAL(5,2) DEFAULT 0.00,
          CategoryID INT,
          ImagePath NVARCHAR(500),
          StockQuantity INT DEFAULT 0,
          IsActive BIT DEFAULT 1,
          CreatedAt DATETIME DEFAULT GETDATE(),
          UpdatedAt DATETIME DEFAULT GETDATE(),
          FOREIGN KEY (CategoryID) REFERENCES Categories(CategoryID)
        )
      `);
    } catch (error) {
      if (!error.message.includes('already exists')) {
        console.error('Error creating Products table:', error.message);
      }
    }
    
    // Create PaymentTypes Table
    try {
      await request.query(`
        IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[PaymentTypes]') AND type in (N'U'))
        CREATE TABLE PaymentTypes (
          PaymentTypeID INT PRIMARY KEY IDENTITY(1,1),
          PaymentName NVARCHAR(50) NOT NULL,
          Description NVARCHAR(255),
          IsActive BIT DEFAULT 1
        )
      `);
    } catch (error) {
      if (!error.message.includes('already exists')) {
        console.error('Error creating PaymentTypes table:', error.message);
      }
    }
    
    // Create Sales Table
    try {
      await request.query(`
        IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Sales]') AND type in (N'U'))
        CREATE TABLE Sales (
          SaleID INT PRIMARY KEY IDENTITY(1,1),
          SaleNumber NVARCHAR(50) UNIQUE NOT NULL,
          SaleDate DATETIME DEFAULT GETDATE(),
          SubTotal DECIMAL(18,2) NOT NULL,
          DiscountType NVARCHAR(20) DEFAULT NULL,
          DiscountValue DECIMAL(18,2) DEFAULT 0.00,
          DiscountAmount DECIMAL(18,2) DEFAULT 0.00,
          VATAmount DECIMAL(18,2) DEFAULT 0.00,
          TotalAmount DECIMAL(18,2) NOT NULL,
          PaymentTypeID INT,
          AmountPaid DECIMAL(18,2) NOT NULL,
          ChangeAmount DECIMAL(18,2) DEFAULT 0.00,
          Notes NVARCHAR(500),
          CreatedAt DATETIME DEFAULT GETDATE(),
          FOREIGN KEY (PaymentTypeID) REFERENCES PaymentTypes(PaymentTypeID)
        )
      `);
    } catch (error) {
      if (!error.message.includes('already exists')) {
        console.error('Error creating Sales table:', error.message);
      }
    }
    
    // Add discount columns to Sales table if they don't exist
    try {
      await request.query(`
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Sales]') AND name = 'DiscountType')
        ALTER TABLE Sales ADD DiscountType NVARCHAR(20) DEFAULT NULL
      `);
      await request.query(`
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Sales]') AND name = 'DiscountValue')
        ALTER TABLE Sales ADD DiscountValue DECIMAL(18,2) DEFAULT 0.00
      `);
      await request.query(`
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Sales]') AND name = 'DiscountAmount')
        ALTER TABLE Sales ADD DiscountAmount DECIMAL(18,2) DEFAULT 0.00
      `);
    } catch (error) {
      console.error('Error adding discount columns to Sales:', error.message);
    }
    
    // Create SaleItems Table
    try {
      await request.query(`
        IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[SaleItems]') AND type in (N'U'))
        CREATE TABLE SaleItems (
          SaleItemID INT PRIMARY KEY IDENTITY(1,1),
          SaleID INT NOT NULL,
          ProductID INT NOT NULL,
          ProductName NVARCHAR(200) NOT NULL,
          Barcode NVARCHAR(100),
          Quantity INT NOT NULL,
          UnitPrice DECIMAL(18,2) NOT NULL,
          DiscountType NVARCHAR(20) DEFAULT NULL,
          DiscountValue DECIMAL(18,2) DEFAULT 0.00,
          DiscountAmount DECIMAL(18,2) DEFAULT 0.00,
          IsVAT BIT DEFAULT 1,
          VATRate DECIMAL(5,2) DEFAULT 0.00,
          LineTotal DECIMAL(18,2) NOT NULL,
          FOREIGN KEY (SaleID) REFERENCES Sales(SaleID) ON DELETE CASCADE,
          FOREIGN KEY (ProductID) REFERENCES Products(ProductID)
        )
      `);
    } catch (error) {
      if (!error.message.includes('already exists')) {
        console.error('Error creating SaleItems table:', error.message);
      }
    }
    
    // Add discount columns to SaleItems table if they don't exist
    try {
      await request.query(`
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[SaleItems]') AND name = 'DiscountType')
        ALTER TABLE SaleItems ADD DiscountType NVARCHAR(20) DEFAULT NULL
      `);
      await request.query(`
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[SaleItems]') AND name = 'DiscountValue')
        ALTER TABLE SaleItems ADD DiscountValue DECIMAL(18,2) DEFAULT 0.00
      `);
      await request.query(`
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[SaleItems]') AND name = 'DiscountAmount')
        ALTER TABLE SaleItems ADD DiscountAmount DECIMAL(18,2) DEFAULT 0.00
      `);
    } catch (error) {
      console.error('Error adding discount columns to SaleItems:', error.message);
    }
    
    // Insert Default Payment Types
    try {
      const paymentCheck = await request.query('SELECT COUNT(*) as count FROM PaymentTypes');
      if (paymentCheck.recordset[0].count === 0) {
        await request.query(`
          INSERT INTO PaymentTypes (PaymentName, Description) VALUES
          ('Cash', 'Cash payment'),
          ('Credit Card', 'Credit card payment'),
          ('Debit Card', 'Debit card payment'),
          ('Mobile Payment', 'Mobile payment (GCash, PayMaya, etc.)'),
          ('Check', 'Check payment')
        `);
      }
    } catch (error) {
      console.error('Error inserting payment types:', error.message);
    }
    
    // Insert Sample Category
    try {
      const categoryCheck = await request.query('SELECT COUNT(*) as count FROM Categories');
      if (categoryCheck.recordset[0].count === 0) {
        await request.query(`
          INSERT INTO Categories (CategoryName, Description) VALUES
          ('General', 'General products')
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

