import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import { fileHandler } from '../lib/logs/file-handler.js';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize the database connection
const db = new Database(path.join(__dirname, 'dev.db'), { verbose: console.log });

// Get all test types with their subtypes count
export function getTestTypes() {
  return getTestTypesQuery();
}

// Get a single test type by ID
export function getTestType(id) {
  const result = getTestTypesQuery(id);
  if (!result.items.length) {
    return { error: 'Test type not found', status: 404 };
  }
  return { testType: result.items[0] };
}

// Shared query function for getting test types
function getTestTypesQuery(id = null) {
  let query = `
    SELECT 
      tt.id,
      tt.name,
      tt.description,
      COUNT(ts.id) as subtypeCount
    FROM TestType tt
    LEFT JOIN TestSubtype ts ON tt.id = ts.testTypeId`;
    
  if (id) {
    query += ' WHERE tt.id = ?';
  }
  
  query += `
    GROUP BY tt.id
    ORDER BY tt.name ASC
  `;

  const items = id ? db.prepare(query).all(id) : db.prepare(query).all();
  return { items };
}

// Get a single subtype's details
export function getSubtype(subtypeId) {
  const subtype = db.prepare(`
    SELECT 
      ts.id,
      ts.name,
      ts.description,
      tt.id as testTypeId,
      tt.name as testTypeName
    FROM TestSubtype ts
    JOIN TestType tt ON ts.testTypeId = tt.id
    WHERE ts.id = ?
  `).get(subtypeId);

  if (!subtype) {
    return { error: 'Subtype not found', status: 404 };
  }

  return { subtype };
}

// Get subtypes for a specific test type
export function getSubtypesForTestType(testTypeId) {
  // First check if test type exists
  const testType = db.prepare('SELECT id FROM TestType WHERE id = ?').get(testTypeId);
  
  if (!testType) {
    return { error: 'Test type not found', status: 404 };
  }

  // Get all subtypes for this test type
  const subtypes = db.prepare(`
    SELECT 
      id,
      name,
      description
    FROM TestSubtype
    WHERE testTypeId = ?
    ORDER BY name ASC
  `).all(testTypeId);

  return { subtypes };
}

// Get test runs for a specific subtype
export function getRunsForSubtypes(subtypeId) {
  // First check if subtype exists
  const subtype = db.prepare('SELECT id FROM TestSubtype WHERE id = ?').get(subtypeId);
  
  if (!subtype) {
    return { error: 'Subtype not found', status: 404 };
  }

  // Get all test runs for this subtype with their environment and stats
  const runs = db.prepare(`
    SELECT 
      tr.id,
      tr.label,
      tr.totalTests,
      tr.passedTests,
      tr.failedTests,
      tr.totalDuration,
      tr.createdAt,
      te.vmlinuxPath,
      te.configPath,
      te.distro,
      te.kernelRelease,
      te.architecture,
      te.configName
    FROM TestRun tr
    LEFT JOIN TestEnvironment te ON tr.id = te.testRunId
    WHERE tr.testSubtypeId = ?
    ORDER BY tr.createdAt DESC
  `).all(subtypeId);

  return { runs };
}

// Get a single test run with all its details
export function getTestRun(runId, subtypeId) {
  // First check if test run exists for this subtype
  const run = db.prepare(`
    SELECT 
      tr.id,
      tr.label,
      tr.totalTests,
      tr.passedTests,
      tr.failedTests,
      tr.totalDuration,
      tr.createdAt,
      te.vmlinuxPath,
      te.configPath,
      te.distro,
      te.kernelRelease,
      te.architecture,
      te.configName
    FROM TestRun tr
    LEFT JOIN TestEnvironment te ON tr.id = te.testRunId
    WHERE tr.id = ? AND tr.testSubtypeId = ?
  `).get(runId, subtypeId);

  if (!run) {
    return { error: 'Test run not found', status: 404 };
  }

  // Get test results for this run
  const results = db.prepare(`
    SELECT
      tr.id,
      tr.name,
      tr.status,
      tr.duration,
      tr.errorMessage,
      tr.hasLog,
      tl.logPath
    FROM TestResult tr
    LEFT JOIN TestLog tl ON tr.id = tl.testResultId
    WHERE tr.testRunId = ?
    ORDER BY tr.name ASC, tr.status DESC, tr.duration DESC
  `).all(runId);

  return {
    run: {
      ...run,
      results,
      stats: {
        totalTests: run.totalTests,
        passedTests: run.passedTests,
        failedTests: run.failedTests,
        totalDuration: run.totalDuration,
        passRate: run.totalTests > 0 ? (run.passedTests / run.totalTests) * 100 : 0
      },
      environment: run.kernelRelease ? {
        vmlinuxPath: run.vmlinuxPath,
        configPath: run.configPath,
        distro: run.distro,
        kernelRelease: run.kernelRelease,
        architecture: run.architecture,
        configName: run.configName
      } : null
    }
  };
}

// Ingest test run data
import fs from 'fs/promises';

// Get log files for a specific test in a test run
export async function getTestLogFiles(runId, testName) {
  // First get the log path from the database
  const result = db.prepare(`
    SELECT tl.logPath
    FROM TestLog tl
    JOIN TestResult tr ON tr.id = tl.testResultId
    WHERE tr.testRunId = ? AND tr.name = ?
  `).get(runId, testName);

  if (!result?.logPath) {
    return { error: 'No log files found', status: 404 };
  }

  try {
    const files = await fileHandler.getLogFiles(result.logPath);
    return { files };
  } catch (error) {
    console.error('Error getting log files:', error);
    return { error: 'Failed to access log files', status: 500 };
  }
}

