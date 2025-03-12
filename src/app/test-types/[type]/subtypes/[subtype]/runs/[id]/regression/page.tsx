"use client";

import React from 'react';
import Link from 'next/link';
import { type SingleTestRun, type TestResult } from '@/lib/validation/test-result';
import { type TestRun } from '@/lib/validation/test-runs-api';

interface RegressionPageProps {
  params: {
    type: string;
    subtype: string;
    id: string;
  };
}

export default function RegressionPage({ params: { type, subtype, id } }: RegressionPageProps) {
  const [currentRun, setCurrentRun] = React.useState<SingleTestRun | null>(null);
  const [compareRuns, setCompareRuns] = React.useState<TestRun[]>([]);
  const [selectedCompareRunId, setSelectedCompareRunId] = React.useState<string | null>(null);
  const [compareRun, setCompareRun] = React.useState<SingleTestRun | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchCurrentRun();
    fetchCompareRuns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, subtype, id]);

  React.useEffect(() => {
    if (selectedCompareRunId) {
      fetchCompareRun();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompareRunId]);

  const fetchCurrentRun = async () => {
    try {
      setLoading(true);
      const url = new URL(
        `/api/test-types/${encodeURIComponent(type)}/subtypes/${encodeURIComponent(subtype)}/runs/${id}`,
        window.location.origin
      );

      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch current run');
      }

      const data = await response.json();
      setCurrentRun(data.run);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompareRuns = async () => {
    try {
      const url = new URL(
        `/api/test-types/${encodeURIComponent(type)}/subtypes/${encodeURIComponent(subtype)}/runs`,
        window.location.origin
      );

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch comparison runs');
      }

      const data = await response.json();
      setCompareRuns(data.runs.filter((r: TestRun) => r.id !== id));
    } catch (err) {
      console.error('Error fetching comparison runs:', err);
    }
  };

  const fetchCompareRun = async () => {
    if (!selectedCompareRunId) return;

    try {
      const url = new URL(
        `/api/test-types/${encodeURIComponent(type)}/subtypes/${encodeURIComponent(subtype)}/runs/${selectedCompareRunId}`,
        window.location.origin
      );

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch comparison run');
      }

      const data = await response.json();
      setCompareRun(data.run);
    } catch (err) {
      console.error('Error fetching comparison run:', err);
      setCompareRun(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getComparisonStatus = (result: TestResult) => {
    if (!compareRun) return null;
    const compareResult = compareRun.results.find(cr => cr.name === result.name);
    if (!compareResult) return null;

    if (result.status.toLowerCase() === 'fail' && compareResult.status.toLowerCase() === 'pass') {
      return 'regression';
    } else if (result.status.toLowerCase() === 'pass' && compareResult.status.toLowerCase() === 'fail') {
      return 'improvement';
    } else if (result.status.toLowerCase() === 'skip' && compareResult.status.toLowerCase() !== 'skip') {
      return 'new-skip';
    }
    return null;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pass':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'fail':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getComparisonColor = (status: string | null) => {
    switch (status) {
      case 'regression':
        return 'bg-red-50 dark:bg-red-900';
      case 'improvement':
        return 'bg-green-50 dark:bg-green-900';
      case 'new-skip':
        return 'bg-yellow-50 dark:bg-yellow-900';
      default:
        return '';
    }
  };

  const changedResults = currentRun?.results.filter(result => {
    if (!compareRun) return false;
    return getComparisonStatus(result) !== null;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
      </div>
    );
  }

  if (error || !currentRun) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex justify-center items-center">
        <div className="bg-red-50 dark:bg-red-900 p-4 rounded-md">
          <p className="text-red-700 dark:text-red-200">
            {error || 'Failed to load test run'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center mb-4">
            <Link
              href={`/test-types/${encodeURIComponent(type)}/subtypes/${encodeURIComponent(subtype)}/runs/${id}`}
              className="mr-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ← Back to Run
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Regression Analysis
            </h1>
          </div>
          <div className="flex items-center">
            <select
              value={selectedCompareRunId || ''}
              onChange={(e) => setSelectedCompareRunId(e.target.value || null)}
              className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md"
            >
              <option value="">Select run to compare</option>
              {compareRuns.map((run) => (
                <option key={run.id} value={run.id}>
                  {formatDate(run.timestamp)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {compareRun && (
          <>
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-2">New Failures</h3>
                <p className="text-2xl text-red-600">
                  {currentRun.results.filter(r => 
                    r.status.toLowerCase() === 'fail' && 
                    compareRun.results.find(cr => cr.name === r.name)?.status.toLowerCase() === 'pass'
                  ).length}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-2">New Passes</h3>
                <p className="text-2xl text-green-600">
                  {currentRun.results.filter(r => 
                    r.status.toLowerCase() === 'pass' && 
                    compareRun.results.find(cr => cr.name === r.name)?.status.toLowerCase() === 'fail'
                  ).length}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-2">New Skips</h3>
                <p className="text-2xl text-yellow-600">
                  {currentRun.results.filter(r => 
                    r.status.toLowerCase() === 'skip' && 
                    compareRun.results.find(cr => cr.name === r.name)?.status.toLowerCase() !== 'skip'
                  ).length}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-2">Stability Score</h3>
                <p className="text-2xl">
                  {formatPercentage((currentRun.results.filter(r => 
                    r.status === compareRun.results.find(cr => cr.name === r.name)?.status
                  ).length / currentRun.results.length) * 100)}
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Changed Tests
                </h3>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700">
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {changedResults?.map((result) => {
                    const comparisonStatus = getComparisonStatus(result);
                    const compareResult = compareRun.results.find(cr => cr.name === result.name);
                    return (
                      <li 
                        key={result.name}
                        className={`px-4 py-4 ${getComparisonColor(comparisonStatus)}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {result.name}
                            </p>
                            {result.errorMessage && (
                              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                                {result.errorMessage}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(compareResult?.status || '')}`}>
                              {compareResult?.status || 'Unknown'}
                            </span>
                            <span className="text-gray-500 dark:text-gray-400">→</span>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(result.status)}`}>
                              {result.status}
                            </span>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
