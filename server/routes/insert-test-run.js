import { Router } from 'express';
import { ingestTestRun } from '../db/database.js';

const router = Router();

// POST /api/insert-test-run
router.post('/', async (req, res) => {
  try {
    console.log('Ingesting test run:', JSON.stringify(req.body, null, 2));
    const result = ingestTestRun(req.body);
    console.log('Ingest result:', result);
    if (result.error) {
      console.log('Returning error:', result.error);
      return res.status(result.status).json({ error: result.error });
    }
    res.json(result);
  } catch (error) {
    console.error('Error ingesting test run:', error);
    res.status(500).json({
      error: error.message || 'Failed to ingest test run data'
    });
  }
});

export default router;
