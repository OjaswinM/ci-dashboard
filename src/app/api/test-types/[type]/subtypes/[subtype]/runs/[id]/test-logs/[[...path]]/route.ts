import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';
import { LogFilesResponseSchema, LogContentSchema } from '@/lib/validation/test-logs';
import { LocalFileHandler } from '@/lib/logs/file-handler';

const fileHandler = new LocalFileHandler();

const RouteParamsSchema = z.object({
  type: z.string(),
  subtype: z.string(),
  id: z.string(),
  path: z.array(z.string()).default([])
});

const QueryParamsSchema = z.object({
  cursor: z.string().optional(),
  filePath: z.string().optional(),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ type: string; subtype: string; id: string; path: string[] }> }
) {
  try {
    // Validate route parameters
    const params = RouteParamsSchema.parse(await context.params);
    
    // The test name will be all parts of the path joined with '/'
    const testName = params.path.join('/');
    // Parse query parameters
    const url = new URL(request.url);
    const query = QueryParamsSchema.parse(Object.fromEntries(url.searchParams));

    // First verify the test type and subtype exist
    const testType = await prisma.testType.findUnique({
      where: { name: params.type },
      include: {
        subtypes: {
          where: { name: params.subtype },
          select: { id: true }
        }
      }
    });

    if (!testType?.subtypes[0]) {
      return NextResponse.json(
        { error: 'Test type or subtype not found' },
        { status: 404 }
      );
    }

    // Get the test result with its log
    const testResult = await prisma.testResult.findFirst({
      where: {
        testRun: {
          id: params.id,
          testSubtypeId: testType.subtypes[0].id
        },
        name: testName
      },
      include: {
        log: true
      }
    });

    if (!testResult?.log?.logPath) {
      return NextResponse.json(
        { error: 'Test log not found' },
        { status: 404 }
      );
    }

    // Resolve the log path - if it's relative, make it absolute
    const logPath = path.isAbsolute(testResult.log.logPath)
      ? testResult.log.logPath
      : path.resolve(process.cwd(), testResult.log.logPath);
    
    // Check if the log file exists and is accessible
    try {
      const logStats = await fs.stat(logPath);

      if (!logStats.isFile()) {
        return NextResponse.json(
          { error: 'Log path exists but is not a file' },
          { status: 500 }
        );
      }

      if (logStats.size === 0) {
        return NextResponse.json(
          { error: 'Log file is empty' },
          { status: 500 }
        );
      }
    } catch (error) {
      console.error('Error accessing log file:', {
        path: testResult.log.logPath,
        error: error instanceof Error ? error.message : error
      });
      return NextResponse.json(
        { error: `Log file not accessible: ${error instanceof Error ? error.message : 'unknown error'}` },
        { status: 500 }
      );
    }

    // If filePath is provided, return paginated content of that file
    if (query.filePath) {
      const resolvedFilePath = path.isAbsolute(query.filePath)
        ? query.filePath
        : path.join(path.dirname(logPath), query.filePath);
      
      try {
        const fileStats = await fs.stat(resolvedFilePath);
        if (!fileStats.isFile()) {
          return NextResponse.json(
            { error: 'Requested path exists but is not a file' },
            { status: 400 }
          );
        }
      } catch (error) {
        return NextResponse.json(
          { error: `Requested file not accessible: ${error instanceof Error ? error.message : 'unknown error'}` },
          { status: 404 }
        );
      }
      
      const content = await fileHandler.getLogContent(
        resolvedFilePath,
        query.cursor,
        32000 // 32KB chunks
      );
      
      const response = LogContentSchema.parse(content);
      return NextResponse.json(response);
    }

    // Otherwise, return list of log files
    try {
      const files = await fileHandler.getLogFiles(logPath);
      
      // Ensure all file paths are relative to the log directory
      const relativePaths = files.map(file => ({
        ...file,
        path: path.relative(path.dirname(logPath), file.path)
      }));
      
      const response = LogFilesResponseSchema.parse({ files: relativePaths });
      return NextResponse.json(response);
    } catch (error) {
      console.error('Error getting log files:', {
        logPath,
        error: error instanceof Error ? error.message : error
      });
      
      return NextResponse.json(
        { error: `Failed to get log files: ${error instanceof Error ? error.message : 'unknown error'}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error handling log request:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request format', details: error.errors },
        { status: 400 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Unhandled error in test logs route:', {
      error: errorMessage,
    });
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  } finally {
    await fileHandler.cleanup?.();
  }
}