// Get content of a specific log file
export async function getLogContent(runId, testName, filePath) {
  // First verify the test exists and has logs
  const result = db.prepare(`
    SELECT tl.logPath
    FROM TestLog tl
    JOIN TestResult tr ON tr.id = tl.testResultId
    WHERE tr.testRunId = ? AND tr.name = ?
  `).get(runId, testName);

  if (!result?.logPath) {
    return { error: 'Log not found', status: 404 };
  }

  const basePath = path.isAbsolute(result.logPath)
    ? path.dirname(result.logPath)
    : path.resolve(process.cwd(), path.dirname(result.logPath));

  const resolvedPath = path.isAbsolute(filePath)
    ? filePath
    : path.join(basePath, filePath);

  // Security check: ensure the requested file is within the base path
  const relativePath = path.relative(basePath, resolvedPath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return { error: 'Invalid file path', status: 400 };
  }

  try {
    const content = await fileHandler.getLogContent(resolvedPath);
    return content;
  } catch (error) {
    console.error('Error reading log content:', error);
    return { error: 'Failed to read log content', status: 500 };
  }
}

export function ingestTestRun(data) {
  // Prepared statements for lookups
  const getTestTypeByName = db.prepare(`
    SELECT id FROM TestType WHERE name = ?
  `);

  const getSubtypeByName = db.prepare(`
    SELECT id FROM TestSubtype WHERE testTypeId = ? AND name = ?
  `);

  const getTestRunBySubtypeId = db.prepare(`
    SELECT id FROM TestRun 
    WHERE id = ? AND testSubtypeId = ?
  `);

  // Prepared statements for inserts
  const insertTestType = db.prepare(`
    INSERT INTO TestType (id, name)
    VALUES (?, ?)
  `);

  const insertTestSubtype = db.prepare(`
    INSERT INTO TestSubtype (id, testTypeId, name)
    VALUES (?, ?, ?)
  `);

  const insertTestRun = db.prepare(`
    INSERT INTO TestRun (id, testSubtypeId, label, totalTests, passedTests, failedTests, totalDuration)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertTestEnvironment = db.prepare(`
    INSERT INTO TestEnvironment (id, testRunId, testSubtypeId, vmlinuxPath, configPath, distro, kernelRelease, architecture, configName)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertTestResult = db.prepare(`
    INSERT INTO TestResult (id, testRunId, testSubtypeId, name, status, duration, hasLog)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertTestLog = db.prepare(`
    INSERT INTO TestLog (id, testResultId, testRunId, logPath)
    VALUES (?, ?, ?, ?)
  `);

  try {
    let testTypeId, subtypeId, runId;
    // Start transaction
    db.prepare('BEGIN').run();

    for (const testTypeData of data.test_types) {
      // Find or create test type
      const testType = getTestTypeByName.get(testTypeData.type);
      testTypeId = testType ? testType.id : (() => {
        const newId = randomUUID();
        insertTestType.run(newId, testTypeData.type);
        return newId;
      })();

      // Find or create subtype
      const subtype = getSubtypeByName.get(testTypeId, testTypeData.subtype.name);
      subtypeId = subtype ? subtype.id : (() => {
        const newId = randomUUID();
        insertTestSubtype.run(newId, testTypeId, testTypeData.subtype.name);
        return newId;
      })();

      // Process each run
      for (const run of testTypeData.subtype.runs) {
        // Check if run_id exists for this subtype
        console.log('Checking run_id:', run.run_id, 'for subtype:', subtypeId);
        const existingRun = getTestRunBySubtypeId.get(run.run_id, subtypeId);
        console.log('Existing run:', existingRun);

        if (existingRun) {
          console.log('Found existing run, returning 409');
          db.prepare('ROLLBACK').run();
          return { 
            error: `Run ID ${run.run_id} already exists for test type '${testTypeData.type}' and subtype '${testTypeData.subtype.name}'`, 
            status: 409 
          };
        }
        
        // Insert test run
        runId = run.run_id;
        const label = run.label;
        const passedTests = run.tests.filter(t => t.status === 'pass').length;
        const totalTests = run.tests.length;
        const totalDuration = run.tests.reduce((sum, t) => sum + t.duration, 0);

        insertTestRun.run(
          runId,
          subtypeId,
          label,
          totalTests,
          passedTests,
          totalTests - passedTests,
          totalDuration
        );

        // Insert environment
        if (run.environment) {
          insertTestEnvironment.run(
            randomUUID(),
            runId,
            subtypeId,
            run.environment.vmlinux_path,
            run.environment.config_path,
            run.environment.distro,
            run.environment.kernel_release,
            run.environment.architecture,
            run.environment.config_name
          );
        }

        // Insert test results
        for (const test of run.tests) {
          const testResultId = randomUUID();
          insertTestResult.run(
            testResultId,
            runId,
            subtypeId,
            test.name,
            test.status,
            test.duration,
            test.log ? 1 : 0
          );

          // Insert test log if present
          if (test.log) {
            insertTestLog.run(
              randomUUID(),
              testResultId,
              runId,
              test.log
            );
          }
        }
      }
    }

    // Commit transaction
    db.prepare('COMMIT').run();
    return { 
	    success: true,
	    testTypeId,
	    subtypeId,
	    runId
    };
  } catch (error) {
    // Rollback on error
    db.prepare('ROLLBACK').run();
    throw error;
  }
}
