import { Router } from 'express';
import { getBackupStatus } from '../utils/backupStatusStore.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const status = await getBackupStatus();
    res.json(status);
  } catch (error) {
    console.error('Failed to load backup status:', error);
    res.status(500).json({ message: 'Failed to load backup status', error: error.message });
  }
});

export default router;


