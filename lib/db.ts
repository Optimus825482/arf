import { Pool, type QueryResultRow } from 'pg';

const sslConfig =
  process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: process.env.PG_SSL_REJECT_UNAUTHORIZED !== 'false' }
    : false;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslConfig,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const query = <T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: readonly unknown[],
) => pool.query<T>(text, params as unknown[] | undefined);

export default pool;
