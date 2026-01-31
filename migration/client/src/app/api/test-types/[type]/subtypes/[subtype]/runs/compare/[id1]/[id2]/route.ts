import { NextResponse } from 'next/server';
import { SingleTestRunResponseSchema } from '@/lib/validation/test-result';
import { TestComparisonResponseSchema } from '@/lib/validation/test-comparison';
import { z } from 'zod';

export async function GET(
  request: Request,
  { params }: { params: { type: string; subtype: string; id1: string; id2: string } }
) {
  try {
    // Fetch both runs in parallel
    const [run1Response, run2Response] = await Promise.all([
      fetch(new URL(
        `/api/test-types/${encodeURIComponent(params.type)}/subtypes/${encodeURIComponent(params.subtype)}/runs/${params.id1}`,
        request.url
      )),
      fetch(new URL(
        `/api/test-types/${encodeURIComponent(params.type)}/subtypes/${encodeURIComponent(params.subtype)}/runs/${params.id2}`,
        request.url
      ))
    ]);

    if (!run1Response.ok || !run2Response.ok) {
      throw new Error('Failed to fetch one or both runs');
    }

    const [run1Data, run2Data] = await Promise.all([
      run1Response.json(),
      run2Response.json()
    ]);

    // Validate both runs using our schema
    const run1 = SingleTestRunResponseSchema.parse(run1Data);
    const run2 = SingleTestRunResponseSchema.parse(run2Data);

    // Calculate comparison statistics
    const stats = {
      newFailures: run1.run.results.filter(r => 
        r.status.toLowerCase() === 'fail' && 
        run2.run.results.find(cr => cr.name === r.name)?.status.toLowerCase() === 'pass'
      ).length,
      newPasses: run1.run.results.filter(r => 
        r.status.toLowerCase() === 'pass' && 
        run2.run.results.find(cr => cr.name === r.name)?.status.toLowerCase() === 'fail'
      ).length,
      newSkips: run1.run.results.filter(r => 
        r.status.toLowerCase() === 'skip' && 
        run2.run.results.find(cr => cr.name === r.name)?.status.toLowerCase() !== 'skip'
      ).length
    };

    // Validate and format the comparison response
    const comparisonResponse = TestComparisonResponseSchema.parse({
      currentRun: run1.run,
      compareRun: run2.run,
      stats
    });

    return NextResponse.json(comparisonResponse);
  } catch (error) {
    console.error('Error comparing runs:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred while comparing runs' },
      { status: 500 }
    );
  }
}
