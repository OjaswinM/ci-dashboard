import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { SingleTestRunResponseSchema } from '@/lib/validation/test-result';

export async function GET(
  request: Request,
  context: { params: { type: string; subtype: string; id: string } }
) {
  try {
    const { type, subtype: subtypeName, id: runId } = await context.params;

    // First verify the test type and subtype exist
    const testType = await prisma.testType.findUnique({
      where: { name: type },
      include: {
        subtypes: {
          where: { name: subtypeName },
          select: { id: true }
        }
      }
    });

    if (!testType) {
      return NextResponse.json(
        { error: 'Test type not found' },
        { status: 404 }
      );
    }

    const subtype = testType.subtypes[0];
    if (!subtype) {
      return NextResponse.json(
        { error: 'Subtype not found' },
        { status: 404 }
      );
    }

    // Get the test run with all its details
    const run = await prisma.testRun.findUnique({
      where: {
        id: runId,
        testSubtypeId: subtype.id
      },
      include: {
        environment: true,
        results: {
          include: {
            log: true
          },
          orderBy: [
            { name: 'asc' },
            { status: 'desc' },  // Failed tests first
            { duration: 'desc' } // Longer duration tests first
          ]
        },
        _count: {
          select: { results: true }
        }
      }
    });

    if (!run) {
      return NextResponse.json(
        { error: 'Test run not found' },
        { status: 404 }
      );
    }

    // Format and validate the response
    const response = SingleTestRunResponseSchema.parse({
      run: {
        id: run.id,
        timestamp: run.runTimestamp.toISOString(),
        version: run.version,
        stats: {
          totalTests: run._count.results,
          passedTests: run.passedTests ?? 0,
          failedTests: run.failedTests ?? 0,
          totalDuration: run.totalDuration ?? 0,
          passRate: run._count.results > 0 && run.passedTests != null
            ? (run.passedTests / run._count.results) * 100
            : 0
        },
        environment: run.environment ? {
          vmlinuxPath: run.environment.vmlinuxPath,
          configPath: run.environment.configPath,
          distro: run.environment.distro,
          kernelRelease: run.environment.kernelRelease,
          architecture: run.environment.architecture ?? null,
          configName: run.environment.configName ?? null
        } : null,
        results: run.results.map(result => ({
          id: result.id,
          name: result.name,
          status: result.status,
          duration: result.duration,
          errorMessage: result.errorMessage,
          hasLog: !!result.log,
          logPath: result.log?.logPath ?? null
        }))
      }
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching test run:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid response format', details: error.errors },
        { status: 500 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
