# Quick Guide: Installing rclone on Windows

## Option 1: Manual Download (Recommended - No Admin Required)

1. **Download rclone:**
   - Go to: https://rclone.org/downloads/
   - Click on "Windows 64-bit" to download the ZIP file

2. **Extract and Setup:**
   - Extract the ZIP file (you'll find `rclone.exe` inside)
   - Create a folder: `C:\rclone` (or any folder you prefer)
   - Move `rclone.exe` to that folder

3. **Add to PATH (Current User - No Admin Needed):**
   - Press `Win + R`, type `sysdm.cpl`, press Enter
   - Go to "Advanced" tab → Click "Environment Variables"
   - Under "User variables", find "Path" and click "Edit"
   - Click "New" and add: `C:\rclone` (or your folder path)
   - Click OK on all dialogs

4. **Verify:**
   - Close and reopen your terminal/PowerShell
   - Run: `rclone version`

# Option 2: Using the installation script (requires admin)

1. From the repository root (`Point-of-sale/`), right-click `install-rclone.ps1`
2. Select "Run with PowerShell" (or "Run as Administrator")
3. Follow the prompts
4. Close and reopen your terminal

## Option 3: Using winget (Windows 10/11)

1. Open PowerShell as Administrator
2. Run: `winget install Rclone.Rclone`
3. Accept the prompts when asked
4. Close and reopen your terminal

## Option 4: Using Scoop (If you have Scoop installed)

```powershell
scoop install rclone
```

## After Installation

1. **Close and reopen your terminal** (important for PATH to update)
2. Verify rclone is accessible:
   ```powershell
   rclone version
   ```
3. Configure a remote (OneDrive, Google Drive, etc.):
   ```powershell
   rclone config
   ```
4. Confirm it exists:
   ```powershell
   rclone listremotes
   # Expected output: drive:, onedrive:, dropbox:, ...
   ```
5. Match that name (including the trailing `:`) in `cloud-backup.config.js`.

## Troubleshooting

If `rclone` is still not recognized after adding to PATH:
- Make sure you closed and reopened your terminal
- Check the PATH: `$env:Path` (should include your rclone folder)
- Try the full path: `C:\rclone\rclone.exe version`

Need platform-specific help? See https://rclone.org/docs/ or follow the links in `Info/CLOUD_BACKUP_README.md`.

