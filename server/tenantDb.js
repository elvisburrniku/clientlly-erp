import pg from 'pg';

const { Pool } = pg;

const tenantPools = new Map();

export function getTenantPool(databaseUrl) {
  if (!databaseUrl) return null;
  if (tenantPools.has(databaseUrl)) return tenantPools.get(databaseUrl);
  const tenantPool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  tenantPools.set(databaseUrl, tenantPool);
  return tenantPool;
}

const tenantDbCache = new Map();

export function setCachedTenantDb(tenantId, dbInfo) {
  tenantDbCache.set(tenantId, dbInfo);
}

export function getCachedTenantDb(tenantId) {
  return tenantDbCache.get(tenantId) || null;
}

export function clearCachedTenantDb(tenantId) {
  tenantDbCache.delete(tenantId);
}

export async function resolvePoolForTenant(tenantId, sharedPool) {
  if (!tenantId) return sharedPool;
  const cached = tenantDbCache.get(tenantId);
  if (cached === undefined) {
    const result = await sharedPool.query(
      'SELECT database_url, database_status FROM tenants WHERE id = $1',
      [tenantId]
    );
    if (result.rows.length === 0) {
      tenantDbCache.set(tenantId, null);
      return sharedPool;
    }
    const row = result.rows[0];
    if (row.database_url && row.database_status === 'active') {
      const info = { database_url: row.database_url, database_status: row.database_status };
      tenantDbCache.set(tenantId, info);
      return getTenantPool(row.database_url);
    }
    tenantDbCache.set(tenantId, null);
    return sharedPool;
  }
  if (cached && cached.database_url && cached.database_status === 'active') {
    return getTenantPool(cached.database_url);
  }
  return sharedPool;
}
