export default {
  cloud: {
    rcloneRemote: "drive:",
    localFolder: "C:\\Codes\\backup",
    cloudFolder: "Backups/",
    schedule: "0 13 * * *",
    runOnStart: false,
    maxFilesToKeep: 7,
    daysToKeep: null
  },

  postgres: {
    pgDumpPath: "C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe",

    dbHost: "localhost",
    dbPort: 5432,
    dbName: "POS_DB",
    dbUser: "postgres",
    dbPassword: "123",

    backupDir: "C:\\Codes\\backup",
    filePrefix: "pos-backup",
    maxBackups: 7,
    daysToKeep: null,
    runOnStart: false,
    schedule: "0 12 * * *"
  }
};


