-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TestEnvironment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "testRunId" TEXT NOT NULL,
    "vmlinuxPath" TEXT,
    "configPath" TEXT,
    "distro" TEXT,
    "kernelRelease" TEXT,
    "architecture" TEXT,
    "configName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TestEnvironment_testRunId_fkey" FOREIGN KEY ("testRunId") REFERENCES "TestRun" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_TestEnvironment" ("configPath", "createdAt", "distro", "id", "kernelRelease", "testRunId", "updatedAt", "vmlinuxPath") SELECT "configPath", "createdAt", "distro", "id", "kernelRelease", "testRunId", "updatedAt", "vmlinuxPath" FROM "TestEnvironment";
DROP TABLE "TestEnvironment";
ALTER TABLE "new_TestEnvironment" RENAME TO "TestEnvironment";
CREATE UNIQUE INDEX "TestEnvironment_testRunId_key" ON "TestEnvironment"("testRunId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
