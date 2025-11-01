import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ZapperStatus, ZapperStatusSchema, ZapperTasks, ZapperTasksSchema, ZapperConfig, ZapperConfigSchema } from './types';
import { logger } from './logger';

export interface ZapperProject {
  rootPath: string;
  name: string;
  status: ZapperStatus | null;
  tasks: ZapperTasks | null;
}

export async function findZapperProjects(): Promise<ZapperProject[]> {
  logger.info('findZapperProjects: Starting to find projects');
  const projects: ZapperProject[] = [];
  
  // Get all workspace folders
  const workspaceFolders = vscode.workspace.workspaceFolders || [];
  logger.debug(`findZapperProjects: Found ${workspaceFolders.length} workspace folders`);
  
  // Check workspace folders first
  for (const folder of workspaceFolders) {
    const zapYamlPath = path.join(folder.uri.fsPath, 'zap.yaml');
    logger.debug(`findZapperProjects: Checking ${zapYamlPath}`);
    
    try {
      // Check if zap.yaml exists in this folder
      if (fs.existsSync(zapYamlPath)) {
        logger.info(`findZapperProjects: Found zap.yaml in ${folder.uri.fsPath}`);
        projects.push({
          rootPath: folder.uri.fsPath,
          name: `${folder.name} (${folder.uri.fsPath})`,
          status: null,
          tasks: null
        });
      } else {
        logger.debug(`findZapperProjects: No zap.yaml found in ${folder.uri.fsPath}`);
      }
    } catch (error) {
      logger.error(`Error checking zap.yaml in ${folder.uri.fsPath}`, error);
    }
  }
  
  // If no projects found in workspace folders, check current working directory
  if (projects.length === 0) {
    logger.info('findZapperProjects: No projects in workspace folders, checking current directory');
    const currentDir = process.cwd();
    const zapYamlPath = path.join(currentDir, 'zap.yaml');
    logger.debug(`findZapperProjects: Checking ${zapYamlPath}`);
    
    try {
      if (fs.existsSync(zapYamlPath)) {
        logger.info(`findZapperProjects: Found zap.yaml in current directory ${currentDir}`);
        projects.push({
          rootPath: currentDir,
          name: `Current Directory (${currentDir})`,
          status: null,
          tasks: null
        });
      } else {
        logger.debug(`findZapperProjects: No zap.yaml found in current directory ${currentDir}`);
      }
    } catch (error) {
      logger.error(`Error checking zap.yaml in current directory ${currentDir}`, error);
    }
  }
  
  logger.info(`findZapperProjects: Returning ${projects.length} projects`);
  return projects;
}

export async function executeZapCommand(command: string, workingDirectory: string): Promise<string> {
  const zapPath = vscode.workspace.getConfiguration('zapper').get<string>('zapPath');
  const hasCustomPath = zapPath && zapPath.trim() !== '';
  
  logger.debug(`executeZapCommand: Running 'zap ${command}' in ${workingDirectory}${hasCustomPath ? ` (using path: ${zapPath})` : ''}`);
  
  return new Promise((resolve, reject) => {
    const { spawn } = require('child_process');
    const nodeProcess = require('process');
    
    let childProcess;
    
    if (hasCustomPath) {
      // Use the provided path directly - split command into args
      const args = command.split(' ').filter(arg => arg.length > 0);
      childProcess = spawn(zapPath!.trim(), args, {
        cwd: workingDirectory,
        stdio: ['ignore', 'pipe', 'pipe']
      });
    } else {
      // Use shell with login flag to load profile (PATH, etc.)
      const userShell: string = vscode.env.shell || (nodeProcess.platform === 'darwin' ? '/bin/zsh' : '/bin/bash');
      const fullCommand = `zap ${command}`;
      
      // Use -l flag for login shell (loads profile) and -c to execute command
      // For zsh: -l makes it a login shell which sources ~/.zprofile
      // For bash: -l makes it a login shell which sources ~/.bash_profile
      childProcess = spawn(userShell, ['-l', '-c', fullCommand], {
        cwd: workingDirectory,
        stdio: ['ignore', 'pipe', 'pipe']
      });
    }
    
    let stdout = '';
    let stderr = '';
    
    childProcess.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });
    
    childProcess.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });
    
    childProcess.on('error', (error: Error) => {
      logger.error(`executeZapCommand: Process error`, error);
      if (error.message.includes('ENOENT')) {
        const errorMsg = hasCustomPath
          ? `Zap executable not found at path: ${zapPath}. Please check the path in settings.`
          : `zap command not found. Please ensure zapper CLI is installed and available in PATH, or set the 'zapper.zapPath' setting.`;
        reject(new Error(errorMsg));
      } else {
        reject(error);
      }
    });
    
    childProcess.on('close', (code: number) => {
      logger.debug(`executeZapCommand: Command completed with code ${code}`);
      if (code === 0) {
        logger.debug(`executeZapCommand: Success, stdout length: ${stdout.length}`);
        resolve(stdout);
      } else {
        logger.error(`executeZapCommand: Failed with stderr`, new Error(stderr));
        reject(new Error(`Command failed with code ${code}: ${stderr}`));
      }
    });
  });
}

