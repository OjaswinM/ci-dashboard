import RegressionClient from './client';

interface RegressionPageProps {
  params: {
    type: string;
    subtype: string;
    id: string;
  };
}

export default function RegressionPage({ params: { type, subtype, id } }: RegressionPageProps) {
  return <RegressionClient testType={type} subtypeName={subtype} runId={id} />;
}
