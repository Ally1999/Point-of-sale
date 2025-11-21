import { exec } from 'child_process';
import { promisify } from 'util';
import { readdir, stat, access } from 'fs/promises';
import { join, basename } from 'path';
import { constants } from 'fs';
import cron from 'node-cron';
import config from './backup.config.js';
import { updateBackupStatus } from './backend/utils/backupStatusStore.js';

const execAsync = promisify(exec);

async function safeUpdateCloudStatus(updates) {
  try {
    await updateBackupStatus('cloud', updates);
  } catch (error) {
    console.error('Failed to persist cloud backup status:', error.message);
  }
}

/**
 * Find rclone executable path
 */
async function findRclone() {
  const commonPaths = [
    'rclone', // In PATH
    'C:\\rclone\\rclone.exe',
    'C:\\Program Files\\rclone\\rclone.exe',
    'C:\\Codes\\rclone\\rclone.exe',
    process.env.LOCALAPPDATA ? `${process.env.LOCALAPPDATA}\\rclone\\rclone.exe` : null,
    process.env.ProgramFiles ? `${process.env.ProgramFiles}\\rclone\\rclone.exe` : null,
  ].filter(Boolean);

  for (const rclonePath of commonPaths) {
    try {
      if (rclonePath === 'rclone') {
        // Try to execute directly (if in PATH)
        await execAsync('rclone version');
        return 'rclone';
      } else {
        // Check if file exists
        await access(rclonePath, constants.F_OK);
        return rclonePath;
      }
    } catch (error) {
      // Continue to next path
      continue;
    }
  }
  
  return null;
}

/**
 * Cloud Backup Script
 * 
 * Features:
 * - Checks local files against cloud storage
 * - Copies missing files to cloud
 * - Runs daily at 1pm
 * - Deletes files older than 7 days (keeps minimum 7 files)
 * - Uses rclone for cloud storage operations
 */

class CloudBackup {
  constructor(config) {
    this.config = config;
    this.rcloneRemote = config.rcloneRemote; // e.g., "onedrive:", "gdrive:", "icloud:"
    this.localFolder = config.localFolder;
    this.cloudFolder = config.cloudFolder;
    this.maxFilesToKeep = Number.isFinite(config.maxFilesToKeep)
      ? config.maxFilesToKeep
      : (Number.isFinite(config.minFilesToKeep) ? config.minFilesToKeep : 7);
    this.daysToKeep = Number.isFinite(config.daysToKeep)
      ? config.daysToKeep
      : null;
    this.rclonePath = null; // Will be set when found
  }

  get shouldUseDaysFilter() {
    return Number.isFinite(this.daysToKeep) && this.daysToKeep > 0;
  }

  get shouldEnforceMax() {
    return Number.isFinite(this.maxFilesToKeep) && this.maxFilesToKeep >= 0;
  }

  /**
   * Filter and order local files that should be considered for upload
   */
  getEligibleLocalFiles(localFiles) {
    let filtered = [...localFiles];

    if (this.shouldUseDaysFilter) {
      const now = new Date();
      const cutoffDate = new Date(now.getTime() - (this.daysToKeep * 24 * 60 * 60 * 1000));
      filtered = filtered.filter(file => file.modified >= cutoffDate);
    }

    // Always sort newest first so we keep the freshest backups
    filtered.sort((a, b) => b.modified - a.modified);

    if (this.shouldEnforceMax && filtered.length > this.maxFilesToKeep) {
      filtered = filtered.slice(0, this.maxFilesToKeep);
    }

    return filtered;
  }

  /**
   * Build normalized remote path
   */
  buildRemotePath(...segments) {
    const base = this.rcloneRemote.endsWith(':')
      ? this.rcloneRemote
      : `${this.rcloneRemote}:`;

    const parts = segments
      .filter(segment => typeof segment === 'string')
      .flatMap(segment =>
        segment
          .split(/[\\/]+/)
          .map(part => part.trim())
          .filter(Boolean)
      );

    if (parts.length === 0) {
      return base;
    }

    return `${base}${parts.join('/')}`;
  }

  /**
   * Find and set rclone path
   */
  async initializeRclone() {
    if (!this.rclonePath) {
      this.rclonePath = await findRclone();
      if (!this.rclonePath) {
        throw new Error('rclone not found. Please install rclone from https://rclone.org/install/');
      }
    }
    return this.rclonePath;
  }

  /**
   * Execute rclone command
   */
  async runRcloneCommand(command) {
    try {
      // Ensure rclone path is found
      if (!this.rclonePath) {
        await this.initializeRclone();
      }
      
      const { stdout, stderr } = await execAsync(`${this.rclonePath} ${command}`);
      if (stderr && !stderr.includes('INFO')) {
        console.warn('Rclone warning:', stderr);
      }
      return stdout.trim();
    } catch (error) {
      throw new Error(`Rclone command failed: ${error.message}`);
    }
  }

