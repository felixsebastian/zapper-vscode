import * as vscode from 'vscode';
import { ZapperProvider } from './zapperProvider';
import { startService, stopService, restartService, openLogsTerminal, openTaskTerminal, startAllServices, stopAllServices, restartAllServices } from './zapperService';

export function activate(context: vscode.ExtensionContext) {
  console.log('Zapper extension is now active!');
  
  const provider = new ZapperProvider(context.extensionUri);
  
  vscode.window.registerTreeDataProvider('zapperView', provider);
  console.log('Tree data provider registered for zapperView');
  
  vscode.commands.registerCommand('zapper.refresh', () => {
    console.log('Refresh command triggered');
    provider.refresh();
  });

  vscode.commands.registerCommand('zapper.toggleService', async (item) => {
    console.log('Toggle command triggered with item:', item);
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
        vscode.window.showErrorMessage(`Failed to toggle ${item.label}: ${error}`);
      }
    } else {
      vscode.window.showErrorMessage('No service selected');
    }
  });

  vscode.commands.registerCommand('zapper.start', async (item) => {
    console.log('Start command triggered with item:', item);
    if (item && item.projectPath && item.label) {
      try {
        await startService(item.projectPath, item.label);
        vscode.window.showInformationMessage(`Started ${item.label}`);
        provider.refresh();
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to start ${item.label}: ${error}`);
      }
    } else {
      vscode.window.showErrorMessage('No service selected');
    }
  });

  vscode.commands.registerCommand('zapper.stop', async (item) => {
    if (item && item.projectPath && item.label) {
      try {
        await stopService(item.projectPath, item.label);
        vscode.window.showInformationMessage(`Stopped ${item.label}`);
        provider.refresh();
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to stop ${item.label}: ${error}`);
      }
    }
  });

  vscode.commands.registerCommand('zapper.restart', async (item) => {
    if (item && item.projectPath && item.label) {
      try {
        await restartService(item.projectPath, item.label);
        vscode.window.showInformationMessage(`Restarted ${item.label}`);
        provider.refresh();
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to restart ${item.label}: ${error}`);
      }
    }
  });

  vscode.commands.registerCommand('zapper.runTask', async (item) => {
    if (item && item.projectPath && item.label) {
      try {
        await openTaskTerminal(item.projectPath, item.label);
        vscode.window.showInformationMessage(`Running task ${item.label}`);
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to run task ${item.label}: ${error}`);
      }
    }
  });

  vscode.commands.registerCommand('zapper.openLogs', async (item) => {
    if (item && item.projectPath && item.label) {
      try {
        await openLogsTerminal(item.projectPath, item.label);
        vscode.window.showInformationMessage(`Opening logs for ${item.label}`);
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to open logs for ${item.label}: ${error}`);
      }
    }
  });

  vscode.commands.registerCommand('zapper.startAll', async () => {
    try {
      const { getAllZapperStatuses } = await import('./zapperService');
      const projects = await getAllZapperStatuses();
      
      if (projects.length === 0) {
        vscode.window.showWarningMessage('No zapper projects found');
        return;
      }
      
      // Start all services in all projects
      const promises = projects.map(project => 
        startAllServices(project.rootPath).catch(error => {
          console.error(`Failed to start services in ${project.name}:`, error);
          return error;
        })
      );
      
      await Promise.all(promises);
      vscode.window.showInformationMessage('Started all services');
      provider.refresh();
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to start all services: ${error}`);
    }
  });

  vscode.commands.registerCommand('zapper.stopAll', async () => {
    try {
      const { getAllZapperStatuses } = await import('./zapperService');
      const projects = await getAllZapperStatuses();
      
      if (projects.length === 0) {
        vscode.window.showWarningMessage('No zapper projects found');
        return;
      }
      
      // Stop all services in all projects
      const promises = projects.map(project => 
        stopAllServices(project.rootPath).catch(error => {
          console.error(`Failed to stop services in ${project.name}:`, error);
          return error;
        })
      );
      
      await Promise.all(promises);
      vscode.window.showInformationMessage('Stopped all services');
      provider.refresh();
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to stop all services: ${error}`);
    }
  });

  vscode.commands.registerCommand('zapper.restartAll', async () => {
    try {
      const { getAllZapperStatuses } = await import('./zapperService');
      const projects = await getAllZapperStatuses();
      
      if (projects.length === 0) {
        vscode.window.showWarningMessage('No zapper projects found');
        return;
      }
      
      // Restart all services in all projects
      const promises = projects.map(project => 
        restartAllServices(project.rootPath).catch(error => {
          console.error(`Failed to restart services in ${project.name}:`, error);
          return error;
        })
      );
      
      await Promise.all(promises);
      vscode.window.showInformationMessage('Restarted all services');
      provider.refresh();
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to restart all services: ${error}`);
    }
  });

  // Clean up polling when extension deactivates
  context.subscriptions.push({
    dispose: () => provider.dispose()
  });
}

export function deactivate() {}
