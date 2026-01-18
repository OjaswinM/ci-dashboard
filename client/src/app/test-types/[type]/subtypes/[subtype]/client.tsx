import React from 'react';
import type { ReactElement } from 'react';
import { Link, useParams } from 'react-router-dom';

type TestType = {
  id: string;
  name: string;
  description: string | null;
};

type TestSubtype = {
  id: string;
  name: string;
  description: string | null;
  testTypeId: string;
  testTypeName: string;
};

type TestRun = {
  id: string;
  label?: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  totalDuration: number;
  createdAt?: string;
  vmlinuxPath?: string;
  configPath?: string;
  distro?: string;
  kernelRelease?: string;
  architecture?: string;
  configName?: string;
};

export default function TestRunsClient(): ReactElement {
  const { type: testType, subtype: subtypeName } = useParams();
  
  if (!testType || !subtypeName) {
    return <div>Invalid URL parameters</div>;
  }
  const [runs, setRuns] = React.useState<TestRun[]>([]);
  const [testTypeDetails, setTestTypeDetails] = React.useState<TestType | null>(null);
  const [subtypeDetails, setSubtypeDetails] = React.useState<TestSubtype | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [nextCursor, setNextCursor] = React.useState<string | undefined>();
  const [totalCount, setTotalCount] = React.useState(0);
  const [dateRange, setDateRange] = React.useState({
    startDate: '',
    endDate: ''
  });

  const filteredRuns = React.useMemo(() => {
    return runs.filter(run => {
      if (!run.createdAt) return true;
      const runDate = new Date(run.createdAt).toISOString().split('T')[0];
      
      if (dateRange.startDate && runDate < dateRange.startDate) {
        return false;
      }
      if (dateRange.endDate && runDate > dateRange.endDate) {
        return false;
      }
      return true;
    });
  }, [runs, dateRange]);

  React.useEffect(() => {
    Promise.all([
      fetchTestTypeDetails(),
      fetchSubtypeDetails(),
      fetchRuns()
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testType, subtypeName]);

  const fetchTestTypeDetails = async () => {
    try {
      const response = await fetch(`/api/test-types/${encodeURIComponent(testType)}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch test type details');
      }

      const data = await response.json();
      setTestTypeDetails(data.testType);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const fetchSubtypeDetails = async () => {
    try {
      const response = await fetch(`/api/test-types/${encodeURIComponent(testType)}/subtypes/${encodeURIComponent(subtypeName)}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch subtype details');
      }

      const data = await response.json();
      setSubtypeDetails(data.subtype);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const fetchRuns = async (cursor?: string) => {
    try {
      setLoading(true);
      const url = new URL(
        `/api/test-types/${encodeURIComponent(testType)}/subtypes/${encodeURIComponent(subtypeName)}/runs`,
        window.location.origin
      );
      
      if (cursor) {
        url.searchParams.set('cursor', cursor);
      }
      if (dateRange.startDate) {
        url.searchParams.set('startDate', dateRange.startDate);
      }
      if (dateRange.endDate) {
        url.searchParams.set('endDate', dateRange.endDate);
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch test runs');
      }

      const data = await response.json();

      console.log('Fetched runs:', data);
      setRuns((prev: TestRun[]) => cursor ? [...prev, ...data.runs] : data.runs);
      setNextCursor(data.nextCursor);
      setTotalCount(data.totalCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) return 'N/A';
    try {
      const dateObj = new Date(date);
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const handleDateRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDateRange(prev => ({ ...prev, [name]: value }));
  };

  const handleClearDateRange = () => {
    setDateRange({
      startDate: '',
      endDate: ''
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center">
            <Link
              to={`/test-types/${encodeURIComponent(testType)}`}
              className="mr-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ← Back
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {subtypeDetails?.name || subtypeName}
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Test type: {testTypeDetails?.name || testType}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="bg-red-50 dark:bg-red-900 p-4 rounded-md mb-6">
            <p className="text-red-700 dark:text-red-200">{error}</p>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Filter Test Runs
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Start Date
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    name="startDate"
                    value={dateRange.startDate}
                    onChange={handleDateRangeChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    End Date
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    name="endDate"
                    value={dateRange.endDate}
                    onChange={handleDateRangeChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                  />
                </div>
              </div>
              {(dateRange.startDate || dateRange.endDate) && (
                <div className="flex justify-end">
                  <button
                    onClick={handleClearDateRange}
                    className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-600"
                  >
                    Clear Dates
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
              Test Runs
            </h3>
            {totalCount > 0 && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Showing {filteredRuns.length} of {totalCount} runs
              </p>
            )}
          </div>
          <ul role="list" className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredRuns.map((run) => (
              <li key={run.id}>
                <Link
                  to={`/test-types/${encodeURIComponent(testType)}/subtypes/${encodeURIComponent(subtypeName)}/runs/${run.id}`}
                  className="block px-4 py-4 sm:px-6 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {run.label && (
                        <span className="font-medium text-gray-900 dark:text-white">{run.label}</span>
                      )}
                      <div className="flex space-x-2 text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Total:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{run.totalTests}</span>
                        <span className="text-gray-500 dark:text-gray-400">Pass:</span>
                        <span className="font-medium text-green-600 dark:text-green-400">{run.passedTests}</span>
                        <span className="text-gray-500 dark:text-gray-400">Fail:</span>
                        <span className="font-medium text-red-600 dark:text-red-400">{run.failedTests}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 text-sm">
                      {run.kernelRelease && (
                        <span className="text-gray-600 dark:text-gray-300">{run.kernelRelease}</span>
                      )}
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">{formatDate(run.createdAt)}</span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {loading && (
          <div className="flex justify-center mt-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
          </div>
        )}

        {nextCursor && !loading && (
          <div className="flex justify-center mt-8">
            <button
              onClick={() => fetchRuns(nextCursor)}
              className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Load More
            </button>
          </div>
        )}

        {!loading && runs.length === 0 && (
          <div className="text-center mt-8">
            <p className="text-gray-500 dark:text-gray-400">
              No test runs found for this subtype.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
