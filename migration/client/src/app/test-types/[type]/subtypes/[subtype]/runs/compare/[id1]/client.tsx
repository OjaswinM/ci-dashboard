"use client";

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type TestRun, TestRunsResponseSchema } from '@/lib/validation/test-runs-api';

interface CompareClientProps {
  type: string;
  subtype: string;
  id1: string;
}

export default function CompareClient({ type, subtype, id1 }: CompareClientProps) {
  const router = useRouter();
  const [compareRuns, setCompareRuns] = React.useState<TestRun[]>([]);
  const [selectedCompareRunId, setSelectedCompareRunId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchCompareRuns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, subtype, id1]);

  React.useEffect(() => {
    if (selectedCompareRunId) {
      router.push(`/test-types/${encodeURIComponent(type)}/subtypes/${encodeURIComponent(subtype)}/runs/compare/${id1}/${selectedCompareRunId}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompareRunId]);

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
      const validatedData = TestRunsResponseSchema.parse(data);
      setCompareRuns(validatedData.items.filter((r: TestRun) => r.id !== id1));
    } catch (err) {
      console.error('Error fetching comparison runs:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex justify-center items-center">
        <div className="bg-red-50 dark:bg-red-900 p-4 rounded-md">
          <p className="text-red-700 dark:text-red-200">
            {error}
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
              href={`/test-types/${encodeURIComponent(type)}/subtypes/${encodeURIComponent(subtype)}/runs/${id1}`}
              className="mr-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ← Back to Run
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Select Run to Compare
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
    </div>
  );
}
