import ComparisonClient from './client';
import { TestComparisonResponseSchema } from '@/lib/validation/test-comparison';

interface ComparisonPageProps {
  params: Promise<{
    type: string;
    subtype: string;
    id1: string;
    id2: string;
  }>;
}

async function fetchComparison(type: string, subtype: string, id1: string, id2: string) {
  const url = new URL(
    `/api/test-types/${encodeURIComponent(type)}/subtypes/${encodeURIComponent(subtype)}/runs/compare/${id1}/${id2}`,
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  );

  const response = await fetch(url);
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch comparison');
  }

  const data = await response.json();
  return TestComparisonResponseSchema.parse(data);
}

export default async function ComparisonPage({ params }: ComparisonPageProps) {
  const { type, subtype, id1, id2 } = await params;
  const data = await fetchComparison(type, subtype, id1, id2);

  return (
    <ComparisonClient
      type={type}
      subtype={subtype}
      id1={id1}
      id2={id2}
      currentRun={data.currentRun}
      compareRun={data.compareRun}
      stats={data.stats}
    />
  );
}
