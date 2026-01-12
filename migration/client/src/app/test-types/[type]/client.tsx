import React from 'react';
import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';

type TestSubtype = {
  id: string;
  name: string;
  description: string | null;
};

type SubtypesResponse = {
  subtypes: TestSubtype[];
};

interface TestTypeClientProps {
  testType: string;
}

export default function TestTypeClient({ testType }: TestTypeClientProps): ReactElement {
  const [subtypes, setSubtypes] = React.useState<TestSubtype[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchSubtypes();
  }, [testType]);

  const fetchSubtypes = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/test-types/${encodeURIComponent(testType)}/subtypes`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch subtypes');
      }

      const data: SubtypesResponse = await response.json();
      setSubtypes(data.subtypes);
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
          <div className="flex items-center">
            <Link
              to="/"
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
              key={subtype.id}
              to={`/test-types/${encodeURIComponent(testType)}/subtypes/${encodeURIComponent(subtype.id)}`}
              className="block bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-200"
            >
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate">
                  {subtype.name}
                </h3>
                {subtype.description && (
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    {subtype.description}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>

        {loading && (
          <div className="flex justify-center mt-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
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
