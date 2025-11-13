-- Create Database (run this manually if database doesn't exist)
-- CREATE DATABASE POS_DB;

USE POS_DB;
GO

-- Categories Table
CREATE TABLE Categories (
    CategoryID INT PRIMARY KEY IDENTITY(1,1),
    CategoryName NVARCHAR(100) NOT NULL,
    Description NVARCHAR(255),
    CreatedAt DATETIME DEFAULT GETDATE()
);
GO

-- Products Table
CREATE TABLE Products (
    ProductID INT PRIMARY KEY IDENTITY(1,1),
    ProductName NVARCHAR(200) NOT NULL,
    Barcode NVARCHAR(100) UNIQUE,
    SKU NVARCHAR(50),
    Description NVARCHAR(500),
    Price DECIMAL(18,2) NOT NULL,
    Cost DECIMAL(18,2),
    IsVAT BIT DEFAULT 1, -- 1 for VAT, 0 for non-VAT
    VATRate DECIMAL(5,2) DEFAULT 0.00,
    CategoryID INT,
    ImagePath NVARCHAR(500),
    StockQuantity INT DEFAULT 0,
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (CategoryID) REFERENCES Categories(CategoryID)
);
GO

-- Payment Types Table
CREATE TABLE PaymentTypes (
    PaymentTypeID INT PRIMARY KEY IDENTITY(1,1),
    PaymentName NVARCHAR(50) NOT NULL,
    Description NVARCHAR(255),
    IsActive BIT DEFAULT 1
);
GO

-- Sales Table
CREATE TABLE Sales (
    SaleID INT PRIMARY KEY IDENTITY(1,1),
    SaleNumber NVARCHAR(50) UNIQUE NOT NULL,
    SaleDate DATETIME DEFAULT GETDATE(),
    SubTotal DECIMAL(18,2) NOT NULL,
    VATAmount DECIMAL(18,2) DEFAULT 0.00,
    TotalAmount DECIMAL(18,2) NOT NULL,
    PaymentTypeID INT,
    AmountPaid DECIMAL(18,2) NOT NULL,
    ChangeAmount DECIMAL(18,2) DEFAULT 0.00,
    Notes NVARCHAR(500),
    CreatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (PaymentTypeID) REFERENCES PaymentTypes(PaymentTypeID)
);
GO

-- Sale Items Table
CREATE TABLE SaleItems (
    SaleItemID INT PRIMARY KEY IDENTITY(1,1),
    SaleID INT NOT NULL,
    ProductID INT NOT NULL,
    ProductName NVARCHAR(200) NOT NULL,
    Barcode NVARCHAR(100),
    Quantity INT NOT NULL,
    UnitPrice DECIMAL(18,2) NOT NULL,
    IsVAT BIT DEFAULT 1,
    VATRate DECIMAL(5,2) DEFAULT 0.00,
    LineTotal DECIMAL(18,2) NOT NULL,
    FOREIGN KEY (SaleID) REFERENCES Sales(SaleID) ON DELETE CASCADE,
    FOREIGN KEY (ProductID) REFERENCES Products(ProductID)
);
GO

-- Insert Default Payment Types
INSERT INTO PaymentTypes (PaymentName, Description) VALUES
('Cash', 'Cash payment'),
('Juice', 'Juice payment');
GO

-- Insert Sample Category
INSERT INTO Categories (CategoryName, Description) VALUES
('General', 'General products'),
('Wedding', 'Wedding products');
GO

