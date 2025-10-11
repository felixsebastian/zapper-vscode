import * as vscode from 'vscode';
import { ZapperStatus, ZapperStatusSchema } from './types';

export async function executeZapCommand(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const { spawn } = require('child_process');
    const process = spawn('zap', command.split(' '), { shell: true });
    
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

export async function getZapperStatus(): Promise<ZapperStatus | null> {
  try {
    const output = await executeZapCommand('ps --json');
    const rawData = JSON.parse(output);
    
    // Validate the data with Zod
    const validationResult = ZapperStatusSchema.safeParse(rawData);
    
    if (!validationResult.success) {
      console.error('Invalid zapper status data:', validationResult.error);
      return null;
    }
    
    return validationResult.data;
  } catch (error) {
    console.error('Failed to get zapper status:', error);
    return null;
  }
}

