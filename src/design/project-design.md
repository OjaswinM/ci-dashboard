# Linux Kernel Test Dashboard Design Document

## Overview

This document outlines the design for a dashboard to visualize Linux kernel test runs. The dashboard will display results from various test types (e.g., xfstests, ltp) and their subtypes, allowing users to track test status, view regressions, and analyze test runs over time.

## Data Model

The system will use the following JSON schema:

```json
{
  "test_types": [
    {
      "type": "string",  // e.g., "xfstests" or "ltp"
      "subtype": {
          "name": "string",
          "runs": [
            {
              "run_id": "string",  // ISO 8601 date-time, e.g., "2025-02-27T15:30:00Z"
              "tests": [
                {
                  "name": "string",  // e.g., "generic/001" or "syscall/read"
                  "status": "string",  // "pass" or "fail"
                  "duration": "number",  // Time taken for the test in seconds
                  "log": "string (optional)"  // Optional filesystem path to the log file
                }],
              "environment": {
                "vmlinux_path": "string | null",  // Path to vmlinux/bzImage
                "config_path": "string | null",  // Path to kernel .config file
                "distro": "string | null",  // Linux distribution name and version
                "kernel_release": "string | null",  // Kernel release identifier
                "architecture": "string | null",  // CPU architecture (e.g., x86_64, arm64)
                "config_name": "string | null"  // Name/identifier of the kernel config
              }
            }
          ]
        }
    }
  ]
}
```

## UI Views

### 1. Home Dashboard View

The home view serves as the entry point, showing a high-level summary of all test types and subtypes.

**Components:**
- **Test Type Cards**: Each card represents a test type (xfstests, ltp, etc.)
  - Display name of test type
  - Show number of subtypes

**Layout:**
- Grid layout for test type cards (responsive, 3 cards per row on desktop)
- Filtering and search options at the top
- Summary statistics showing total tests ran and %passing. 

### 2. Test Type View

When a test type is selected, this view shows all subtypes within that test type.

**Components:**
- **Header**: Shows the selected test type with navigation breadcrumbs
- **Subtype Cards**: Each card represents a subtype (e.g., "quick" for xfstests)
  - Display name of subtype
  - Latest run timestamp
  - Pass/fail score of latest tests (% test passing in latest run) 

**Layout:**
- Grid of subtype cards
- Historical trend chart showing pass rates over time
- Filter controls for date ranges and specific subtypes

### 3. Run Dashboard View

This view shows a detailed view of a specific test run for a selected subtype.

**Components:**
- **Header**: Test type, subtype, and run timestamp
- **Summary Statistics**: 
  - Total tests run
  - Pass/fail counts and percentages
  - Regression comparison with previous run
- **Test Grid**: 
  - Each test represented as a color-coded box (green for pass, red for fail)
  - Grid layout allowing quick visual scanning of many tests
  - Hover for test name and duration
  - Click to expand for more details and links to logs
- **Search/Filter Controls**:
  - Filter by test status
  - Search by test name
  - Sort options (by name, duration, status)

**Layout:**
- Summary cards at the top
- Large grid of test boxes below, infinite scroll. sorted by name initially
- Detail panel that slides in from the side when a test is selected

### 4. Regression View (To be done in later phases)

This view focuses on comparing the current run with the previous run to highlight regressions.

**Components:**
- **Header**: Test type, subtype, and comparison runs information
- **Regression Summary**: 
  - Number of new failures
  - Number of new passes
  - Overall stability score
- **Regression Grid**:
  - Only show tests that changed status
  - Color coding:
    - Red: Passed in previous run, failed in current run (regression)
    - Green: Failed in previous run, passed in current run (improvement)
  - Sortable columns for test name, duration delta, etc.
- **Timeline Selector**: Ability to select different runs for comparison

**Layout:**
- Summary cards at the top
- Tabbed interface to switch between "All Tests", "Regressions Only", and "Improvements Only"
- Detailed test grid showing status changes

### 5. Test Detail View

This view appears when a user clicks on a specific test.

**Components:**
- **Test Information**: 
  - Name
  - Status
  - Duration
  - Run ID
  - Link for logs
- **Log Viewer**: 
  - Display test logs from the filesystem path in a travis style log display
  - Stream large log files for better performance
  - Syntax highlighting for errors and warnings
  - Search and filter functionality within logs
- **Historical Performance**:
  - Chart showing test status over last N runs
  - Duration trend over time

**Layout:**
- Modal or slide-in panel
- Tabbed interface for different detail sections
- Copy-to-clipboard functionality for logs

## API Endpoints

### Pagination
All list endpoints support cursor-based pagination for infinite scroll:
```typescript
type PaginatedResponse<T> = {
  items: T[];
  nextCursor?: string;  // Base64 encoded cursor for next page
  totalCount: number;   // Total count for progress indicators
}

type PaginationParams = {
  cursor?: string;      // Base64 encoded cursor from previous response
  limit?: number;       // Number of items per page (default: 50)
}
```

## API Endpoints

### 1. Test Types API

```
GET /api/test-types
```

Returns a paginated list of all test types with summary statistics. Supports infinite scroll with cursor-based pagination.

### 2. Subtypes API

```
GET /api/test-types/:type/subtypes
```

