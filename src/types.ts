import { z } from 'zod';

export const ServiceStatusSchema = z.object({
  service: z.string(),
  rawName: z.string(),
  status: z.string(),
  type: z.enum(['bare_metal', 'docker'])
});

export const TaskSchema = z.object({
  name: z.string(),
  description: z.string().optional()
});

export const ZapperStatusSchema = z.object({
  bareMetal: z.array(ServiceStatusSchema),
  docker: z.array(ServiceStatusSchema)
});

export const ZapperTasksSchema = z.array(TaskSchema);

export type ServiceStatus = z.infer<typeof ServiceStatusSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type ZapperStatus = z.infer<typeof ZapperStatusSchema>;
export type ZapperTasks = z.infer<typeof ZapperTasksSchema>;

