#!/usr/bin/env bash
# Reset Prisma database (destructive) - drops all data and reapplies migrations
# Usage: ./reset-db.sh [--yes]

set -euo pipefail

if [ "${1:-}" != "--yes" ]; then
  echo "WARNING: This will DELETE ALL DATA in the database configured by DATABASE_URL."
  echo "If you are sure, re-run with: ./reset-db.sh --yes"
  exit 1
fi

echo "Running Prisma migrate reset (destructive)."
# Ensure we run from backend folder
DIR=$(dirname "$0")
cd "$DIR"

if ! command -v npx >/dev/null 2>&1; then
  echo "npx not found. Install Node.js and npm first." >&2
  exit 1
fi

echo "Executing: npx prisma migrate reset --force"
npx prisma migrate reset --force

echo "Regenerating Prisma client"
npx prisma generate

echo "Database reset complete. All data deleted and migrations reapplied."
