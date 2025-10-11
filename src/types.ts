import { z } from 'zod';

export const ServiceStatusSchema = z.object({
  service: z.string(),
  rawName: z.string(),
  status: z.string(),
  type: z.enum(['bare_metal', 'docker'])
});

export const ZapperStatusSchema = z.object({
  bareMetal: z.array(ServiceStatusSchema),
  docker: z.array(ServiceStatusSchema)
});

export type ServiceStatus = z.infer<typeof ServiceStatusSchema>;
export type ZapperStatus = z.infer<typeof ZapperStatusSchema>;

