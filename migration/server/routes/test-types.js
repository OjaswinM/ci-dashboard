import { Router } from 'express';
import { getTestTypes, getSubtypesForTestType } from '../db/database.js';

const router = Router();

// GET /api/test-types
router.get('/', (req, res) => {
  try {
    const result = getTestTypes();
    res.json(result);
  } catch (error) {
    console.error('Error fetching test types:', error);
    res.status(500).json({
      error: 'Failed to fetch test types'
    });
  }
});

// GET /api/test-types/:id/subtypes
router.get('/:id/subtypes', (req, res) => {
  try {
    console.log('Getting subtypes for:', req.params.id); // Debug log
    const result = getSubtypesForTestType(req.params.id);
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }
    res.json(result);
  } catch (error) {
    console.error('Error fetching subtypes:', error);
    res.status(500).json({
      error: 'Failed to fetch subtypes'
    });
  }
});

export default router;
