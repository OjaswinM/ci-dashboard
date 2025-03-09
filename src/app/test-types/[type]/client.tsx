"use client";

import React from 'react';
import type { ReactElement } from 'react';
import Link from 'next/link';

type TestSubtype = {
  id: string;
  name: string;
  stats: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    passRate: number;
    lastRunTimestamp: string;
  } | null;
};

type SubtypesResponse = {
  items: TestSubtype[];
  nextCursor?: string;
  totalCount: number;
};

interface TestTypeClientProps {
  testType: string;
}

export default function TestTypeClient({ testType }: TestTypeClientProps): ReactElement {
  const [subtypes, setSubtypes] = React.useState<TestSubtype[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [nextCursor, setNextCursor] = React.useState<string | undefined>();
  const [totalCount, setTotalCount] = React.useState(0);

  React.useEffect(() => {
    fetchSubtypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testType]);

  const fetchSubtypes = async (cursor?: string) => {
    try {
      setLoading(true);
      const url = new URL(`/api/test-types/${encodeURIComponent(testType)}/subtypes`, window.location.origin);
      if (cursor) {
        url.searchParams.set('cursor', cursor);
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch subtypes');
      }

      const data: SubtypesResponse = await response.json();
      setSubtypes((prev: TestSubtype[]) => cursor ? [...prev, ...data.items] : data.items);
      setNextCursor(data.nextCursor);
      setTotalCount(data.totalCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center">
            <Link
              href="/"
              className="mr-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ← Back
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {testType}
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="bg-red-50 dark:bg-red-900 p-4 rounded-md mb-6">
            <p className="text-red-700 dark:text-red-200">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {subtypes.map((subtype: TestSubtype) => (
            <Link
              href={`/test-types/${encodeURIComponent(testType)}/subtypes/${encodeURIComponent(subtype.name)}`}
              key={subtype.id}
              className="block"
            >
              <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-200">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate">
                    {subtype.name}
                  </h3>

                  {subtype.stats ? (
                    <>
                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Tests
                          </p>
                          <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                            {subtype.stats.totalTests}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Pass Rate
                          </p>
                          <p className={`mt-1 text-2xl font-semibold ${
                            subtype.stats.passRate >= 90 ? 'text-green-600 dark:text-green-400' :
                            subtype.stats.passRate >= 75 ? 'text-yellow-600 dark:text-yellow-400' :
                            'text-red-600 dark:text-red-400'
                          }`}>
                            {formatPercentage(subtype.stats.passRate)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-1">
                          <span>Passed: {subtype.stats.passedTests}</span>
                          <span>Failed: {subtype.stats.failedTests}</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                          <div
                            className={`h-2.5 rounded-full ${
                              subtype.stats.passRate >= 90 ? 'bg-green-600' :
                              subtype.stats.passRate >= 75 ? 'bg-yellow-500' :
                              'bg-red-600'
                            }`}
                            style={{ width: `${Math.min(100, subtype.stats.passRate)}%` }}
                          />
                        </div>
                      </div>

                      <div className="mt-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Last Run: {formatDate(subtype.stats.lastRunTimestamp)}
                        </p>
                      </div>
                    </>
                  ) : (
                    <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                      No test runs available
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {loading && (
          <div className="flex justify-center mt-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
          </div>
        )}

        {nextCursor && !loading && (
          <div className="flex justify-center mt-8">
            <button
              onClick={() => fetchSubtypes(nextCursor)}
              className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Load More
            </button>
          </div>
        )}

        {!loading && subtypes.length === 0 && (
          <div className="text-center mt-8">
            <p className="text-gray-500 dark:text-gray-400">
              No subtypes found for this test type.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
