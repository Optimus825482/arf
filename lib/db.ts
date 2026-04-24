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

export const query = (text: string, params?: any[]) => pool.query(text, params);

export default pool;
