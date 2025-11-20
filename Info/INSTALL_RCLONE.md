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

## Option 2: Using the Installation Script (Requires Admin)

1. Right-click `install-rclone.ps1`
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
2. Verify with: `rclone version`
3. Configure your cloud storage: `rclone config`

## Troubleshooting

If `rclone` is still not recognized after adding to PATH:
- Make sure you closed and reopened your terminal
- Check the PATH: `$env:Path` (should include your rclone folder)
- Try the full path: `C:\rclone\rclone.exe version`

