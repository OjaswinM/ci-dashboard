"use client";

import React from 'react';
import Link from 'next/link';
import { type SingleTestRun, type TestResult } from '@/lib/validation/test-result';
import { LogFile, LogContent } from '@/lib/validation/test-logs';
import LogViewer from '@/components/LogViewer';

interface ComparisonClientProps {
  type: string;
  subtype: string;
  id1: string;
  id2: string;
  currentRun: SingleTestRun;
  compareRun: SingleTestRun;
  stats: {
    newFailures: number;
    newPasses: number;
    newSkips: number;
  };
}

export default function ComparisonClient({ type, subtype, id1, id2, currentRun, compareRun, stats }: ComparisonClientProps) {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pass':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'fail':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'skip':
        return 'bg-yellow-200 text-yellow-800 dark:bg-yellow-600 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getComparisonStatus = (result: TestResult) => {
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

  const getComparisonColor = (status: string | null) => {
    switch (status) {
      case 'regression':
        return 'bg-red-50 dark:bg-red-900';
      case 'improvement':
        return 'bg-green-50 dark:bg-green-900';
      case 'new-skip':
        return '';
      default:
        return '';
    }
  };

  const changedResults = currentRun.results.filter(result => {
    return getComparisonStatus(result) !== null;
  });

  const [filterType, setFilterType] = React.useState('all');
  const [selectedTest, setSelectedTest] = React.useState<TestResult | null>(null);
  const [selectedTab, setSelectedTab] = React.useState<'current' | 'compare'>('current');
  
  // Current run log state
  const [currentLogFiles, setCurrentLogFiles] = React.useState<LogFile[]>([]);
  const [currentSelectedLogFile, setCurrentSelectedLogFile] = React.useState<string | null>(null);
  const [currentLogContent, setCurrentLogContent] = React.useState<string>('');
  const [loadingCurrentLogs, setLoadingCurrentLogs] = React.useState(false);
  const [currentHasMoreLogs, setCurrentHasMoreLogs] = React.useState(false);
  const [currentNextCursor, setCurrentNextCursor] = React.useState<string | undefined>();

  // Compare run log state
  const [compareLogFiles, setCompareLogFiles] = React.useState<LogFile[]>([]);
  const [compareSelectedLogFile, setCompareSelectedLogFile] = React.useState<string | null>(null);
  const [compareLogContent, setCompareLogContent] = React.useState<string>('');
  const [loadingCompareLogs, setLoadingCompareLogs] = React.useState(false);
  const [compareHasMoreLogs, setCompareHasMoreLogs] = React.useState(false);
  const [compareNextCursor, setCompareNextCursor] = React.useState<string | undefined>();

  const handleViewLogs = async (test: TestResult) => {
    setSelectedTest(test);
    await Promise.all([
      fetchTestLogs(test, id1, setLoadingCurrentLogs, setCurrentLogFiles),
      fetchTestLogs(test, id2, setLoadingCompareLogs, setCompareLogFiles)
    ]);
  };

  const fetchTestLogs = async (
    test: TestResult,
    runId: string,
    setLoading: (loading: boolean) => void,
    setFiles: (files: LogFile[]) => void
  ) => {
    setLoading(true);
    try {
      const url = new URL(
        `/api/test-types/${encodeURIComponent(type)}/subtypes/${encodeURIComponent(subtype)}/runs/${runId}/test-logs/${encodeURIComponent(test.name)}`,
        window.location.origin
      );

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch log files');
      }

      const data = await response.json();
      setFiles(data.files);
    } catch (err) {
      console.error('Error fetching log files:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogContent = async (
    filePath: string,
    runId: string,
    cursor: string | undefined,
    setLoading: (loading: boolean) => void,
    setContent: (content: string) => void,
    setHasMore: (hasMore: boolean) => void,
    setNextCursor: (cursor: string | undefined) => void
  ) => {
    if (!selectedTest) return;

    setLoading(true);
    try {
      const url = new URL(
        `/api/test-types/${encodeURIComponent(type)}/subtypes/${encodeURIComponent(subtype)}/runs/${runId}/test-logs/${encodeURIComponent(selectedTest.name)}`,
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
      setContent(prev => cursor ? prev + data.content : data.content);
      setHasMore(data.hasMore);
      setNextCursor(data.nextCursor);
    } catch (err) {
      console.error('Error fetching log content:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCurrentLogScroll = () => {
    if (!currentHasMoreLogs || loadingCurrentLogs || !currentSelectedLogFile || !selectedTest) return;
    fetchLogContent(
      currentSelectedLogFile,
      id1,
      currentNextCursor,
      setLoadingCurrentLogs,
      setCurrentLogContent,
      setCurrentHasMoreLogs,
      setCurrentNextCursor
    );
  };

  const handleCompareLogScroll = () => {
    if (!compareHasMoreLogs || loadingCompareLogs || !compareSelectedLogFile || !selectedTest) return;
    fetchLogContent(
      compareSelectedLogFile,
      id2,
      compareNextCursor,
      setLoadingCompareLogs,
      setCompareLogContent,
      setCompareHasMoreLogs,
      setCompareNextCursor
    );
  };

  const handleCurrentSelectLogFile = async (filePath: string) => {
    setCurrentSelectedLogFile(filePath);
    setCurrentLogContent('');
    setCurrentNextCursor(undefined);
    await fetchLogContent(
      filePath,
      id1,
      undefined,
      setLoadingCurrentLogs,
      setCurrentLogContent,
      setCurrentHasMoreLogs,
      setCurrentNextCursor
    );
  };

  const handleCompareSelectLogFile = async (filePath: string) => {
    setCompareSelectedLogFile(filePath);
    setCompareLogContent('');
    setCompareNextCursor(undefined);
    await fetchLogContent(
      filePath,
      id2,
      undefined,
      setLoadingCompareLogs,
      setCompareLogContent,
      setCompareHasMoreLogs,
      setCompareNextCursor
    );
  };

  const filteredResults = React.useMemo(() => {
    return changedResults.filter(result => {
      const status = getComparisonStatus(result);
      switch (filterType) {
        case 'new-failures':
          return status === 'regression';
        case 'new-passes':
          return status === 'improvement';
        case 'new-skips':
          return status === 'new-skip';
        default:
          return true;
      }
    });
  }, [changedResults, filterType]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center mb-4">
            <Link
              href={`/test-types/${encodeURIComponent(type)}/subtypes/${encodeURIComponent(subtype)}/runs/compare/${id1}`}
              className="mr-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ← Back to Run Selection
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Regression Analysis
            </h1>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Comparing run {id1} with {id2} 
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-3 gap-4 mb-8">
          <button 
            onClick={() => setFilterType('new-failures')}
            className={`text-left bg-white dark:bg-gray-800 p-4 rounded-lg shadow hover:ring-2 hover:ring-red-500 transition-all ${filterType === 'new-failures' ? 'ring-2 ring-red-500' : ''}`}
          >
            <h3 className="text-lg font-semibold mb-2">New Failures</h3>
            <p className="text-2xl text-red-600">
              {stats.newFailures}
            </p>
          </button>
          <button 
            onClick={() => setFilterType('new-passes')}
            className={`text-left bg-white dark:bg-gray-800 p-4 rounded-lg shadow hover:ring-2 hover:ring-green-500 transition-all ${filterType === 'new-passes' ? 'ring-2 ring-green-500' : ''}`}
          >
            <h3 className="text-lg font-semibold mb-2">New Passes</h3>
            <p className="text-2xl text-green-600">
              {stats.newPasses}
            </p>
          </button>
          <button 
            onClick={() => setFilterType('new-skips')}
            className={`text-left bg-white dark:bg-gray-800 p-4 rounded-lg shadow hover:ring-2 hover:ring-gray-500 transition-all ${filterType === 'new-skips' ? 'ring-2 ring-gray-500' : ''}`}
          >
            <h3 className="text-lg font-semibold mb-2">New Skips</h3>
            <p className="text-2xl text-yellow-600">
              {stats.newSkips}
            </p>
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Changed Tests
              </h3>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="block w-48 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
              >
                <option value="all">All Changes</option>
                <option value="new-failures">New Failures</option>
                <option value="new-passes">New Passes</option>
                <option value="new-skips">New Skips</option>
              </select>
            </div>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="grid grid-cols-[repeat(8,minmax(120px,1fr))] gap-4 justify-items-stretch">
              {filteredResults?.map((result) => {
                const comparisonStatus = getComparisonStatus(result);
                const compareResult = compareRun.results.find(cr => cr.name === result.name);
                return (
                  <div 
                    key={result.name}
                    onClick={() => result.hasLog && handleViewLogs(result)}
                    className={`p-4 rounded-lg border w-full aspect-square transition-all ${getComparisonColor(comparisonStatus)} border-gray-200 dark:border-gray-700 ${result.hasLog ? 'cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-400 hover:shadow-md' : ''}`}
                  >
                    <div className="flex flex-col h-full justify-between">
                      <p className="text-xs font-medium text-gray-900 dark:text-white truncate" title={result.name}>
                        {result.name}
                      </p>
                      {result.errorMessage && (
                        <div className="text-[10px] mt-1">
                          <span className="text-red-600 dark:text-red-400 truncate block" title={result.errorMessage}>
                            {result.errorMessage}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-xs mt-auto gap-1">
                        <span className={`px-2 py-0.5 inline-flex leading-5 font-semibold rounded-full ${getStatusColor(compareResult?.status || '')}`}>
                          {compareResult?.status || 'Unknown'}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">→</span>
                        <span className={`px-2 py-0.5 inline-flex leading-5 font-semibold rounded-full ${getStatusColor(result.status)}`}>
                          {result.status}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
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
                      Test Logs
                    </h3>
                    <button
                      onClick={() => {
                        setSelectedTest(null);
                        setCurrentLogFiles([]);
                        setCompareLogFiles([]);
                        setCurrentSelectedLogFile(null);
                        setCompareSelectedLogFile(null);
                        setCurrentLogContent('');
                        setCompareLogContent('');
                        setCurrentNextCursor(undefined);
                        setCompareNextCursor(undefined);
                      }}
                      className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                    >
                      <span className="sr-only">Close</span>
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Tabs */}
                  <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
                    <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                      <button
                        onClick={() => setSelectedTab('current')}
                        className={`${
                          selectedTab === 'current'
                            ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                      >
                        Current Run ({id1})
                      </button>
                      <button
                        onClick={() => setSelectedTab('compare')}
                        className={`${
                          selectedTab === 'compare'
                            ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                      >
                        Compare Run ({id2})
                      </button>
                    </nav>
                  </div>

                  {/* Log Content */}
                  {selectedTab === 'current' ? (
                    <LogViewer
                      testName={selectedTest.name}
                      status={selectedTest.status}
                      logFiles={currentLogFiles}
                      loadingLogs={loadingCurrentLogs}
                      logContent={currentLogContent}
                      selectedLogFile={currentSelectedLogFile}
                      onSelectLogFile={handleCurrentSelectLogFile}
                      onLogScroll={handleCurrentLogScroll}
                    />
                  ) : (
                    <LogViewer
                      testName={selectedTest.name}
                      status={compareRun.results.find(r => r.name === selectedTest.name)?.status || 'unknown'}
                      logFiles={compareLogFiles}
                      loadingLogs={loadingCompareLogs}
                      logContent={compareLogContent}
                      selectedLogFile={compareSelectedLogFile}
                      onSelectLogFile={handleCompareSelectLogFile}
                      onLogScroll={handleCompareLogScroll}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
