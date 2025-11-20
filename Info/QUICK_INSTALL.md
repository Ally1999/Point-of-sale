
# Quick rclone Installation Guide

## The Issue
Your backup script needs rclone, but it's not installed yet. I've fixed the module warning in `package.json`, but you still need to install rclone.

## Easiest Method: Manual Download (5 minutes)

### Step 1: Download
1. Open your browser
2. Go to: **https://rclone.org/downloads/**
3. Click on **"Windows 64-bit"** (the ZIP file link)
4. Save it to your Downloads folder

### Step 2: Extract
1. Right-click the downloaded ZIP file
2. Select "Extract All..."
3. Extract to: `C:\rclone` (create this folder if needed)
4. You should have `C:\rclone\rclone.exe` after extraction

### Step 3: Add to PATH
1. Press `Win + R`
2. Type: `sysdm.cpl` and press Enter
3. Click **"Advanced"** tab
4. Click **"Environment Variables"**
5. Under **"User variables"**, find **"Path"** and click **"Edit"**
6. Click **"New"**
7. Type: `C:\rclone`
8. Click **OK** on all dialogs

### Step 4: Verify
1. **Close this terminal/PowerShell completely**
2. **Open a new terminal/PowerShell**
3. Run: `rclone version`

You should see rclone version information. If you see an error, make sure you:
- Closed and reopened the terminal
- Used the correct path in Step 3

## After Installation

Once rclone is installed:

1. **Configure your cloud storage:**
   ```bash
   rclone config
   ```
   - Follow the prompts to set up OneDrive, Google Drive, iCloud, etc.
   - When asked for a name, use something like `onedrive` or `gdrive`

2. **Update your config file:**
   - Edit `cloud-backup.config.js`
   - Set `rcloneRemote` to match your configured remote (e.g., `"onedrive:"`)

3. **Test the backup:**
   ```bash
   npm run backup:once
   ```

## Alternative: Use Scoop (if installed)

If you have Scoop package manager:
```powershell
scoop install rclone
```

## Alternative: Use Chocolatey (if installed)

If you have Chocolatey:
```powershell
choco install rclone
```

---

**Note:** The module type warning has been fixed. Once rclone is installed, your backup script will work perfectly!