export async function getZapperStatusForProject(project: ZapperProject): Promise<ZapperStatus | null> {
  logger.info(`getZapperStatusForProject: Getting status for ${project.name}`);
  try {
    const output = await executeZapCommand('status --json', project.rootPath);
    logger.debug(`getZapperStatusForProject: Raw output length: ${output.length}`);
    logger.debug(`getZapperStatusForProject: Raw output preview: ${output.substring(0, 200)}...`);
    
    const rawData = JSON.parse(output);
    logger.debug(`getZapperStatusForProject: Parsed JSON data: ${JSON.stringify(rawData)}`);
    
    // Validate the data with Zod
    const validationResult = ZapperStatusSchema.safeParse(rawData);
    
    if (!validationResult.success) {
      logger.error(`Invalid zapper status data for ${project.name}`, validationResult.error);
      return null;
    }
    
    logger.debug(`getZapperStatusForProject: Validation successful for ${project.name}`);
    return validationResult.data;
  } catch (error) {
    logger.error(`Failed to get zapper status for ${project.name}`, error);
    return null;
  }
}

export async function getZapperTasksForProject(project: ZapperProject): Promise<ZapperTasks | null> {
  logger.info(`getZapperTasksForProject: Getting tasks for ${project.name}`);
  try {
    const output = await executeZapCommand('task --json', project.rootPath);
    logger.debug(`getZapperTasksForProject: Raw output length: ${output.length}`);
    logger.debug(`getZapperTasksForProject: Raw output preview: ${output.substring(0, 200)}...`);
    
    const rawData = JSON.parse(output);
    logger.debug(`getZapperTasksForProject: Parsed JSON data: ${JSON.stringify(rawData)}`);
    
    // Validate the data with Zod
    const validationResult = ZapperTasksSchema.safeParse(rawData);
    
    if (!validationResult.success) {
      logger.error(`Invalid zapper tasks data for ${project.name}`, validationResult.error);
      return null;
    }
    
    logger.debug(`getZapperTasksForProject: Validation successful for ${project.name}`);
    return validationResult.data;
  } catch (error) {
    logger.error(`Failed to get zapper tasks for ${project.name}`, error);
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
      logger.error(`Invalid zapper config data for ${project.name}`, validationResult.error);
      return null;
    }
    
    return validationResult.data;
  } catch (error) {
    logger.error(`Failed to get zapper config for ${project.name}`, error);
    return null;
  }
}

export function isUsingCustomPath(): boolean {
  const zapPath = vscode.workspace.getConfiguration('zapper').get<string>('zapPath');
  return Boolean(zapPath && zapPath.trim() !== '');
}

export function getZapPath(): string {
  const zapPath = vscode.workspace.getConfiguration('zapper').get<string>('zapPath');
  return zapPath && zapPath.trim() !== '' ? zapPath.trim() : 'zap';
}

export async function getAllZapperStatuses(): Promise<ZapperProject[]> {
  logger.info('getAllZapperStatuses: Starting to get all zapper statuses');
  const projects = await findZapperProjects();
  logger.debug(`getAllZapperStatuses: Found ${projects.length} projects`);
  
  // Get status and tasks for each project in parallel
  const statusPromises = projects.map(async (project) => {
    logger.debug(`getAllZapperStatuses: Processing project ${project.name}`);
    const [status, tasks] = await Promise.all([
      getZapperStatusForProject(project),
      getZapperTasksForProject(project)
    ]);
    logger.debug(`getAllZapperStatuses: Project ${project.name} - status: ${status ? 'found' : 'null'}, tasks: ${tasks ? 'found' : 'null'}`);
    return { ...project, status, tasks };
  });
  
  const result = await Promise.all(statusPromises);
  logger.info(`getAllZapperStatuses: Returning ${result.length} projects with data`);
  return result;
}

export async function startService(projectPath: string, serviceName: string): Promise<void> {
  try {
    await executeZapCommand(`up ${serviceName}`, projectPath);
  } catch (error) {
    logger.error(`Failed to start service ${serviceName}`, error);
    throw error;
  }
}

export async function stopService(projectPath: string, serviceName: string): Promise<void> {
  try {
    await executeZapCommand(`down ${serviceName}`, projectPath);
  } catch (error) {
    logger.error(`Failed to stop service ${serviceName}`, error);
    throw error;
  }
}

export async function restartService(projectPath: string, serviceName: string): Promise<void> {
  try {
    await executeZapCommand(`restart ${serviceName}`, projectPath);
  } catch (error) {
    logger.error(`Failed to restart service ${serviceName}`, error);
    throw error;
  }
}

export async function runTask(projectPath: string, taskName: string): Promise<void> {
  try {
    await executeZapCommand(`task ${taskName}`, projectPath);
  } catch (error) {
    logger.error(`Failed to run task ${taskName}`, error);
    throw error;
  }
}

export async function startAllServices(projectPath: string): Promise<void> {
  try {
    await executeZapCommand('up', projectPath);
  } catch (error) {
    logger.error('Failed to start all services', error);
    throw error;
  }
}

export async function stopAllServices(projectPath: string): Promise<void> {
  try {
    await executeZapCommand('down', projectPath);
  } catch (error) {
    logger.error('Failed to stop all services', error);
    throw error;
  }
}

export async function restartAllServices(projectPath: string): Promise<void> {
  try {
    await executeZapCommand('restart', projectPath);
  } catch (error) {
    logger.error('Failed to restart all services', error);
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
    logger.error(`Failed to open terminal and run command`, error);
    throw error;
  }
}

export async function openLogsTerminal(projectPath: string, serviceName: string): Promise<void> {
  const zapCommand = getZapPath();
  const command = `${zapCommand} logs ${serviceName}`;
  await openTerminalAndRunCommand(command, projectPath, `Logs: ${serviceName}`);
}

export async function openTaskTerminal(projectPath: string, taskName: string): Promise<void> {
  const zapCommand = getZapPath();
  const command = `${zapCommand} task ${taskName}`;
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
    logger.error(`Failed to open terminal for service ${serviceName}`, error);
    throw error;
  }
}