  /**
   * Check if rclone is installed and configured
   */
  async checkRcloneSetup() {
    try {
      // Find rclone first
      await this.initializeRclone();
      console.log(`✓ Rclone is installed (found at: ${this.rclonePath})`);
      
      // Check if remote is configured
      const remotes = await this.runRcloneCommand('listremotes');
      if (!remotes.includes(this.rcloneRemote)) {
        throw new Error(`Remote "${this.rcloneRemote}" not found. Please configure it with: rclone config`);
      }
      console.log(`✓ Remote "${this.rcloneRemote}" is configured`);
      return true;
    } catch (error) {
      console.error('✗ Rclone setup error:', error.message);
      if (!this.rclonePath) {
        console.error('\nPlease install rclone from: https://rclone.org/install/');
      }
      console.error('Then configure your remote with: rclone config');
      return false;
    }
  }

  /**
   * Get list of files from local folder
   */
  async getLocalFiles() {
    try {
      const files = await readdir(this.localFolder);
      const fileDetails = [];
      
      for (const file of files) {
        const filePath = join(this.localFolder, file);
        const stats = await stat(filePath);
        if (stats.isFile()) {
          fileDetails.push({
            name: file,
            path: filePath,
            size: stats.size,
            modified: stats.mtime
          });
        }
      }
      
      return fileDetails;
    } catch (error) {
      throw new Error(`Failed to read local folder: ${error.message}`);
    }
  }

  /**
   * Get list of files from cloud storage
   */
  async getCloudFiles() {
    try {
      const remotePath = this.buildRemotePath(this.cloudFolder);
      const output = await this.runRcloneCommand(`lsjson "${remotePath}"`);
      
      if (!output) {
        return [];
      }
      
      const files = JSON.parse(output);
      return files
        .filter(item => !item.IsDir)
        .map(item => ({
          name: basename(item.Path),
          size: item.Size,
          modified: new Date(item.ModTime)
        }));
    } catch (error) {
      // If folder doesn't exist, return empty array
      if (error.message.includes('directory not found') || error.message.includes('doesn\'t exist')) {
        return [];
      }
      throw error;
    }
  }

  /**
   * Check if file exists in cloud
   */
  fileExistsInCloud(localFile, cloudFiles) {
    return cloudFiles.some(
      cloudFile => cloudFile.name === localFile.name && cloudFile.size === localFile.size
    );
  }

  /**
   * Copy file to cloud storage
   */
  async copyFileToCloud(localFile) {
    try {
      const remotePath = this.buildRemotePath(this.cloudFolder, localFile.name);
      console.log(`  Copying ${localFile.name} to cloud...`);

      await this.runRcloneCommand(`copyto "${localFile.path}" "${remotePath}"`);
      console.log(`  ✓ Successfully copied ${localFile.name}`);
      return true;
    } catch (error) {
      console.error(`  ✗ Failed to copy ${localFile.name}:`, error.message);
      return false;
    }
  }

  /**
   * Get files from cloud with full details for deletion
   */
  async getCloudFilesForDeletion() {
    try {
      const remotePath = this.buildRemotePath(this.cloudFolder);
      const output = await this.runRcloneCommand(`lsjson "${remotePath}"`);
      
      if (!output) {
        return [];
      }
      
      const files = JSON.parse(output);
      return files
        .filter(item => !item.IsDir)
        .map(item => ({
          name: basename(item.Path),
          path: this.buildRemotePath(this.cloudFolder, item.Path),
          size: item.Size,
          modified: new Date(item.ModTime)
        }))
        .sort((a, b) => b.modified - a.modified); // Sort by date, newest first
    } catch (error) {
      if (error.message.includes('directory not found') || error.message.includes('doesn\'t exist')) {
        return [];
      }
      throw error;
    }
  }

  /**
   * Delete old files from cloud (keeps minimum 7 files)
   */
  async deleteOldFiles() {
    try {
      console.log('\n--- Cleaning up old files ---');
      const cloudFiles = await this.getCloudFilesForDeletion();
      const filesMarkedForDeletion = new Map();

      if (this.shouldUseDaysFilter) {
        const now = new Date();
        const cutoffDate = new Date(now.getTime() - (this.daysToKeep * 24 * 60 * 60 * 1000));
        for (const file of cloudFiles) {
          if (file.modified < cutoffDate) {
            filesMarkedForDeletion.set(file.path, file);
          }
        }
      }

      if (this.shouldEnforceMax) {
        const remaining = cloudFiles.filter(file => !filesMarkedForDeletion.has(file.path));
        if (remaining.length > this.maxFilesToKeep) {
          const overflow = remaining.slice(this.maxFilesToKeep); // cloudFiles already sorted by date desc
          for (const file of overflow) {
            filesMarkedForDeletion.set(file.path, file);
          }
        }
      }

      if (filesMarkedForDeletion.size === 0) {
        console.log('  No old files to delete.');
        return;
      }

      const filesToDelete = Array.from(filesMarkedForDeletion.values()).sort(
        (a, b) => a.modified - b.modified
      );
      console.log(`  Deleting ${filesToDelete.length} file(s) to enforce retention policy.`);
      
      for (const file of filesToDelete) {
        try {
          await this.runRcloneCommand(`delete "${file.path}"`);
          console.log(`  ✓ Deleted ${file.name} (${file.modified.toLocaleDateString()})`);
        } catch (error) {
          console.error(`  ✗ Failed to delete ${file.name}:`, error.message);
        }
      }
    } catch (error) {
      console.error('Error during cleanup:', error.message);
    }
  }

