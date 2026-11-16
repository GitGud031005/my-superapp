#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

forbidden_dirs=$(git ls-files packages/p5r-ds/assets packages/p5r-ds/reference)
images=$(git ls-files 'packages/p5r-ds/*' | grep -iE '\.(png|jpe?g|gif|webp)$' || true)

if [ -n "$forbidden_dirs" ] || [ -n "$images" ]; then
  echo "ERROR: Persona 5 Royal game assets are tracked by git. They must never be committed." >&2
  if [ -n "$forbidden_dirs" ]; then
    echo "Tracked files under packages/p5r-ds/assets or packages/p5r-ds/reference:" >&2
    echo "$forbidden_dirs" | sed 's/^/  /' >&2
  fi
  if [ -n "$images" ]; then
    echo "Tracked image files under packages/p5r-ds:" >&2
    echo "$images" | sed 's/^/  /' >&2
  fi
  echo "Unstage with: git rm --cached <file>  (or git restore --staged <file> if not yet committed)" >&2
  exit 1
fi

echo "OK: no game assets tracked under packages/p5r-ds."
