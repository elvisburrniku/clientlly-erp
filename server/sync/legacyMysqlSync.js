import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { Client as SshClient } from 'ssh2';

const SUPPORTED_ADAPTER = 'clientlly-legacy-mysql';

const EXTERNAL_SYNC_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS external_sync_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  adapter VARCHAR(100) NOT NULL,
  target_tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'active',
  ssh_host VARCHAR(255),
  ssh_port INTEGER DEFAULT 22,
  ssh_username VARCHAR(255),
  ssh_password TEXT,
  db_host VARCHAR(255) NOT NULL,
  db_port INTEGER DEFAULT 3306,
  db_name VARCHAR(255) NOT NULL,
  db_user VARCHAR(255) NOT NULL,
  db_password TEXT NOT NULL,
  options JSONB DEFAULT '{}'::jsonb,
  last_synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS external_sync_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES external_sync_sources(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'running',
  summary JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  started_at TIMESTAMP DEFAULT NOW(),
  finished_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_external_sync_runs_source_id ON external_sync_runs(source_id, started_at DESC);

CREATE TABLE IF NOT EXISTS external_sync_record_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES external_sync_sources(id) ON DELETE CASCADE,
  entity_name VARCHAR(100) NOT NULL,
  source_table VARCHAR(255) NOT NULL,
  source_record_id VARCHAR(255) NOT NULL,
  target_table VARCHAR(255) NOT NULL,
  target_record_id UUID NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  synced_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (source_id, entity_name, source_table, source_record_id)
);

CREATE INDEX IF NOT EXISTS idx_external_sync_links_source_entity
  ON external_sync_record_links(source_id, entity_name);
