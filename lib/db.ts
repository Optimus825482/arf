import { Pool } from 'pg';

/**
 * ARF PostgreSQL Baglanti Havuzu (pgvector destekli)
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Maksimum es zamanli baglanti
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error:', error);
});

export const isDatabaseConfigured = () => Boolean(process.env.DATABASE_URL);

export const query = (text: string, params?: unknown[]) => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured');
  }
  return pool.query(text, params);
};

export default pool;
