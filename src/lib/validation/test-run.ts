import { z } from 'zod';

// Validate file paths exist and have correct extensions
const validateFilePath = (path: string, ext?: string[]) => {
  if (!path.startsWith('/')) {
    return false;
  }
  if (ext && ext.length > 0) {
    return ext.some(e => path.endsWith(e));
  }
  return true;
};

const TestEnvironmentSchema = z.object({
  vmlinux_path: z.string()
    .nullish()
    .transform(val => val || null)
    .refine(path => !path || validateFilePath(path, ["/vmlinux", "/bzImage"]), {
      message: "If provided, vmlinux_path must be an absolute path ending with /vmlinux or /bzImage"
    }),
  config_path: z.string()
    .nullish()
    .transform(val => val || null)
    .refine(path => !path || validateFilePath(path, [".config"]), {
      message: "If provided, config_path must be an absolute path to a .config file"
    }),
  distro: z.string()
    .min(1)
    .regex(/^[a-zA-Z0-9._-]+$/)
    .max(100),
  kernel_release: z.string()
    .min(1)
    .regex(/^[0-9]+\.[0-9]+\.[0-9]+.*$/)
    .max(100),
  architecture: z.string()
    .nullish()
    .transform(val => val || null),
  config_name: z.string()
    .nullish()
    .transform(val => val || null)
});

const TestSchema = z.object({
  name: z.string()
    .min(1)
    .max(255)
    .regex(/^[a-zA-Z0-9/_-]+$/)
    .refine(name => !name.includes('..'), {
      message: "Test name cannot contain '..'"
    }),
  status: z.enum(['pass', 'fail', 'skip', 'error'])
    .refine(status => ['pass', 'fail', 'skip', 'error'].includes(status), {
      message: "Invalid test status. Must be one of: pass, fail, skip, error"
    }),
  duration: z.number()
    .max(86400, { message: "Test duration cannot exceed 24 hours" }),
  log: z.string()
    .nullish()
    .transform(val => val || null)
    .refine(path => !path || validateFilePath(path), {
      message: "If provided, log path must be an absolute path"
    })
});

export const TestRunSchema = z.object({
  run_id: z.string()
    .refine(date => !isNaN(Date.parse(date)), {
      message: "Invalid datetime format. Must be ISO 8601 format"
    })
    .refine(date => new Date(date) <= new Date(), {
      message: "Run timestamp cannot be in the future"
    }),
  tests: z.array(TestSchema)
    .min(1, { message: "At least one test result is required" })
    .max(10000, { message: "Cannot import more than 10000 tests in a single run" }),
  environment: TestEnvironmentSchema
});

const TestSubtypeSchema = z.object({
  name: z.string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .refine(name => name.toLowerCase() === name, {
      message: "Subtype name must be lowercase"
    }),
  runs: z.array(TestRunSchema)
    .min(1, { message: "At least one test run is required" })
    .max(100, { message: "Cannot import more than 100 runs at once" })
});

const TestTypeSchema = z.object({
  type: z.string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .refine(type => type.toLowerCase() === type, {
      message: "Test type must be lowercase"
    }),
  subtype: TestSubtypeSchema
});

export const ImportTestRunSchema = z.object({
  test_types: z.array(TestTypeSchema)
});

export type ImportTestRun = z.infer<typeof ImportTestRunSchema>;

// Client-side interface with camelCase properties
export interface ClientTestRun {
  id: string;
  timestamp: string;
  stats: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    totalDuration: number;
    passRate: number;
  };
  environment: {
    vmlinuxPath: string | null;
    configPath: string | null;
    distro: string | null;
    kernelRelease: string | null;
    architecture: string | null;
    configName: string | null;
  };
}

// Transform server response to client format
export function transformToClientTestRun(run: z.infer<typeof TestRunSchema>): ClientTestRun {
  const totalTests = run.tests.length;
  const passedTests = run.tests.filter(t => t.status === 'pass').length;
  const failedTests = run.tests.filter(t => t.status === 'fail').length;
  const totalDuration = run.tests.reduce((sum, t) => sum + t.duration, 0);
  
  return {
    id: run.run_id,
    timestamp: run.run_id, // run_id is the timestamp in ISO format
    stats: {
      totalTests,
      passedTests,
      failedTests,
      totalDuration,
      passRate: totalTests > 0 ? (passedTests / totalTests) * 100 : 0
    },
    environment: {
      vmlinuxPath: run.environment.vmlinux_path,
      configPath: run.environment.config_path,
      distro: run.environment.distro,
      kernelRelease: run.environment.kernel_release,
      architecture: run.environment.architecture,
      configName: run.environment.config_name
    }
  };
};