Returns a paginated list of subtypes for a specific test type. Supports infinite scroll with cursor-based pagination.

### 3. Runs API

```
GET /api/test-types/:type/subtypes/:subtype/runs
```

Returns a paginated list of runs for a specific subtype. Supports infinite scroll with cursor-based pagination.

### 4. Run Detail API

```
GET /api/test-types/:type/subtypes/:subtype/runs/:run_id
```

Returns detailed information about a specific run, including a paginated list of tests. Supports infinite scroll with cursor-based pagination.

### 5. Test Detail API

```
GET /api/test-types/:type/subtypes/:subtype/runs/:run_id/tests/:test_name
```

Returns detailed information about a specific test, including logs.

### 6. Regression API

```
GET /api/test-types/:type/subtypes/:subtype/regression?current=:run_id&previous=:run_id
```

Returns regression analysis between two runs.

### 7. Historical API

```
GET /api/test-types/:type/subtypes/:subtype/tests/:test_name/history?limit=10
```
Returns historical data for a specific test across multiple runs.

8. Import Test Run API
```
POST /api/import-test-run
```
Accepts a JSON payload following the data model schema. The payload is strictly validated against the schema before any database operations are performed. Creates all necessary database entries including test types, subtypes, runs, test results, and environment details. Returns validation errors if the payload format is invalid.


## Component Architecture

### NextJS Pages Structure

```
pages/
├── index.js                             # Home Dashboard
├── [type]/                              # Test Type Route
│   ├── index.js                         # Test Type View
│   └── [subtype]/                       # Subtype Route
│       ├── index.js                     # Subtype View (list of runs)
│       ├── runs/                        # Runs Route
│       │   └── [run_id].js              # Run Dashboard View
│       └── regression/                  # Regression Route
│           └── [run_id].js              # Regression View (compares with previous)
└── api/                                 # API Routes
    ├── test-types.js                    # Test Types API
    ├── test-types/[type]/
        └── subtypes.js                  # Subtypes API
    ├── test-types/[type]/[subtype]/
        └── runs.js                      # Runs API
    ├── import-test-run.js               # Import Test Run API

### Core Components

1. **TestTypeCard**: Displays a test type with summary
2. **SubtypeCard**: Displays a subtype with summary
3. **TestGrid**: Grid display of tests with color-coded status
4. **StatusBadge**: Shows test status (pass/fail) with appropriate color
5. **RunSelector**: Dropdown or timeline for selecting runs
6. **TestDetailPanel**: Slide-in panel for test details
7. **LogViewer**: Component for viewing test logs
8. **RegressionIndicator**: Visual indicator of regression status
9. **DurationChart**: Chart component for showing test durations
10. **TrendChart**: Line chart for showing trends over time

## State Management

For state management, we'll use React Context or a lightweight state management solution:

1. **DashboardContext**: Manages global dashboard state
2. **FilterContext**: Manages filters across views
3. **TestContext**: Manages the currently selected test

## Data Fetching Strategy

1. Use prisma for schema management and data fetching

## Implementation Plan

### Phase 1: Core Infrastructure
- Set up Next.js project with Tailwind CSS
- Implement API endpoints
- Create basic data fetching utilities
- Implement Prisma schema (Refer database-design.md for the schema)

### Phase 2: Home and Type Views
- Implement Home Dashboard
- Implement Test Type View
- Build core card components

### Phase 3: Run Dashboard
- Create Test Grid component
- Implement Run Dashboard View
- Build test detail functionality

### Phase 4: Regression View
- Implement comparison logic
- Create Regression View
- Add visualization for changes

### Phase 5: Refinement
- Add search and filtering
- Implement advanced visualizations
- Performance optimizations
- Mobile responsiveness

## Tailwind Component Examples

### TestTypeCard

```jsx
<div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-lg font-semibold text-gray-800">{type.name}</h3>
    <div className={`h-3 w-3 rounded-full ${getHealthColor(type.health)}`}></div>
  </div>
  <div className="text-sm text-gray-600 mb-2">{type.subtypeCount} subtypes</div>
  <div className="flex items-center justify-between text-sm">
    <span>Latest: {formatDate(type.latestRun)}</span>
    <span className={`font-medium ${getPassRateColor(type.passRate)}`}>
      {type.passRate}% passing
    </span>
  </div>
</div>
```

### TestGrid

```jsx
<div className="grid grid-cols-10 gap-2 mt-4">
  {tests.map(test => (
    <div 
      key={test.name}
      onClick={() => selectTest(test)}
      className={`
        h-12 w-full rounded cursor-pointer flex items-center justify-center
        ${test.status === 'pass' ? 'bg-green-100 hover:bg-green-200' : 'bg-red-100 hover:bg-red-200'}
        transition-colors duration-150
      `}
      title={`${test.name} (${test.duration}s)`}
    >
      <span className="text-xs truncate px-1">{getTestShortName(test.name)}</span>
    </div>
  ))}
</div>
```

## Future Enhancements

1. User authentication and personalized views
2. Email notifications for new regressions
3. Test result annotations and comments
4. Integration with bug tracking systems
5. Advanced filtering and tagging system
6. Export functionality for reports
7. Compare arbitrary runs (not just sequential)
8. Custom dashboard layouts