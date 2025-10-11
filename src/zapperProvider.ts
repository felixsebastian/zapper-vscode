import * as vscode from 'vscode';
import { getZapperStatus } from './zapperService';
import { ServiceStatus } from './types';

export class ZapperProvider implements vscode.TreeDataProvider<ZapperItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<ZapperItem | undefined | null | void> = new vscode.EventEmitter<ZapperItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<ZapperItem | undefined | null | void> = this._onDidChangeTreeData.event;
  
  private status: ServiceStatus[] = [];
  private pollingInterval: NodeJS.Timeout | undefined;

  constructor(private extensionUri: vscode.Uri) {
    this.startPolling();
  }

  private startPolling(): void {
    this.pollStatus();
    this.pollingInterval = setInterval(() => {
      this.pollStatus();
    }, 2000); // Poll every 2 seconds
  }

  private async pollStatus(): Promise<void> {
    try {
      const zapperStatus = await getZapperStatus();
      if (zapperStatus) {
        this.status = [...zapperStatus.bareMetal, ...zapperStatus.docker];
        this._onDidChangeTreeData.fire();
      }
    } catch (error) {
      console.error('Failed to poll zapper status:', error);
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
    if (!element) {
      const items: ZapperItem[] = [];
      
      if (this.status.length === 0) {
        items.push(new ZapperItem('No services running', vscode.TreeItemCollapsibleState.None));
      } else {
        this.status.forEach(service => {
          const statusText = `(${service.status})`;
          items.push(new ZapperItem(`${service.name} ${statusText}`, vscode.TreeItemCollapsibleState.None));
        });
      }
      
      return Promise.resolve(items);
    }
    return Promise.resolve([]);
  }
}

class ZapperItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
  }
}
