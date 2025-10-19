import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ZapperStatus, ZapperStatusSchema, ZapperTasks, ZapperTasksSchema, ZapperConfig, ZapperConfigSchema } from './types';

export interface ZapperProject {
  rootPath: string;
  name: string;
  status: ZapperStatus | null;
  tasks: ZapperTasks | null;
}

export async function findZapperProjects(): Promise<ZapperProject[]> {
  console.log('findZapperProjects: Starting to find projects');
  const projects: ZapperProject[] = [];
  
  // Get all workspace folders
  const workspaceFolders = vscode.workspace.workspaceFolders || [];
  console.log(`findZapperProjects: Found ${workspaceFolders.length} workspace folders`);
  
  // Check workspace folders first
  for (const folder of workspaceFolders) {
    const zapYamlPath = path.join(folder.uri.fsPath, 'zap.yaml');
    console.log(`findZapperProjects: Checking ${zapYamlPath}`);
    
    try {
      // Check if zap.yaml exists in this folder
      if (fs.existsSync(zapYamlPath)) {
        console.log(`findZapperProjects: Found zap.yaml in ${folder.uri.fsPath}`);
        projects.push({
          rootPath: folder.uri.fsPath,
          name: `${folder.name} (${folder.uri.fsPath})`,
          status: null,
          tasks: null
        });
      } else {
        console.log(`findZapperProjects: No zap.yaml found in ${folder.uri.fsPath}`);
      }
    } catch (error) {
      console.error(`Error checking zap.yaml in ${folder.uri.fsPath}:`, error);
    }
  }
  
  // If no projects found in workspace folders, check current working directory
  if (projects.length === 0) {
    console.log('findZapperProjects: No projects in workspace folders, checking current directory');
    const currentDir = process.cwd();
    const zapYamlPath = path.join(currentDir, 'zap.yaml');
    console.log(`findZapperProjects: Checking ${zapYamlPath}`);
    
    try {
      if (fs.existsSync(zapYamlPath)) {
        console.log(`findZapperProjects: Found zap.yaml in current directory ${currentDir}`);
        projects.push({
          rootPath: currentDir,
          name: `Current Directory (${currentDir})`,
          status: null,
          tasks: null
        });
      } else {
        console.log(`findZapperProjects: No zap.yaml found in current directory ${currentDir}`);
      }
    } catch (error) {
      console.error(`Error checking zap.yaml in current directory ${currentDir}:`, error);
    }
  }
  
  console.log(`findZapperProjects: Returning ${projects.length} projects`);
  return projects;
}

export async function executeZapCommand(command: string, workingDirectory: string): Promise<string> {
  // Get custom command from settings
  const customCommand = vscode.workspace.getConfiguration('zapper').get<string>('customCommand');
  const zapCommand = customCommand && customCommand.trim() !== '' ? customCommand : 'zap';
  
  console.log(`executeZapCommand: Running '${zapCommand} ${command}' in ${workingDirectory}`);
  return new Promise((resolve, reject) => {
    const { spawn } = require('child_process');
    const process = spawn(zapCommand, command.split(' '), { 
      shell: true,
      cwd: workingDirectory
    });
    
    let stdout = '';
    let stderr = '';
    
    process.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });
    
    process.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });
    
    process.on('error', (error: Error) => {
      console.error(`executeZapCommand: Process error: ${error.message}`);
      if (error.message.includes('ENOENT')) {
        reject(new Error(`${zapCommand} command not found. Please ensure zapper CLI is installed and available in PATH.`));
      } else {
        reject(error);
      }
    });
    
    process.on('close', (code: number) => {
      console.log(`executeZapCommand: Command completed with code ${code}`);
      if (code === 0) {
        console.log(`executeZapCommand: Success, stdout length: ${stdout.length}`);
        resolve(stdout);
      } else {
        console.error(`executeZapCommand: Failed with stderr: ${stderr}`);
        reject(new Error(`Command failed with code ${code}: ${stderr}`));
      }
    });
  });
}

