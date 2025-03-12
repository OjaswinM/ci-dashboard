"use client";

import React from 'react';
import type { ReactElement } from 'react';
import Link from 'next/link';
import { LogFile, LogContent } from '@/lib/validation/test-logs';

import { type SingleTestRun, type TestResult, type SingleTestRunResponse } from '@/lib/validation/test-result';
import { useRouter } from 'next/navigation';

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
  const [selectedTest, setSelectedTest] = React.useState<TestResult | null>(null);
  const [logFiles, setLogFiles] = React.useState<LogFile[]>([]);
  const [selectedLogFile, setSelectedLogFile] = React.useState<string | null>(null);
  const [logContent, setLogContent] = React.useState<string>('');
  const [loadingLogs, setLoadingLogs] = React.useState(false);
  const [hasMoreLogs, setHasMoreLogs] = React.useState(false);
  const [nextCursor, setNextCursor] = React.useState<string | undefined>();
  const logViewerRef = React.useRef<HTMLDivElement>(null);
  const router = useRouter();

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

  const handleViewLogs = async (test: TestResult) => {
    setSelectedTest(test);
    setLoadingLogs(true);
    try {
      const url = new URL(
        `/api/test-types/${encodeURIComponent(testType)}/subtypes/${encodeURIComponent(subtypeName)}/runs/${runId}/test-logs/${encodeURIComponent(test.name)}`,
        window.location.origin
      );

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch log files');
      }

      const data = await response.json();
      setLogFiles(data.files);
    } catch (err) {
      console.error('Error fetching log files:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch log files');
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleSelectLogFile = async (filePath: string) => {
    setSelectedLogFile(filePath);
    setLogContent('');
    setNextCursor(undefined);
    await fetchLogContent(filePath);
  };

  const fetchLogContent = async (filePath: string, cursor?: string) => {
    if (!selectedTest) return;

    setLoadingLogs(true);
    try {
      const url = new URL(
        `/api/test-types/${encodeURIComponent(testType)}/subtypes/${encodeURIComponent(subtypeName)}/runs/${runId}/test-logs/${encodeURIComponent(selectedTest.name)}`,
        window.location.origin
      );
      url.searchParams.set('filePath', filePath);
      if (cursor) {
        url.searchParams.set('cursor', cursor);
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch log content');
      }

      const data: LogContent = await response.json();
      setLogContent(prev => cursor ? prev + data.content : data.content);
      setHasMoreLogs(data.hasMore);
      setNextCursor(data.nextCursor);
    } catch (err) {
      console.error('Error fetching log content:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch log content');
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleLogScroll = () => {
    if (!logViewerRef.current || !hasMoreLogs || loadingLogs || !selectedLogFile) return;

    const { scrollTop, scrollHeight, clientHeight } = logViewerRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      fetchLogContent(selectedLogFile, nextCursor);
    }
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

  const filteredResults = run?.results?.filter(result => {
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
            <button
              onClick={() => router.push(`/test-types/${encodeURIComponent(testType)}/subtypes/${encodeURIComponent(subtypeName)}/runs/compare/${runId}`)} 
              className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Compare with Another Run
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Test Run Details
              </h1>
              {run && (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {subtypeName} • {formatDate(run.timestamp)}
                </p>
              )}
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
                  {run?.stats?.totalTests}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Pass Rate
                </p>
                <p className={`mt-1 text-2xl font-semibold ${
                  run?.stats?.passRate >= 90 ? 'text-green-600 dark:text-green-400' :
                  run?.stats?.passRate >= 75 ? 'text-yellow-600 dark:text-yellow-400' :
                  'text-red-600 dark:text-red-400'
                }`}>
                  {formatPercentage(run?.stats?.passRate || 0)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Duration
                </p>
                <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                  {formatDuration(run?.stats?.totalDuration || 0)}
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
                    {run?.environment?.kernelRelease}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Distro
                  </p>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {run?.environment?.distro}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    vmlinux Path
                  </p>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white break-all">
                    {run?.environment?.vmlinuxPath || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Config Path
                  </p>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white break-all">
                    {run?.environment?.configPath || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Architecture
                  </p>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {run?.environment?.architecture || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Config Name
                  </p>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {run?.environment?.configName || "N/A"}
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
                      className={`p-4 rounded-lg border w-full h-full cursor-pointer hover:shadow-md transition-shadow ${result.status === 'fail' ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}
                      onClick={() => handleViewLogs(result)}
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
                          {result.hasLog && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewLogs(result);
                              }}
                              className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 shrink-0"
                            >
                              Log→
                            </button>
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

      {/* Log Viewer Modal */}
      {selectedTest && (
        <div className="fixed inset-0 backdrop-blur-[2px] bg-black/20 transition-opacity z-50">
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left shadow-xl transition-all sm:my-8 sm:w-[80vw]">
                <div className="bg-white dark:bg-gray-800 px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {selectedTest.name}
                    </h3>
                    <button
                      onClick={() => {
                        setSelectedTest(null);
                        setLogFiles([]);
                        setSelectedLogFile(null);
                        setLogContent('');
                        setNextCursor(undefined);
                      }}
                      className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                    >
                      <span className="sr-only">Close</span>
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="flex space-x-4">
                    {/* Log Files List */}
                    <div className="w-1/6 border-r dark:border-gray-700 pr-4">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Log Files</h4>
                      {loadingLogs && logFiles.length === 0 ? (
                        <div className="flex justify-center items-center h-32">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-white"></div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {logFiles.map((file) => (
                            <button
                              key={file.path}
                              onClick={() => handleSelectLogFile(file.path)}
                              className={`w-full text-left px-3 py-2 rounded-md text-sm ${selectedLogFile === file.path
                                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200'
                                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                              }`}
                            >
                              <div className="truncate">{file.path}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {(file.size / 1024).toFixed(1)}KB
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Log Content */}
                    <div className="w-5/6 overflow-hidden">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Log Content</h4>
                      <div
                        ref={logViewerRef}
                        className="font-mono text-sm bg-gray-100 dark:bg-gray-900 rounded-md p-4 h-[65vh] overflow-auto whitespace-pre"
                        onScroll={handleLogScroll}
                      >
                        {selectedLogFile ? (
                          loadingLogs ? (
                            <div className="flex justify-center items-center h-full">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-white"></div>
                            </div>
                          ) : logContent ? (
                            logContent
                          ) : (
                            <div className="text-gray-500 dark:text-gray-400 text-center">
                              No content available
                            </div>
                          )
                        ) : (
                          <div className="text-gray-500 dark:text-gray-400 text-center">
                            Select a log file to view its content
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
