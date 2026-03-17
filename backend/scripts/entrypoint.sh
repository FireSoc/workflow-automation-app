#!/usr/bin/env bash
set -e

# Wait for Postgres to be ready. Set PGHOST, PGUSER, PGPASSWORD to match DATABASE_URL (e.g. in compose).
export PGHOST="${PGHOST:-db}"
export PGUSER="${PGUSER:-agile}"
export PGPORT="${PGPORT:-5432}"
until pg_isready -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" 2>/dev/null; do
  echo "Waiting for Postgres at $PGHOST:$PGPORT..."
  sleep 2
done

# Run migrations
alembic upgrade head

# Run the main command (e.g. uvicorn)
exec "$@"