`;

const COMPANY_SETTING_KEYS = [
  'company_name',
  'company_email',
  'company_phone',
  'company_phone_2',
  'company_address',
  'company_city',
  'company_state',
  'company_country',
  'company_tax_number',
  'company_vat_number',
  'company_bank_details',
  'company_logo',
  'site_currency',
];

const SUPPORTED_SYNC_STAGES = new Set(['full', 'invoices', 'payments', 'bills', 'journals']);

function createLogger(logger = console) {
  return {
    info(message) {
      if (logger?.log) logger.log(message);
    },
    warn(message) {
      if (logger?.warn) logger.warn(message);
      else if (logger?.log) logger.log(message);
    },
    error(message) {
      if (logger?.error) logger.error(message);
      else if (logger?.log) logger.log(message);
    },
  };
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function trimOrNull(value) {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
}

function trimOrEmpty(value) {
  return trimOrNull(value) || '';
}

function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampMoney(value) {
  return Number(toNumber(value, 0).toFixed(2));
}

function normalizeLegacyDate(value) {
  const normalized = trimOrNull(value);
  if (!normalized) return null;
  if (normalized.startsWith('0000-00-00')) return null;
  return normalized;
}

function normalizeAdapterName(adapter) {
  return trimOrNull(adapter) || SUPPORTED_ADAPTER;
}

function normalizeStage(stage) {
  const normalized = trimOrNull(stage)?.toLowerCase() || 'full';
  if (!SUPPORTED_SYNC_STAGES.has(normalized)) {
    throw new Error(`Unsupported sync stage "${normalized}". Supported stages: ${Array.from(SUPPORTED_SYNC_STAGES).join(', ')}`);
  }
  return normalized;
}

function normalizeOptions(options = {}, dbName = null) {
  return {
    sourceSchema: trimOrNull(options.sourceSchema) || trimOrNull(dbName),
    currency: trimOrNull(options.currency) || null,
    includeJournalEntries: options.includeJournalEntries === true,
    stage: normalizeStage(options.stage),
    invoiceNumberMin: options.invoiceNumberMin !== undefined && options.invoiceNumberMin !== null && options.invoiceNumberMin !== ''
      ? Number(options.invoiceNumberMin)
      : null,
    invoiceNumberMax: options.invoiceNumberMax !== undefined && options.invoiceNumberMax !== null && options.invoiceNumberMax !== ''
      ? Number(options.invoiceNumberMax)
      : null,
    raw: options.raw || {},
  };
}

function normalizeConfig(config) {
  if (!config || typeof config !== 'object') {
    throw new Error('A sync config object is required.');
  }

  if (config.dbName && config.dbUser && config.dbPassword) {
    const adapter = normalizeAdapterName(config.adapter);
    if (adapter !== SUPPORTED_ADAPTER) {
      throw new Error(`Unsupported adapter "${adapter}". Supported adapters: ${SUPPORTED_ADAPTER}`);
    }
    return {
      name: trimOrNull(config.name),
      adapter,
      targetTenantId: trimOrNull(config.targetTenantId),
      targetTenantName: trimOrNull(config.targetTenantName),
      targetTenantCode: trimOrNull(config.targetTenantCode),
      sshHost: trimOrNull(config.sshHost),
      sshPort: Number(config.sshPort || 22),
      sshUsername: trimOrNull(config.sshUsername),
      sshPassword: trimOrNull(config.sshPassword),
      dbHost: trimOrNull(config.dbHost) || '127.0.0.1',
      dbPort: Number(config.dbPort || 3306),
      dbName: trimOrNull(config.dbName),
      dbUser: trimOrNull(config.dbUser),
      dbPassword: trimOrNull(config.dbPassword),
      options: normalizeOptions(config.options, config.dbName),
    };
  }

  const adapter = normalizeAdapterName(config.adapter);
  if (adapter !== SUPPORTED_ADAPTER) {
    throw new Error(`Unsupported adapter "${adapter}". Supported adapters: ${SUPPORTED_ADAPTER}`);
  }

  const sourceName = trimOrNull(config.name);
  if (!sourceName) {
    throw new Error('Sync source name is required.');
  }

  const database = config.database || {};
  const ssh = config.ssh || {};
  const options = config.options || {};

  const dbHost = trimOrNull(database.host) || '127.0.0.1';
  const dbPort = Number(database.port || 3306);
  const dbName = trimOrNull(database.name);
  const dbUser = trimOrNull(database.user);
  const dbPassword = trimOrNull(database.password);

  if (!dbName || !dbUser || !dbPassword) {
    throw new Error('database.name, database.user and database.password are required.');
  }

  const normalized = {
    name: sourceName,
    adapter,
    targetTenantId: trimOrNull(config.targetTenantId),
    targetTenantName: trimOrNull(config.targetTenantName),
    targetTenantCode: trimOrNull(config.targetTenantCode),
    sshHost: trimOrNull(ssh.host),
    sshPort: Number(ssh.port || 22),
    sshUsername: trimOrNull(ssh.username),
    sshPassword: trimOrNull(ssh.password),
    dbHost,
    dbPort,
    dbName,
    dbUser,
    dbPassword,
    options: normalizeOptions(options, dbName),
  };

  if (normalized.sshHost && (!normalized.sshUsername || !normalized.sshPassword)) {
    throw new Error('ssh.username and ssh.password are required when ssh.host is set.');
  }

  return normalized;
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      parsed[key] = true;
      continue;
    }
    parsed[key] = next;
    index += 1;
  }
  return parsed;
}

function parseSyncOverrides(args) {
  const hasOverrides = [
    'stage',
    'include-journals',
    'invoice-number-min',
    'invoice-number-max',
    'target-tenant-id',
    'target-tenant-name',
    'target-tenant-code',
  ].some((key) => args[key] !== undefined);

  if (!hasOverrides) return null;

  return {
    targetTenantId: args['target-tenant-id'],
    targetTenantName: args['target-tenant-name'],
    targetTenantCode: args['target-tenant-code'],
    options: {
      stage: args.stage,
      includeJournalEntries: Boolean(args['include-journals']),
      invoiceNumberMin: args['invoice-number-min'],
      invoiceNumberMax: args['invoice-number-max'],
    },
  };
}

export function parseSyncCliArgs(argv) {
  const args = parseArgs(argv);

  if (args.config) {
    const configPath = path.resolve(process.cwd(), args.config);
    const rawConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return {
      mode: 'config',
      config: normalizeConfig(rawConfig),
    };
  }

  if (args['source-id']) {
    return { mode: 'stored-source-id', sourceId: args['source-id'], overrides: parseSyncOverrides(args) };
  }

  if (args['source-name'] && !args['db-name']) {
    return { mode: 'stored-source-name', sourceName: args['source-name'], overrides: parseSyncOverrides(args) };
  }

  const hasInlineDbConfig = args['db-name'] || args['db-user'] || args['db-password'];
  if (!hasInlineDbConfig) {
    throw new Error(
      'Provide either --config <file>, --source-id <uuid>, --source-name <name>, or inline database arguments.'
    );
  }

  return {
    mode: 'config',
    config: normalizeConfig({
      name: args['source-name'],
      adapter: args.adapter,
      targetTenantId: args['target-tenant-id'],
      targetTenantName: args['target-tenant-name'],
      targetTenantCode: args['target-tenant-code'],
      ssh: {
        host: args['ssh-host'],
        port: args['ssh-port'],
        username: args['ssh-username'],
        password: args['ssh-password'],
      },
      database: {
        host: args['db-host'],
        port: args['db-port'],
        name: args['db-name'],
        user: args['db-user'],
        password: args['db-password'],
      },
      options: {
        sourceSchema: args['source-schema'],
        currency: args.currency,
        stage: args.stage,
        includeJournalEntries: Boolean(args['include-journals']),
        invoiceNumberMin: args['invoice-number-min'],
        invoiceNumberMax: args['invoice-number-max'],
      },
    }),
  };
}

export async function ensureExternalSyncSchema(pool) {
  await pool.query(EXTERNAL_SYNC_SCHEMA_SQL);
}

function maskSecret(value) {
  if (!value) return null;
  if (value.length <= 4) return '*'.repeat(value.length);
  return `${value.slice(0, 2)}***${value.slice(-2)}`;
}

function maskSource(source) {
  if (!source) return null;
  return {
    ...source,
    ssh_password: maskSecret(source.ssh_password),
    db_password: maskSecret(source.db_password),
  };
}

async function getStoredSourceById(pool, sourceId) {
  const result = await pool.query('SELECT * FROM external_sync_sources WHERE id = $1', [sourceId]);
  return result.rows[0] || null;
}

async function getStoredSourceByName(pool, sourceName) {
  const result = await pool.query('SELECT * FROM external_sync_sources WHERE LOWER(name) = LOWER($1)', [sourceName]);
  return result.rows[0] || null;
}

function sourceRowToConfig(row) {
  if (!row) return null;
  return normalizeConfig({
    name: row.name,
    adapter: row.adapter,
    targetTenantId: row.target_tenant_id,
    ssh: {
      host: row.ssh_host,
      port: row.ssh_port,
      username: row.ssh_username,
      password: row.ssh_password,
    },
    database: {
      host: row.db_host,
      port: row.db_port,
      name: row.db_name,
      user: row.db_user,
      password: row.db_password,
    },
    options: row.options || {},
  });
}

function applyConfigOverrides(baseConfig, overrides = null) {
  if (!overrides) return baseConfig;
  return normalizeConfig({
    ...baseConfig,
    targetTenantId: overrides.targetTenantId ?? baseConfig.targetTenantId,
    targetTenantName: overrides.targetTenantName ?? baseConfig.targetTenantName,
    targetTenantCode: overrides.targetTenantCode ?? baseConfig.targetTenantCode,
    options: {
      ...(baseConfig.options || {}),
      ...(overrides.options || {}),
    },
  });
}

async function upsertStoredSource(pool, config, targetTenantId) {
  const result = await pool.query(
    `INSERT INTO external_sync_sources (
       name, adapter, target_tenant_id, status,
       ssh_host, ssh_port, ssh_username, ssh_password,
       db_host, db_port, db_name, db_user, db_password, options, updated_at
     )
     VALUES ($1, $2, $3, 'active', $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, NOW())
     ON CONFLICT (name) DO UPDATE SET
       adapter = EXCLUDED.adapter,
       target_tenant_id = EXCLUDED.target_tenant_id,
       ssh_host = EXCLUDED.ssh_host,
       ssh_port = EXCLUDED.ssh_port,
       ssh_username = EXCLUDED.ssh_username,
       ssh_password = EXCLUDED.ssh_password,
       db_host = EXCLUDED.db_host,
       db_port = EXCLUDED.db_port,
       db_name = EXCLUDED.db_name,
       db_user = EXCLUDED.db_user,
       db_password = EXCLUDED.db_password,
       options = EXCLUDED.options,
       updated_at = NOW()
     RETURNING *`,
    [
      config.name,
      config.adapter,
      targetTenantId,
      config.sshHost,
      config.sshPort,
      config.sshUsername,
      config.sshPassword,
      config.dbHost,
      config.dbPort,
      config.dbName,
      config.dbUser,
      config.dbPassword,
      JSON.stringify(config.options || {}),
    ]
  );
  return result.rows[0];
}

async function openMysqlConnection(config) {
  let sshClient = null;
  let connection = null;
  try {
    if (config.sshHost) {
      sshClient = new SshClient();
      await new Promise((resolve, reject) => {
        sshClient
          .on('ready', resolve)
          .on('error', reject)
          .connect({
            host: config.sshHost,
            port: config.sshPort || 22,
            username: config.sshUsername,
            password: config.sshPassword,
            readyTimeout: 30000,
          });
      });

      const stream = await new Promise((resolve, reject) => {
        sshClient.forwardOut('127.0.0.1', 0, config.dbHost, config.dbPort || 3306, (err, forwardedStream) => {
          if (err) reject(err);
          else resolve(forwardedStream);
        });
      });

      connection = await mysql.createConnection({
        user: config.dbUser,
        password: config.dbPassword,
        database: config.dbName,
        charset: 'utf8mb4',
        decimalNumbers: true,
        supportBigNumbers: true,
        bigNumberStrings: false,
        dateStrings: true,
        stream,
      });
    } else {
      connection = await mysql.createConnection({
        host: config.dbHost,
        port: config.dbPort || 3306,
        user: config.dbUser,
        password: config.dbPassword,
        database: config.dbName,
        charset: 'utf8mb4',
        decimalNumbers: true,
        supportBigNumbers: true,
        bigNumberStrings: false,
        dateStrings: true,
      });
    }

    return {
      connection,
      async close() {
        if (connection) {
          try {
            await connection.end();
          } catch {
            // ignore close errors
          }
        }
        if (sshClient) {
          sshClient.end();
        }
      },
    };
  } catch (error) {
    if (connection) {
      try {
        await connection.end();
      } catch {
        // ignore close errors
      }
    }
    if (sshClient) sshClient.end();
    throw error;
  }
}

async function fetchAll(connection, sql, params = []) {
  const [rows] = await connection.query(sql, params);
  return rows;
}

function toMap(rows, keyField = 'id') {
  return new Map(rows.map((row) => [String(row[keyField]), row]));
}

function groupBy(rows, keyField) {
  const grouped = new Map();
  for (const row of rows) {
    const key = String(row[keyField]);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(row);
  }
  return grouped;
}

function mapLegacyAccountType(sourceType, code) {
  const typeNumber = Number(sourceType);
  if (typeNumber === 1) return 'asset';
  if (typeNumber === 2) return 'liability';
  if (typeNumber === 3) return 'equity';
  if (typeNumber === 4) return 'income';
  if (typeNumber === 5 || typeNumber === 6 || typeNumber === 7) return 'expense';

  const numericCode = String(code || '');
  if (numericCode.startsWith('1')) return 'asset';
  if (numericCode.startsWith('2')) return 'liability';
  if (numericCode.startsWith('3')) return 'equity';
  if (numericCode.startsWith('4')) return 'income';
  if (numericCode.startsWith('5') || numericCode.startsWith('6') || numericCode.startsWith('7')) return 'expense';
  return 'asset';
}

function mapLegacyInvoiceStatus(sourceInvoice, total, paidAmount) {
  const sourceStatus = Number(sourceInvoice.status || 0);
  if (total > 0 && paidAmount >= total - 0.01) return 'paid';
  if (sourceStatus === 7) return 'cancelled';
  if (sourceStatus === 0) return 'draft';
  if (paidAmount > 0 && paidAmount < total) return 'partial';
  if (sourceInvoice.due_date) {
    const due = new Date(sourceInvoice.due_date);
    if (!Number.isNaN(due.getTime()) && due.getTime() < Date.now()) return 'overdue';
  }
  if (sourceStatus === 1 || sourceStatus === 2 || sourceStatus === 6) return 'sent';
  return 'pending';
}

function mapLegacyBillStatus(sourceBill, amount, paidAmount) {
  const sourceStatus = Number(sourceBill.status || 0);
  if (amount > 0 && paidAmount >= amount - 0.01) return 'paid';
  if (paidAmount > 0 && paidAmount < amount) return 'partial';
  if (sourceStatus === 0) return 'draft';
  if (sourceStatus === 3) return 'cancelled';
  if (sourceBill.due_date) {
    const due = new Date(sourceBill.due_date);
    if (!Number.isNaN(due.getTime()) && due.getTime() < Date.now()) return 'overdue';
  }
  return 'pending';
}

function mapLegacyPaymentMethod(value) {
  const normalized = trimOrNull(value);
  if (normalized) return normalized.toLowerCase();

  const method = Number(value);
  if (method === 0) return 'manual';
  if (method === 1) return 'cash';
  if (method === 2) return 'bank_transfer';
  if (method === 3) return 'card';
  return 'manual';
}

async function fetchLegacyData(connection, sourceSchema, options = {}) {
  const invoiceFilter = buildInvoiceNumberWhereClause(options, 'i');

  const settingsRows = await fetchAll(
    connection,
    `SELECT name, value, updated_at
     FROM ${sourceSchema}.settings
     WHERE name IN (${COMPANY_SETTING_KEYS.map(() => '?').join(', ')})
     ORDER BY updated_at ASC`,
    COMPANY_SETTING_KEYS
  );

  const settings = {};
  for (const row of settingsRows) {
    const value = trimOrNull(row.value);
    if (value) settings[row.name] = value;
  }

  const baseResults = await Promise.all([
    fetchAll(connection, `SELECT id, name, rate, created_at, updated_at FROM ${sourceSchema}.taxes ORDER BY id ASC`),
    fetchAll(connection, `SELECT id, name, created_at, updated_at FROM ${sourceSchema}.product_service_units ORDER BY id ASC`),
    fetchAll(connection, `SELECT id, name, type, created_at, updated_at FROM ${sourceSchema}.product_service_categories ORDER BY id ASC`),
    fetchAll(
      connection,
      `SELECT p.*, c.name AS category_name, u.name AS unit_name, t.name AS tax_name, t.rate AS tax_rate
       FROM ${sourceSchema}.product_services p
       LEFT JOIN ${sourceSchema}.product_service_categories c ON c.id = p.category_id
       LEFT JOIN ${sourceSchema}.product_service_units u ON u.id = p.unit_id
       LEFT JOIN ${sourceSchema}.taxes t ON t.id = p.tax_id
       WHERE p.deleted_at IS NULL
       ORDER BY p.id ASC`
    ),
    fetchAll(connection, `SELECT * FROM ${sourceSchema}.customers WHERE deleted_at IS NULL ORDER BY id ASC`),
    fetchAll(connection, `SELECT * FROM ${sourceSchema}.venders WHERE deleted_at IS NULL ORDER BY id ASC`),
    fetchAll(
      connection,
      `SELECT c.*, t.name AS type_name, st.name AS sub_type_name
       FROM ${sourceSchema}.chart_of_accounts c
       LEFT JOIN ${sourceSchema}.chart_of_account_types t ON t.id = c.type
       LEFT JOIN ${sourceSchema}.chart_of_account_sub_types st ON st.id = c.sub_type
       ORDER BY c.code ASC, c.id ASC`
    ),
    fetchAll(
      connection,
      `SELECT i.*, ic.name AS invoice_contact_name, ic.company_name AS invoice_company_name, ic.email AS invoice_email,
              ic.contact AS invoice_contact_phone, ic.tax_number AS invoice_tax_number,
              ic.unique_number AS invoice_unique_number, ic.billing_city AS invoice_billing_city,
              ic.billing_address AS invoice_billing_address
       FROM ${sourceSchema}.invoices i
       LEFT JOIN ${sourceSchema}.invoice_customers ic ON ic.invoice_id = i.id
       WHERE i.deleted_at IS NULL
       ${invoiceFilter.clause}
       ORDER BY i.id ASC`
      ,
      invoiceFilter.params
    ),
    fetchAll(
      connection,
      `SELECT ip.*
       FROM ${sourceSchema}.invoice_products ip
       JOIN ${sourceSchema}.invoices i ON i.id = ip.invoice_id
       WHERE i.deleted_at IS NULL
       ${invoiceFilter.clause}
       ORDER BY ip.invoice_id ASC, ip.id ASC`,
      invoiceFilter.params
    ),
    fetchAll(
      connection,
      `SELECT p.*
       FROM ${sourceSchema}.invoice_payments p
       JOIN ${sourceSchema}.invoices i ON i.id = p.invoice_id
       WHERE i.deleted_at IS NULL
       ${invoiceFilter.clause}
       ORDER BY p.invoice_id ASC, p.id ASC`,
      invoiceFilter.params
    ),
    fetchAll(
      connection,
      `SELECT b.*, v.name AS supplier_contact_name, v.company_name AS supplier_company_name, v.email AS supplier_email,
              v.phone AS supplier_phone, v.contact AS supplier_contact, v.address AS supplier_address,
              v.city AS supplier_city, v.unique_number AS supplier_unique_number, v.tax_number AS supplier_tax_number
       FROM ${sourceSchema}.bills b
       LEFT JOIN ${sourceSchema}.venders v ON v.id = b.vender_id
       WHERE b.deleted_at IS NULL
       ORDER BY b.id ASC`
    ),
    fetchAll(connection, `SELECT * FROM ${sourceSchema}.bill_expenses ORDER BY bill_id ASC, id ASC`),
    fetchAll(connection, `SELECT * FROM ${sourceSchema}.bill_payments ORDER BY bill_id ASC, id ASC`),
  ]);

  const [
    taxes,
    units,
    productCategories,
    products,
    customers,
    suppliers,
    accounts,
    invoices,
    invoiceItems,
    invoicePayments,
    bills,
    billExpenses,
    billPayments,
  ] = baseResults;

  const [journalEntries, journalEntryItems] = options.includeJournalEntries
    ? await Promise.all([
      fetchAll(connection, `SELECT * FROM ${sourceSchema}.transaction_accounts ORDER BY id ASC`),
      fetchAll(connection, `SELECT * FROM ${sourceSchema}.transaction_account_items ORDER BY transaction_account_id ASC, id ASC`),
    ])
    : [[], []];

  return {
    settings,
    taxes,
    units,
    productCategories,
    products,
    customers,
    suppliers,
    accounts,
    invoices,
    invoiceItems,
    invoicePayments,
    bills,
    billExpenses,
    billPayments,
    journalEntries,
    journalEntryItems,
  };
}

async function resolveTargetTenant(pool, config, settings) {
  if (config.targetTenantId) {
    const existing = await pool.query('SELECT * FROM tenants WHERE id = $1', [config.targetTenantId]);
    if (existing.rows[0]) return existing.rows[0];
    throw new Error(`Target tenant ${config.targetTenantId} was not found.`);
  }

  const requestedCode = trimOrNull(config.targetTenantCode) || slugify(config.targetTenantName || settings.company_name || config.name);
  const requestedName = trimOrNull(config.targetTenantName) || trimOrNull(settings.company_name) || config.name;

  if (requestedCode) {
    const byCode = await pool.query('SELECT * FROM tenants WHERE LOWER(code) = LOWER($1)', [requestedCode]);
    if (byCode.rows[0]) {
      const updated = await pool.query(
        `UPDATE tenants
         SET name = COALESCE($2, name),
             nipt = COALESCE($3, nipt),
             address = COALESCE($4, address),
             city = COALESCE($5, city),
             phone = COALESCE($6, phone),
             email = COALESCE($7, email),
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [
          byCode.rows[0].id,
          requestedName,
          trimOrNull(settings.company_tax_number) || trimOrNull(settings.company_vat_number),
          trimOrNull(settings.company_address),
          trimOrNull(settings.company_city),
          trimOrNull(settings.company_phone),
          trimOrNull(settings.company_email),
        ]
      );
      return updated.rows[0];
    }
  }

  if (requestedName) {
    const byName = await pool.query('SELECT * FROM tenants WHERE LOWER(name) = LOWER($1)', [requestedName]);
    if (byName.rows[0]) {
      const updated = await pool.query(
        `UPDATE tenants
         SET code = COALESCE(code, $2),
             nipt = COALESCE($3, nipt),
             address = COALESCE($4, address),
             city = COALESCE($5, city),
             phone = COALESCE($6, phone),
             email = COALESCE($7, email),
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [
          byName.rows[0].id,
          requestedCode,
          trimOrNull(settings.company_tax_number) || trimOrNull(settings.company_vat_number),
          trimOrNull(settings.company_address),
          trimOrNull(settings.company_city),
          trimOrNull(settings.company_phone),
          trimOrNull(settings.company_email),
        ]
      );
      return updated.rows[0];
    }
  }

  const created = await pool.query(
    `INSERT INTO tenants (name, code, status, plan, nipt, address, city, phone, email, settings)
     VALUES ($1, $2, 'active', 'free', $3, $4, $5, $6, $7, $8::jsonb)
     RETURNING *`,
    [
      requestedName,
      requestedCode,
      trimOrNull(settings.company_tax_number) || trimOrNull(settings.company_vat_number),
      trimOrNull(settings.company_address),
      trimOrNull(settings.company_city),
      trimOrNull(settings.company_phone),
      trimOrNull(settings.company_email),
      JSON.stringify({
        source_sync: {
          adapter: config.adapter,
          source_name: config.name,
          source_database: config.dbName,
        },
      }),
    ]
  );
  return created.rows[0];
}

async function createRun(pool, sourceId) {
  const result = await pool.query(
    `INSERT INTO external_sync_runs (source_id, status, summary)
     VALUES ($1, 'running', '{}'::jsonb)
     RETURNING *`,
    [sourceId]
  );
  return result.rows[0];
}

async function finishRun(pool, runId, status, summary, errorMessage = null) {
  await pool.query(
    `UPDATE external_sync_runs
     SET status = $2,
         summary = $3::jsonb,
         error_message = $4,
         finished_at = NOW()
     WHERE id = $1`,
    [runId, status, JSON.stringify(summary || {}), errorMessage]
  );
}

async function touchSourceSyncTimestamp(pool, sourceId) {
  await pool.query(
    'UPDATE external_sync_sources SET last_synced_at = NOW(), updated_at = NOW() WHERE id = $1',
    [sourceId]
  );
}

async function loadLinkMap(pool, sourceId, entityName) {
  const result = await pool.query(
    `SELECT source_record_id, target_record_id
     FROM external_sync_record_links
     WHERE source_id = $1 AND entity_name = $2`,
    [sourceId, entityName]
  );
  return new Map(result.rows.map((row) => [row.source_record_id, row.target_record_id]));
}

async function upsertLink(pool, sourceId, entityName, sourceTable, sourceRecordId, targetTable, targetRecordId, metadata = {}) {
  await pool.query(
    `INSERT INTO external_sync_record_links (
       source_id, entity_name, source_table, source_record_id, target_table, target_record_id, metadata, synced_at, updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, NOW(), NOW())
     ON CONFLICT (source_id, entity_name, source_table, source_record_id)
     DO UPDATE SET
       target_table = EXCLUDED.target_table,
       target_record_id = EXCLUDED.target_record_id,
       metadata = EXCLUDED.metadata,
       synced_at = NOW(),
       updated_at = NOW()`,
    [sourceId, entityName, sourceTable, String(sourceRecordId), targetTable, targetRecordId, JSON.stringify(metadata || {})]
  );
}

async function updateOrInsertLinkedRecord({
  pool,
  linkMap,
  sourceId,
  entityName,
  sourceTable,
  sourceRecordId,
  targetTable,
  metadata,
  updateSql,
  updateValues,
  insertSql,
  insertValues,
}) {
  const sourceKey = String(sourceRecordId);
  const existingTargetId = linkMap.get(sourceKey);
  if (existingTargetId) {
    const updateResult = await pool.query(updateSql, [...updateValues, existingTargetId]);
    if (updateResult.rows[0]) {
      await upsertLink(pool, sourceId, entityName, sourceTable, sourceKey, targetTable, updateResult.rows[0].id, metadata);
      return { id: updateResult.rows[0].id, mode: 'updated' };
    }
  }

  const insertResult = await pool.query(insertSql, insertValues);
  const targetId = insertResult.rows[0].id;
  linkMap.set(sourceKey, targetId);
  await upsertLink(pool, sourceId, entityName, sourceTable, sourceKey, targetTable, targetId, metadata);
  return { id: targetId, mode: 'created' };
}

function buildInvoiceItem(sourceItem, productRow, unitRow, taxRow, targetProductId) {
  const quantity = toNumber(sourceItem.quantity, 0);
  const unitPrice = clampMoney(sourceItem.price);
  const unitPriceWithTax = clampMoney(sourceItem.price_with_tax || sourceItem.price);
  const taxRate = clampMoney(taxRow?.rate || sourceItem.tax || 0);
  const subtotal = clampMoney(quantity * unitPrice);
  const total = clampMoney(quantity * unitPriceWithTax);
  return {
    source_id: sourceItem.id,
    source_product_id: sourceItem.product_id,
    product_id: targetProductId,
    product_name: productRow?.name || trimOrNull(sourceItem.description) || `Legacy product #${sourceItem.product_id}`,
    description: trimOrNull(sourceItem.description) || productRow?.description || null,
    quantity,
    unit: unitRow?.name || productRow?.unit_name || null,
    unit_price: unitPrice,
    price_with_tax: unitPriceWithTax,
    tax_rate: taxRate,
    tax_amount: clampMoney(total - subtotal),
    discount: clampMoney(sourceItem.discount || 0),
    total,
  };
}

function buildBillItem(sourceItem, accountRow, taxRow) {
  const subtotal = clampMoney(sourceItem.price);
  const taxRate = clampMoney(taxRow?.rate || 0);
  const taxAmount = clampMoney(subtotal * taxRate / 100);
  const total = clampMoney(subtotal + taxAmount);
  return {
    source_id: sourceItem.id,
    account_source_id: sourceItem.account_id,
    account_code: accountRow?.code ? String(accountRow.code) : null,
    account_name: accountRow?.name || null,
    description: trimOrNull(sourceItem.description) || accountRow?.name || null,
    price: subtotal,
    tax_rate: taxRate,
    tax_amount: taxAmount,
    total,
  };
}

function buildPaymentRecord(sourcePayment) {
  return {
    source_id: sourcePayment.id,
    amount: clampMoney(sourcePayment.amount),
    payment_date: normalizeLegacyDate(sourcePayment.date),
    payment_method: mapLegacyPaymentMethod(sourcePayment.payment_type || sourcePayment.payment_method),
    reference: trimOrNull(sourcePayment.reference) || trimOrNull(sourcePayment.txn_id) || trimOrNull(sourcePayment.order_id),
    notes: trimOrNull(sourcePayment.description) || null,
    created_at: normalizeLegacyDate(sourcePayment.created_at),
  };
}

function buildInvoiceNumberWhereClause(options = {}, tableAlias = 'i') {
  const clauses = [];
  const params = [];

  if (options.invoiceNumberMin !== null && options.invoiceNumberMin !== undefined && Number.isFinite(Number(options.invoiceNumberMin))) {
    clauses.push(`${tableAlias}.invoice_id >= ?`);
    params.push(Number(options.invoiceNumberMin));
  }

  if (options.invoiceNumberMax !== null && options.invoiceNumberMax !== undefined && Number.isFinite(Number(options.invoiceNumberMax))) {
    clauses.push(`${tableAlias}.invoice_id <= ?`);
    params.push(Number(options.invoiceNumberMax));
  }

  return {
    clause: clauses.length ? ` AND ${clauses.join(' AND ')}` : '',
    params,
  };
}

function shouldSyncInvoices(options = {}) {
  return !options.stage || options.stage === 'full' || options.stage === 'invoices';
}

function shouldSyncPayments(options = {}) {
  return options.stage === 'full' || options.stage === 'payments';
}

function shouldSyncBills(options = {}) {
  return options.stage === 'full' || options.stage === 'bills';
}

function shouldSyncJournals(options = {}) {
  return options.includeJournalEntries === true && (options.stage === 'full' || options.stage === 'journals');
}

function shouldSyncMasterData(options = {}) {
  return !options.stage || options.stage === 'full' || options.stage === 'invoices';
}

async function syncTaxRates(pool, context) {
  const linkMap = await loadLinkMap(pool, context.source.id, 'tax_rate');
  const counts = { created: 0, updated: 0 };
  const sourceById = new Map();
  const targetById = new Map();

  for (const row of context.legacy.taxes) {
    sourceById.set(String(row.id), row);

    const insertValues = [
      context.tenant.id,
      trimOrEmpty(row.name) || `Legacy Tax ${row.id}`,
      clampMoney(row.rate),
      false,
      false,
      true,
      row.created_at || null,
      row.updated_at || null,
    ];

    const updateValues = [
      context.tenant.id,
      trimOrEmpty(row.name) || `Legacy Tax ${row.id}`,
      clampMoney(row.rate),
      false,
      false,
      true,
      row.updated_at || null,
    ];

    const result = await updateOrInsertLinkedRecord({
      pool,
      linkMap,
      sourceId: context.source.id,
      entityName: 'tax_rate',
      sourceTable: 'taxes',
      sourceRecordId: row.id,
      targetTable: 'tax_rates',
      metadata: { name: row.name, rate: row.rate },
      updateSql: `
        UPDATE tax_rates
        SET tenant_id = $1, name = $2, rate = $3, is_inclusive = $4, is_default = $5, is_active = $6, updated_at = COALESCE($7, NOW())
        WHERE id = $8
        RETURNING id`,
      updateValues,
      insertSql: `
        INSERT INTO tax_rates (tenant_id, name, rate, is_inclusive, is_default, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, NOW()), COALESCE($8, NOW()))
        RETURNING id`,
      insertValues,
    });

    counts[result.mode] += 1;
    targetById.set(String(row.id), result.id);
  }

  context.maps.sourceTaxes = sourceById;
  context.maps.targetTaxIds = targetById;
  return counts;
}

async function syncUnits(pool, context) {
  const linkMap = await loadLinkMap(pool, context.source.id, 'unit');
  const counts = { created: 0, updated: 0 };
  const sourceById = new Map();
  const targetById = new Map();

  for (const row of context.legacy.units) {
    sourceById.set(String(row.id), row);
    const name = trimOrEmpty(row.name) || `Unit ${row.id}`;
    const abbreviation = name.length <= 12 ? name : name.slice(0, 12);

    const result = await updateOrInsertLinkedRecord({
      pool,
      linkMap,
      sourceId: context.source.id,
      entityName: 'unit',
      sourceTable: 'product_service_units',
      sourceRecordId: row.id,
      targetTable: 'units',
      metadata: { name },
      updateSql: `
        UPDATE units
        SET tenant_id = $1, name = $2, abbreviation = $3, updated_at = COALESCE($4, NOW())
        WHERE id = $5
        RETURNING id`,
      updateValues: [context.tenant.id, name, abbreviation, row.updated_at || null],
      insertSql: `
        INSERT INTO units (tenant_id, name, abbreviation, created_at, updated_at)
        VALUES ($1, $2, $3, COALESCE($4, NOW()), COALESCE($5, NOW()))
        RETURNING id`,
      insertValues: [context.tenant.id, name, abbreviation, row.created_at || null, row.updated_at || null],
    });

    counts[result.mode] += 1;
    targetById.set(String(row.id), result.id);
  }

  context.maps.sourceUnits = sourceById;
  context.maps.targetUnitIds = targetById;
  return counts;
}

async function syncClients(pool, context) {
  const linkMap = await loadLinkMap(pool, context.source.id, 'client');
  const counts = { created: 0, updated: 0 };
  const sourceById = new Map();
  const targetById = new Map();

  for (const row of context.legacy.customers) {
    sourceById.set(String(row.id), row);

    const name = trimOrNull(row.company_name) || trimOrNull(row.name) || `Legacy Client ${row.id}`;
    const contactPerson = trimOrNull(row.company_name) && trimOrNull(row.name) && row.company_name !== row.name ? trimOrNull(row.name) : null;

    const payload = [
      context.tenant.id,
      name,
      trimOrNull(row.email),
      trimOrNull(row.billing_phone) || trimOrNull(row.contact),
      trimOrNull(row.billing_address) || trimOrNull(row.shipping_address),
      trimOrNull(row.billing_city) || trimOrNull(row.shipping_city),
      trimOrNull(row.unique_number) || trimOrNull(row.tax_number),
      trimOrNull(row.tax_number),
      contactPerson,
      null,
      clampMoney(row.balance),
    ];

    const result = await updateOrInsertLinkedRecord({
      pool,
      linkMap,
      sourceId: context.source.id,
      entityName: 'client',
      sourceTable: 'customers',
      sourceRecordId: row.id,
      targetTable: 'clients',
      metadata: { legacy_customer_id: row.customer_id || null, name },
      updateSql: `
        UPDATE clients
        SET tenant_id = $1, name = $2, email = $3, phone = $4, address = $5, city = $6,
            nipt = $7, tvsh = $8, contact_person = $9, notes = $10, balance = $11, updated_at = NOW()
        WHERE id = $12
        RETURNING id`,
      updateValues: payload,
      insertSql: `
        INSERT INTO clients (tenant_id, name, email, phone, address, city, nipt, tvsh, contact_person, notes, balance, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, COALESCE($12, NOW()), COALESCE($13, NOW()))
        RETURNING id`,
      insertValues: [...payload, row.created_at || null, row.updated_at || null],
    });

    counts[result.mode] += 1;
    targetById.set(String(row.id), result.id);
  }

  context.maps.sourceClients = sourceById;
  context.maps.targetClientIds = targetById;
  return counts;
}

async function syncSuppliers(pool, context) {
  const linkMap = await loadLinkMap(pool, context.source.id, 'supplier');
  const counts = { created: 0, updated: 0 };
  const sourceById = new Map();
  const targetById = new Map();

  for (const row of context.legacy.suppliers) {
    sourceById.set(String(row.id), row);

    const name = trimOrNull(row.company_name) || trimOrNull(row.name) || `Legacy Supplier ${row.id}`;
    const contactPerson = trimOrNull(row.contact_person) || (row.company_name && row.name !== row.company_name ? trimOrNull(row.name) : null);

    const payload = [
      context.tenant.id,
      name,
      trimOrNull(row.email),
      trimOrNull(row.phone) || trimOrNull(row.contact),
      trimOrNull(row.address) || trimOrNull(row.billing_address),
      trimOrNull(row.city) || trimOrNull(row.billing_city),
      trimOrNull(row.unique_number) || trimOrNull(row.tax_number),
      contactPerson,
      trimOrNull(row.notes),
      trimOrNull(row.payment_terms),
      trimOrNull(row.status) ? row.status.toLowerCase() === 'active' : true,
      clampMoney(row.balance || row.credit_limit),
    ];

    const result = await updateOrInsertLinkedRecord({
      pool,
      linkMap,
      sourceId: context.source.id,
      entityName: 'supplier',
      sourceTable: 'venders',
      sourceRecordId: row.id,
      targetTable: 'suppliers',
      metadata: { legacy_vendor_id: row.vender_id || null, name },
      updateSql: `
        UPDATE suppliers
        SET tenant_id = $1, name = $2, email = $3, phone = $4, address = $5, city = $6,
            nipt = $7, contact_person = $8, notes = $9, payment_terms = $10,
            is_active = $11, total_spent = $12, updated_at = NOW()
        WHERE id = $13
        RETURNING id`,
      updateValues: payload,
      insertSql: `
        INSERT INTO suppliers (
          tenant_id, name, email, phone, address, city, nipt, contact_person,
          notes, payment_terms, is_active, total_spent, created_at, updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10, $11, $12, COALESCE($13, NOW()), COALESCE($14, NOW())
        )
        RETURNING id`,
      insertValues: [...payload, row.created_at || null, row.updated_at || null],
    });

    counts[result.mode] += 1;
    targetById.set(String(row.id), result.id);
  }

  context.maps.sourceSuppliers = sourceById;
  context.maps.targetSupplierIds = targetById;
  return counts;
}

async function syncProducts(pool, context) {
  const linkMap = await loadLinkMap(pool, context.source.id, 'product');
  const counts = { created: 0, updated: 0 };
  const sourceById = new Map();
  const targetById = new Map();

  for (const row of context.legacy.products) {
    sourceById.set(String(row.id), row);
    const taxRate = clampMoney(row.tax_rate || 0);
    const payload = [
      context.tenant.id,
      trimOrNull(row.name) || `Legacy Product ${row.id}`,
      trimOrNull(row.description),
      clampMoney(row.sale_price || row.price),
      trimOrNull(row.unit_name),
      trimOrNull(row.category_name),
      trimOrNull(row.sku),
      clampMoney(row.stock || row.quantity),
      taxRate,
      true,
      trimOrNull(row.type) || 'product',
      clampMoney(row.purchase_price),
      clampMoney(row.price),
      taxRate,
    ];

    const result = await updateOrInsertLinkedRecord({
      pool,
      linkMap,
      sourceId: context.source.id,
      entityName: 'product',
      sourceTable: 'product_services',
      sourceRecordId: row.id,
      targetTable: 'products',
      metadata: { sku: row.sku, type: row.type },
      updateSql: `
        UPDATE products
        SET tenant_id = $1, name = $2, description = $3, price = $4, unit = $5, category = $6,
            sku = $7, stock_quantity = $8, tax_rate = $9, is_active = $10, type = $11,
            cost_price = $12, price_ex_vat = $13, vat_rate = $14, updated_at = NOW()
        WHERE id = $15
        RETURNING id`,
      updateValues: payload,
      insertSql: `
        INSERT INTO products (
          tenant_id, name, description, price, unit, category, sku, stock_quantity,
          tax_rate, is_active, type, cost_price, price_ex_vat, vat_rate, created_at, updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10, $11, $12, $13, $14, COALESCE($15, NOW()), COALESCE($16, NOW())
        )
        RETURNING id`,
      insertValues: [...payload, row.created_at || null, row.updated_at || null],
    });

    counts[result.mode] += 1;
    targetById.set(String(row.id), result.id);
  }

  context.maps.sourceProducts = sourceById;
  context.maps.targetProductIds = targetById;
  return counts;
}

async function syncAccounts(pool, context) {
  const linkMap = await loadLinkMap(pool, context.source.id, 'account');
  const counts = { created: 0, updated: 0 };
  const sourceById = new Map();
  const targetById = new Map();

  for (const row of context.legacy.accounts) {
    sourceById.set(String(row.id), row);
    const accountType = mapLegacyAccountType(row.type, row.code);
    const normalBalance = row.is_debit ? 'debit' : ['liability', 'equity', 'income'].includes(accountType) ? 'credit' : 'debit';
    const descriptionParts = [trimOrNull(row.description), trimOrNull(row.type_name), trimOrNull(row.sub_type_name)].filter(Boolean);
    const description = descriptionParts.join(' | ') || null;
    const code = trimOrNull(row.code) || String(row.id);

    const payload = [
      context.tenant.id,
      code,
      trimOrNull(row.name) || `Legacy Account ${row.id}`,
      accountType,
      true,
      description,
      normalBalance,
    ];

    const result = await updateOrInsertLinkedRecord({
      pool,
      linkMap,
      sourceId: context.source.id,
      entityName: 'account',
      sourceTable: 'chart_of_accounts',
      sourceRecordId: row.id,
      targetTable: 'chart_of_accounts',
      metadata: { code, type: row.type, sub_type: row.sub_type },
      updateSql: `
        UPDATE chart_of_accounts
        SET tenant_id = $1, code = $2, name = $3, account_type = $4,
            is_active = $5, description = $6, normal_balance = $7, updated_at = NOW()
        WHERE id = $8
        RETURNING id`,
      updateValues: payload,
      insertSql: `
        INSERT INTO chart_of_accounts (
          tenant_id, code, name, account_type, is_active, description, normal_balance, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, NOW()), COALESCE($9, NOW()))
        RETURNING id`,
      insertValues: [...payload, row.created_at || null, row.updated_at || null],
    });

    counts[result.mode] += 1;
    targetById.set(String(row.id), result.id);
  }

  context.maps.sourceAccounts = sourceById;
  context.maps.targetAccountIds = targetById;
  return counts;
}

async function syncInvoices(pool, context) {
  const linkMap = await loadLinkMap(pool, context.source.id, 'invoice');
  const counts = { created: 0, updated: 0 };
  const targetById = new Map();
  const invoiceItemsByInvoiceId = groupBy(context.legacy.invoiceItems, 'invoice_id');
  const invoicePaymentsByInvoiceId = groupBy(context.legacy.invoicePayments, 'invoice_id');

  for (const row of context.legacy.invoices) {
    const sourceItems = invoiceItemsByInvoiceId.get(String(row.id)) || [];
    const sourcePayments = invoicePaymentsByInvoiceId.get(String(row.id)) || [];

    const items = sourceItems.map((item) => {
      const productRow = context.maps.sourceProducts.get(String(item.product_id));
      const unitRow = context.maps.sourceUnits.get(String(item.unit_id));
      const taxRow = context.maps.sourceTaxes.get(String(item.tax));
      const targetProductId = context.maps.targetProductIds.get(String(item.product_id)) || null;
      return buildInvoiceItem(item, productRow, unitRow, taxRow, targetProductId);
    });

    const subtotal = clampMoney(items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0));
    const total = clampMoney(items.reduce((sum, item) => sum + item.total, 0));
    const taxAmount = clampMoney(total - subtotal);
    const paymentRecords = sourcePayments.map(buildPaymentRecord);
    const paidAmount = clampMoney(paymentRecords.reduce((sum, payment) => sum + payment.amount, 0));
    const invoiceStatus = mapLegacyInvoiceStatus(row, total, paidAmount);
    const clientTargetId = context.maps.targetClientIds.get(String(row.customer_id)) || null;
    const clientSourceRow = context.maps.sourceClients.get(String(row.customer_id));
    const invoiceNumber = trimOrNull(row.invoice_id) || String(row.id);

    const payload = [
      context.tenant.id,
      String(invoiceNumber),
      'standard',
      'classic',
      trimOrNull(context.tenant.name),
      trimOrNull(context.tenant.nup || context.tenant.nipt || context.settings.company_tax_number),
      trimOrNull(context.tenant.tvsh || context.settings.company_vat_number),
      trimOrNull(context.tenant.city || context.settings.company_city),
      trimOrNull(context.tenant.address || context.settings.company_address),
      trimOrNull(context.tenant.phone || context.settings.company_phone),
      trimOrNull(context.tenant.email || context.settings.company_email),
      trimOrNull(context.tenant.bank_account || context.settings.company_bank_details),
      trimOrNull(context.settings.company_logo),
      clientTargetId,
      trimOrNull(row.invoice_company_name) || trimOrNull(clientSourceRow?.company_name) || trimOrNull(clientSourceRow?.name),
      trimOrNull(row.invoice_billing_address) || trimOrNull(clientSourceRow?.billing_address),
      trimOrNull(row.invoice_billing_city) || trimOrNull(clientSourceRow?.billing_city),
      trimOrNull(row.invoice_unique_number) || trimOrNull(clientSourceRow?.unique_number),
      trimOrNull(row.invoice_email) || trimOrNull(clientSourceRow?.email),
      trimOrNull(row.invoice_contact_phone) || trimOrNull(clientSourceRow?.contact) || trimOrNull(clientSourceRow?.billing_phone),
      normalizeLegacyDate(row.issue_date),
      normalizeLegacyDate(row.due_date),
      JSON.stringify(items),
      subtotal,
      taxAmount,
      clampMoney(total),
      clampMoney(total),
      paidAmount,
      invoiceStatus,
      trimOrNull(row.note),
      trimOrNull(context.settings.site_currency) || trimOrNull(context.options.currency) || 'EUR',
      mapLegacyPaymentMethod(row.payment_type),
      JSON.stringify(paymentRecords),
      trimOrNull(row.note),
      [trimOrNull(row.note_intern), `Legacy status: ${row.status}`, row.uuid_progress ? `Legacy uuid: ${row.uuid_progress}` : null].filter(Boolean).join('\n') || null,
      trimOrNull(row.created_by) ? `Legacy user #${row.created_by}` : null,
    ];

    const result = await updateOrInsertLinkedRecord({
      pool,
      linkMap,
      sourceId: context.source.id,
      entityName: 'invoice',
      sourceTable: 'invoices',
      sourceRecordId: row.id,
      targetTable: 'invoices',
      metadata: { invoice_id: row.invoice_id, customer_id: row.customer_id, source_status: row.status },
      updateSql: `
        UPDATE invoices
        SET tenant_id = $1, invoice_number = $2, invoice_type = $3, template = $4,
            company_name = $5, company_nup = $6, company_tvsh = $7, company_city = $8,
            company_address = $9, company_phone = $10, company_email = $11, company_bank = $12,
            company_logo_url = $13, client_id = $14, client_name = $15, client_address = $16,
            client_city = $17, client_nuis = $18, client_email = $19, client_phone = $20,
            issue_date = $21, due_date = $22, items = $23::jsonb, subtotal = $24, tax_amount = $25,
            vat_amount = $25, total = $26, amount = $27, paid_amount = $28, status = $29, notes = $30,
            currency = $31, payment_method = $32, payment_records = $33::jsonb, description = $34,
            internal_notes = $35, issued_by = $36, updated_at = NOW()
        WHERE id = $37
        RETURNING id`,
      updateValues: payload,
      insertSql: `
        INSERT INTO invoices (
          tenant_id, invoice_number, invoice_type, template, company_name, company_nup, company_tvsh,
          company_city, company_address, company_phone, company_email, company_bank, company_logo_url,
          client_id, client_name, client_address, client_city, client_nuis, client_email, client_phone,
          issue_date, due_date, items, subtotal, tax_amount, vat_amount, total, amount, paid_amount, status, notes,
          currency, payment_method, payment_records, description, internal_notes, issued_by, created_at, updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12, $13,
          $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23::jsonb, $24, $25, $25, $26, $27, $28, $29, $30,
          $31, $32, $33::jsonb, $34, $35, $36, COALESCE($37, NOW()), COALESCE($38, NOW())
        )
        RETURNING id`,
      insertValues: [...payload, normalizeLegacyDate(row.created_at), normalizeLegacyDate(row.updated_at)],
    });

    counts[result.mode] += 1;
    targetById.set(String(row.id), result.id);
  }

  context.maps.targetInvoiceIds = targetById;
  return counts;
}

