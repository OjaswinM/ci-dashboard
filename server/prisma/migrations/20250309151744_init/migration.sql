-- CreateTable
CREATE TABLE "TestType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TestSubtype" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "testTypeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TestSubtype_testTypeId_fkey" FOREIGN KEY ("testTypeId") REFERENCES "TestType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TestRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "testSubtypeId" TEXT NOT NULL,
    "runTimestamp" DATETIME NOT NULL,
    "version" TEXT,
    "totalTests" INTEGER,
    "passedTests" INTEGER,
    "failedTests" INTEGER,
    "totalDuration" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TestRun_testSubtypeId_fkey" FOREIGN KEY ("testSubtypeId") REFERENCES "TestSubtype" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TestEnvironment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "testRunId" TEXT NOT NULL,
    "vmlinuxPath" TEXT NOT NULL,
    "configPath" TEXT NOT NULL,
    "distro" TEXT NOT NULL,
    "kernelRelease" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TestEnvironment_testRunId_fkey" FOREIGN KEY ("testRunId") REFERENCES "TestRun" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TestResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "testRunId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "duration" REAL NOT NULL,
    "hasLog" BOOLEAN NOT NULL,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TestResult_testRunId_fkey" FOREIGN KEY ("testRunId") REFERENCES "TestRun" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TestLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "testResultId" TEXT NOT NULL,
    "logPath" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TestLog_testResultId_fkey" FOREIGN KEY ("testResultId") REFERENCES "TestResult" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "TestType_name_key" ON "TestType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TestSubtype_testTypeId_name_key" ON "TestSubtype"("testTypeId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "TestEnvironment_testRunId_key" ON "TestEnvironment"("testRunId");

-- CreateIndex
CREATE INDEX "TestResult_testRunId_name_idx" ON "TestResult"("testRunId", "name");

-- CreateIndex
CREATE INDEX "TestResult_testRunId_status_idx" ON "TestResult"("testRunId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TestLog_testResultId_key" ON "TestLog"("testResultId");
