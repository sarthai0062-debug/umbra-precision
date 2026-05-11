#!/usr/bin/env bash
set -euo pipefail

npm run build -w @umbro/shared
npm run build -w @umbro/api
npm run build -w @umbro/web
