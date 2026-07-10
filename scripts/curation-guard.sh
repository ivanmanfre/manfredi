#!/usr/bin/env bash
# Fails the build if any shipped plugin file matches a held-back pattern.
set -euo pipefail
cd "$(dirname "$0")/.."
FAIL=0
while IFS= read -r pat; do
  [[ -z "$pat" || "$pat" == \#* ]] && continue
  if hits=$(grep -rInE "$pat" plugins/ 2>/dev/null); then
    echo "CURATION GUARD HIT — pattern: $pat"
    echo "$hits"
    FAIL=1
  fi
done < scripts/curation-denylist.txt
if [[ $FAIL -eq 1 ]]; then
  echo "✘ curation guard failed — private-layer content in shipped plugins"
  exit 1
fi
echo "✔ curation guard clean"