async function syncPayments(pool, context) {
  const linkMap = await loadLinkMap(pool, context.source.id, 'payment');
  const counts = { created: 0, updated: 0 };
  const invoiceSourceMap = toMap(context.legacy.invoices);

  for (const row of context.legacy.invoicePayments) {
    const sourceInvoice = invoiceSourceMap.get(String(row.invoice_id));
    const targetInvoiceId = context.maps.targetInvoiceIds.get(String(row.invoice_id)) || null;
    const targetClientId = sourceInvoice ? context.maps.targetClientIds.get(String(sourceInvoice.customer_id)) || null : null;
    const clientSource = sourceInvoice ? context.maps.sourceClients.get(String(sourceInvoice.customer_id)) : null;

    const payload = [
      context.tenant.id,
      targetInvoiceId,
      sourceInvoice ? String(sourceInvoice.invoice_id || sourceInvoice.id) : null,
      targetClientId,
      trimOrNull(sourceInvoice?.invoice_company_name) || trimOrNull(clientSource?.company_name) || trimOrNull(clientSource?.name),
      clampMoney(row.amount),
      normalizeLegacyDate(row.date),
      mapLegacyPaymentMethod(row.payment_type || row.payment_method),
      trimOrNull(row.reference) || trimOrNull(row.txn_id) || trimOrNull(row.order_id),
      trimOrNull(row.description),
    ];

    const result = await updateOrInsertLinkedRecord({
      pool,
      linkMap,
      sourceId: context.source.id,
      entityName: 'payment',
      sourceTable: 'invoice_payments',
      sourceRecordId: row.id,
      targetTable: 'payments',
      metadata: { invoice_id: row.invoice_id, account_id: row.account_id },
      updateSql: `
        UPDATE payments
        SET tenant_id = $1, invoice_id = $2, invoice_number = $3, client_id = $4, client_name = $5,
            amount = $6, payment_date = $7, payment_method = $8, reference = $9, notes = $10, updated_at = NOW()
        WHERE id = $11
        RETURNING id`,
      updateValues: payload,
      insertSql: `
        INSERT INTO payments (
          tenant_id, invoice_id, invoice_number, client_id, client_name, amount,
          payment_date, payment_method, reference, notes, created_at, updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, COALESCE($11, NOW()), COALESCE($12, NOW())
        )
        RETURNING id`,
      insertValues: [...payload, normalizeLegacyDate(row.created_at), normalizeLegacyDate(row.updated_at)],
    });

    counts[result.mode] += 1;
  }

  return counts;
}

