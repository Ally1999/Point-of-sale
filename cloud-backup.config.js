/**
 * Cloud Backup Configuration
 * 
 * Instructions:
 * 1. Install rclone: https://rclone.org/install/
 * 2. Configure your remote: rclone config
 *    - For OneDrive: Choose "onedrive" and follow setup
 *    - For Google Drive: Choose "drive" and follow setup
 *    - For iCloud: Choose "icloud" and follow setup
 * 3. Update the settings below
 */

export default {
  // Rclone remote name (configured via: rclone config)
  // Examples: "onedrive:", "gdrive:", "icloud:", "dropbox:"
  rcloneRemote: "drive:", // Change this to your configured remote name
  
  // Local folder to backup (absolute path recommended)
  localFolder: "C:\\Codes\\backup", // Change this to your folder
  
  // Cloud folder path (relative to remote root)
  // Leave empty string "" for root, or use "Backups/" for a subfolder
  cloudFolder: "Backups/", // Change this to your desired cloud folder
  
  // Run backup immediately when script starts (true/false)
  runOnStart: true,
  
  // Maximum number of backup files to keep in cloud
  // Oldest files beyond this count will be deleted (default: 7)
  maxFilesToKeep: 7,
  
  // Number of days to keep files (set to null to disable age-based cleanup)
  daysToKeep: null
};

