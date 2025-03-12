import { z } from 'zod';
import { SingleTestRunSchema } from './test-result';

export const TestComparisonStatsSchema = z.object({
  newFailures: z.number(),
  newPasses: z.number(),
  newSkips: z.number(),
});

export const TestComparisonResponseSchema = z.object({
  currentRun: SingleTestRunSchema,
  compareRun: SingleTestRunSchema,
  stats: TestComparisonStatsSchema,
});

export type TestComparisonStats = z.infer<typeof TestComparisonStatsSchema>;
export type TestComparisonResponse = z.infer<typeof TestComparisonResponseSchema>;
