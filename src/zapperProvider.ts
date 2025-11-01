import * as vscode from 'vscode';
import { getAllZapperStatuses, ZapperProject, isUsingCustomPath, getZapPathSync, getNodePathSync, isUsingCustomNodePath } from './zapperService';
import { ServiceStatus, Task } from './types';
import { logger } from './logger';

export class ZapperProvider implements vscode.TreeDataProvider<ZapperItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<ZapperItem | undefined | null | void> = new vscode.EventEmitter<ZapperItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<ZapperItem | undefined | null | void> = this._onDidChangeTreeData.event;
  
  private projects: ZapperProject[] = [];
  private pollingInterval: NodeJS.Timeout | undefined;

  constructor(private extensionUri: vscode.Uri) {
    logger.info('ZapperProvider constructor called');
    this.startPolling();
  }

  private startPolling(): void {
    this.pollStatus();
    this.pollingInterval = setInterval(() => {
      this.pollStatus();
    }, 2000); // Poll every 2 seconds
  }

  private async pollStatus(): Promise<void> {
    logger.info('ZapperProvider: Starting pollStatus');
    try {
      this.projects = await getAllZapperStatuses();
      logger.info(`ZapperProvider: Poll completed, got ${this.projects.length} projects`);
      this.projects.forEach((project, index) => {
        logger.debug(`ZapperProvider: Project ${index}: ${project.name}, status: ${project.status ? 'has status' : 'no status'}, tasks: ${project.tasks ? 'has tasks' : 'no tasks'}`);
      });
      this._onDidChangeTreeData.fire();
      logger.debug('ZapperProvider: Fired tree data change event');
    } catch (error) {
      logger.error('Failed to poll zapper status', error);
    }
  }

  refresh(): void {
    this.pollStatus();
  }

  dispose(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
  }

  getTreeItem(element: ZapperItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: ZapperItem): Thenable<ZapperItem[]> {
    logger.debug(`getChildren called with element: ${element?.label || 'root'}`);
    
    if (!element) {
      const items: ZapperItem[] = [];
      
      const debugMode = vscode.workspace.getConfiguration('zapper').get<boolean>('debugMode', false);
      
      if (debugMode) {
        const zapPath = getZapPathSync();
        items.push(new ZapperItem('Debug Info', vscode.TreeItemCollapsibleState.Expanded, 'debug'));
      }
      
      // Add custom path indicator at the top if using custom path (only if not in debug mode)
      if (!debugMode && isUsingCustomPath()) {
        const zapPath = getZapPathSync();
        items.push(new ZapperItem(`Using: ${zapPath}`, vscode.TreeItemCollapsibleState.None, 'info'));
      }
      
      if (this.projects.length === 0) {
        logger.info('No projects found, showing placeholder');
        items.push(new ZapperItem('No zapper projects found', vscode.TreeItemCollapsibleState.None));
      } else if (this.projects.length === 1) {
        // Single project: show 3 sections directly
        const project = this.projects[0];
        items.push(new ZapperItem('💾 Bare Metal', vscode.TreeItemCollapsibleState.Expanded, 'section', project.name, undefined, project.rootPath, 'bareMetal'));
        items.push(new ZapperItem('🐳 Docker', vscode.TreeItemCollapsibleState.Expanded, 'section', project.name, undefined, project.rootPath, 'docker'));
        items.push(new ZapperItem('▶️ Tasks', vscode.TreeItemCollapsibleState.Expanded, 'section', project.name, undefined, project.rootPath, 'tasks'));
        logger.debug(`Single project: showing 3 sections`);
      } else {
        // Multiple projects: show project headers for nesting
        logger.debug(`Found ${this.projects.length} projects, using nesting`);
        this.projects.forEach(project => {
          if (project.status || project.tasks) {
            items.push(new ZapperItem(project.name, vscode.TreeItemCollapsibleState.Expanded, 'project'));
          }
        });
      }
      
      logger.debug(`Returning ${items.length} items`);
      return Promise.resolve(items);
    } else if (element.type === 'debug') {
      const items: ZapperItem[] = [];
      const zapPath = getZapPathSync();
      const usingCustomPath = isUsingCustomPath();
      const nodePath = getNodePathSync();
      const usingCustomNodePath = isUsingCustomNodePath();
      
      items.push(new ZapperItem(`Zap Command: ${zapPath}`, vscode.TreeItemCollapsibleState.None, 'debugInfo'));
      items.push(new ZapperItem(`Using Custom Zap Path: ${usingCustomPath ? 'Yes' : 'No'}`, vscode.TreeItemCollapsibleState.None, 'debugInfo'));
      items.push(new ZapperItem(`Node Path: ${nodePath}`, vscode.TreeItemCollapsibleState.None, 'debugInfo'));
      items.push(new ZapperItem(`Using Custom Node Path: ${usingCustomNodePath ? 'Yes' : 'No'}`, vscode.TreeItemCollapsibleState.None, 'debugInfo'));
      items.push(new ZapperItem(`Projects Found: ${this.projects.length}`, vscode.TreeItemCollapsibleState.None, 'debugInfo'));
      
      if (this.projects.length > 0) {
        this.projects.forEach((project, index) => {
          items.push(new ZapperItem(`Project ${index + 1}: ${project.rootPath}`, vscode.TreeItemCollapsibleState.None, 'debugInfo'));
        });
      }
      
      return Promise.resolve(items);
    } else if (element.type === 'project') {
      // Return sections for this project (multi-project mode)
      const project = this.projects.find(p => p.name === element.label);
      if (project) {
        const items: ZapperItem[] = [];
        items.push(new ZapperItem('💾 Bare Metal', vscode.TreeItemCollapsibleState.Expanded, 'section', project.name, undefined, project.rootPath, 'bareMetal'));
        items.push(new ZapperItem('🐳 Docker', vscode.TreeItemCollapsibleState.Expanded, 'section', project.name, undefined, project.rootPath, 'docker'));
        items.push(new ZapperItem('▶️ Tasks', vscode.TreeItemCollapsibleState.Expanded, 'section', project.name, undefined, project.rootPath, 'tasks'));
        return Promise.resolve(items);
      }
    } else if (element.type === 'section') {
      // Return items for this section
      const project = this.projects.find(p => p.name === element.projectName);
      if (project) {
        const items: ZapperItem[] = [];
        
        if (element.sectionType === 'bareMetal' && project.status) {
          project.status.bareMetal.forEach(service => {
            items.push(new ZapperItem(service.service, vscode.TreeItemCollapsibleState.None, 'service', project.name, service.status, project.rootPath));
          });
        } else if (element.sectionType === 'docker' && project.status) {
          project.status.docker.forEach(service => {
            items.push(new ZapperItem(service.service, vscode.TreeItemCollapsibleState.None, 'service', project.name, service.status, project.rootPath));
          });
        } else if (element.sectionType === 'tasks' && project.tasks) {
          project.tasks.forEach(task => {
            items.push(new ZapperItem(task.name as string, vscode.TreeItemCollapsibleState.None, 'task', project.name, undefined, project.rootPath));
          });
        }
        
        return Promise.resolve(items);
      }
    }
    
    return Promise.resolve([]);
  }
}

class ZapperItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly type: 'project' | 'section' | 'service' | 'task' | 'info' | 'debug' | 'debugInfo' = 'service',
    public readonly projectName?: string,
    public readonly status?: string,
    public readonly projectPath?: string,
    public readonly sectionType?: 'bareMetal' | 'docker' | 'tasks'
  ) {
    super(label, collapsibleState);
    
    if (type === 'project') {
      this.contextValue = 'project';
    } else if (type === 'section') {
      this.contextValue = 'section';
    } else if (type === 'info') {
      this.contextValue = 'info';
      this.iconPath = new vscode.ThemeIcon('info');
    } else if (type === 'debug') {
      this.contextValue = 'debug';
      this.iconPath = new vscode.ThemeIcon('bug');
    } else if (type === 'debugInfo') {
      this.contextValue = 'debugInfo';
      this.iconPath = new vscode.ThemeIcon('info');
    } else if (type === 'service') {
      this.contextValue = 'service';
      logger.debug(`Created service item with contextValue: ${this.contextValue}, status: ${status}`);
      
      // Set icon based on status
      if (status === 'up') {
        this.iconPath = new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.green'));
      } else if (status === 'down' || status === 'stopped') {
        this.iconPath = new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.red'));
      } else {
        // Unknown status - use yellow/orange
        this.iconPath = new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.orange'));
      }
      
      // Set context value for menu based on status
      if (status === 'up') {
        this.contextValue = 'service-running';
      } else {
        this.contextValue = 'service-stopped';
      }
    } else if (type === 'task') {
      this.contextValue = 'task';
      logger.debug(`Created task item with contextValue: ${this.contextValue}`);
      
      // Add icon for task items
      this.iconPath = new vscode.ThemeIcon('play');
      
      // Add default command (click to run)
      this.command = {
        command: 'zapper.runTask',
        title: 'Run Task',
        arguments: [this]
      };
    }
  }
}