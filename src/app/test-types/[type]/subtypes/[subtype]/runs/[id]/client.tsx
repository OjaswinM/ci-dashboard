"use client";

import React from 'react';
import type { ReactElement } from 'react';
import Link from 'next/link';

import { type SingleTestRun, type TestResult, type SingleTestRunResponse } from '@/lib/validation/test-result';

interface TestRunClientProps {
  testType: string;
  subtypeName: string;
  runId: string;
}

export default function TestRunClient({ testType, subtypeName, runId }: TestRunClientProps): ReactElement {
  const [run, setRun] = React.useState<SingleTestRun | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = React.useState<string>('all');
  const [searchQuery, setSearchQuery] = React.useState('');

  React.useEffect(() => {
    fetchTestRun();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testType, subtypeName, runId]);

  const fetchTestRun = async () => {
    try {
      setLoading(true);
      const url = new URL(
        `/api/test-types/${encodeURIComponent(testType)}/subtypes/${encodeURIComponent(subtypeName)}/runs/${runId}`,
        window.location.origin
      );

      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch test run');
      }

      const data = await response.json();
      setRun(data.run);
      console.log('Fetched test run:', data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatDuration = (duration: number) => {
    if (duration < 0.01) {
      return '< 0.01s';
    }
    if (duration < 1) {
      return `${(duration * 1000).toFixed(0)}ms`;
    }
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return minutes > 0 ? `${minutes}m ${seconds.toFixed(1)}s` : `${seconds.toFixed(1)}s`;
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
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

  const filteredResults = run?.results.filter(result => {
    const matchesStatus = selectedStatus === 'all' || result.status.toLowerCase() === selectedStatus.toLowerCase();
    const matchesSearch = result.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (result.errorMessage?.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
      </div>
    );
  }

  if (error || !run) {
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
          <div className="flex items-center">
            <Link
              href={`/test-types/${encodeURIComponent(testType)}/subtypes/${encodeURIComponent(subtypeName)}`}
              className="mr-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ← Back
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Test Run Details
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {subtypeName} • {formatDate(run.timestamp)}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Summary Card */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Run Summary
            </h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total Tests
                </p>
                <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                  {run.stats.totalTests}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Pass Rate
                </p>
                <p className={`mt-1 text-2xl font-semibold ${
                  run.stats.passRate >= 90 ? 'text-green-600 dark:text-green-400' :
                  run.stats.passRate >= 75 ? 'text-yellow-600 dark:text-yellow-400' :
                  'text-red-600 dark:text-red-400'
                }`}>
                  {formatPercentage(run.stats.passRate)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Duration
                </p>
                <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                  {formatDuration(run.stats.totalDuration)}
                </p>
              </div>
              {run.version && (
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Version
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                    {run.version}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Environment Card */}
        {run.environment && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Environment
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Kernel Release
                  </p>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {run.environment.kernelRelease}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Distro
                  </p>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {run.environment.distro}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    vmlinux Path
                  </p>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white break-all">
                    {run.environment.vmlinuxPath || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Config Path
                  </p>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white break-all">
                    {run.environment.configPath || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Architecture
                  </p>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {run.environment.architecture || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Config Name
                  </p>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {run.environment.configName || "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Test Results */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Test Results
              </h2>
              <div className="mt-3 sm:mt-0 flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0">
                <div>
                  <label htmlFor="status" className="sr-only">
                    Filter by Status
                  </label>
                  <select
                    id="status"
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="pass">Passed</option>
                    <option value="fail">Failed</option>
                    <option value="skip">Skipped</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="search" className="sr-only">
                    Search Tests
                  </label>
                  <input
                    type="search"
                    id="search"
                    placeholder="Search tests..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4">
              {filteredResults?.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                  No test results match your filters.
                </p>
              ) : (
                <div className="grid auto-rows-[120px] grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-4 justify-items-stretch">
                  {filteredResults?.map((result) => (
                    <div 
                      key={result.id} 
                      className={`p-4 rounded-lg border w-full h-full ${result.status === 'fail' ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}
                    >
                      <div className="flex flex-col h-full justify-between">
                        <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                          {result.name}
                        </p>
                        <div className="flex justify-between items-center text-[10px]">
                          <span className={`px-1.5 py-0.5 inline-flex leading-4 font-semibold rounded-full ${getStatusColor(result.status)}`}>
                            {result.status}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400">
                            {formatDuration(result.duration)}
                          </span>
                        </div>
                        <div className="flex gap-1 text-[10px] mt-1 items-center">
                          {result.errorMessage && (
                            <span className="text-red-600 dark:text-red-400 truncate flex-1" title={result.errorMessage}>
                              {result.errorMessage}
                            </span>
                          )}
                          {result.hasLog && result.logPath && (
                            <a
                              href={result.logPath}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 shrink-0"
                            >
                              Log→
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
