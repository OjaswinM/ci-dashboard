"use client";

import React from 'react';
import Link from 'next/link';
import { type SingleTestRun, type TestResult } from '@/lib/validation/test-result';
import { type TestRun } from '@/lib/validation/test-runs-api';

interface RegressionClientProps {
  testType: string;
  subtypeName: string;
  runId: string;
}

export default function RegressionClient({ testType, subtypeName, runId }: RegressionClientProps) {
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
  }, [testType, subtypeName, runId]);

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
        `/api/test-types/${encodeURIComponent(testType)}/subtypes/${encodeURIComponent(subtypeName)}/runs/${runId}`,
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
        `/api/test-types/${encodeURIComponent(testType)}/subtypes/${encodeURIComponent(subtypeName)}/runs`,
        window.location.origin
      );

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch comparison runs');
      }

      const data = await response.json();
      setCompareRuns(data.runs.filter((r: TestRun) => r.id !== runId));
    } catch (err) {
      console.error('Error fetching comparison runs:', err);
    }
  };

  const fetchCompareRun = async () => {
    if (!selectedCompareRunId) return;

    try {
      const url = new URL(
        `/api/test-types/${encodeURIComponent(testType)}/subtypes/${encodeURIComponent(subtypeName)}/runs/${selectedCompareRunId}`,
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
              href={`/test-types/${encodeURIComponent(testType)}/subtypes/${encodeURIComponent(subtypeName)}/runs/${runId}`}
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

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {selectedCompareRunId && compareRun && (
          <>
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg mb-6">
              <div className="px-4 py-5 sm:p-6">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Comparison Summary
                </h2>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Regressions
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-red-600 dark:text-red-400">
                      {changedResults?.filter(r => getComparisonStatus(r) === 'regression').length || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Improvements
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-green-600 dark:text-green-400">
                      {changedResults?.filter(r => getComparisonStatus(r) === 'improvement').length || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      New Skips
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-yellow-600 dark:text-yellow-400">
                      {changedResults?.filter(r => getComparisonStatus(r) === 'new-skip').length || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Changed Tests
                </h2>
                <div className="grid grid-cols-[repeat(8,minmax(120px,1fr))] gap-4 justify-items-stretch">
                  {changedResults?.map((result) => {
                    const comparisonStatus = getComparisonStatus(result);
                    const compareResult = compareRun.results.find(cr => cr.name === result.name);
                    return (
                      <div
                        key={result.id}
                        className={`p-4 rounded-lg border w-full aspect-square transition-all ${getComparisonColor(comparisonStatus)} ${result.hasLog ? 'cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-400 hover:shadow-md' : ''}`}
                      >
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {result.name}
                        </h3>
                        <div className="mt-2 space-y-2">
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Current Run</p>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(result.status)}`}>
                              {result.status}
                            </span>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Compare Run</p>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(compareResult?.status || 'unknown')}`}>
                              {compareResult?.status || 'unknown'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
