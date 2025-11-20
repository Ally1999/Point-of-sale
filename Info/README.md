# Point of Sale System

A modern, offline-ready Point of Sale (POS) application powered by Vue 3, Vite, Express, and PostgreSQL. The system covers the full in-store workflow—from catalog maintenance to checkout, VAT handling, and receipt generation.

---

## Highlights

- **Fast barcode lookup** – Scan or type barcodes to add items instantly.
- **Rich product catalog** – Manage descriptions, VAT flags, stock, and images.
- **Image-in-database storage** – Product photos are stored as Base64 directly in PostgreSQL, simplifying deployment (no more upload folders).
- **Dual discount model** – Apply fixed-amount discounts per line item and for the overall cart; percentage discounts are intentionally removed to reduce pricing mistakes.
- **VAT awareness** – Track VAT-inclusive pricing with per-line VAT exclusion toggles and clear receipt labelling.
- **Payment flexibility** – Ships with default tenders and supports receipt regeneration and printing.
- **Inventory tracking** – Sale completion automatically adjusts product stock.
- **Cloud-safe backups** – Optional rclone helper uploads exported files on a schedule and enforces retention.

---

## What’s New

- Product images now save as Base64 blobs in PostgreSQL.
- Item and cart discounts are amount-only (percentage option removed).
- Sales lines can mark VAT as excluded; receipts hide the VAT badge accordingly.
- Backend request limits tuned for Base64 uploads (5 MB JSON payloads).

---

## Tech Stack

- **Frontend:** Vue 3, Vite, Axios, Vue Toastification
- **Backend:** Node.js 18+, Express, PostgreSQL (pg)
- **Database:** PostgreSQL (12 or later recommended)

> ℹ️ Multer and on-disk image storage were removed; no additional file-storage middleware is required.

---

## Prerequisites

- Node.js 18 or newer
- npm 9+ (bundled with Node 18) or Yarn
- PostgreSQL (12 or later) with a user that has database creation rights
- rclone (optional) for the automated backup helper

---

## Quick Start

1. **Clone & Install**
   ```bash
   git clone https://github.com/Ally1999/Point-of-sale.git
   cd point-of-sale
   npm run install:all          # installs root, backend, and frontend deps
   ```

2. **Configure the Backend**
   - Copy `backend/.env.example` to `backend/.env` (if needed).
   - Update the connection settings:
     ```ini
     DB_HOST=localhost
     DB_DATABASE=POS_DB
     DB_USER=postgres
     DB_PASSWORD=YourPassword123
     DB_PORT=5432
     ```

3. **Start Everything**
   ```bash
   npm run dev
   ```
   - Frontend → http://localhost:5173  
   - Backend API → http://localhost:3000  
   - Cloud backup scheduler → runs automatically via `node cloud-backup.js`

   > Don’t have rclone configured yet? Either install it (see `Info/INSTALL_RCLONE.md`) or run services separately with `npm run dev:backend`, `npm run dev:frontend`, and skip `npm run backup` for now.

4. **Visit the App**
   Open `http://localhost:5173` in your browser.

The first backend launch will create tables and seed defaults (payment types, sample category). Existing databases receive column backfills automatically (discount columns, Base64 image field, VAT exclusion flag).

---

## Database Notes

- **Automatic migrations:** `backend/database/init.js` creates missing tables/columns on boot.
- **Schema snapshot:** `backend/database/schema.sql` provides the full structure for manual deployment.
- **Base64 images:** The `Products` table uses an `ImageBase64` column (`TEXT`); no file share is required.

---

## Project Structure

```
Point-of-sale/
├── backend/
│   ├── config/
│   │   └── database.js        # Connection pool
│   ├── database/
│   │   ├── schema.sql         # Canonical schema
│   │   └── init.js            # On-boot migration helper
│   ├── routes/
│   │   ├── products.js        # Product CRUD + Base64 handling
│   │   ├── categories.js
│   │   ├── sales.js           # Checkout, VAT logic, receipts
│   │   └── payments.js
│   ├── server.js              # Express bootstrap
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/api.js         # Axios client
│   │   ├── views/
│   │   │   ├── POS.vue        # Register, discount controls
│   │   │   ├── Products.vue   # Catalog maintenance
│   │   │   └── Sales.vue      # History & receipt modal
│   │   ├── App.vue
│   │   ├── main.js
│   │   └── style.css
│   ├── vite.config.js
│   └── package.json
├── package.json               # Root utilities (install:all, dev)
└── README.md
```

---

## Core Workflows

### Products
1. Navigate to **Products**.
2. Add or edit items, including optional image uploads (handled as Base64).
3. Set VAT status, rates, SKU/barcode, and inventory levels.

### Point of Sale
1. Open **POS**.
2. Scan or search; click items to add to the cart.
3. Apply per-line amount discounts or mark VAT as excluded when needed.
4. Enter a cart-wide discount (amount).
5. Choose a payment type and process the sale; inventory updates automatically.

### Sales History & Receipts
1. Check **Sales** for past transactions.
2. View receipts with item-level discount/VAT detail and print directly from the browser.

---

## API Overview

- `GET /api/products` – List active products
- `POST /api/products` – Create product (accepts Base64 images)
- `PUT /api/products/:id` – Update product
- `DELETE /api/products/:id` – Soft-delete product
- `GET /api/products/barcode/:code` – Lookup by barcode
- `GET /api/categories` – List categories
- `GET /api/sales` – Paginated sales history
- `POST /api/sales` – Create sale (supports item + cart discounts, VAT exclusion)
- `GET /api/sales/:id` – Sale detail with line items
- `POST /api/sales/:id/print-thermal-receipt` – Generate formatted receipt payload
- `GET /api/payments` – Available payment types

---

## Troubleshooting

| Issue | Quick Fix |
| --- | --- |
| PostgreSQL connection fails | Ensure PostgreSQL service is running, verify credentials match `.env`, and confirm the database exists. |
| Backend rejects image upload | Base64 payloads are capped at 5 MB—compress/resize the image and retry. |
| Ports already in use | Change `PORT` in `backend/.env` and/or adjust Vite port in `frontend/vite.config.js`. |
| Barcode scan not detected | Focus the scan input (POS page) and ensure the scanner sends an Enter key. |

---

## Default Data

- Categories: `General`
- Payment Types: `Cash`, `Juice`
- Currency: `Rs`
- Default VAT rate (suggested): 15 %

Adjust defaults by editing `backend/database/init.js` before the first run, or update via the UI once the app is running.

---

## Development Scripts

| Location | Command | Description |
| --- | --- | --- |
| root | `npm run install:all` | Install dependencies for root + services |
| root | `npm run dev` | Run frontend, backend, and cloud backup scheduler |
| root | `npm run backup` | Start only the backup scheduler (`node cloud-backup.js`) |
| root | `npm run backup:once` | Run a one-off backup for smoke tests |
| backend | `npm run dev` | Start Express with file watcher |
| backend | `npm start` | Start Express (production) |
| frontend | `npm run dev` | Launch Vite dev server |
| frontend | `npm run build` | Production build (dist/) |

---

## Contributing

1. Fork → feature branch → PR.
2. Keep lint errors at zero (run `npm run lint` where available).
3. Document user-facing changes (e.g., update this README when adding features).

---

## License

This project is distributed for internal use. Please review your organization’s licensing requirements before redistribution.