export async function getZapperStatusForProject(project: ZapperProject): Promise<ZapperStatus | null> {
  console.log(`getZapperStatusForProject: Getting status for ${project.name}`);
  try {
    const output = await executeZapCommand('status --json', project.rootPath);
    console.log(`getZapperStatusForProject: Raw output length: ${output.length}`);
    console.log(`getZapperStatusForProject: Raw output preview: ${output.substring(0, 200)}...`);
    
    const rawData = JSON.parse(output);
    console.log(`getZapperStatusForProject: Parsed JSON data:`, rawData);
    
    // Validate the data with Zod
    const validationResult = ZapperStatusSchema.safeParse(rawData);
    
    if (!validationResult.success) {
      console.error(`Invalid zapper status data for ${project.name}:`, validationResult.error);
      return null;
    }
    
    console.log(`getZapperStatusForProject: Validation successful for ${project.name}`);
    return validationResult.data;
  } catch (error) {
    console.error(`Failed to get zapper status for ${project.name}:`, error);
    return null;
  }
}

export async function getZapperTasksForProject(project: ZapperProject): Promise<ZapperTasks | null> {
  console.log(`getZapperTasksForProject: Getting tasks for ${project.name}`);
  try {
    const output = await executeZapCommand('task --json', project.rootPath);
    console.log(`getZapperTasksForProject: Raw output length: ${output.length}`);
    console.log(`getZapperTasksForProject: Raw output preview: ${output.substring(0, 200)}...`);
    
    const rawData = JSON.parse(output);
    console.log(`getZapperTasksForProject: Parsed JSON data:`, rawData);
    
    // Validate the data with Zod
    const validationResult = ZapperTasksSchema.safeParse(rawData);
    
    if (!validationResult.success) {
      console.error(`Invalid zapper tasks data for ${project.name}:`, validationResult.error);
      return null;
    }
    
    console.log(`getZapperTasksForProject: Validation successful for ${project.name}`);
    return validationResult.data;
  } catch (error) {
    console.error(`Failed to get zapper tasks for ${project.name}:`, error);
    return null;
  }
}

export async function getZapperConfigForProject(project: ZapperProject): Promise<ZapperConfig | null> {
  try {
    const output = await executeZapCommand('config --pretty', project.rootPath);
    const rawData = JSON.parse(output);
    
    // Validate the data with Zod
    const validationResult = ZapperConfigSchema.safeParse(rawData);
    
    if (!validationResult.success) {
      console.error(`Invalid zapper config data for ${project.name}:`, validationResult.error);
      return null;
    }
    
    return validationResult.data;
  } catch (error) {
    console.error(`Failed to get zapper config for ${project.name}:`, error);
    return null;
  }
}

export function isUsingCustomCommand(): boolean {
  const customCommand = vscode.workspace.getConfiguration('zapper').get<string>('customCommand');
  return Boolean(customCommand && customCommand.trim() !== '');
}

export function getZapCommand(): string {
  const customCommand = vscode.workspace.getConfiguration('zapper').get<string>('customCommand');
  return customCommand && customCommand.trim() !== '' ? customCommand : 'zap';
}

export async function getAllZapperStatuses(): Promise<ZapperProject[]> {
  console.log('getAllZapperStatuses: Starting to get all zapper statuses');
  const projects = await findZapperProjects();
  console.log(`getAllZapperStatuses: Found ${projects.length} projects`);
  
  // Get status and tasks for each project in parallel
  const statusPromises = projects.map(async (project) => {
    console.log(`getAllZapperStatuses: Processing project ${project.name}`);
    const [status, tasks] = await Promise.all([
      getZapperStatusForProject(project),
      getZapperTasksForProject(project)
    ]);
    console.log(`getAllZapperStatuses: Project ${project.name} - status: ${status ? 'found' : 'null'}, tasks: ${tasks ? 'found' : 'null'}`);
    return { ...project, status, tasks };
  });
  
  const result = await Promise.all(statusPromises);
  console.log(`getAllZapperStatuses: Returning ${result.length} projects with data`);
  return result;
}

