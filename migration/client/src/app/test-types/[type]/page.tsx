import React from 'react';
import type { ReactElement } from 'react';
import TestTypeClient from './client';

type TestSubtype = {
  id: string;
  name: string;
  stats: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    passRate: number;
    lastRunTimestamp: string;
  } | null;
};


export default async function TestTypePage({
  params,
}: {
  params: { type: string };
}): Promise<ReactElement> {
  const { type } = await params;
  const testType = decodeURIComponent(type);

  return <TestTypeClient testType={testType} />;
}
