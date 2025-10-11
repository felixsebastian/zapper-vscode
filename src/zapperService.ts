import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ZapperStatus, ZapperStatusSchema, ZapperTasks, ZapperTasksSchema } from './types';

export interface ZapperProject {
  rootPath: string;
  name: string;
  status: ZapperStatus | null;
  tasks: ZapperTasks | null;
}

export async function findZapperProjects(): Promise<ZapperProject[]> {
  const projects: ZapperProject[] = [];
  
  // Get all workspace folders
  const workspaceFolders = vscode.workspace.workspaceFolders || [];
  
  for (const folder of workspaceFolders) {
    const zapYamlPath = path.join(folder.uri.fsPath, 'zap.yaml');
    
    try {
      // Check if zap.yaml exists in this folder
      if (fs.existsSync(zapYamlPath)) {
        projects.push({
          rootPath: folder.uri.fsPath,
          name: `${folder.name} (${folder.uri.fsPath})`,
          status: null,
          tasks: null
        });
      }
    } catch (error) {
      console.error(`Error checking zap.yaml in ${folder.uri.fsPath}:`, error);
    }
  }
  
  return projects;
}

export async function executeZapCommand(command: string, workingDirectory: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const { spawn } = require('child_process');
    const process = spawn('zap', command.split(' '), { 
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
    
    process.on('close', (code: number) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`Command failed with code ${code}: ${stderr}`));
      }
    });
  });
}

export async function getZapperStatusForProject(project: ZapperProject): Promise<ZapperStatus | null> {
  try {
    const output = await executeZapCommand('ps --json', project.rootPath);
    const rawData = JSON.parse(output);
    
    // Validate the data with Zod
    const validationResult = ZapperStatusSchema.safeParse(rawData);
    
    if (!validationResult.success) {
      console.error(`Invalid zapper status data for ${project.name}:`, validationResult.error);
      return null;
    }
    
    return validationResult.data;
  } catch (error) {
    console.error(`Failed to get zapper status for ${project.name}:`, error);
    return null;
  }
}

export async function getZapperTasksForProject(project: ZapperProject): Promise<ZapperTasks | null> {
  try {
    const output = await executeZapCommand('task --json', project.rootPath);
    const rawData = JSON.parse(output);
    
    // Validate the data with Zod
    const validationResult = ZapperTasksSchema.safeParse(rawData);
    
    if (!validationResult.success) {
      console.error(`Invalid zapper tasks data for ${project.name}:`, validationResult.error);
      return null;
    }
    
    return validationResult.data;
  } catch (error) {
    console.error(`Failed to get zapper tasks for ${project.name}:`, error);
    return null;
  }
}

export async function getAllZapperStatuses(): Promise<ZapperProject[]> {
  const projects = await findZapperProjects();
  
  // Get status and tasks for each project in parallel
  const statusPromises = projects.map(async (project) => {
    const [status, tasks] = await Promise.all([
      getZapperStatusForProject(project),
      getZapperTasksForProject(project)
    ]);
    return { ...project, status, tasks };
  });
  
  return Promise.all(statusPromises);
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

