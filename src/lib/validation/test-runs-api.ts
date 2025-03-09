import { z } from 'zod';

export const TestRunStatsSchema = z.object({
  totalTests: z.number(),
  passedTests: z.number(),
  failedTests: z.number(),
  totalDuration: z.number(),
  passRate: z.number()
});

export const TestRunEnvironmentSchema = z.object({
  vmlinuxPath: z.string().nullable(),
  configPath: z.string().nullable(),
  distro: z.string().nullable(),
  kernelRelease: z.string().nullable(),
  architecture: z.string().nullable(),
  configName: z.string().nullable()
});

export const TestRunResponseSchema = z.object({
  id: z.string(),
  timestamp: z.string().datetime(),
  stats: TestRunStatsSchema,
  environment: TestRunEnvironmentSchema
});

export const TestRunsResponseSchema = z.object({
  items: z.array(TestRunResponseSchema),
  nextCursor: z.string().optional(),
  totalCount: z.number()
});

// Type exports
export type TestRunStats = z.infer<typeof TestRunStatsSchema>;
export type TestRunEnvironment = z.infer<typeof TestRunEnvironmentSchema>;
export type TestRun = z.infer<typeof TestRunResponseSchema>;
export type TestRuns = z.infer<typeof TestRunsResponseSchema>;
