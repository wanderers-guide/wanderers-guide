#!/usr/bin/env bash
# Run every spec in a fresh browser; preserve artifacts and aggregate failures without retries.
set -uo pipefail

specs=$(rg --files cypress/e2e -g '*.cy.{js,jsx,ts,tsx}' | sort) || exit 1
test -n "$specs" || exit 1

failed=0
while IFS= read -r spec; do
  npm run cy:run -- --browser chrome --spec "$spec" --config trashAssetsBeforeRuns=false || failed=1
done <<< "$specs"
exit "$failed"
