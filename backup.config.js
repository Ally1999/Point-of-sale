/**
 * Unified backup configuration
 */

export default {
  cloud: {
    // Rclone remote name (configured via: rclone config)
    // Examples: "onedrive:", "gdrive:", "icloud:", "dropbox:"
    rcloneRemote: "drive:",

    // Local folder to backup (absolute path recommended)
    localFolder: "C:\\Codes\\backup",

    // Cloud folder path (relative to remote root). Use "" for root.
    cloudFolder: "Backups/",

    // Run backup immediately when script starts (true/false)
    runOnStart: true,

    // Maximum number of backup files to keep in cloud
    maxFilesToKeep: 7,

    // Number of days to keep files (set to null to disable age-based cleanup)
    daysToKeep: null
  },

  postgres: {
    // Path to pg_dump. Use absolute path if pg_dump is not in PATH.
    pgDumpPath: "C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe",

    // Database connection details
    dbHost: "localhost",
    dbPort: 5432,
    dbName: "POS_DB",
    dbUser: "postgres",
    dbPassword: "123",

    // Where to store backup files (will be created if missing)
    backupDir: "C:\\Codes\\backup",

    // Filename prefix for generated dumps
    filePrefix: "pos-backup",

    // Retention policy
    maxBackups: 7,
    daysToKeep: null,

    // Scheduler
    runOnStart: true,
    schedule: "0 12 * * *" // every day at noon (local time)
  }
};


