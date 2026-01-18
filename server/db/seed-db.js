import Database from "better-sqlite3";
import path from "path";

const db = new Database(path.join(".", "dev.db"));

// Insert sample test types
const testTypes = [
  {
    id: "xfstests",
    name: "XFS Tests",
    description: "Tests for the XFS filesystem"
  },
  {
    id: "ltp",
    name: "Linux Test Project",
    description: "Linux Test Project test suite"
  }
];

// Insert test types
const insertTestType = db.prepare(`
  INSERT OR IGNORE INTO TestType (id, name, description)
  VALUES (@id, @name, @description)
`);

for (const testType of testTypes) {
  insertTestType.run(testType);
}

// Insert sample subtypes
const subtypes = [
  {
    id: "quick",
    testTypeId: "xfstests",
    name: "Quick Tests",
    description: "Quick running XFS tests"
  },
  {
    id: "syscalls",
    testTypeId: "ltp",
    name: "System Calls",
    description: "Tests for Linux system calls"
  }
];

// Insert subtypes
const insertSubtype = db.prepare(`
  INSERT OR IGNORE INTO TestSubtype (id, testTypeId, name, description)
  VALUES (@id, @testTypeId, @name, @description)
`);

for (const subtype of subtypes) {
  insertSubtype.run(subtype);
}

console.log("[db] Sample data inserted");
