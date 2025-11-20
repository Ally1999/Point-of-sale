# Cloud Backup Script

A free, automated cloud backup helper for this POS project. It uses rclone to copy local files (e.g., daily exports, DB dumps, receipt PDFs) to the cloud on a schedule, and keeps the backup directory tidy.

---

## Features

- **One command** – `npm run dev` now runs the frontend, backend, and backup scheduler together.
- **Incremental uploads** – Only files missing in the cloud get copied (name + size comparison).
- **Retention policy** – Keep the newest `maxFilesToKeep` files (default 7) and optionally delete anything older than `daysToKeep` days.
- **rclone powered** – Works with Google Drive, OneDrive, Dropbox, iCloud, S3-compatible providers, etc.
- **Cross-platform** – Node.js 18+ script tested on Windows, macOS, and Linux.

---

## Prerequisites

1. **Node.js 18+** – already required for the POS stack.
2. **rclone** – install via:
   - Windows: run `install-rclone.ps1`, or download from https://rclone.org/downloads/
   - macOS: `brew install rclone`
   - Linux: `sudo apt install rclone` (or the equivalent for your distro)
3. **Configured remote** – run `rclone config` once and create a remote such as `drive:` or `onedrive:`.

Verify both tools:

```bash
node -v
rclone version
rclone listremotes   # should list your remote name(s)
```

---

## Configure `cloud-backup.config.js`

```javascript
export default {
  rcloneRemote: "drive:",      // must match the name from `rclone config`
  localFolder: "C:\\Codes\\backup", // absolute path to the folder you want to mirror
  cloudFolder: "Backups/",     // remote path; "" uploads to the remote root
  runOnStart: true,            // run immediately before scheduling
  maxFilesToKeep: 7,           // keep the newest N files
  daysToKeep: null             // set to a number (e.g., 14) to also delete by age
};
```

Tips:
- Use double backslashes (`C:\\path\\to\\folder`) on Windows.
- Leaving `cloudFolder` empty sends files to the remote root. With a value (e.g., `Backups/`), folders are created relative to the remote.
- Set `daysToKeep` to `null` to disable age-based cleanup.

---

## Usage

### During Development

Running the standard dev script launches everything (frontend, backend, backup scheduler):

```bash
npm run dev
```

Prefer separate windows? Start them individually:

```bash
npm run dev:backend
npm run dev:frontend
npm run backup
```

### One-off Backup

```bash
npm run backup:once
# or
node cloud-backup.js --once
```

### Persistent Scheduler Only

```bash
npm run backup
# equivalent to `node cloud-backup.js`
```

The scheduler:
- Runs immediately if `runOnStart` is true.
- Schedules a daily run at 13:00 (1 PM) server time.
- Keeps running until you stop it (Ctrl+C) or the process exits.

---

## How Retention Works

1. **Filter eligible local files** – optional age filter (`daysToKeep`) + limit to the newest `maxFilesToKeep`.
2. **Upload missing files** – compares by filename and size.
3. **Cloud cleanup** – deletes files older than `daysToKeep` days, then trims the directory so only `maxFilesToKeep` newest files remain.

This ensures you always have a fresh rolling window of backups without manual cleanup.

---

## Running as a Background Job (Optional)

- **Windows Task Scheduler** – point it at `node` with arguments `cloud-backup.js` and set the working directory to the repo root.
- **PM2**:
  ```bash
  npm install -g pm2
  pm2 start cloud-backup.js --name cloud-backup
  pm2 save
  pm2 startup
  ```

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `rclone: command not found` | Install rclone or reopen the terminal so PATH updates. |
| `Remote "drive:" not found` | Run `rclone listremotes`, make sure the `rcloneRemote` value matches exactly (including the trailing `:`). |
| Uploads create nested folders | Ensure `cloudFolder` does not contain duplicate slashes; the script normalizes paths but double-check configuration. |
| Files never delete | Set `daysToKeep` to a positive number or reduce `maxFilesToKeep`. |
| Permission denied | Run the shell with access to the local folder and confirm the remote account can write to the target directory. |

To inspect the remote directly:

```bash
rclone lsjson drive:Backups
rclone lsd drive:
```

---

## Security Notes

- rclone credentials live in `%APPDATA%\rclone\rclone.conf` (Windows) or `~/.config/rclone/rclone.conf` (macOS/Linux).
- Do not commit this file or share it publicly.
- The backup script only reads local files and writes to the remote; it never deletes local data.

---

## Need Help?

- rclone docs: https://rclone.org/docs/
- General install tips: `Info/INSTALL_RCLONE.md`
- Project-level questions: open an issue or ping the POS team.

Happy (and safe) backing up!

