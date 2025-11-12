# Point of Sale System

A comprehensive Point of Sale (POS) application built with Vue.js, Vite, Node.js, and MS SQL Server, designed to run locally.

## Features

- ✅ **Barcode Scanning** - Scan or manually enter barcodes to add products to cart
- ✅ **Product Management** - Add, edit, and manage products with images
- ✅ **VAT/Non-VAT Items** - Support for both VAT and non-VAT products with configurable VAT rates
- ✅ **Multiple Payment Types** - Cash, Credit Card, Debit Card, Mobile Payment, Check
- ✅ **Receipt Printing** - Generate and print receipts for sales
- ✅ **Sales History** - View and manage sales records
- ✅ **Stock Management** - Track product inventory

## Tech Stack

- **Frontend**: Vue.js 3, Vite, Vue Router
- **Backend**: Node.js, Express.js
- **Database**: MS SQL Server
- **Image Upload**: Multer

## Prerequisites

- Node.js (v16 or higher)
- MS SQL Server (local instance)
- npm or yarn

## Setup Instructions

### 1. Database Setup

1. Install and start MS SQL Server on your local machine
2. Create a database named `POS_DB` (or update the database name in `.env`)
3. Update the database credentials in `backend/.env`:
   ```
   DB_SERVER=localhost
   DB_DATABASE=POS_DB
   DB_USER=sa
   DB_PASSWORD=YourPassword123
   DB_PORT=1433
   DB_TRUST_CERT=true
   ```

### 2. Install Dependencies

From the root directory, run:
```bash
npm run install:all
```

Or install manually:
```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 3. Initialize Database

The database schema will be automatically initialized when you start the backend server. Alternatively, you can manually run the SQL script:

```bash
# Connect to MS SQL Server and run:
sqlcmd -S localhost -d POS_DB -i backend/database/schema.sql
```

### 4. Run the Application

#### Option 1: Run both frontend and backend together
```bash
npm run dev
```

#### Option 2: Run separately

**Backend (Terminal 1):**
```bash
cd backend
npm run dev
```
Backend will run on `http://localhost:3000`

**Frontend (Terminal 2):**
```bash
cd frontend
npm run dev
```
Frontend will run on `http://localhost:5173`

### 5. Access the Application

Open your browser and navigate to:
```
http://localhost:5173
```

## Project Structure

```
Point-of-sale/
├── backend/
│   ├── config/
│   │   └── database.js          # Database configuration
│   ├── database/
│   │   ├── schema.sql            # Database schema
│   │   └── init.js               # Database initialization
│   ├── routes/
│   │   ├── products.js           # Product API routes
│   │   ├── categories.js         # Category API routes
│   │   ├── sales.js              # Sales API routes
│   │   └── payments.js           # Payment types API routes
│   ├── uploads/
│   │   └── products/             # Product images storage
│   ├── server.js                 # Express server
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── api.js            # API client
│   │   ├── views/
│   │   │   ├── POS.vue          # Point of Sale interface
│   │   │   ├── Products.vue     # Product management
│   │   │   └── Sales.vue        # Sales history
│   │   ├── App.vue              # Main app component
│   │   ├── main.js              # App entry point
│   │   └── style.css            # Global styles
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── package.json                  # Root package.json
```

## API Endpoints

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `GET /api/products/barcode/:barcode` - Get product by barcode
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Categories
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create category

### Sales
- `GET /api/sales` - Get all sales
- `GET /api/sales/:id` - Get sale by ID with items
- `POST /api/sales` - Create new sale

### Payments
- `GET /api/payments` - Get all payment types

## Usage

### Adding Products
1. Navigate to the "Products" page
2. Click "Add Product"
3. Fill in product details including:
   - Product name (required)
   - Barcode (optional, for scanning)
   - Price (required)
   - VAT status (VAT or Non-VAT)
   - VAT rate (if VAT item)
   - Product image (optional)
4. Click "Save"

### Processing a Sale
1. Navigate to the "POS" page
2. Scan or search for products to add to cart
3. Adjust quantities as needed
4. Select payment type
5. Enter amount paid
6. Click "Process Sale"
7. View and print receipt

### Viewing Sales History
1. Navigate to the "Sales" page
2. View all past sales
3. Click "View Receipt" to see details and print

## Notes

- Product images are stored in `backend/uploads/products/`
- The application uses Mauritian rooes (Rs) as the currency symbol
- Default VAT rate is 15% (common in Mauritius)
- Barcode scanning works by entering the barcode in the search field and pressing Enter
- Receipts can be printed using the browser's print function


### Image Upload Issues
- Ensure `backend/uploads/products/` directory exists
- Check file permissions
- Verify file size is under 5MB

### Port Conflicts
- Backend default port: 3000
- Frontend default port: 5173
- Update ports in configuration files if needed
