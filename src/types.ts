export interface ServiceStatus {
  name: string;
  status: string;
  type: 'process' | 'container';
}

export interface ZapperStatus {
  processes: ServiceStatus[];
  containers: ServiceStatus[];
}

