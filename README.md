# Zapper VS Code Extension

A VS Code extension that provides a user-friendly interface for managing local development with [Zapper](https://zapper.felixsebastian.dev) - a powerful CLI tool that combines bare metal process management (via pm2) with containers (via Docker) and task automation.

## What is Zapper?

Zapper is a local development tool that simplifies managing complex development environments by combining:
- **Bare metal processes** (managed via pm2)
- **Containers** (managed via Docker)
- **Task automation** (similar to Makefile/Taskfile)

## Features

This VS Code extension provides an intuitive sidebar interface with three main sections:

### 🔧 Bare Metal Processes
- View current status of all processes
- Start/stop individual processes
- Monitor process health

### 🐳 Containers
- View Docker container status
- Start/stop containers
- Container management controls

### ⚡ Tasks
- Execute predefined tasks from your `zap.yaml` configuration
- One-click task execution
- Task status monitoring

## Quick Actions

The extension provides convenient toolbar buttons for:
- **Start All** - Launch all services and containers
- **Stop All** - Shutdown all running services
- **Restart All** - Restart all services
- **Refresh** - Update status information

## Prerequisites

- [Zapper CLI](https://zapper.felixsebastian.dev) must be installed
- A `zap.yaml` configuration file in your project root
- VS Code 1.74.0 or higher

## Installation

1. Install the extension from the VS Code marketplace
2. Ensure Zapper CLI is installed on your system
3. Open a project with a `zap.yaml` file
4. The Zapper sidebar will automatically appear

## Usage

1. **Open the Zapper sidebar** - Click the Zapper icon in the activity bar
2. **View status** - See all services, containers, and available tasks
3. **Control services** - Use the inline buttons to start/stop individual services
4. **Run tasks** - Click the run button next to any task
5. **Bulk operations** - Use the toolbar buttons for start all/stop all operations

## Configuration

The extension reads your existing `zap.yaml` configuration file. No additional configuration is required - it works out of the box with your existing Zapper setup.

## Commands

The extension provides several VS Code commands:
- `zapper.refresh` - Refresh the current status
- `zapper.start` - Start a service
- `zapper.stop` - Stop a service
- `zapper.restart` - Restart a service
- `zapper.runTask` - Execute a task
- `zapper.startAll` - Start all services
- `zapper.stopAll` - Stop all services
- `zapper.restartAll` - Restart all services
- `zapper.openLogs` - View service logs

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Links

- [Zapper CLI Documentation](https://zapper.felixsebastian.dev)
- [VS Code Extension Marketplace](https://marketplace.visualstudio.com/items?itemName=felixsebastian.zapper-vscode)
