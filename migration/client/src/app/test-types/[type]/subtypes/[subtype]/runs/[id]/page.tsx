import React from 'react';
import type { ReactElement } from 'react';
import TestRunClient from './client';

export default async function TestRunPage({
  params,
}: {
  params: { type: string; subtype: string; id: string };
}): Promise<ReactElement> {
  const { type, subtype, id } = await params;
  const testType = decodeURIComponent(type);
  const subtypeName = decodeURIComponent(subtype);

  return <TestRunClient testType={testType} subtypeName={subtypeName} runId={id} />;
}
