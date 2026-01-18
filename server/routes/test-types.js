import { Router } from 'express';
import { getTestTypes, getTestType, getSubtype, getSubtypesForTestType, getRunsForSubtypes, getTestRun, getTestLogFiles, getLogContent } from '../db/database.js';

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

// GET /api/test-types/:id
router.get('/:id', (req, res) => {
  try {
    const result = getTestType(req.params.id);
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }
    res.json(result);
  } catch (error) {
    console.error('Error fetching test type:', error);
    res.status(500).json({
      error: 'Failed to fetch test type'
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

// GET /api/test-types/:typeId/subtypes/:subtypeId
router.get('/:typeId/subtypes/:subtypeId', (req, res) => {
  try {
    const result = getSubtype(req.params.subtypeId);
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }
    res.json(result);
  } catch (error) {
    console.error('Error fetching subtype:', error);
    res.status(500).json({
      error: 'Failed to fetch subtype'
    });
  }
});

// GET /api/test-types/:typeId/subtypes/:subtypeId/runs
router.get('/:typeId/subtypes/:subtypeId/runs', (req, res) => {
  try {
    const result = getRunsForSubtypes(req.params.subtypeId);
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }
    res.json(result);
  } catch (error) {
    console.error('Error fetching runs:', error);
    res.status(500).json({
      error: 'Failed to fetch runs'
    });
  }
});

// GET /api/test-types/:typeId/subtypes/:subtypeId/runs/:runId
router.get('/:typeId/subtypes/:subtypeId/runs/:runId', (req, res) => {
  try {
    const result = getTestRun(req.params.runId, req.params.subtypeId);
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }
    res.json(result);
  } catch (error) {
    console.error('Error fetching test run:', error);
    res.status(500).json({
      error: 'Failed to fetch test run'
    });
  }
});

// GET /api/test-types/:typeId/subtypes/:subtypeId/runs/:runId/test-logs/:testName
router.get('/:typeId/subtypes/:subtypeId/runs/:runId/test-logs/:testName', async (req, res) => {
  try {
    const result = await getTestLogFiles(req.params.runId, req.params.testName);
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }
    res.json(result);
  } catch (error) {
    console.error('Error fetching test log files:', error);
    res.status(500).json({
      error: 'Failed to fetch test log files'
    });
  }
});

// GET /api/test-types/:typeId/subtypes/:subtypeId/runs/:runId/test-logs/:testName/content
router.get('/:typeId/subtypes/:subtypeId/runs/:runId/test-logs/:testName/content', async (req, res) => {
  try {
    const { filePath } = req.query;
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    const result = await getLogContent(req.params.runId, req.params.testName, filePath);
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }
    res.json(result);
  } catch (error) {
    console.error('Error fetching log content:', error);
    res.status(500).json({
      error: 'Failed to fetch log content'
    });
  }
});

export default router;
