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

  echo "[entrypoint] checking RAG schema health..."
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL' >/dev/null
do $$
declare
  rag_documents_exists boolean;
  rag_documents_id_is_key boolean;
begin
  select to_regclass('public.rag_documents') is not null
    into rag_documents_exists;

  if rag_documents_exists then
    select exists (
      select 1
      from pg_constraint
      where conrelid = 'public.rag_documents'::regclass
        and contype in ('p', 'u')
        and conkey = array[
          (
            select attnum
            from pg_attribute
            where attrelid = 'public.rag_documents'::regclass
              and attname = 'id'
          )::smallint
        ]
    ) into rag_documents_id_is_key;

    if not rag_documents_id_is_key then
      raise notice 'repairing incomplete RAG schema';
      drop table if exists public.rag_chunks cascade;
      drop table if exists public.rag_documents cascade;
    end if;
  end if;
end $$;
SQL

  echo "[entrypoint] ensuring database schema..."
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f /app/init-db.sql >/dev/null
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "create table if not exists app_seed_state (key text primary key, value text not null, applied_at timestamptz not null default now());" >/dev/null

  applied="$(psql "$DATABASE_URL" -At -v ON_ERROR_STOP=1 -c "select value from app_seed_state where key = '$seed_marker';" 2>/dev/null || true)"
  chunk_count="$(psql "$DATABASE_URL" -At -v ON_ERROR_STOP=1 -c "select count(*) from public.rag_chunks;" 2>/dev/null || echo 0)"
  if [ "$applied" = "applied" ] && [ "${chunk_count:-0}" -gt 0 ]; then
    echo "[entrypoint] RAG seed already applied ($seed_marker)"
  else
    echo "[entrypoint] applying RAG seed ($seed_marker)..."
    gzip -dc "$seed_file" | psql "$DATABASE_URL" -v ON_ERROR_STOP=1 >/dev/null
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "insert into app_seed_state(key, value, applied_at) values ('$seed_marker', 'applied', now()) on conflict (key) do update set value = excluded.value, applied_at = excluded.applied_at;" >/dev/null
    echo "[entrypoint] RAG seed applied"
  fi
fi

exec "$@"
