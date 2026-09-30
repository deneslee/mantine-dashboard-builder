import { z } from 'zod';

export const chartOptions = z.object({
  form: z.enum(['area', 'line', 'bar']).default('area'),
});

export type ChartOptions = z.infer<typeof chartOptions>;