async function syncBills(pool, context) {
  const linkMap = await loadLinkMap(pool, context.source.id, 'bill');
  const counts = { created: 0, updated: 0 };
  const billExpensesByBillId = groupBy(context.legacy.billExpenses, 'bill_id');
  const billPaymentsByBillId = groupBy(context.legacy.billPayments, 'bill_id');

  for (const row of context.legacy.bills) {
    const sourceItems = billExpensesByBillId.get(String(row.id)) || [];
    const sourcePayments = billPaymentsByBillId.get(String(row.id)) || [];

    const items = sourceItems.map((item) => {
      const accountRow = context.maps.sourceAccounts.get(String(item.account_id));
      const taxRow = context.maps.sourceTaxes.get(String(item.tax_id));
      return buildBillItem(item, accountRow, taxRow);
    });

    const subtotal = clampMoney(items.reduce((sum, item) => sum + item.price, 0));
    const vatAmount = clampMoney(items.reduce((sum, item) => sum + item.tax_amount, 0));
    const amount = clampMoney(subtotal + vatAmount);
    const paymentRecords = sourcePayments.map(buildPaymentRecord);
    const paidAmount = clampMoney(paymentRecords.reduce((sum, payment) => sum + payment.amount, 0));
    const billStatus = mapLegacyBillStatus(row, amount, paidAmount);

    const payload = [
      context.tenant.id,
      trimOrNull(row.invoice_number) || trimOrNull(row.order_number) || trimOrNull(row.bill_id) || String(row.id),
      trimOrNull(row.supplier_company_name) || trimOrNull(row.supplier_contact_name),
      trimOrNull(row.supplier_email),
      trimOrNull(row.supplier_phone) || trimOrNull(row.supplier_contact),
      trimOrNull(row.supplier_unique_number) || trimOrNull(row.supplier_tax_number),
      trimOrNull(row.supplier_address),
      JSON.stringify(items),
      subtotal,
      vatAmount,
      amount,
      paidAmount,
      mapLegacyPaymentMethod(row.payment_type),
      JSON.stringify(paymentRecords),
      normalizeLegacyDate(row.due_date),
      trimOrNull(row.description),
      billStatus,
      paidAmount < amount - 0.01,
      trimOrNull(row.created_by) ? `Legacy user #${row.created_by}` : null,
    ];

    const result = await updateOrInsertLinkedRecord({
      pool,
      linkMap,
      sourceId: context.source.id,
      entityName: 'bill',
      sourceTable: 'bills',
      sourceRecordId: row.id,
      targetTable: 'bills',
      metadata: { bill_id: row.bill_id, vendor_id: row.vender_id, source_status: row.status },
      updateSql: `
        UPDATE bills
        SET tenant_id = $1, bill_number = $2, supplier_name = $3, supplier_email = $4, supplier_phone = $5,
            supplier_nipt = $6, supplier_address = $7, items = $8::jsonb, subtotal = $9, vat_amount = $10,
            amount = $11, paid_amount = $12, payment_method = $13, payment_records = $14::jsonb,
            due_date = $15, description = $16, status = $17, is_open = $18, issued_by = $19, updated_at = NOW()
        WHERE id = $20
        RETURNING id`,
      updateValues: payload,
      insertSql: `
        INSERT INTO bills (
          tenant_id, bill_number, supplier_name, supplier_email, supplier_phone, supplier_nipt,
          supplier_address, items, subtotal, vat_amount, amount, paid_amount, payment_method,
          payment_records, due_date, description, status, is_open, issued_by, created_at, updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8::jsonb, $9, $10, $11, $12, $13,
          $14::jsonb, $15, $16, $17, $18, $19, COALESCE($20, NOW()), COALESCE($21, NOW())
        )
        RETURNING id`,
      insertValues: [...payload, normalizeLegacyDate(row.created_at), normalizeLegacyDate(row.updated_at)],
    });

    counts[result.mode] += 1;
  }

  return counts;
}

