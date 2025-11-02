import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';
import * as os from 'os';
import { ZapperStatus, ZapperStatusSchema, ZapperTasks, ZapperTasksSchema, ZapperProfiles, ZapperProfilesSchema, ZapperState, ZapperStateSchema, ZapperConfig, ZapperConfigSchema } from './types';
import { logger } from './logger';

export interface ZapperProject {
  rootPath: string;
  name: string;
  status: ZapperStatus | null;
  tasks: ZapperTasks | null;
  profiles: ZapperProfiles | null;
  activeProfile: string | null;
}

let cachedZapPath: string | null = null;
let zapPathLookupAttempted = false;

let cachedNodePath: string | null = null;
let nodePathLookupAttempted = false;

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
          tasks: null,
          profiles: null,
          activeProfile: null
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
          tasks: null,
          profiles: null,
          activeProfile: null
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

async function locateZapBinary(): Promise<string | null> {
  if (cachedZapPath !== null) {
    return cachedZapPath;
  }
  
  if (zapPathLookupAttempted) {
    return null;
  }
  
  zapPathLookupAttempted = true;
  
  try {
    const isWindows = os.platform() === 'win32';
    const whichCommand = isWindows ? 'where' : 'which';
    
    try {
      const result = execSync(`${whichCommand} zap`, { encoding: 'utf-8', timeout: 5000 }).trim();
      if (result && fs.existsSync(result)) {
        logger.info(`locateZapBinary: Found zap at ${result} via ${whichCommand}`);
        cachedZapPath = result;
        return result;
      }
    } catch (error) {
      logger.debug(`locateZapBinary: ${whichCommand} zap failed, trying alternative locations`);
    }
    
    const homeDir = os.homedir();
    const commonPaths = [
      path.join(homeDir, '.local', 'bin', 'zap'),
      path.join(homeDir, '.npm-global', 'bin', 'zap'),
      '/usr/local/bin/zap',
      '/opt/homebrew/bin/zap',
      path.join(path.dirname(process.execPath), 'zap'),
    ];
    
    if (isWindows) {
      commonPaths.push(
        path.join(process.env.LOCALAPPDATA || '', 'npm', 'zap.cmd'),
        path.join(process.env.APPDATA || '', 'npm', 'zap.cmd'),
        path.join(process.env.ProgramFiles || '', 'nodejs', 'zap.cmd'),
      );
    }
    
    for (const testPath of commonPaths) {
      if (fs.existsSync(testPath)) {
        logger.info(`locateZapBinary: Found zap at ${testPath}`);
        cachedZapPath = testPath;
        return testPath;
      }
    }
    
    if (homeDir) {
      const nvmVersionsPath = path.join(homeDir, '.nvm', 'versions', 'node');
      if (fs.existsSync(nvmVersionsPath)) {
        try {
          const versions = fs.readdirSync(nvmVersionsPath).filter(v => {
            const versionPath = path.join(nvmVersionsPath, v);
            return fs.statSync(versionPath).isDirectory();
          });
          
          for (const version of versions) {
            const zapPath = path.join(nvmVersionsPath, version, 'bin', 'zap');
            if (fs.existsSync(zapPath)) {
              logger.info(`locateZapBinary: Found zap at ${zapPath} (via nvm)`);
              cachedZapPath = zapPath;
              return zapPath;
            }
          }
        } catch (error) {
          logger.debug(`locateZapBinary: Error checking nvm directory: ${error}`);
        }
      }
    }
    
    logger.warn('locateZapBinary: Could not locate zap binary via auto-detection');
    return null;
  } catch (error) {
    logger.error('locateZapBinary: Error during lookup', error);
    return null;
  }
}

async function getZapBinaryPath(): Promise<string> {
  const resolvedPath = await locateZapBinary();
  
  if (resolvedPath) {
    return resolvedPath;
  }
  
  const userProvidedPath = vscode.workspace.getConfiguration('zapper').get<string>('zapPath');
  if (userProvidedPath && userProvidedPath.trim() !== '') {
    const resolvedUserPath = path.resolve(userProvidedPath.trim());
    if (fs.existsSync(resolvedUserPath)) {
      logger.debug(`getZapBinaryPath: Using user-provided path: ${resolvedUserPath}`);
      return resolvedUserPath;
    }
    logger.warn(`getZapBinaryPath: User-provided path does not exist: ${resolvedUserPath}`);
  }
  
  return 'zap';
}

