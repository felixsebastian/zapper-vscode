# Zapper vscode extension

This project is a vscode extension that works with the zapper CLI application to make it easily accessible from within vscode.

The zapper CLI is a tool for local dev that combines bare metal process management (via pm2) with containers (via docker) and also tasks, similar to makefile/taskfile.

The basic usage is to have a zap.yaml file in your project (usually a wrapper repo), then run commands like:
- `zap up` to start everything
- `zap down` to stop everything
- `zap status` to see whats currently running
- `zap task <task_name>` to run tasks

The functions of the extension:
- Always get an up-to-date view of the current status
- Start and stop services
- Run tasks

So the extension will be a sidebar item with 3 sections:
- bare metal processes (current status with start/stop button)
- containers (current status with start/stop button)
- tasks (run button)
