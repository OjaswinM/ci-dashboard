import CompareClient from './client';

interface ComparePageProps {
  params: Promise<{
    type: string;
    subtype: string;
    id1: string;
  }>;
}



export default async function ComparePage({ params }: ComparePageProps) {
  const { type, subtype, id1 } = await params;
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <CompareClient type={type} subtype={subtype} id1={id1} />
    </div>
  );
}
