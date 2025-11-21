-- Create Database (run this manually if database doesn't exist)
-- CREATE DATABASE "POS_DB";

-- Categories Table
CREATE TABLE IF NOT EXISTS "Categories" (
    "CategoryID" SERIAL PRIMARY KEY,
    "CategoryName" VARCHAR(100) NOT NULL,
    "Description" VARCHAR(255),
    "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products Table
CREATE TABLE IF NOT EXISTS "Products" (
    "ProductID" SERIAL PRIMARY KEY,
    "ProductName" VARCHAR(200) NOT NULL,
    "Barcode" VARCHAR(100) UNIQUE NOT NULL,
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
);

-- Payment Types Table
CREATE TABLE IF NOT EXISTS "PaymentTypes" (
    "PaymentTypeID" SERIAL PRIMARY KEY,
    "PaymentName" VARCHAR(50) NOT NULL,
    "Description" VARCHAR(255),
    "IsActive" BOOLEAN DEFAULT true
);

-- Sales Table
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
    "IsVoided" BOOLEAN DEFAULT false,
    "VoidedAt" TIMESTAMP NULL,
    "IsReturn" BOOLEAN DEFAULT false,
    "OriginalSaleID" INT NULL,
    "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("PaymentTypeID") REFERENCES "PaymentTypes"("PaymentTypeID"),
    FOREIGN KEY ("OriginalSaleID") REFERENCES "Sales"("SaleID")
);

-- Sale Items Table
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
);

-- Insert Default Payment Types
INSERT INTO "PaymentTypes" ("PaymentName", "Description") VALUES
('Cash', 'Cash payment'),
('Juice', 'Juice payment')
ON CONFLICT DO NOTHING;

-- Insert Sample Category
INSERT INTO "Categories" ("CategoryName", "Description") VALUES
('General', 'General products'),
('kitchen', 'Litchen products'),
('Wedding', 'Wedding products')
ON CONFLICT DO NOTHING;