async function syncJournalEntries(pool, context) {
  const linkMap = await loadLinkMap(pool, context.source.id, 'journal_entry');
  const counts = { created: 0, updated: 0 };
  const journalItemsByEntryId = groupBy(context.legacy.journalEntryItems, 'transaction_account_id');

  for (const row of context.legacy.journalEntries) {
    const lineItems = journalItemsByEntryId.get(String(row.id)) || [];
    const totalDebit = clampMoney(lineItems.reduce((sum, item) => sum + toNumber(item.debit, 0), 0));
    const totalCredit = clampMoney(lineItems.reduce((sum, item) => sum + toNumber(item.credit, 0), 0));

    const payload = [
      context.tenant.id,
      `LEG-${row.id}`,
      normalizeLegacyDate(row.date),
      trimOrNull(row.description) || trimOrNull(row.name) || `Legacy journal ${row.id}`,
      trimOrNull(row.modelable_type) || trimOrNull(row.name),
      null,
      trimOrNull(row.modelable_id),
      totalDebit,
      totalCredit,
      'posted',
      null,
      trimOrNull(row.name),
      normalizeLegacyDate(row.created_at),
      normalizeLegacyDate(row.updated_at),
    ];

    const result = await updateOrInsertLinkedRecord({
      pool,
      linkMap,
      sourceId: context.source.id,
      entityName: 'journal_entry',
      sourceTable: 'transaction_accounts',
      sourceRecordId: row.id,
      targetTable: 'journal_entries',
      metadata: { modelable_type: row.modelable_type, modelable_id: row.modelable_id },
      updateSql: `
        UPDATE journal_entries
        SET tenant_id = $1, entry_number = $2, entry_date = $3, description = $4,
            reference_type = $5, reference_id = $6, reference_number = $7, total_debit = $8,
            total_credit = $9, status = $10, created_by = $11, created_by_name = $12,
            posted_at = COALESCE($13, NOW()), updated_at = COALESCE($14, NOW())
        WHERE id = $15
        RETURNING id`,
      updateValues: payload,
      insertSql: `
        INSERT INTO journal_entries (
          tenant_id, entry_number, entry_date, description, reference_type, reference_id,
          reference_number, total_debit, total_credit, status, created_by, created_by_name,
          posted_at, created_at, updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11, $12,
          COALESCE($13, NOW()), COALESCE($13, NOW()), COALESCE($14, NOW())
        )
        RETURNING id`,
      insertValues: payload,
    });

    counts[result.mode] += 1;

    await pool.query('DELETE FROM journal_lines WHERE journal_entry_id = $1', [result.id]);
    for (const line of lineItems) {
      const sourceAccount = context.maps.sourceAccounts.get(String(line.chart_account_id));
      const targetAccountId = context.maps.targetAccountIds.get(String(line.chart_account_id)) || null;
      await pool.query(
        `INSERT INTO journal_lines (
           tenant_id, journal_entry_id, account_id, account_code, account_name, debit, credit, description, created_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, NOW()))`,
        [
          context.tenant.id,
          result.id,
          targetAccountId,
          sourceAccount?.code ? String(sourceAccount.code) : null,
          trimOrNull(sourceAccount?.name),
          clampMoney(line.debit),
          clampMoney(line.credit),
          trimOrNull(row.description) || trimOrNull(row.name),
          line.created_at || row.created_at || null,
        ]
      );
    }
  }

  return counts;
}

