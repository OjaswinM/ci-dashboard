import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const PaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().min(1).max(100).optional().default(50),
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const searchParams = new URLSearchParams(url.search);
    const validatedParams = PaginationSchema.parse({
      cursor: searchParams.get('cursor') || undefined,
      limit: searchParams.has('limit') ? parseInt(searchParams.get('limit') || '50') : undefined,
    });

    // Get test types with their subtypes count and latest run stats
    const testTypes = await prisma.testType.findMany({
      take: validatedParams.limit,
      ...(validatedParams.cursor ? {
        skip: 1,
        cursor: {
          id: validatedParams.cursor as string,
        },
      } : {}),
      include: {
        _count: {
          select: { subtypes: true }
        },
        subtypes: {
          include: {
            runs: {
              orderBy: { runTimestamp: 'desc' },
              take: 1,
              include: {
                _count: {
                  select: { results: true }
                }
              }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Calculate summary statistics for each test type
    const testTypesWithStats = testTypes.map(testType => {
      const latestRuns = testType.subtypes.map(subtype => subtype.runs[0]).filter(Boolean);
      const totalTests = latestRuns.reduce((sum, run) => sum + (run?._count?.results || 0), 0);
      const totalPassed = latestRuns.reduce((sum, run) => sum + (run?.passedTests || 0), 0);
      
      return {
        id: testType.id,
        name: testType.name,
        subtypeCount: testType._count.subtypes,
        stats: {
          totalTests,
          passedTests: totalPassed,
          passRate: totalTests > 0 ? (totalPassed / totalTests) * 100 : 0
        }
      };
    });

    // Get the next cursor
    const nextCursor = testTypes.length === validatedParams.limit 
      ? testTypes[testTypes.length - 1].id as string 
      : undefined;

    // Get total count for progress indicators
    const totalCount = await prisma.testType.count();

    return NextResponse.json({
      items: testTypesWithStats,
      nextCursor,
      totalCount
    });

  } catch (error) {
    console.error('Error fetching test types:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch test types' },
      { status: 500 }
    );
  }
}
