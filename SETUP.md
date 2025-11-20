# Setup Guide

This document walks through preparing the environment, configuring PostgreSQL, and launching the POS application for the first time.

---

## 1. Install Prerequisites

| Tool | Minimum Version | Notes |
| --- | --- | --- |
| Node.js | 18.x | Includes npm 9+ |
| PostgreSQL | 12+ | Latest stable version recommended |
| Git | Latest | Optional but recommended |

> During PostgreSQL installation, set a password for the `postgres` superuser (or create another user with database creation rights).

---

## 2. Database Preparation

1. Launch **pgAdmin** or use `psql` command line tool.
2. Connect with a user that can create databases (typically `postgres`).
3. Create the POS database:
   ```sql
   CREATE DATABASE "POS_DB";
   ```
4. Ensure the user you will use from Node.js has appropriate rights on `POS_DB` (or ability to create tables).

> When the backend starts it will create/patch all tables (Categories, Products, Sales, SaleItems, PaymentTypes) and add default payment types + sample category.

---

## 3. Configure Environment Variables

1. Navigate to the backend folder:
   ```bash
   cd backend
   cp .env.example .env    # if .env does not exist
   ```
2. Edit `.env` with your PostgreSQL credentials:
   ```ini
   DB_HOST=localhost
   DB_DATABASE=POS_DB
   DB_USER=postgres
   DB_PASSWORD=YourActualPassword
   DB_PORT=5432
   ```
3. Optional: set `PORT=3000` (default) or any other port for the backend API.

---

## 4. Install Dependencies

From the repository root:
```bash
npm run install:all
```
This installs packages for the root, backend, and frontend projects. If you prefer manual control:
```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

---

## 5. Start the Application

### Option A – Split Terminals (recommended during development)
```bash
# Terminal 1 – backend API
cd backend
npm run dev          # http://localhost:3000

# Terminal 2 – frontend UI
cd frontend
npm run dev          # http://localhost:5173
```

### Option B – Single command (if you have a root-level runner configured)
```bash
npm run dev
```

This starts the frontend, backend, and the cloud-backup scheduler simultaneously. Ensure rclone is installed/configured before using this option, or temporarily comment the backup command in `package.json`.

Open your browser to **http://localhost:5173** once both services are running.

---

## 6. Configure Backup Agents (Optional but Recommended)

### Cloud File Sync (rclone)

1. **Install rclone** – run `install-rclone.ps1` (Windows) or follow Appendix A below.
2. **Configure a remote** – `rclone config` (e.g., `drive:`, `onedrive:`, `dropbox:`).
3. **Edit `backup.config.js` (cloud section):**
   ```javascript
   cloud: {
     rcloneRemote: "drive:",
     localFolder: "C:\\Codes\\backup",
     cloudFolder: "Backups/",
     runOnStart: true,
     maxFilesToKeep: 7,
     daysToKeep: null
   }
   ```
4. **Test once:** `npm run backup:once`
5. **Run alongside dev:** `npm run dev` (already includes the backup scheduler) or start it with `npm run backup`.

> The scheduler uploads only new files and trims the remote directory to the newest `maxFilesToKeep` files, so it is safe to leave running indefinitely.

### PostgreSQL Dump Agent

1. Confirm `pg_dump` is installed and on PATH (ships with PostgreSQL). On Windows you may need to add `C:\Program Files\PostgreSQL\<version>\bin`.
2. Edit `backup.config.js` (postgres section):
   ```javascript
   postgres: {
     pgDumpPath: "pg_dump",
     dbHost: "localhost",
     dbPort: 5432,
     dbName: "POS_DB",
     dbUser: "postgres",
     dbPassword: "123",
     backupDir: "C:\\Codes\\postgres-backups",
     filePrefix: "pos-backup",
     maxBackups: 7,
     daysToKeep: 14,
     runOnStart: true,
     schedule: "0 12 * * *"
   }
   ```
3. Test the process: `npm run db:backup:once`
4. Keep it running via `npm run dev` (includes the scheduler) or start it independently with `npm run db:backup`.

> The agent writes timestamped `.sql` dumps using `pg_dump`, then prunes old files based on both age and count so your backup folder never grows unbounded.

---

## 7. First-Run Checklist

1. **Add a product** via the **Products** view. Upload an optional image—this will be saved as Base64 directly in PostgreSQL, no file storage required.
2. **Test the POS flow:** scan or search for the product, add it to the cart, mark VAT exclusion if needed, and apply an amount discount per line.
3. **Apply a cart discount** using the “Sale Discount (Amount)” input, then process the sale.
4. **Review the receipt** in the modal or from the **Sales** view; confirm VAT badges only appear when VAT is included.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `password authentication failed` | Verify `.env` credentials match your PostgreSQL user and password. Ensure the user has rights on `POS_DB`. |
| `database "POS_DB" does not exist` | Create the database manually using `CREATE DATABASE POS_DB;` in PostgreSQL. |
| `EADDRINUSE: address already in use` | Change backend `PORT` in `backend/.env` and/or frontend port in `frontend/vite.config.js`. |
| Base64 image rejected | The backend caps JSON bodies at 5 MB. Resize/compress the image before uploading. |
| Scanner does not add products | Verify the POS barcode input is focused and the scanner sends an Enter key press. |
| Tables missing after first run | Confirm the PostgreSQL user can create/alter tables. Check backend logs for detailed SQL errors. |

---

## Defaults & Seeds

- **Categories:** `General`
- **Payment Types:** `Cash`, `Juice`
- **Currency label:** `Rs`
- **VAT rate suggestion:** 15 % (adjust per product)

To change seeded data, edit `backend/database/init.js` before the first launch, or update records through the UI post-setup.

---

## Useful Commands

| Location | Command | Purpose |
| --- | --- | --- |
| Root | `npm run install:all` | Install dependencies across all workspaces |
| Backend | `npm run dev` | Start Express with watch mode |
| Backend | `npm start` | Start Express without watch (production) |
| Frontend | `npm run dev` | Start Vite development server |
| Frontend | `npm run build` | Create production build (dist/) |

---

## Appendix A – Install rclone on Windows

1. Download the Windows 64-bit ZIP from https://rclone.org/downloads/.
2. Extract the archive and move `rclone.exe` to `C:\rclone` (or another permanent folder).
3. Add that folder to the **Path** environment variable (System Properties → Advanced → Environment Variables).
4. Close and reopen PowerShell, then run `rclone version`.
5. Configure a remote: `rclone config` → create `drive:` / `onedrive:` / etc.
6. Update the `cloud.rcloneRemote` setting in `backup.config.js` to match the remote name (including the trailing colon).

> If you prefer automation, right-click `install-rclone.ps1` in the project root and select **Run with PowerShell**. After the script finishes, reopen your terminal before running `rclone version`.

---

Happy selling! Let the POS team know if you encounter setup issues or require additional seed data.

