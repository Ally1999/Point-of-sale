import { spawn } from 'child_process';
import { mkdir, readdir, stat, unlink } from 'fs/promises';
import { createWriteStream } from 'fs';
import { join } from 'path';
import cron from 'node-cron';
import backupConfig from './backup.config.js';
import { updateBackupStatus } from './backend/utils/backupStatusStore.js';

const config = backupConfig?.postgres ?? {};

if (config.enabled === false) {
  console.log('PostgreSQL backup disabled via backup.config.js.');
  process.exit(0);
}

async function safeUpdateDbStatus(updates) {
  try {
    await updateBackupStatus('postgres', updates);
  } catch (error) {
    console.error('Failed to persist DB backup status:', error.message);
  }
}

/**
 * Ensure the backup directory exists
 */
async function ensureBackupDir() {
  await mkdir(config.backupDir, { recursive: true });
}

/**
 * Build backup filename using timestamp
 */
function buildBackupFilename() {
  const now = new Date();
  const parts = [
    config.filePrefix,
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0')
  ];
  return `${parts.join('-')}.sql`;
}

/**
 * Run pg_dump and write to file
 */
async function runPgDump(outputPath) {
  const args = [
    `--host=${config.dbHost}`,
    `--port=${config.dbPort}`,
    `--username=${config.dbUser}`,
    `--format=plain`,
    `--clean`,
    config.dbName
  ];

  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      PGPASSWORD: config.dbPassword ?? process.env.PGPASSWORD
    };

    const dumpProcess = spawn(config.pgDumpPath, args, { env, shell: false });
    const writeStream = createWriteStream(outputPath, { encoding: 'utf8' });

    dumpProcess.stdout.pipe(writeStream);
    dumpProcess.stderr.on('data', data => {
      process.stderr.write(data);
    });

    dumpProcess.on('error', error => {
      writeStream.destroy();
      reject(new Error(`Failed to start pg_dump: ${error.message}`));
    });

    dumpProcess.on('close', code => {
      writeStream.end();
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`pg_dump exited with code ${code}`));
      }
    });
  });
}

/**
 * Cleanup old backups based on retention rules
 */
async function cleanupBackups() {
  const entries = await readdir(config.backupDir);
  const backupFiles = [];

  for (const entry of entries) {
    if (!entry.endsWith('.sql') || !entry.startsWith(config.filePrefix)) {
      continue;
    }
    const filePath = join(config.backupDir, entry);
    const stats = await stat(filePath);
    if (!stats.isFile()) continue;
    backupFiles.push({ filePath, mtime: stats.mtime });
  }

  if (backupFiles.length === 0) {
    return;
  }

  backupFiles.sort((a, b) => b.mtime - a.mtime); // newest first
  const filesToDelete = new Set();

  if (Number.isFinite(config.daysToKeep) && config.daysToKeep > 0) {
    const cutoff = Date.now() - (config.daysToKeep * 24 * 60 * 60 * 1000);
    for (const file of backupFiles) {
      if (file.mtime.getTime() < cutoff) {
        filesToDelete.add(file.filePath);
      }
    }
  }

  if (Number.isFinite(config.maxBackups) && config.maxBackups >= 0) {
    const overflow = backupFiles.slice(config.maxBackups);
    for (const file of overflow) {
      filesToDelete.add(file.filePath);
    }
  }

  for (const filePath of filesToDelete) {
    try {
      await unlink(filePath);
      console.log(`✂️  Deleted old backup: ${filePath}`);
    } catch (error) {
      console.error(`Failed to delete ${filePath}:`, error.message);
    }
  }
}

/**
 * Perform one full backup cycle
 */
async function performBackup() {
  const startedAt = new Date();
  const startedAtIso = startedAt.toISOString();

  await safeUpdateDbStatus({
    status: 'running',
    lastRun: startedAtIso,
    message: 'Database backup in progress'
  });

  console.log('\n=== PostgreSQL Backup ===');
  console.log(`Start: ${new Date().toLocaleString()}`);

  try {
    await ensureBackupDir();
    const filename = buildBackupFilename();
    const fullPath = join(config.backupDir, filename);

    console.log(`→ Writing dump to ${fullPath}`);
    await runPgDump(fullPath);
    console.log('✓ Backup completed successfully');

    await cleanupBackups();
    console.log('✓ Cleanup complete');

    await safeUpdateDbStatus({
      status: 'success',
      lastRun: startedAtIso,
      lastSuccess: new Date().toISOString(),
      errorMessage: null,
      message: `Backup saved to ${filename}`
    });
  } catch (error) {
    console.error('✗ Backup failed:', error.message);
    await safeUpdateDbStatus({
      status: 'failed',
      lastRun: startedAtIso,
      lastFailure: new Date().toISOString(),
      errorMessage: error.message,
      message: error.message || 'Database backup failed'
    });
  } finally {
    console.log(`End: ${new Date().toLocaleString()}`);
    console.log('==========================\n');
  }
}

/**
 * Start scheduler
 */
function startScheduler() {
  console.log('PostgreSQL backup scheduler running');
  console.log(`Cron schedule: ${config.schedule} (local time)`);

  if (config.runOnStart) {
    performBackup();
  }

  cron.schedule(config.schedule, () => {
    performBackup();
  });
}

if (process.argv.includes('--once')) {
  performBackup().then(() => process.exit(0)).catch(() => process.exit(1));
} else {
  startScheduler();
}


