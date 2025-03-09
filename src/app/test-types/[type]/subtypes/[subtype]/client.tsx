"use client";

import React from 'react';
import type { ReactElement } from 'react';
import Link from 'next/link';

import { type TestRun, type TestRuns } from '@/lib/validation/test-runs-api';

interface TestRunsClientProps {
  testType: string;
  subtypeName: string;
}

export default function TestRunsClient({ testType, subtypeName }: TestRunsClientProps): ReactElement {
  const [runs, setRuns] = React.useState<TestRun[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [nextCursor, setNextCursor] = React.useState<string | undefined>();
  const [totalCount, setTotalCount] = React.useState(0);
  const [dateRange, setDateRange] = React.useState({
    startDate: '',
    endDate: ''
  });

  React.useEffect(() => {
    fetchRuns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testType, subtypeName, dateRange]);

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

      const data: TestRuns = await response.json();

      console.log('Fetched runs:', data);
      setRuns((prev: TestRun[]) => cursor ? [...prev, ...data.items] : data.items);
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

  const formatDuration = (duration: number) => {
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}m ${seconds.toFixed(1)}s`;
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const handleDateRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDateRange(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center">
            <Link
              href={`/test-types/${encodeURIComponent(testType)}`}
              className="mr-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ← Back
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {subtypeName}
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Test type: {testType}
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Start Date
                </label>
                <input
                  type="datetime-local"
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
                  type="datetime-local"
                  id="endDate"
                  name="endDate"
                  value={dateRange.endDate}
                  onChange={handleDateRangeChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                />
              </div>
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
                Showing {runs.length} of {totalCount} runs
              </p>
            )}
          </div>
          <ul role="list" className="divide-y divide-gray-200 dark:divide-gray-700">
            {runs.map((run) => (
              <li key={run.id}>
                <Link
                  href={`/test-types/${encodeURIComponent(testType)}/subtypes/${encodeURIComponent(subtypeName)}/runs/${run.id}`}
                  className="block px-4 py-4 sm:px-6 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 truncate">
                        Run ID: {run.id}
                      </p>
                      <div className="ml-2 flex-shrink-0">
                        <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          {formatDate(run.timestamp)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex justify-between">
                      <div className="sm:flex">
                        <div className="mr-6">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Total Tests: {run.stats.totalTests}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Duration: {formatDuration(run.stats.totalDuration)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Passed: {run.stats.passedTests}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Failed: {run.stats.failedTests}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${
                          run.stats.passRate >= 90 ? 'text-green-600 dark:text-green-400' :
                          run.stats.passRate >= 75 ? 'text-yellow-600 dark:text-yellow-400' :
                          'text-red-600 dark:text-red-400'
                        }`}>
                          Pass Rate: {formatPercentage(run.stats.passRate)}
                        </p>
                      </div>
                    </div>
                    {run.environment?.kernelRelease && (
                      <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        <p>Kernel: {run.environment.kernelRelease}</p>
                        <p>Distro: {run.environment.distro || 'N/A'}</p>
                        <p>Architecture: {run.environment.architecture || 'N/A'}</p>
                        <p>Config Name: {run.environment.configName || 'N/A'}</p>
                      </div>
                    )}
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
