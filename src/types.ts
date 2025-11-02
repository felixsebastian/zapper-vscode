import { z } from 'zod';

export const ServiceStatusSchema = z.object({
  service: z.string(),
  rawName: z.string(),
  status: z.string(),
  type: z.enum(['bare_metal', 'docker']),
  cwd: z.string().optional()
});

export const ProcessSchema = z.object({
  cmd: z.string(),
  cwd: z.string().optional(),
  aliases: z.array(z.string()).optional(),
  repo: z.string().optional(),
  name: z.string(),
  profiles: z.array(z.string()).optional()
});

export const ContainerSchema = z.object({
  image: z.string(),
  ports: z.array(z.string()).optional(),
  volumes: z.array(z.string()).optional(),
  name: z.string()
});

export const TaskSchema = z.object({
  name: z.string(),
  cmds: z.array(z.string()),
  cwd: z.string().optional()
});

export const TaskNameSchema = z.object({
  name: z.string()
});

export const ProfileNameSchema = z.object({
  name: z.string()
});

export const ZapperConfigSchema = z.object({
  projectName: z.string(),
  projectRoot: z.string(),
  envFiles: z.array(z.string()),
  processes: z.array(ProcessSchema),
  containers: z.array(ContainerSchema),
  tasks: z.array(TaskSchema)
});

export const ZapperStatusSchema = z.object({
  bareMetal: z.array(ServiceStatusSchema),
  docker: z.array(ServiceStatusSchema)
});

export const ZapperTasksSchema = z.array(TaskNameSchema);
export const ZapperProfilesSchema = z.array(z.string());

export const ZapperStateSchema = z.object({
  activeProfile: z.string().nullable(),
  lastUpdated: z.string()
});

export type ServiceStatus = z.infer<typeof ServiceStatusSchema>;
export type Process = z.infer<typeof ProcessSchema>;
export type Container = z.infer<typeof ContainerSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type TaskName = z.infer<typeof TaskNameSchema>;
export type ProfileName = z.infer<typeof ProfileNameSchema>;
export type ZapperConfig = z.infer<typeof ZapperConfigSchema>;
export type ZapperStatus = z.infer<typeof ZapperStatusSchema>;
export type ZapperTasks = z.infer<typeof ZapperTasksSchema>;
export type ZapperProfiles = z.infer<typeof ZapperProfilesSchema>;
export type ZapperState = z.infer<typeof ZapperStateSchema>;