  /**
   * Main backup process
   */
  async performBackup() {
    const startedAt = new Date();
    const startedAtIso = startedAt.toISOString();
    
    await safeUpdateCloudStatus({
      status: 'running',
      lastRun: startedAtIso,
      message: 'Cloud backup in progress'
    });

    console.log('\n========================================');
    console.log(`Cloud Backup Started: ${new Date().toLocaleString()}`);
    console.log('========================================\n');

    // Check rclone setup
    const isSetup = await this.checkRcloneSetup();
    if (!isSetup) {
      console.error('\n✗ Backup aborted: Rclone not properly configured');
      await safeUpdateCloudStatus({
        status: 'failed',
        lastRun: startedAtIso,
        lastFailure: new Date().toISOString(),
        errorMessage: 'Rclone not properly configured',
        message: 'Rclone setup incomplete'
      });
      return;
    }

    try {
      // Get file lists
      console.log('--- Checking files ---');
      const localFiles = await this.getLocalFiles();
      const eligibleLocalFiles = this.getEligibleLocalFiles(localFiles);
      const cloudFiles = await this.getCloudFiles();
      
      console.log(`  Local files: ${localFiles.length}`);
      if (eligibleLocalFiles.length !== localFiles.length) {
        console.log(`  Eligible for upload: ${eligibleLocalFiles.length}`);
      }
      console.log(`  Cloud files: ${cloudFiles.length}`);

      // Find missing files
      const missingFiles = eligibleLocalFiles.filter(
        localFile => !this.fileExistsInCloud(localFile, cloudFiles)
      );

      if (missingFiles.length === 0) {
        console.log('\n✓ All files are already in cloud storage.');
      } else {
        console.log(`\n--- Copying ${missingFiles.length} missing file(s) ---`);
        let successCount = 0;
        
        for (const file of missingFiles) {
          const success = await this.copyFileToCloud(file);
          if (success) successCount++;
        }
        
        console.log(`\n✓ Copied ${successCount} of ${missingFiles.length} file(s) to cloud.`);
      }

      // Clean up old files
      await this.deleteOldFiles();

      console.log('\n========================================');
      console.log('Cloud Backup Completed Successfully');
      console.log('========================================\n');

      await safeUpdateCloudStatus({
        status: 'success',
        lastRun: startedAtIso,
        lastSuccess: new Date().toISOString(),
        errorMessage: null,
        message: missingFiles.length === 0
          ? 'No new files needed upload'
          : `Uploaded ${missingFiles.length} file(s) and applied retention policy`
      });
    } catch (error) {
      console.error('\n✗ Backup failed:', error.message);
      console.error(error.stack);
      await safeUpdateCloudStatus({
        status: 'failed',
        lastRun: startedAtIso,
        lastFailure: new Date().toISOString(),
        errorMessage: error.message,
        message: error.message || 'Cloud backup failed'
      });
    }
  }

  /**
   * Start the scheduled backup
   */
  startScheduler() {
    const schedule = this.config.schedule || '0 13 * * *';
    
    console.log('Cloud Backup Scheduler Started');
    console.log(`Schedule: ${schedule}`);
    console.log('Waiting for scheduled time...\n');
    
    // Run immediately on start (optional - remove if you only want scheduled runs)
    if (this.config.runOnStart) {
      console.log('Running initial backup...');
      this.performBackup();
    }
    
    // Schedule daily runs
    cron.schedule(schedule, () => {
      this.performBackup();
    });
  }
}

// Main execution
const cloudConfig = config?.cloud ?? {};

if (cloudConfig.enabled === false) {
  console.log('Cloud backup disabled via backup.config.js.');
  process.exit(0);
}

const backup = new CloudBackup(cloudConfig);

// Run once if --once flag is provided
if (process.argv.includes('--once')) {
  backup.performBackup().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
} else {
  // Start scheduler (default behavior)
  backup.startScheduler();
  
  // Keep process alive
  process.on('SIGINT', () => {
    console.log('\n\nShutting down cloud backup scheduler...');
    process.exit(0);
  });
}

export default CloudBackup;

