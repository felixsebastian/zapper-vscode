#!/bin/bash

rm zapper-vscode-*.vsix;
rm -rf ./out;
pnpm run build;
rm -rf ./out;
pnpm run build;
pnpm run package;
