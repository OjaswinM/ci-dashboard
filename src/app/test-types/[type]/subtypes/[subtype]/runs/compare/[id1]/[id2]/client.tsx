"use client";

import React from 'react';
import Link from 'next/link';
import { type SingleTestRun, type TestResult } from '@/lib/validation/test-result';

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
            <div className="grid auto-rows-[120px] grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-4 justify-items-stretch">
              {filteredResults?.map((result) => {
                const comparisonStatus = getComparisonStatus(result);
                const compareResult = compareRun.results.find(cr => cr.name === result.name);
                return (
                  <div 
                    key={result.name}
                    className={`p-4 rounded-lg border w-full h-full hover:shadow-md transition-shadow ${getComparisonColor(comparisonStatus)} border-gray-200 dark:border-gray-700`}
                  >
                    <div className="flex flex-col h-full justify-between">
                      <p className="text-xs font-medium text-gray-900 dark:text-white truncate" title={result.name}>
                        {result.name}
                      </p>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between text-[10px] gap-1">
                          <span className={`px-1.5 py-0.5 inline-flex leading-4 font-semibold rounded-full ${getStatusColor(compareResult?.status || '')}`}>
                            {compareResult?.status || 'Unknown'}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400">→</span>
                          <span className={`px-1.5 py-0.5 inline-flex leading-4 font-semibold rounded-full ${getStatusColor(result.status)}`}>
                            {result.status}
                          </span>
                        </div>
                        {result.errorMessage && (
                          <span className="text-[10px] text-red-600 dark:text-red-400 truncate block" title={result.errorMessage}>
                            {result.errorMessage}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
