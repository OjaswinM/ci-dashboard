import React from 'react';
import type { ReactElement } from 'react';
import TestRunsClient from './client';

export default async function TestSubtypePage({
  params,
}: {
  params: { type: string; subtype: string };
}): Promise<ReactElement> {
  const { type, subtype } = await params;
  const testType = decodeURIComponent(type);
  const subtypeName = decodeURIComponent(subtype);

  return <TestRunsClient testType={testType} subtypeName={subtypeName} />;
}
