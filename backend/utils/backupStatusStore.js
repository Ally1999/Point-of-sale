import { readFile, writeFile, mkdir, rename, rm } from 'fs/promises';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const statusFilePath = fileURLToPath(new URL('../../backup-status.json', import.meta.url));
const validTypes = new Set(['cloud', 'postgres']);

function createDefaultEntry() {
  return {
    status: 'unknown',
    lastRun: null,
    lastSuccess: null,
    lastFailure: null,
    message: null,
    errorMessage: null,
    updatedAt: null
  };
}

function createDefaultStatus() {
  return {
    cloud: createDefaultEntry(),
    postgres: createDefaultEntry()
  };
}

async function ensureStatusFileDir() {
  await mkdir(dirname(statusFilePath), { recursive: true });
}

async function readStatusFile() {
  try {
    const raw = await readFile(statusFilePath, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      cloud: { ...createDefaultEntry(), ...(parsed.cloud ?? {}) },
      postgres: { ...createDefaultEntry(), ...(parsed.postgres ?? {}) }
    };
  } catch (error) {
    if (error.code !== 'ENOENT' && !(error instanceof SyntaxError)) {
      throw error;
    }

    const defaults = createDefaultStatus();
    await ensureStatusFileDir();
    await writeStatusFile(defaults);
    return defaults;
  }
}

async function writeStatusFile(status) {
  await ensureStatusFileDir();
  const tempPath = `${statusFilePath}.tmp-${process.pid}-${Date.now()}`;
  const data = JSON.stringify(status, null, 2);
  await writeFile(tempPath, data);

  try {
    await rm(statusFilePath, { force: true });
  } catch (error) {
    if (error.code !== 'ENOENT') {
      await rm(tempPath, { force: true });
      throw error;
    }
  }

  try {
    await rename(tempPath, statusFilePath);
  } catch (error) {
    await rm(tempPath, { force: true });
    throw error;
  }
}

export async function getBackupStatus() {
  return readStatusFile();
}

export async function updateBackupStatus(type, updates = {}) {
  if (!validTypes.has(type)) {
    throw new Error(`Invalid backup type "${type}"`);
  }

  const status = await readStatusFile();
  status[type] = {
    ...status[type],
    ...updates,
    updatedAt: new Date().toISOString()
  };

  await writeStatusFile(status);
  return status[type];
}