export async function startService(projectPath: string, serviceName: string): Promise<void> {
  try {
    await executeZapCommand(`up ${serviceName}`, projectPath);
  } catch (error) {
    console.error(`Failed to start service ${serviceName}:`, error);
    throw error;
  }
}

export async function stopService(projectPath: string, serviceName: string): Promise<void> {
  try {
    await executeZapCommand(`down ${serviceName}`, projectPath);
  } catch (error) {
    console.error(`Failed to stop service ${serviceName}:`, error);
    throw error;
  }
}

export async function restartService(projectPath: string, serviceName: string): Promise<void> {
  try {
    await executeZapCommand(`restart ${serviceName}`, projectPath);
  } catch (error) {
    console.error(`Failed to restart service ${serviceName}:`, error);
    throw error;
  }
}

export async function runTask(projectPath: string, taskName: string): Promise<void> {
  try {
    await executeZapCommand(`task ${taskName}`, projectPath);
  } catch (error) {
    console.error(`Failed to run task ${taskName}:`, error);
    throw error;
  }
}

export async function startAllServices(projectPath: string): Promise<void> {
  try {
    await executeZapCommand('up', projectPath);
  } catch (error) {
    console.error('Failed to start all services:', error);
    throw error;
  }
}

export async function stopAllServices(projectPath: string): Promise<void> {
  try {
    await executeZapCommand('down', projectPath);
  } catch (error) {
    console.error('Failed to stop all services:', error);
    throw error;
  }
}

export async function restartAllServices(projectPath: string): Promise<void> {
  try {
    await executeZapCommand('restart', projectPath);
  } catch (error) {
    console.error('Failed to restart all services:', error);
    throw error;
  }
}

export async function openTerminalAndRunCommand(command: string, projectPath: string, terminalName?: string): Promise<void> {
  try {
    const terminal = vscode.window.createTerminal({
      name: terminalName || 'Zapper',
      cwd: projectPath,
      location: vscode.TerminalLocation.Editor
    });
    
    terminal.show();
    terminal.sendText(command);
  } catch (error) {
    console.error(`Failed to open terminal and run command:`, error);
    throw error;
  }
}

export async function openLogsTerminal(projectPath: string, serviceName: string): Promise<void> {
  const command = `zap logs ${serviceName}`;
  await openTerminalAndRunCommand(command, projectPath, `Logs: ${serviceName}`);
}

export async function openTaskTerminal(projectPath: string, taskName: string): Promise<void> {
  const command = `zap task ${taskName}`;
  await openTerminalAndRunCommand(command, projectPath, `Task: ${taskName}`);
}

export async function openServiceTerminal(projectPath: string, serviceName: string): Promise<void> {
  try {
    // Get the project configuration to find the cwd
    const project: ZapperProject = {
      rootPath: projectPath,
      name: 'temp', // We don't need the name for config fetching
      status: null,
      tasks: null
    };
    
    const config = await getZapperConfigForProject(project);
    if (!config) {
      throw new Error('Failed to get zapper configuration');
    }
    
    // Find the service in the processes array
    const service = config.processes.find(p => p.name === serviceName);
    let targetPath = projectPath;
    
    if (service && service.cwd) {
      targetPath = `${projectPath}/${service.cwd}`;
    } else {
      // Fallback to service name if no cwd specified
      targetPath = `${projectPath}/${serviceName}`;
    }
    
    const terminalName = `Terminal: ${serviceName}`;
    
    const terminal = vscode.window.createTerminal({
      name: terminalName,
      cwd: targetPath,
      location: vscode.TerminalLocation.Editor
    });
    
    terminal.show();
  } catch (error) {
    console.error(`Failed to open terminal for service ${serviceName}:`, error);
    throw error;
  }
}

