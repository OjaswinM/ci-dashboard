import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const PaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().min(1).max(100).optional().default(50),
});

export async function GET(
  request: Request,
  context: { params: { type: string } }
) {
  try {
    const { type } = await context.params;
    const url = new URL(request.url);
    const searchParams = new URLSearchParams(url.search);
    const validatedParams = PaginationSchema.parse({
      cursor: searchParams.get('cursor') || undefined,
      limit: searchParams.has('limit') ? parseInt(searchParams.get('limit') || '50') : undefined,
    });

    // First verify the test type exists
    const testType = await prisma.testType.findUnique({
      where: { name: type },
      select: { id: true }
    });

    if (!testType) {
      return NextResponse.json(
        { error: 'Test type not found' },
        { status: 404 }
      );
    }

    // Get subtypes with their latest run information
    const subtypes = await prisma.testSubtype.findMany({
      where: { testTypeId: testType.id },
      take: validatedParams.limit,
      ...(validatedParams.cursor ? {
        skip: 1,
        cursor: {
          id: validatedParams.cursor as string,
        },
      } : {}),
      include: {
        runs: {
          orderBy: { runTimestamp: 'desc' },
          take: 1,
          include: {
            _count: {
              select: { results: true }
            },
            results: {
              select: {
                status: true
              }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Calculate statistics for each subtype
    const subtypesWithStats = subtypes.map(subtype => {
      const latestRun = subtype.runs[0];
      const stats = latestRun ? {
        totalTests: latestRun._count.results,
        passedTests: latestRun.passedTests ?? 0,
        failedTests: latestRun.failedTests ?? 0,
        passRate: latestRun._count.results > 0 
          ? ((latestRun.passedTests ?? 0) / latestRun._count.results) * 100 
          : 0,
        lastRunTimestamp: latestRun.runTimestamp
      } : null;

      return {
        id: subtype.id,
        name: subtype.name,
        stats
      };
    });

    // Get the next cursor
    const nextCursor = subtypes.length === validatedParams.limit 
      ? subtypes[subtypes.length - 1].id as string 
      : undefined;

    // Get total count for progress indicators
    const totalCount = await prisma.testSubtype.count({
      where: { testTypeId: testType.id }
    });

    return NextResponse.json({
      items: subtypesWithStats,
      nextCursor,
      totalCount
    });

  } catch (error) {
    console.error('Error fetching subtypes:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch subtypes' },
      { status: 500 }
    );
  }
}
