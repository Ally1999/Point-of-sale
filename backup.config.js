export default {
  postgres: {
    dbHost: "localhost",
    dbPort: 5432,
    dbName: "POS_DB",
    dbUser: "postgres",
    dbPassword: "123",

    enabled: true,
    pgDumpPath: "C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe",
    backupDir: "C:\\Codes\\backup",
    filePrefix: "pos-backup",
    maxBackups: 7,
    daysToKeep: null,
    runOnStart: false,
    schedule: "0 16 * * *"
  },
  cloud: {
    enabled: true,
    rcloneRemote: "drive:",
    localFolder: "C:\\Codes\\backup",
    cloudFolder: "Backups/",
    schedule: "0 17 * * *",
    runOnStart: false,
    maxFilesToKeep: 7,
    daysToKeep: null
  }
};


