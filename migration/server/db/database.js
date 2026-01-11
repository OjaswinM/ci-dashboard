import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize the database connection
const db = new Database(path.join(__dirname, 'dev.db'), { verbose: console.log });

// Get all test types with their subtypes count
export function getTestTypes() {
  const query = `
    SELECT 
      tt.id,
      tt.name,
      tt.description,
      COUNT(ts.id) as subtypeCount
    FROM TestType tt
    LEFT JOIN TestSubtype ts ON tt.id = ts.testTypeId
    GROUP BY tt.id
    ORDER BY tt.name ASC
  `;

  const items = db.prepare(query).all();
  return { items };
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

// Ingest test run data
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
    INSERT INTO TestRun (id, testSubtypeId, runTimestamp, totalTests, passedTests, failedTests, totalDuration)
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
    // Start transaction
    db.prepare('BEGIN').run();

    for (const testTypeData of data.test_types) {
      // Find or create test type
      const testType = getTestTypeByName.get(testTypeData.type);
      const testTypeId = testType ? testType.id : (() => {
        const newId = randomUUID();
        insertTestType.run(newId, testTypeData.type);
        return newId;
      })();

      // Find or create subtype
      const subtype = getSubtypeByName.get(testTypeId, testTypeData.subtype.name);
      const subtypeId = subtype ? subtype.id : (() => {
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
        }         // Insert test run
        const runId = run.run_id;
        const passedTests = run.tests.filter(t => t.status === 'pass').length;
        const totalTests = run.tests.length;
        const totalDuration = run.tests.reduce((sum, t) => sum + t.duration, 0);

        insertTestRun.run(
          runId,
          subtypeId,
          run.run_id,
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
    return { success: true };
  } catch (error) {
    // Rollback on error
    db.prepare('ROLLBACK').run();
    throw error;
  }
}
