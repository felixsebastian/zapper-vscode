import * as vscode from 'vscode';
import { ZapperProvider } from './zapperProvider';

export function activate(context: vscode.ExtensionContext) {
  const provider = new ZapperProvider(context.extensionUri);
  
  vscode.window.registerTreeDataProvider('zapperView', provider);
  
  vscode.commands.registerCommand('zapper.refresh', () => {
    provider.refresh();
  });

  // Clean up polling when extension deactivates
  context.subscriptions.push({
    dispose: () => provider.dispose()
  });
}

export function deactivate() {}