function buildSummary(source, tenant, counts, settings) {
  return {
    source: {
      id: source.id,
      name: source.name,
      adapter: source.adapter,
      database: source.db_name,
      ssh_host: source.ssh_host || null,
    },
    targetTenant: {
      id: tenant.id,
      name: tenant.name,
      code: tenant.code,
    },
    company: {
      name: settings.company_name || null,
      email: settings.company_email || null,
      phone: settings.company_phone || null,
      address: settings.company_address || null,
      city: settings.company_city || null,
      tax_number: settings.company_tax_number || null,
      currency: settings.site_currency || null,
    },
    counts,
  };
}

async function runSyncWithConfig(pool, config, logger) {
  const mysqlHandle = await openMysqlConnection(config);
  try {
    const legacy = await fetchLegacyData(
      mysqlHandle.connection,
      config.options.sourceSchema || config.dbName,
      config.options || {}
    );
    const tenant = await resolveTargetTenant(pool, config, legacy.settings);
    const source = await upsertStoredSource(pool, config, tenant.id);
    const run = await createRun(pool, source.id);

    try {
      const context = {
        source,
        tenant,
        legacy,
        settings: legacy.settings,
        options: config.options || {},
        maps: {},
      };

      logger.info(`Syncing "${source.name}" into tenant "${tenant.name}" (${tenant.id})`);

      const counts = {};

      if (shouldSyncMasterData(context.options)) {
        counts.tax_rates = await syncTaxRates(pool, context);
        counts.units = await syncUnits(pool, context);
        counts.clients = await syncClients(pool, context);
        counts.suppliers = await syncSuppliers(pool, context);
        counts.products = await syncProducts(pool, context);
        counts.chart_of_accounts = await syncAccounts(pool, context);
      } else {
        context.maps.sourceTaxes = toMap(context.legacy.taxes);
        context.maps.sourceUnits = toMap(context.legacy.units);
        context.maps.sourceClients = toMap(context.legacy.customers);
        context.maps.sourceSuppliers = toMap(context.legacy.suppliers);
        context.maps.sourceProducts = toMap(context.legacy.products);
        context.maps.sourceAccounts = toMap(context.legacy.accounts);
        context.maps.targetClientIds = await loadLinkMap(pool, context.source.id, 'client');
        context.maps.targetInvoiceIds = await loadLinkMap(pool, context.source.id, 'invoice');
        context.maps.targetAccountIds = await loadLinkMap(pool, context.source.id, 'account');

        counts.tax_rates = { created: 0, updated: 0, skipped: true };
        counts.units = { created: 0, updated: 0, skipped: true };
        counts.clients = { created: 0, updated: 0, skipped: true };
        counts.suppliers = { created: 0, updated: 0, skipped: true };
        counts.products = { created: 0, updated: 0, skipped: true };
        counts.chart_of_accounts = { created: 0, updated: 0, skipped: true };
      }

      if (shouldSyncInvoices(context.options)) {
        counts.invoices = await syncInvoices(pool, context);
      } else {
        if (!context.maps.targetInvoiceIds) {
          context.maps.targetInvoiceIds = await loadLinkMap(pool, context.source.id, 'invoice');
        }
        counts.invoices = { created: 0, updated: 0, skipped: true };
      }

      counts.payments = shouldSyncPayments(context.options)
        ? await syncPayments(pool, context)
        : { created: 0, updated: 0, skipped: true };

      counts.bills = shouldSyncBills(context.options)
        ? await syncBills(pool, context)
        : { created: 0, updated: 0, skipped: true };

      counts.journal_entries = shouldSyncJournals(context.options)
        ? await syncJournalEntries(pool, context)
        : { created: 0, updated: 0, skipped: true };

      await touchSourceSyncTimestamp(pool, source.id);
      const summary = buildSummary(source, tenant, counts, legacy.settings);
      await finishRun(pool, run.id, 'completed', summary);
      return summary;
    } catch (error) {
      const failedSummary = buildSummary(source, tenant, {}, legacy.settings);
      try {
        await finishRun(pool, run.id, 'failed', failedSummary, error.message);
      } catch (finishError) {
        error.message = `${error.message}\n[finishRun failed] ${finishError.message}`;
      }
      throw error;
    }
  } finally {
    await mysqlHandle.close();
  }
}

