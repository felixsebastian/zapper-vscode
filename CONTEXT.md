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

I think (but not certain) the best way to make this work would be to just trigger CLI commands, something like:
- `zap status --json` to get the status as json, we need to run this every second or so.
- `zap up <service_name>` to start a service
- `zap down <service_name>` to stop a service

The alternative method I can think of is that we skip zapper for the status and directly query or stream events from docker and pm2 which might be more efficient. I think for now we start with the simple option but structure the code in a way that let's us switch out the status command for something else (nothing too crazy just put it in a function I guess).
