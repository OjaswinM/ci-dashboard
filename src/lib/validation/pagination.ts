import { z } from 'zod';

export const PaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().min(1).max(100).optional().default(50),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});

export type PaginationParams = z.infer<typeof PaginationSchema>;