export async function runLegacyMysqlSync(pool, configOrSourceLookup, logger = console) {
  const log = createLogger(logger);
  await ensureExternalSyncSchema(pool);

  if (configOrSourceLookup?.mode === 'stored-source-id') {
    const stored = await getStoredSourceById(pool, configOrSourceLookup.sourceId);
    if (!stored) throw new Error(`Sync source ${configOrSourceLookup.sourceId} was not found.`);
    return runSyncWithConfig(pool, applyConfigOverrides(sourceRowToConfig(stored), configOrSourceLookup.overrides), log);
  }

  if (configOrSourceLookup?.mode === 'stored-source-name') {
    const stored = await getStoredSourceByName(pool, configOrSourceLookup.sourceName);
    if (!stored) throw new Error(`Sync source "${configOrSourceLookup.sourceName}" was not found.`);
    return runSyncWithConfig(pool, applyConfigOverrides(sourceRowToConfig(stored), configOrSourceLookup.overrides), log);
  }

  const config = normalizeConfig(configOrSourceLookup?.config || configOrSourceLookup);
  return runSyncWithConfig(pool, config, log);
}

export async function listStoredSyncSources(pool) {
  await ensureExternalSyncSchema(pool);
  const result = await pool.query(
    'SELECT id, name, adapter, target_tenant_id, status, ssh_host, ssh_port, db_host, db_port, db_name, db_user, last_synced_at, created_at, updated_at, options FROM external_sync_sources ORDER BY name ASC'
  );
  return result.rows.map(maskSource);
}

export async function listSyncRuns(pool, sourceId = null) {
  await ensureExternalSyncSchema(pool);
  const result = sourceId
    ? await pool.query(
      'SELECT * FROM external_sync_runs WHERE source_id = $1 ORDER BY started_at DESC',
      [sourceId]
    )
    : await pool.query('SELECT * FROM external_sync_runs ORDER BY started_at DESC');
  return result.rows;
}
