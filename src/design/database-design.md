# Database Schema PRD for Linux Kernel Test Dashboard

## Overview

This document defines the database schema requirements for the Linux Kernel Test Dashboard application. 

## Goals

- Store and organize test results from multiple test types and subtypes
- Support historical analysis of test runs
- Enable regression detection between runs
- Provide efficient querying for dashboard visualizations
- Scale appropriately as test history grows

## Database Requirements

### 1. Schema Design

The database schema should reflect the hierarchical nature of the test data:

#### Tables

1. **test_types**
   - Primary storage for test type definitions (e.g., xfstests, ltp)

2. **test_subtypes**
   - Stores subtypes within each test type (e.g., quick, syscall)
   - References test_types

3. **test_runs**
   - Stores individual test runs
   - References test_subtypes

4. **test_results**
   - Stores individual test results
   - References test_runs

5. **test_logs**
   - Stores filesystem path for  logs of the particular test results.
   - References test_results

### 2. Table Structures

#### test_types
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| name | VARCHAR(100) | NOT NULL, UNIQUE | Test type name (e.g., "xfstests") |
| description | TEXT | | Optional description |
| created_at | TIMESTAMP | NOT NULL | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL | Last update timestamp |

#### test_subtypes
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| test_type_id | UUID | FOREIGN KEY | Reference to test_types |
| name | VARCHAR(100) | NOT NULL | Subtype name (e.g., "quick") |
| description | TEXT | | Optional description |
| created_at | TIMESTAMP | NOT NULL | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL | Last update timestamp |
| **UNIQUE** | | (test_type_id, name) | Ensure uniqueness within a test type |

#### test_runs
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| test_subtype_id | UUID | FOREIGN KEY | Reference to test_subtypes |
| run_timestamp | TIMESTAMP | NOT NULL | When the run occurred |
| version | VARCHAR(100) | | Version identifier (e.g., kernel version) |
| total_tests | INTEGER | | Total number of tests in run |
| passed_tests | INTEGER | | Number of passed tests |
| failed_tests | INTEGER | | Number of failed tests |
| total_duration | FLOAT | | Total run duration in seconds |
| created_at | TIMESTAMP | NOT NULL | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL | Last update timestamp |

#### test_environment
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| test_run_id | UUID | FOREIGN KEY (test_runs.id), UNIQUE | Reference to associated test run (one-to-one) |
| vmlinux_path | VARCHAR(255) | | Filesystem path to vmlinux/bzImage |
| config_path | VARCHAR(255) | | Filesystem path to kernel .config file |
| distro | VARCHAR(100) | | Linux distribution name and version |
| kernel_release | VARCHAR(100) | | Kernel release identifier |
| architecture | VARCHAR(50) | | CPU architecture (e.g., x86_64, arm64) |
| config_name | VARCHAR(100) | | Name/identifier of the kernel config |
| created_at | TIMESTAMP | NOT NULL | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL | Last update timestamp |

#### test_results
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| test_run_id | UUID | FOREIGN KEY | Reference to test_runs |
| name | VARCHAR(255) | NOT NULL | Test name (e.g., "generic/001") |
| status | VARCHAR(50) | NOT NULL | Test status (e.g., "pass", "fail") |
| duration | FLOAT | NOT NULL | Test duration in seconds |
| has_log | BOOLEAN | NOT NULL | Whether test has associated log |
| error_message | TEXT | | Short error message if failed |
| created_at | TIMESTAMP | NOT NULL | Creation timestamp |
| **INDEX** | | (test_run_id, name) | For faster lookups |
| **INDEX** | | (test_run_id, status) | For status filtering |

#### test_logs
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| test_result_id | UUID | FOREIGN KEY | Reference to test_results |
| log_path | VARCHAR(255) | NOT NULL | Filesystem path to the log file |
| created_at | TIMESTAMP | NOT NULL | Creation timestamp |


### 5. Constraints and Validation

1. Enforce status values through constraints or application logic:
   - Valid statuses: "pass", "fail", "skip", "error", etc.
2. Ensure run_timestamp is always set

## Data Import/Export

### Import Requirements

1. Develop a JSON import procedure that maps the existing JSON schema to the database
2. Support batch imports for historical data
3. Implement validation during import
4. Handle incremental imports for new runs

### Export API

1. Provide a JSON export API that reconstructs the original JSON format
2. Support filtering by date ranges, test types, and subtypes
3. Include pagination for large result sets

## Implementation Considerations

### Database Technology

The schema design works well with:

1. **SQLite** (for development/small deployments)
   - Simple setup
   - Portable

- But it is VERY important to use Prisma so that in future we can migrate to
  a different DB


## API Integration

The database schema should power these API endpoints:

1. `/api/test-types` - List all test types
2. `/api/test-types/:id/subtypes` - List subtypes for a test type
3. `/api/test-subtypes/:id/runs` - List runs for a subtype
4. `/api/test-runs/:id` - Get details for a specific run
5. `/api/test-runs/:id/results` - Get all test results for a run
6. `/api/test-results/:id/logs` - Get logs for a specific test result
7. `/api/regression/:run_id1/:run_id2` - Compare two runs
