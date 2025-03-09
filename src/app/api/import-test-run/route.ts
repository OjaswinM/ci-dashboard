import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ImportTestRunSchema } from '@/lib/validation/test-run';
import { z } from 'zod';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate the request body
    const validatedData = ImportTestRunSchema.parse(body);
    
    // Process each test type
    for (const testType of validatedData.test_types) {
      // Create or get test type
      const dbTestType = await prisma.testType.upsert({
        where: { name: testType.type },
        create: { name: testType.type },
        update: {}
      });

      // Create or get subtype
      const dbSubtype = await prisma.testSubtype.upsert({
        where: {
          testTypeId_name: {
            testTypeId: dbTestType.id,
            name: testType.subtype.name
          }
        },
        create: {
          name: testType.subtype.name,
          testTypeId: dbTestType.id
        },
        update: {}
      });

      // Process runs
      for (const run of testType.subtype.runs) {
          // Create test run with environment
          const dbRun = await prisma.testRun.create({
            data: {
              testSubtypeId: dbSubtype.id,
              runTimestamp: new Date(run.run_id),
              totalTests: run.tests.length,
              passedTests: run.tests.filter((t: { status: string }) => t.status === 'pass').length,
              failedTests: run.tests.filter((t: { status: string }) => t.status === 'fail').length,
              totalDuration: run.tests.reduce((sum: number, t: { duration: number }) => sum + t.duration, 0),
              environment: {
                create: {
                  vmlinuxPath: run.environment.vmlinux_path || "",
                  configPath: run.environment.config_path || "",
                  distro: run.environment.distro,
                  kernelRelease: run.environment.kernel_release
                }
              },
              results: {
                create: run.tests.map((test: { name: string; status: string; duration: number; log: string | null }) => ({
                  name: test.name,
                  status: test.status,
                  duration: test.duration,
                  hasLog: !!test.log,
                  ...(test.log && {
                    log: {
                      create: {
                        logPath: test.log
                      }
                    }
                  })
                }))
              }
            }
          });
        }
    }

    return NextResponse.json({ 
      success: true,
      message: 'Test run data imported successfully'
    });

  } catch (error) {
    console.error('Import error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: error.errors
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to process import' },
      { status: 500 }
    );
  }
}
