import * as vscode from 'vscode';

let outputChannel: vscode.OutputChannel | undefined;

function ensureChannel(): vscode.OutputChannel {
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel('Zapper');
  }
  return outputChannel;
}

function formatMessage(level: string, message: string): string {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level}] ${message}`;
}

export const logger = {
  info(message: string): void {
    ensureChannel().appendLine(formatMessage('INFO', message));
  },

  warn(message: string): void {
    ensureChannel().appendLine(formatMessage('WARN', message));
  },

  error(message: string, error?: unknown): void {
    const channel = ensureChannel();
    channel.appendLine(formatMessage('ERROR', message));
    if (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      channel.appendLine(formatMessage('ERROR', errorMsg));
      if (error instanceof Error && error.stack) {
        channel.appendLine(error.stack);
      }
    }
  },

  debug(message: string): void {
    ensureChannel().appendLine(formatMessage('DEBUG', message));
  },

  show(): void {
    ensureChannel().show(true);
  }
};

