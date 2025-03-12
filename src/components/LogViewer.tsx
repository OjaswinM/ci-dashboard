"use client";

import React from 'react';
import { LogFile } from '@/lib/validation/test-logs';

interface LogViewerProps {
  testName: string;
  status: string;
  logFiles: LogFile[];
  loadingLogs: boolean;
  logContent: string;
  selectedLogFile: string | null;
  onSelectLogFile: (filePath: string) => void;
  onLogScroll: () => void;
}

export default function LogViewer({
  testName,
  status,
  logFiles,
  loadingLogs,
  logContent,
  selectedLogFile,
  onSelectLogFile,
  onLogScroll,
}: LogViewerProps) {
  const logViewerRef = React.useRef<HTMLDivElement>(null);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pass':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'fail':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'skip':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  return (
    <div className="flex space-x-4">
      {/* Log Files List */}
      <div className="w-1/6 border-r dark:border-gray-700 pr-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
          {testName}
          <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(status)}`}>
            {status}
          </span>
        </h4>
        {loadingLogs && logFiles.length === 0 ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-white"></div>
          </div>
        ) : (
          <div className="space-y-2">
            {logFiles.map((file) => (
              <button
                key={file.path}
                onClick={() => onSelectLogFile(file.path)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                  selectedLogFile === file.path
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
          onScroll={onLogScroll}
        >
          {loadingLogs ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-white"></div>
            </div>
          ) : logFiles.length > 0 ? (
            selectedLogFile ? logContent : (
              <div className="text-gray-500 dark:text-gray-400 text-center">
                Select a log file to view its content
              </div>
            )
          ) : (
            <div className="text-gray-500 dark:text-gray-400 text-center">
              No logs found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
