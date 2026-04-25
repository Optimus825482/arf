#!/bin/sh
set -eu

seed_enabled="${RAG_SEED_ON_START:-true}"
seed_marker="${RAG_SEED_MARKER:-rag_seed_v1}"
seed_file="/app/docker/rag_inserts.sql.gz"

if [ "$seed_enabled" != "false" ] && [ -n "${DATABASE_URL:-}" ] && [ -f "$seed_file" ]; then
  echo "[entrypoint] waiting for database..."
  attempts=0
  until psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "select 1" >/dev/null 2>&1; do
    attempts=$((attempts + 1))
    if [ "$attempts" -ge 60 ]; then
      echo "[entrypoint] database is not reachable after 60 seconds"
      exit 1
    fi
    sleep 1
  done

  echo "[entrypoint] ensuring database schema..."
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f /app/init-db.sql >/dev/null
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "create table if not exists app_seed_state (key text primary key, value text not null, applied_at timestamptz not null default now());" >/dev/null

  applied="$(psql "$DATABASE_URL" -At -v ON_ERROR_STOP=1 -c "select value from app_seed_state where key = '$seed_marker';" 2>/dev/null || true)"
  if [ "$applied" = "applied" ]; then
    echo "[entrypoint] RAG seed already applied ($seed_marker)"
  else
    echo "[entrypoint] applying RAG seed ($seed_marker)..."
    gzip -dc "$seed_file" | psql "$DATABASE_URL" -v ON_ERROR_STOP=1 >/dev/null
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "insert into app_seed_state(key, value, applied_at) values ('$seed_marker', 'applied', now()) on conflict (key) do update set value = excluded.value, applied_at = excluded.applied_at;" >/dev/null
    echo "[entrypoint] RAG seed applied"
  fi
fi

exec "$@"
