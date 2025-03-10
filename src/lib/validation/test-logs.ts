import { z } from 'zod';

// Define the log file type literals
export const LOG_FILE_TYPES = ['text', 'archive'] as const;
export type LogFileType = typeof LOG_FILE_TYPES[number];

// Schema for a log file entry
export const LogFileSchema = z.object({
  path: z.string(),
  size: z.number(),
  type: z.enum(LOG_FILE_TYPES),
});

// Schema for the list of log files response
export const LogFilesResponseSchema = z.object({
  files: z.array(LogFileSchema),
});

// Schema for paginated log content
export const LogContentSchema = z.object({
  content: z.string(),
  hasMore: z.boolean(),
  nextCursor: z.string().optional(),
});

// Infer TypeScript types from schemas
export type LogFile = z.infer<typeof LogFileSchema>;
export type LogFilesResponse = z.infer<typeof LogFilesResponseSchema>;
export type LogContent = z.infer<typeof LogContentSchema>;
