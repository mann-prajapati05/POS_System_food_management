import pg from 'pg';
import dotenv from 'dotenv';
import { readFile } from 'fs/promises';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '5432', 10);
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';
const DB_NAME = process.env.DB_NAME || 'odoo_pos';

const pool = new Pool({
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  max: 10,
  min: 2,  // Keep at least 2 connections open
  idleTimeoutMillis: 300000,  // 5 minutes (reduced connection cleanup events)
  connectionTimeoutMillis: 5000,
  statement_timeout: 30000,  // 30 second query timeout
});

// Pool event monitoring
pool.on('error', (err) => {
  console.error('🔴 Unexpected PostgreSQL pool error:', err.message);
  console.error('Error details:', err);
});

pool.on('connect', () => {
  console.log('✅ New PostgreSQL connection established');
});

pool.on('remove', () => {
  console.log('⚠️  PostgreSQL connection removed from pool');
});

function quoteIdentifier(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

async function readSchemaSql() {
  const schemaPath = resolve(__dirname, '../db/schema.sql');
  return readFile(schemaPath, 'utf8');
}

export async function ensureDatabaseAndSchema() {
  const maintenanceDb = process.env.DB_MAINTENANCE_DB || 'postgres';
  const adminPool = new Pool({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: maintenanceDb,
    max: 1,
    connectionTimeoutMillis: 2000,
  });

  try {
    const dbExists = await adminPool.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [DB_NAME]
    );

    if (dbExists.rowCount === 0) {
      await adminPool.query(`CREATE DATABASE ${quoteIdentifier(DB_NAME)}`);
      console.log(`Database created: ${DB_NAME}`);
    }
  } finally {
    await adminPool.end();
  }

  await pool.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
  await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

  const tableCheck = await pool.query(
    "SELECT to_regclass('public.users') AS users_table"
  );

  if (!tableCheck.rows[0]?.users_table) {
    const schemaSql = await readSchemaSql();
    await pool.query(schemaSql);
    console.log('Schema initialized');
  }
}

export async function testConnection() {
  await pool.query('SELECT 1');
}

export async function getPoolStatus() {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
    database: DB_NAME,
    host: DB_HOST,
    port: DB_PORT,
  };
}

export async function query(queryText, values = []) {
  return pool.query(queryText, values);
}

export async function beginTransaction() {
  const client = await pool.connect();
  await client.query('BEGIN');
  return client;
}

export async function commitTransaction(client) {
  await client.query('COMMIT');
  client.release();
}

export async function rollbackTransaction(client) {
  try {
    await client.query('ROLLBACK');
  } finally {
    client.release();
  }
}

export async function closeConnection() {
  await pool.end();
}

export default pool;
