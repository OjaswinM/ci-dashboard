import { z } from 'zod';
import { TestRunStatsSchema, TestRunEnvironmentSchema } from './test-runs-api';

export const TestResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string(),
  duration: z.number(),
  errorMessage: z.string().nullable(),
  hasLog: z.boolean(),
  logPath: z.string().nullable()
});

export const SingleTestRunSchema = z.object({
  id: z.string(),
  timestamp: z.string().datetime(),
  version: z.string().nullable(),
  stats: TestRunStatsSchema,
  environment: TestRunEnvironmentSchema.nullable(),
  results: z.array(TestResultSchema)
});

export const SingleTestRunResponseSchema = z.object({
  run: SingleTestRunSchema
});

// Type exports
export type TestResult = z.infer<typeof TestResultSchema>;
export type SingleTestRun = z.infer<typeof SingleTestRunSchema>;
export type SingleTestRunResponse = z.infer<typeof SingleTestRunResponseSchema>;
