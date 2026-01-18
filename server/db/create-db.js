import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// Make sure data folder exists
const dbFile = path.join(".", "dev.db");
if (!fs.existsSync(dbFile)) {
  fs.writeFileSync(dbFile, "");
}

export const db = new Database(dbFile);

// ----------- TestType -----------
db.prepare(`
CREATE TABLE IF NOT EXISTS TestType (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
)
`).run();

// ----------- TestSubtype -----------
db.prepare(`
CREATE TABLE IF NOT EXISTS TestSubtype (
  id TEXT PRIMARY KEY,
  testTypeId TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(testTypeId) REFERENCES TestType(id),
  UNIQUE(testTypeId, name)
)
`).run();

// ----------- TestRun -----------
db.prepare(`
CREATE TABLE IF NOT EXISTS TestRun (
  id TEXT NOT NULL,
  label TEXT NOT NULL,
  testSubtypeId TEXT NOT NULL,
  totalTests INTEGER,
  passedTests INTEGER,
  failedTests INTEGER,
  totalDuration REAL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (id, testSubtypeId),
  FOREIGN KEY(testSubtypeId) REFERENCES TestSubtype(id)
)
`).run();

// ----------- TestEnvironment -----------
db.prepare(`
CREATE TABLE IF NOT EXISTS TestEnvironment (
  id TEXT NOT NULL,
  testRunId TEXT NOT NULL,
  testSubtypeId TEXT NOT NULL,
  vmlinuxPath TEXT,
  configPath TEXT,
  distro TEXT,
  kernelRelease TEXT,
  architecture TEXT,
  configName TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (id, testRunId),
  FOREIGN KEY(testRunId, testSubtypeId) REFERENCES TestRun(id, testSubtypeId)
)
`).run();

// ----------- TestResult -----------
db.prepare(`
CREATE TABLE IF NOT EXISTS TestResult (
  id TEXT NOT NULL,
  testRunId TEXT NOT NULL,
  testSubtypeId TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  duration REAL NOT NULL,
  hasLog INTEGER NOT NULL, -- 0 = false, 1 = true
  errorMessage TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (id, testRunId),
  FOREIGN KEY(testRunId, testSubtypeId) REFERENCES TestRun(id, testSubtypeId)
)
`).run();

// Indexes for TestResult
// db.prepare(`CREATE INDEX IF NOT EXISTS idx_TestResult_runId_name ON TestResult(testRunId, name)`).run();
// db.prepare(`CREATE INDEX IF NOT EXISTS idx_TestResult_runId_status ON TestResult(testRunId, status)`).run();

// ----------- TestLog -----------
db.prepare(`
CREATE TABLE IF NOT EXISTS TestLog (
  id TEXT NOT NULL,
  testResultId TEXT NOT NULL,
  testRunId TEXT NOT NULL,
  logPath TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (id, testResultId),
  FOREIGN KEY(testResultId, testRunId) REFERENCES TestResult(id, testRunId)
)
`).run();


const tables = db
  .prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type='table'
    ORDER BY name
  `)
  .all();

console.log(
  "[db] tables:",
  tables.map(t => t.name).join(", ")
);
