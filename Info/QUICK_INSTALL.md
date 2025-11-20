# Quick Install

Use this checklist when you just need the Point-of-sale stack up and running fast (frontend, backend, and the optional rclone backup helper).

---

## 1. Requirements

| Tool | Min Version | Notes |
| --- | --- | --- |
| Node.js | 18.x | Ships with npm 9+ |
| PostgreSQL | 12+ | Any edition works |
| Git | Latest | Optional but recommended |
| rclone | Latest | Only required if you want cloud backups |

---

## 2. Clone & Install

```bash
git clone https://github.com/Ally1999/Point-of-sale.git
cd Point-of-sale
npm run install:all          # installs root, backend, frontend deps
```

---

## 3. Configure the Backend

```bash
cd backend
cp .env.example .env   # if needed
```

Edit `.env` with your PostgreSQL settings:

```ini
DB_HOST=localhost
DB_DATABASE=POS_DB
DB_USER=postgres
DB_PASSWORD=YourPassword
DB_PORT=5432
```

> First boot auto-creates tables, payment types, and the default category. Ensure the DB user can create/alter tables.

---

## 4. Start Developing

```bash
# top-level runner (frontend + backend + backup scheduler)
npm run dev
```

- Frontend: http://localhost:5173  
- Backend API: http://localhost:3000  
- Backup scheduler: runs `node cloud-backup.js` alongside dev servers (requires rclone)

Prefer split terminals? Run `npm run dev:backend`, `npm run dev:frontend`, and `npm run backup` separately.

---

## 5. Verify the App

1. Visit http://localhost:5173.
2. Create a product in **Products** (optional image uploads are stored as Base64).
3. Sell it through **POS**; apply line or cart discounts.
4. Confirm the sale in **Sales** and print a receipt.

---

## 6. (Optional) Enable Cloud Backups

1. Install rclone (see `Info/INSTALL_RCLONE.md` or run `install-rclone.ps1`).
2. Configure a remote: `rclone config` (e.g., `drive`, `onedrive`, etc.).
3. Update `cloud-backup.config.js` with:
   - `rcloneRemote`
   - `localFolder`
   - `cloudFolder`
   - `maxFilesToKeep` / `daysToKeep` (retention policy)
4. Test once: `npm run backup:once`

Once configured, `npm run dev` keeps the scheduler alive so new files land in the cloud automatically.

---

You're ready to work. For more detail, see `Info/SETUP.md` (full guide) and `Info/CLOUD_BACKUP_README.md` (backup deep dive).

