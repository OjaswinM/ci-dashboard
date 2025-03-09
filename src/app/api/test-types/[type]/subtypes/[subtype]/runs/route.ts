import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { TestRunsResponseSchema } from '@/lib/validation/test-runs-api';
import { PaginationSchema, type PaginationParams } from '@/lib/validation/pagination';

export async function GET(
  request: Request,
  context: { params: { type: string; subtype: string } }
) {
  try {
    const { type, subtype: subtypeName } = await context.params;
    const url = new URL(request.url);
    const searchParams = new URLSearchParams(url.search);
    const validatedParams: PaginationParams = PaginationSchema.parse({
      cursor: searchParams.get('cursor') || undefined,
      limit: searchParams.has('limit') ? parseInt(searchParams.get('limit') || '50') : undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined
    });

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

    // Build date filter if provided
    const dateFilter = {
      ...(validatedParams.startDate && {
        gte: new Date(validatedParams.startDate)
      }),
      ...(validatedParams.endDate && {
        lte: new Date(validatedParams.endDate)
      })
    };

    // Get runs with their test results summary
    const runs = await prisma.testRun.findMany({
      where: {
        testSubtypeId: subtype.id,
        ...(Object.keys(dateFilter).length > 0 && {
          runTimestamp: dateFilter
        })
      },
      take: validatedParams.limit,
      ...(validatedParams.cursor ? {
        skip: 1,
        cursor: {
          id: validatedParams.cursor as string,
        },
      } : {}),
      include: {
        environment: true,
        _count: {
          select: { results: true }
        }
      },
      orderBy: { runTimestamp: 'desc' }
    });

    // Get total count for progress indicators
    const totalCount = await prisma.testRun.count({
      where: {
        testSubtypeId: subtype.id,
        ...(Object.keys(dateFilter).length > 0 && {
          runTimestamp: dateFilter
        })
      }
    });

    // Format and validate the response data
    const response = TestRunsResponseSchema.parse({
      items: runs.map(run => ({
        id: run.id,
        timestamp: run.runTimestamp.toISOString(),
        stats: {
          totalTests: run._count.results,
          passedTests: run.passedTests ?? 0,
          failedTests: run.failedTests ?? 0,
          totalDuration: run.totalDuration ?? 0,
          passRate: run._count.results > 0 && run.passedTests != null
            ? (run.passedTests / run._count.results) * 100 
            : 0
        },
        environment: {
          vmlinuxPath: run.environment?.vmlinuxPath ?? null,
          configPath: run.environment?.configPath ?? null,
          distro: run.environment?.distro ?? null,
          kernelRelease: run.environment?.kernelRelease ?? null,
          architecture: run.environment?.architecture ?? null,
          configName: run.environment?.configName ?? null
        }
      })),
      nextCursor: runs.length === validatedParams.limit 
        ? runs[runs.length - 1].id
        : undefined,
      totalCount
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching runs:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
