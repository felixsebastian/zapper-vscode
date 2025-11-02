import * as vscode from 'vscode';
import { ZapperProvider } from './zapperProvider';
import { startService, stopService, restartService, openLogsTerminal, openTaskTerminal, openServiceTerminal, startAllServices, stopAllServices, restartAllServices, ZapperProject } from './zapperService';
import { logger } from './logger';

export function activate(context: vscode.ExtensionContext) {
  logger.info('Zapper extension is now active!');
  
  const provider = new ZapperProvider(context.extensionUri);
  
  vscode.window.registerTreeDataProvider('zapperView', provider);
  logger.info('Tree data provider registered for zapperView');
  
  vscode.commands.registerCommand('zapper.refresh', () => {
    logger.info('Refresh command triggered');
    provider.refresh();
  });

  vscode.commands.registerCommand('zapper.toggleService', async (item) => {
    logger.info(`Toggle command triggered with item: ${item?.label} (${item?.status}) in ${item?.projectPath}`);
    if (item && item.projectPath && item.label && item.status) {
      try {
        if (item.status === 'up') {
          await stopService(item.projectPath, item.label);
          vscode.window.showInformationMessage(`Stopped ${item.label}`);
        } else {
          await startService(item.projectPath, item.label);
          vscode.window.showInformationMessage(`Started ${item.label}`);
        }
        provider.refresh();
      } catch (error) {
        logger.error(`Failed to toggle ${item.label}`, error);
        vscode.window.showErrorMessage(`Failed to toggle ${item.label}: ${error}`);
      }
    } else {
      vscode.window.showErrorMessage('No service selected');
    }
  });

  vscode.commands.registerCommand('zapper.start', async (item) => {
    logger.info(`Start command triggered with item: ${item?.label} in ${item?.projectPath}`);
    if (item && item.projectPath && item.label) {
      try {
        await startService(item.projectPath, item.label);
        vscode.window.showInformationMessage(`Started ${item.label}`);
        provider.refresh();
      } catch (error) {
        logger.error(`Failed to start ${item.label}`, error);
        vscode.window.showErrorMessage(`Failed to start ${item.label}: ${error}`);
      }
    } else {
      vscode.window.showErrorMessage('No service selected');
    }
  });

  vscode.commands.registerCommand('zapper.stop', async (item) => {
    logger.info(`Stop command triggered with item: ${item?.label} in ${item?.projectPath}`);
    if (item && item.projectPath && item.label) {
      try {
        await stopService(item.projectPath, item.label);
        vscode.window.showInformationMessage(`Stopped ${item.label}`);
        provider.refresh();
      } catch (error) {
        logger.error(`Failed to stop ${item.label}`, error);
        vscode.window.showErrorMessage(`Failed to stop ${item.label}: ${error}`);
      }
    }
  });

  vscode.commands.registerCommand('zapper.restart', async (item) => {
    logger.info(`Restart command triggered with item: ${item?.label} in ${item?.projectPath}`);
    if (item && item.projectPath && item.label) {
      try {
        await restartService(item.projectPath, item.label);
        vscode.window.showInformationMessage(`Restarted ${item.label}`);
        provider.refresh();
      } catch (error) {
        logger.error(`Failed to restart ${item.label}`, error);
        vscode.window.showErrorMessage(`Failed to restart ${item.label}: ${error}`);
      }
    }
  });

  vscode.commands.registerCommand('zapper.runTask', async (item) => {
    logger.info(`Run task command triggered with item: ${item?.label} in ${item?.projectPath}`);
    if (item && item.projectPath && item.label) {
      try {
        await openTaskTerminal(item.projectPath, item.label);
        vscode.window.showInformationMessage(`Running task ${item.label}`);
      } catch (error) {
        logger.error(`Failed to run task ${item.label}`, error);
        vscode.window.showErrorMessage(`Failed to run task ${item.label}: ${error}`);
      }
    }
  });

  vscode.commands.registerCommand('zapper.openLogs', async (item) => {
    logger.info(`Open logs command triggered with item: ${item?.label} in ${item?.projectPath}`);
    if (item && item.projectPath && item.label) {
      try {
        await openLogsTerminal(item.projectPath, item.label);
        vscode.window.showInformationMessage(`Opening logs for ${item.label}`);
      } catch (error) {
        logger.error(`Failed to open logs for ${item.label}`, error);
        vscode.window.showErrorMessage(`Failed to open logs for ${item.label}: ${error}`);
      }
    }
  });

  vscode.commands.registerCommand('zapper.openTerminal', async (item) => {
    logger.info(`Open terminal command triggered with item: ${item?.label} in ${item?.projectPath}`);
    if (item && item.projectPath && item.label) {
      try {
        await openServiceTerminal(item.projectPath, item.label);
        vscode.window.showInformationMessage(`Opening terminal for ${item.label}`);
      } catch (error) {
        logger.error(`Failed to open terminal for ${item.label}`, error);
        vscode.window.showErrorMessage(`Failed to open terminal for ${item.label}: ${error}`);
      }
    }
  });

  vscode.commands.registerCommand('zapper.startAll', async () => {
    logger.info('Start all command triggered');
    try {
      const { getAllZapperStatuses } = await import('./zapperService');
      const projects = await getAllZapperStatuses();
      
      if (projects.length === 0) {
        vscode.window.showWarningMessage('No zapper projects found');
        return;
      }
      
      if (projects.length > 1) {
        vscode.window.showWarningMessage('Global actions are only available for single-project workspaces');
        return;
      }
      
      // Single project - start all services
      await startAllServices(projects[0].rootPath);
      vscode.window.showInformationMessage('Started all services');
      provider.refresh();
    } catch (error) {
      logger.error('Failed to start all services', error);
      vscode.window.showErrorMessage(`Failed to start all services: ${error}`);
    }
  });

  vscode.commands.registerCommand('zapper.stopAll', async () => {
    logger.info('Stop all command triggered');
    try {
      const { getAllZapperStatuses } = await import('./zapperService');
      const projects = await getAllZapperStatuses();
      
      if (projects.length === 0) {
        vscode.window.showWarningMessage('No zapper projects found');
        return;
      }
      
      if (projects.length > 1) {
        vscode.window.showWarningMessage('Global actions are only available for single-project workspaces');
        return;
      }
      
      // Single project - stop all services
      await stopAllServices(projects[0].rootPath);
      vscode.window.showInformationMessage('Stopped all services');
      provider.refresh();
    } catch (error) {
      logger.error('Failed to stop all services', error);
      vscode.window.showErrorMessage(`Failed to stop all services: ${error}`);
    }
  });

  vscode.commands.registerCommand('zapper.restartAll', async () => {
    logger.info('Restart all command triggered');
    try {
      const { getAllZapperStatuses } = await import('./zapperService');
      const projects = await getAllZapperStatuses();
      
      if (projects.length === 0) {
        vscode.window.showWarningMessage('No zapper projects found');
        return;
      }
      
      if (projects.length > 1) {
        vscode.window.showWarningMessage('Global actions are only available for single-project workspaces');
        return;
      }
      
      // Single project - restart all services
      await restartAllServices(projects[0].rootPath);
      vscode.window.showInformationMessage('Restarted all services');
      provider.refresh();
    } catch (error) {
      logger.error('Failed to restart all services', error);
      vscode.window.showErrorMessage(`Failed to restart all services: ${error}`);
    }
  });

  vscode.commands.registerCommand('zapper.openZapFile', async () => {
    logger.info('Open zap file command triggered');
    try {
      const { getAllZapperStatuses } = await import('./zapperService');
      const projects = await getAllZapperStatuses();
      
      if (projects.length === 0) {
        vscode.window.showWarningMessage('No zapper projects found');
        return;
      }
      
      if (projects.length === 1) {
        // Single project - open its zap.yaml file
        const zapFilePath = vscode.Uri.file(`${projects[0].rootPath}/zap.yaml`);
        await vscode.window.showTextDocument(zapFilePath);
      } else {
        // Multiple projects - let user choose which one
        const projectNames = projects.map(p => p.name);
        const selectedProject = await vscode.window.showQuickPick(projectNames, {
          placeHolder: 'Select a project to open its zap.yaml file'
        });
        
        if (selectedProject) {
          const project = projects.find(p => p.name === selectedProject);
          if (project) {
            const zapFilePath = vscode.Uri.file(`${project.rootPath}/zap.yaml`);
            await vscode.window.showTextDocument(zapFilePath);
          }
        }
      }
    } catch (error) {
      logger.error('Failed to open zap.yaml file', error);
      vscode.window.showErrorMessage(`Failed to open zap.yaml file: ${error}`);
    }
  });

  vscode.commands.registerCommand('zapper.showLogs', () => {
    logger.show();
  });

  vscode.commands.registerCommand('zapper.viewTasks', async () => {
    logger.info('View tasks command triggered');
    try {
      const { getAllZapperStatuses } = await import('./zapperService');
      const projects = await getAllZapperStatuses();
      
      if (projects.length === 0) {
        vscode.window.showWarningMessage('No zapper projects found');
        return;
      }
      
      let selectedProject: ZapperProject | undefined;
      
      if (projects.length === 1) {
        selectedProject = projects[0];
      } else {
        const projectNames = projects.map(p => p.name);
        const selectedProjectName = await vscode.window.showQuickPick(projectNames, {
          placeHolder: 'Select a project to view tasks'
        });
        
        if (!selectedProjectName) {
          return;
        }
        
        selectedProject = projects.find(p => p.name === selectedProjectName);
      }
      
      if (!selectedProject) {
        return;
      }
      
      // Get tasks for the selected project
      const { getZapperTasksForProject } = await import('./zapperService');
      const tasks = await getZapperTasksForProject(selectedProject);
      
      if (!tasks || tasks.length === 0) {
        vscode.window.showInformationMessage('No tasks found');
        return;
      }
      
      // Show tasks in quick pick
      const taskNames = tasks.map(t => t.name);
      const selectedTask = await vscode.window.showQuickPick(taskNames, {
        placeHolder: 'Select a task to run'
      });
      
      if (selectedTask) {
        await openTaskTerminal(selectedProject.rootPath, selectedTask);
        vscode.window.showInformationMessage(`Running task ${selectedTask}`);
      }
    } catch (error) {
      logger.error('Failed to view tasks', error);
      vscode.window.showErrorMessage(`Failed to view tasks: ${error}`);
    }
  });

  // Clean up polling when extension deactivates
  context.subscriptions.push({
    dispose: () => provider.dispose()
  });
}

export function deactivate() {}
