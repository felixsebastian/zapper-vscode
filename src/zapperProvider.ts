import * as vscode from 'vscode';

export class ZapperProvider implements vscode.TreeDataProvider<ZapperItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<ZapperItem | undefined | null | void> = new vscode.EventEmitter<ZapperItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<ZapperItem | undefined | null | void> = this._onDidChangeTreeData.event;

  constructor(private extensionUri: vscode.Uri) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ZapperItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: ZapperItem): Thenable<ZapperItem[]> {
    if (!element) {
      return Promise.resolve([
        new ZapperItem('Hello from zapper', vscode.TreeItemCollapsibleState.None)
      ]);
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
