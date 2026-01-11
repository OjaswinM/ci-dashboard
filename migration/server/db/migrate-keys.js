import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(path.join(__dirname, 'dev.db'), { verbose: console.log });

try {
  // Start transaction
  db.prepare('BEGIN').run();

  // 1. Rename existing tables to backup
  db.prepare('ALTER TABLE TestEnvironment RENAME TO TestEnvironment_old').run();
  db.prepare('ALTER TABLE TestResult RENAME TO TestResult_old').run();
  db.prepare('ALTER TABLE TestLog RENAME TO TestLog_old').run();

  // 2. Create new tables with correct keys
  db.prepare(`
    CREATE TABLE TestEnvironment (
      id TEXT NOT NULL,
      testRunId TEXT NOT NULL,
      vmlinuxPath TEXT,
      configPath TEXT,
      distro TEXT,
      kernelRelease TEXT,
      architecture TEXT,
      configName TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (id, testRunId),
      FOREIGN KEY(testRunId) REFERENCES TestRun(id)
    )
  `).run();

  db.prepare(`
    CREATE TABLE TestResult (
      id TEXT NOT NULL,
      testRunId TEXT NOT NULL,
      name TEXT NOT NULL,
      status TEXT NOT NULL,
      duration REAL NOT NULL,
      hasLog INTEGER NOT NULL,
      errorMessage TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (id, testRunId),
      FOREIGN KEY(testRunId) REFERENCES TestRun(id)
    )
  `).run();

  db.prepare(`
    CREATE TABLE TestLog (
      id TEXT NOT NULL,
      testResultId TEXT NOT NULL,
      logPath TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (id, testResultId),
      FOREIGN KEY(testResultId) REFERENCES TestResult(id)
    )
  `).run();

  // 3. Copy data from old tables to new tables
  db.prepare(`
    INSERT INTO TestEnvironment 
    SELECT id, testRunId, vmlinuxPath, configPath, distro, kernelRelease, architecture, configName, createdAt, updatedAt 
    FROM TestEnvironment_old
  `).run();

  db.prepare(`
    INSERT INTO TestResult 
    SELECT id, testRunId, name, status, duration, hasLog, errorMessage, createdAt 
    FROM TestResult_old
  `).run();

  db.prepare(`
    INSERT INTO TestLog 
    SELECT id, testResultId, logPath, createdAt 
    FROM TestLog_old
  `).run();

  // 4. Drop old tables
  db.prepare('DROP TABLE TestEnvironment_old').run();
  db.prepare('DROP TABLE TestResult_old').run();
  db.prepare('DROP TABLE TestLog_old').run();

  // Commit transaction
  db.prepare('COMMIT').run();
  console.log('Migration completed successfully');
} catch (error) {
  // Rollback on error
  db.prepare('ROLLBACK').run();
  console.error('Migration failed:', error);
  throw error;
}
