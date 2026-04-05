import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Pool } = pg;

function parseEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return;

  const contents = fs.readFileSync(envPath, 'utf8');
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;

    const eqIndex = line.indexOf('=');
    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();

    if (!key || process.env[key] !== undefined) continue;
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function loadEnvFiles() {
  const cwd = process.cwd();
  parseEnvFile(path.resolve(cwd, '.env.local'));
  parseEnvFile(path.resolve(cwd, '.env'));
}

function buildDatabaseUrlFromPgVars() {
  const host = process.env.PGHOST;
  const database = process.env.PGDATABASE;
  const user = process.env.PGUSER;
  const password = process.env.PGPASSWORD || '';
  const port = process.env.PGPORT || '5432';

  if (!host || !database || !user) return null;

  const auth = password ? `${encodeURIComponent(user)}:${encodeURIComponent(password)}` : encodeURIComponent(user);
  return `postgresql://${auth}@${host}:${port}/${database}`;
}

loadEnvFiles();

const resolvedDatabaseUrl = process.env.DATABASE_URL || buildDatabaseUrlFromPgVars();

if (!resolvedDatabaseUrl) {
  throw new Error('No PostgreSQL connection string found. Set DATABASE_URL or the PGHOST/PGDATABASE/PGUSER variables in .env or .env.local.');
}

function isLocalDatabaseUrl(databaseUrl) {
  if (!databaseUrl) return false;
  try {
    const url = new URL(databaseUrl);
    return ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  } catch {
    return /localhost|127\.0\.0\.1|\[::1\]/i.test(databaseUrl);
  }
}

export function getDatabaseSslConfig(databaseUrl) {
  if (!databaseUrl || isLocalDatabaseUrl(databaseUrl)) return false;
  return { rejectUnauthorized: false };
}

export function createPgPool(databaseUrl, options = {}) {
  return new Pool({
    connectionString: databaseUrl,
    ssl: options.ssl ?? getDatabaseSslConfig(databaseUrl),
    ...options,
  });
}

const pool = createPgPool(resolvedDatabaseUrl);

export default pool;
