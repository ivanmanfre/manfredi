#!/usr/bin/env bash
# Structural validation: the marketplace manifest and every plugin, strict mode.
set -euo pipefail
cd "$(dirname "$0")/.."
claude plugin validate --strict .claude-plugin/marketplace.json
for p in plugins/*/; do
  claude plugin validate --strict "$p"
done
echo "✔ all manifests validate (strict)"