export async function executeZapCommand(command: string, workingDirectory: string): Promise<string> {
  let zapPath = await getZapBinaryPath();
  let isExplicitPath = zapPath !== 'zap' && path.isAbsolute(zapPath);
  
  // If we're using 'zap' (not explicit path), try to locate it first
  if (!isExplicitPath) {
    const locatedPath = await locateZapBinary();
    if (locatedPath) {
      zapPath = locatedPath;
      isExplicitPath = true;
      logger.debug(`executeZapCommand: Located zap at ${zapPath}, using explicit path`);
    }
  }
  
  logger.debug(`executeZapCommand: Running 'zap ${command}' in ${workingDirectory}${isExplicitPath ? ` (using path: ${zapPath})` : ' (using PATH)'}`);
  
  // Debug: Check if zap file exists and read its shebang
  if (isExplicitPath && fs.existsSync(zapPath)) {
    try {
      const firstLine = fs.readFileSync(zapPath, 'utf-8').split('\n')[0];
      logger.debug(`executeZapCommand: Zap file shebang: ${firstLine}`);
    } catch (error) {
      logger.debug(`executeZapCommand: Could not read zap file: ${error}`);
    }
  }
  
  // Get detected node executable path (or fallback to VS Code's node runtime)
  const nodeExecPath = await getNodeBinaryPath();
  const nodeDir = path.dirname(nodeExecPath);
  const nodeExe = path.basename(nodeExecPath);
  
  return new Promise((resolve, reject) => {
    const { spawn } = require('child_process');
    const nodeProcess = require('process');
    
    // Build environment with node in PATH
    const env = { ...nodeProcess.env };
    
    // Debug: Log current PATH and node info
    logger.debug(`executeZapCommand: Node execPath: ${nodeExecPath}`);
    logger.debug(`executeZapCommand: Node dir: ${nodeDir}`);
    logger.debug(`executeZapCommand: Node exe: ${nodeExe}`);
    logger.debug(`executeZapCommand: Original PATH: ${env.PATH || '(not set)'}`);
    
    // Ensure node directory is at the beginning of PATH
    if (env.PATH) {
      const pathParts = env.PATH.split(path.delimiter || ':');
      if (!pathParts.includes(nodeDir)) {
        env.PATH = `${nodeDir}${path.delimiter || ':'}${env.PATH}`;
      }
    } else {
      env.PATH = nodeDir;
    }
    
    logger.debug(`executeZapCommand: Updated PATH: ${env.PATH}`);
    
    // Verify node is accessible
    try {
      if (!fs.existsSync(nodeExecPath)) {
        logger.error(`executeZapCommand: Node executable does not exist at ${nodeExecPath}`);
      } else {
        logger.debug(`executeZapCommand: Verified node exists at ${nodeExecPath}`);
      }
    } catch (error) {
      logger.error(`executeZapCommand: Error checking node executable`, error);
    }
    
    let childProcess;
    
    if (isExplicitPath) {
      // Check if zap is a node script that we should execute with node directly
      let useNodeDirectly = false;
      if (fs.existsSync(zapPath)) {
        try {
          const content = fs.readFileSync(zapPath, 'utf-8');
          const firstLine = content.split('\n')[0];
          if (firstLine.includes('node') || zapPath.endsWith('.js')) {
            useNodeDirectly = true;
            logger.debug(`executeZapCommand: Zap appears to be a Node.js script, executing with node directly`);
          }
        } catch (error) {
          logger.debug(`executeZapCommand: Could not check zap file content: ${error}`);
        }
      }
      
      if (useNodeDirectly) {
        // Execute zap script directly with node
        const args = command.split(' ').filter(arg => arg.length > 0);
        childProcess = spawn(nodeExecPath, [zapPath, ...args], {
          cwd: workingDirectory,
          env: env,
          stdio: ['ignore', 'pipe', 'pipe']
        });
      } else {
        // Execute zap directly
        const args = command.split(' ').filter(arg => arg.length > 0);
        childProcess = spawn(zapPath, args, {
          cwd: workingDirectory,
          env: env,
          stdio: ['ignore', 'pipe', 'pipe']
        });
      }
    } else {
      // Use shell with PATH explicitly set in the command
      const userShell: string = vscode.env.shell || (nodeProcess.platform === 'darwin' ? '/bin/zsh' : '/bin/bash');
      // Export PATH at the beginning of the command to ensure node is available
      const pathExport = `export PATH="${env.PATH}" && `;
      const fullCommand = `${pathExport}${zapPath} ${command}`;
      
      logger.debug(`executeZapCommand: Shell command: ${fullCommand}`);
      
      childProcess = spawn(userShell, ['-l', '-c', fullCommand], {
        cwd: workingDirectory,
        env: env,
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
    
    childProcess.on('error', async (error: Error) => {
      logger.error(`executeZapCommand: Process error`, error);
      if (error.message.includes('ENOENT')) {
        const resolvedPath = await locateZapBinary();
        if (!resolvedPath) {
          const action = await vscode.window.showWarningMessage(
            "Couldn't find 'zap' in your PATH. Do you want to specify its location?",
            'Open Settings',
            'Dismiss'
          );
          
          if (action === 'Open Settings') {
            await vscode.commands.executeCommand('workbench.action.openSettings', 'zapper.zapPath');
          }
        }
        
        const errorMsg = isExplicitPath
          ? `Zap executable not found at path: ${zapPath}. Please check the path in settings.`
          : `zap command not found. Please ensure zapper CLI is installed and available in PATH, or set the 'zapper.zapPath' setting.`;
        reject(new Error(errorMsg));
      } else {
        reject(error);
      }
    });
    
    childProcess.on('close', (code: number) => {
      logger.debug(`executeZapCommand: Command completed with code ${code}`);
      logger.debug(`executeZapCommand: stdout length: ${stdout.length}, stderr length: ${stderr.length}`);
      if (code === 0) {
        logger.debug(`executeZapCommand: Success, stdout length: ${stdout.length}`);
        resolve(stdout);
      } else {
        logger.error(`executeZapCommand: Failed with code ${code}`);
        logger.error(`executeZapCommand: stderr: ${stderr}`);
        logger.error(`executeZapCommand: stdout: ${stdout}`);
        if (stderr.includes('node: No such file or directory') || stderr.includes('env: node')) {
          logger.error(`executeZapCommand: Node not found in PATH. Node dir: ${nodeDir}, PATH: ${env.PATH}`);
          reject(new Error(`Node.js not found when executing zap. Node executable: ${nodeExecPath}, PATH: ${env.PATH}. Error: ${stderr}`));
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr || stdout}`));
        }
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

export async function getZapperProfilesForProject(project: ZapperProject): Promise<ZapperProfiles | null> {
  logger.info(`getZapperProfilesForProject: Getting profiles for ${project.name}`);
  try {
    const output = await executeZapCommand('profile --list --json', project.rootPath);
    logger.debug(`getZapperProfilesForProject: Raw output length: ${output.length}`);
    logger.debug(`getZapperProfilesForProject: Raw output preview: ${output.substring(0, 200)}...`);
    
    const rawData = JSON.parse(output);
    logger.debug(`getZapperProfilesForProject: Parsed JSON data: ${JSON.stringify(rawData)}`);
    
    // Validate the data with Zod
    const validationResult = ZapperProfilesSchema.safeParse(rawData);
    
    if (!validationResult.success) {
      logger.error(`Invalid zapper profiles data for ${project.name}`, validationResult.error);
      return null;
    }
    
    logger.debug(`getZapperProfilesForProject: Validation successful for ${project.name}`);
    return validationResult.data;
  } catch (error) {
    logger.error(`Failed to get zapper profiles for ${project.name}`, error);
    return null;
  }
}

export async function getZapperStateForProject(project: ZapperProject): Promise<ZapperState | null> {
  logger.info(`getZapperStateForProject: Getting state for ${project.name}`);
  try {
    const output = await executeZapCommand('state', project.rootPath);
    logger.debug(`getZapperStateForProject: Raw output length: ${output.length}`);
    logger.debug(`getZapperStateForProject: Raw output preview: ${output.substring(0, 200)}...`);
    
    const rawData = JSON.parse(output);
    logger.debug(`getZapperStateForProject: Parsed JSON data: ${JSON.stringify(rawData)}`);
    
    // Validate the data with Zod
    const validationResult = ZapperStateSchema.safeParse(rawData);
    
    if (!validationResult.success) {
      logger.error(`Invalid zapper state data for ${project.name}`, validationResult.error);
      return null;
    }
    
    logger.debug(`getZapperStateForProject: Validation successful for ${project.name}`);
    return validationResult.data;
  } catch (error) {
    logger.error(`Failed to get zapper state for ${project.name}`, error);
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

export async function getZapPath(): Promise<string> {
  return await getZapBinaryPath();
}

export function getZapPathSync(): string {
  if (cachedZapPath) {
    return cachedZapPath;
  }
  
  const userProvidedPath = vscode.workspace.getConfiguration('zapper').get<string>('zapPath');
  if (userProvidedPath && userProvidedPath.trim() !== '') {
    return userProvidedPath.trim();
  }
  
  return 'zap';
}

async function locateNodeBinary(): Promise<string | null> {
  if (cachedNodePath !== null) {
    return cachedNodePath;
  }
  
  if (nodePathLookupAttempted) {
    return null;
  }
  
  nodePathLookupAttempted = true;
  
  try {
    const isWindows = os.platform() === 'win32';
    const whichCommand = isWindows ? 'where' : 'which';
    
    try {
      const result = execSync(`${whichCommand} node`, { encoding: 'utf-8', timeout: 5000 }).trim();
      if (result && fs.existsSync(result)) {
        logger.info(`locateNodeBinary: Found node at ${result} via ${whichCommand}`);
        cachedNodePath = result;
        return result;
      }
    } catch (error) {
      logger.debug(`locateNodeBinary: ${whichCommand} node failed, trying alternative locations`);
    }
    
    const homeDir = os.homedir();
    const commonPaths = [
      path.join(homeDir, '.local', 'bin', 'node'),
      path.join(homeDir, '.npm-global', 'bin', 'node'),
      '/usr/local/bin/node',
      '/opt/homebrew/bin/node',
    ];
    
    if (isWindows) {
      commonPaths.push(
        path.join(process.env.LOCALAPPDATA || '', 'npm', 'node.exe'),
        path.join(process.env.APPDATA || '', 'npm', 'node.exe'),
        path.join(process.env.ProgramFiles || '', 'nodejs', 'node.exe'),
      );
    }
    
    for (const testPath of commonPaths) {
      if (fs.existsSync(testPath)) {
        logger.info(`locateNodeBinary: Found node at ${testPath}`);
        cachedNodePath = testPath;
        return testPath;
      }
    }
    
    if (homeDir) {
      const nvmVersionsPath = path.join(homeDir, '.nvm', 'versions', 'node');
      if (fs.existsSync(nvmVersionsPath)) {
        try {
          const versions = fs.readdirSync(nvmVersionsPath).filter(v => {
            const versionPath = path.join(nvmVersionsPath, v);
            return fs.statSync(versionPath).isDirectory();
          });
          
          for (const version of versions) {
            const nodePath = path.join(nvmVersionsPath, version, 'bin', 'node');
            if (fs.existsSync(nodePath)) {
              logger.info(`locateNodeBinary: Found node at ${nodePath} (via nvm)`);
              cachedNodePath = nodePath;
              return nodePath;
            }
          }
        } catch (error) {
          logger.debug(`locateNodeBinary: Error checking nvm directory: ${error}`);
        }
      }
    }
    
    logger.warn('locateNodeBinary: Could not locate node binary via auto-detection');
    return null;
  } catch (error) {
    logger.error('locateNodeBinary: Error during lookup', error);
    return null;
  }
}

async function getNodeBinaryPath(): Promise<string> {
  const resolvedPath = await locateNodeBinary();
  
  if (resolvedPath) {
    return resolvedPath;
  }
  
  const userProvidedPath = vscode.workspace.getConfiguration('zapper').get<string>('nodePath');
  if (userProvidedPath && userProvidedPath.trim() !== '') {
    const resolvedUserPath = path.resolve(userProvidedPath.trim());
    if (fs.existsSync(resolvedUserPath)) {
      logger.debug(`getNodeBinaryPath: Using user-provided path: ${resolvedUserPath}`);
      return resolvedUserPath;
    }
    logger.warn(`getNodeBinaryPath: User-provided path does not exist: ${resolvedUserPath}`);
  }
  
  return process.execPath;
}

export async function getNodePath(): Promise<string> {
  return await getNodeBinaryPath();
}

export function getNodePathSync(): string {
  if (cachedNodePath) {
    return cachedNodePath;
  }
  
  const userProvidedPath = vscode.workspace.getConfiguration('zapper').get<string>('nodePath');
  if (userProvidedPath && userProvidedPath.trim() !== '') {
    return userProvidedPath.trim();
  }
  
  const isWindows = os.platform() === 'win32';
  try {
    const whichCommand = isWindows ? 'where' : 'which';
    const result = execSync(`${whichCommand} node`, { encoding: 'utf-8', timeout: 1000 }).trim();
    if (result && fs.existsSync(result)) {
      cachedNodePath = result;
      return result;
    }
  } catch (error) {
    logger.debug(`getNodePathSync: Could not locate node via ${isWindows ? 'where' : 'which'}`);
  }
  
  return process.execPath;
}

export function isUsingCustomNodePath(): boolean {
  const nodePath = vscode.workspace.getConfiguration('zapper').get<string>('nodePath');
  return Boolean(nodePath && nodePath.trim() !== '');
}

export async function getAllZapperStatuses(): Promise<ZapperProject[]> {
  logger.info('getAllZapperStatuses: Starting to get all zapper statuses');
  const projects = await findZapperProjects();
  logger.debug(`getAllZapperStatuses: Found ${projects.length} projects`);
  
  // Get status, tasks, profiles, and state for each project in parallel
  const statusPromises = projects.map(async (project) => {
    logger.debug(`getAllZapperStatuses: Processing project ${project.name}`);
    const [status, tasks, profiles, state] = await Promise.all([
      getZapperStatusForProject(project),
      getZapperTasksForProject(project),
      getZapperProfilesForProject(project),
      getZapperStateForProject(project)
    ]);
    const activeProfile = state?.activeProfile || null;
    logger.debug(`getAllZapperStatuses: Project ${project.name} - status: ${status ? 'found' : 'null'}, tasks: ${tasks ? 'found' : 'null'}, profiles: ${profiles ? 'found' : 'null'}, activeProfile: ${activeProfile || 'null'}`);
    return { ...project, status, tasks, profiles, activeProfile };
  });
  
  const result = await Promise.all(statusPromises);
  logger.info(`getAllZapperStatuses: Returning ${result.length} projects with data`);
  return result;
}

export async function enableProfile(projectPath: string, profileName: string): Promise<void> {
  try {
    await executeZapCommand(`profile enable ${profileName}`, projectPath);
  } catch (error) {
    logger.error(`Failed to enable profile ${profileName}`, error);
    throw error;
  }
}

export async function disableProfile(projectPath: string): Promise<void> {
  try {
    await executeZapCommand(`profile --disable`, projectPath);
  } catch (error) {
    logger.error(`Failed to disable profile`, error);
    throw error;
  }
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
  const zapCommand = await getZapPath();
  const command = `${zapCommand} logs ${serviceName}`;
  await openTerminalAndRunCommand(command, projectPath, `Logs: ${serviceName}`);
}

export async function openTaskTerminal(projectPath: string, taskName: string): Promise<void> {
  const zapCommand = await getZapPath();
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
      tasks: null,
      profiles: null,
      activeProfile: null
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

