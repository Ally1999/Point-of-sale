# Cloud Backup Script

A free, automated cloud backup solution using rclone that syncs your local files to cloud storage (OneDrive, Google Drive, iCloud, etc.) and automatically manages old files.

## Features

✅ **Checks files** - Compares local files with cloud storage  
✅ **Copies missing files** - Automatically uploads new files  
✅ **Runs daily at 1pm** - Scheduled automatic backups  
✅ **Smart cleanup** - Deletes files older than 7 days, but always keeps at least 7 files  
✅ **Uses rclone** - Free, open-source tool for cloud storage  
✅ **100% Free** - Works with personal accounts, no paid services required  

## Prerequisites

1. **Node.js** (v14 or higher) - Already installed in your project
2. **rclone** - Free command-line tool for cloud storage

## Installation

### Step 1: Install rclone

**Windows (Easiest - Automated Script):**
1. Right-click on `install-rclone.ps1` in this folder
2. Select "Run with PowerShell" (may need to run as Administrator)
3. The script will download and install rclone automatically
4. Close and reopen your terminal after installation

**Windows (Manual Methods):**
1. Download from: https://rclone.org/downloads/
   - Download the Windows 64-bit ZIP file
   - Extract `rclone.exe` to a folder (e.g., `C:\Program Files\rclone`)
   - Add that folder to your system PATH
2. Or use Chocolatey: `choco install rclone` (requires Chocolatey)
3. Or use Scoop: `scoop install rclone` (requires Scoop)
4. Or use winget: `winget install Rclone.Rclone` (Windows 10/11)

**macOS:**
```bash
brew install rclone
```

**Linux:**
```bash
# Most distributions
sudo apt install rclone
# or
sudo yum install rclone
```

Verify installation:
```bash
rclone version
```

### Step 2: Configure rclone Remote

Run the configuration wizard:
```bash
rclone config
```

**For OneDrive (Personal):**
1. Choose `n` for new remote
2. Name it `onedrive` (or any name you prefer)
3. Select `onedrive` from the list
4. Choose `onedrive` (not business)
5. Follow the prompts to authenticate with your Microsoft account
6. Leave other settings as default

**For Google Drive (Personal):**
1. Choose `n` for new remote
2. Name it `gdrive` (or any name you prefer)
3. Select `drive` from the list
4. Follow the prompts to authenticate with your Google account
5. Leave other settings as default

**For iCloud Drive:**
1. Choose `n` for new remote
2. Name it `icloud` (or any name you prefer)
3. Select `icloud` from the list
4. Follow the prompts to authenticate with your Apple ID
5. Leave other settings as default

**For Dropbox:**
1. Choose `n` for new remote
2. Name it `dropbox` (or any name you prefer)
3. Select `dropbox` from the list
4. Follow the prompts to authenticate with your Dropbox account
5. Leave other settings as default

After configuration, verify your remote:
```bash
rclone listremotes
```

You should see your configured remote (e.g., `onedrive:`)

### Step 3: Install Node.js Dependencies

```bash
npm install
```

This will install `node-cron` for scheduling.

### Step 4: Configure the Backup Script

Edit `cloud-backup.config.js`:

```javascript
export default {
  rcloneRemote: "onedrive:",  // Change to your remote name (e.g., "gdrive:", "icloud:")
  localFolder: "C:\\Users\\YourUsername\\Documents\\BackupFolder",  // Your local folder path
  cloudFolder: "Backups",  // Cloud folder name (or "" for root)
  runOnStart: true,  // Run immediately when started
  minFilesToKeep: 7,  // Always keep at least 7 files
  daysToKeep: 7  // Delete files older than 7 days
};
```

**Important:** Use absolute paths for `localFolder` on Windows (e.g., `C:\\Users\\...`)

## Usage

### Run Once (Test)

Test the backup without scheduling:
```bash
node cloud-backup.js --once
```

### Run with Scheduler (Daily at 1pm)

Start the script and it will run daily at 1:00 PM:
```bash
node cloud-backup.js
```

The script will:
- Run immediately if `runOnStart: true`
- Schedule daily runs at 1:00 PM
- Keep running until you stop it (Ctrl+C)

### Run as Windows Service (Optional)

To run automatically in the background on Windows, you can use:

1. **Task Scheduler** (Built-in Windows tool):
   - Open Task Scheduler
   - Create Basic Task
   - Trigger: "When the computer starts"
   - Action: "Start a program"
   - Program: `node`
   - Arguments: `C:\Codes\Point-of-sale\cloud-backup.js`
   - Start in: `C:\Codes\Point-of-sale`

2. **PM2** (Process Manager):
   ```bash
   npm install -g pm2
   pm2 start cloud-backup.js --name cloud-backup
   pm2 save
   pm2 startup
   ```

## How It Works

1. **File Checking**: Compares local files with cloud files by name and size
2. **Uploading**: Only uploads files that don't exist in cloud or have different sizes
3. **Cleanup**: 
   - Finds files older than 7 days
   - Deletes them, but **always keeps at least 7 files**
   - If deleting would leave fewer than 7 files, it keeps the newest files

## Troubleshooting

### "Rclone not found"
- Make sure rclone is installed and in your PATH
- On Windows, you may need to restart your terminal after installation

### "Remote not found"
- Run `rclone listremotes` to see configured remotes
- Make sure the remote name in config matches (including the `:` at the end)

### "Permission denied"
- Check that you have read access to the local folder
- Check that rclone has write access to your cloud storage

### "Authentication failed"
- Re-authenticate: `rclone config`
- For OneDrive/Google Drive, you may need to re-authorize the app

### Files not uploading
- Check your internet connection
- Verify the cloud folder path is correct
- Check rclone logs: `rclone lsd yourremote:`

## Testing Your Setup

1. **Test rclone connection:**
   ```bash
   rclone lsd onedrive:  # Replace with your remote name
   ```

2. **Test file copy:**
   ```bash
   rclone copy "test.txt" "onedrive:Backups/"
   ```

3. **Test the script:**
   ```bash
   node cloud-backup.js --once
   ```

## Security Notes

- rclone stores credentials in `%APPDATA%\rclone\rclone.conf` (Windows) or `~/.config/rclone/rclone.conf` (Linux/Mac)
- This file is encrypted by default
- Never share your rclone config file
- The backup script only reads from your local folder and writes to cloud - it never deletes local files

## Customization

### Change Schedule Time

Edit `cloud-backup.js`, find this line:
```javascript
const schedule = '0 13 * * *';  // 1:00 PM daily
```

Cron format: `minute hour day month weekday`
- `0 13 * * *` = 1:00 PM daily
- `0 9 * * *` = 9:00 AM daily
- `0 13 * * 1` = 1:00 PM every Monday

### Change Retention Policy

Edit `cloud-backup.config.js`:
```javascript
minFilesToKeep: 10,  // Keep at least 10 files
daysToKeep: 14  // Keep files for 14 days
```

## Support

For rclone issues, visit: https://rclone.org/docs/  
For rclone configuration help: https://rclone.org/docs/#configure

## License

Free to use for personal and commercial purposes.

