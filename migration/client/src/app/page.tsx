import React from 'react';
import type { ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';

type TestType = {
  id: string;
  name: string;
  description: string | null;
  subtypeCount: number;
};

type TestTypesResponse = {
  items: TestType[];
};

export default function Home(): ReactElement {
  const navigate = useNavigate();
  const [testTypes, setTestTypes] = React.useState<TestType[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  React.useEffect(() => {
    fetchTestTypes();
  }, []);

  const fetchTestTypes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/test-types');
      if (!response.ok) {
        throw new Error('Failed to fetch test types');
      }

      const data: TestTypesResponse = await response.json();
      setTestTypes(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Test Dashboard
          </h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="bg-red-50 dark:bg-red-900 p-4 rounded-md mb-6">
            <p className="text-red-700 dark:text-red-200">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {testTypes.map((testType: TestType) => (
              <div 
                key={testType.id} 
                className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-200 cursor-pointer"
                onClick={() => navigate(`/test-types/${encodeURIComponent(testType.id)}`)}
              >
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate">
                    {testType.name}
                  </h3>
                  
                  {testType.description && (
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      {testType.description}
                    </p>
                  )}
                  
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Subtypes
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                      {testType.subtypeCount}
                    </p>
                  </div>
                </div>
              </div>
          ))}
        </div>

        {loading && (
          <div className="flex justify-center mt-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
          </div>
        )}



        {!loading && testTypes.length === 0 && (
          <div className="text-center mt-8">
            <p className="text-gray-500 dark:text-gray-400">
              No test types found. Start by adding some test types to your dashboard.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
