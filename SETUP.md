# Quick Setup Guide

## Step 1: Database Setup

1. **Install MS SQL Server** (if not already installed)
   - Download from: https://www.microsoft.com/en-us/sql-server/sql-server-downloads
   - Install SQL Server Express (free) or any edition
   - During installation, choose "Mixed Mode Authentication" and set a password for the 'sa' account

2. **Create Database**
   - Open SQL Server Management Studio (SSMS) or use sqlcmd
   - Connect to your local SQL Server instance
   - Run: `CREATE DATABASE POS_DB;`
   - Or the database will be created automatically when you first run the application (make sure the user has CREATE DATABASE permission)

## Step 2: Configure Environment

1. **Backend Configuration**
   - Navigate to `backend/` folder
   - Copy `.env.example` to `.env` (if it doesn't exist)
   - Edit `.env` with your database credentials:
     ```
     DB_SERVER=localhost
     DB_DATABASE=POS_DB
     DB_USER=sa
     DB_PASSWORD=YourActualPassword
     DB_PORT=1433
     DB_TRUST_CERT=true
     ```

## Step 3: Install Dependencies

From the root directory:
```bash
npm run install:all
```

Or manually:
```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

## Step 4: Run the Application

### Option A: Run Both Together
```bash
npm run dev
```

### Option B: Run Separately

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

## Step 5: Access the Application

Open your browser and go to:
```
http://localhost:5173
```

## First Steps

1. **Add Products**
   - Go to "Products" page
   - Click "Add Product"
   - Fill in product details
   - Upload product image (optional)
   - Set VAT status and rate
   - Save

2. **Process a Sale**
   - Go to "POS" page
   - Scan barcode or search for products
   - Add items to cart
   - Select payment type
   - Enter amount paid
   - Click "Process Sale"
   - View and print receipt

## Troubleshooting

### Database Connection Error
- Verify SQL Server is running
- Check credentials in `backend/.env`
- Ensure SQL Server Authentication is enabled
- Verify the database exists

### Port Already in Use
- Backend: Change `PORT` in `backend/.env`
- Frontend: Change port in `frontend/vite.config.js`

### Image Upload Not Working
- Check that `backend/uploads/products/` directory exists
- Verify file permissions
- Ensure file size is under 5MB

## Default Payment Types

The system comes with these payment types pre-configured:
- Cash
- Juice

## Notes

- Default VAT rate is 12% (common in Philippines)
- Currency symbol is Rs (Philippine Peso)
- Barcode scanning: Enter barcode in search field and press Enter
- Receipt printing uses browser's print function

