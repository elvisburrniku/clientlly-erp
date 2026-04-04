import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));

const CRITICAL_TABLES = new Set([
  'clients', 'suppliers', 'products', 'invoices', 'expenses', 'payments',
  'chart_of_accounts', 'journal_entries', 'journal_lines',
]);

const TENANT_TABLES = [
  'clients',
  'suppliers',
  'products',
  'units',
  'service_categories',
  'invoices',
  'invoice_settings',
  'invoice_templates',
  'quotes',
  'quote_templates',
  'expenses',
  'expense_categories',
  'category_budgets',
  'payments',
  'cash_transactions',
  'cashbox_settings',
  'cash_handovers',
  'transfers',
  'inventory',
  'reminders',
  'report_templates',
  'departments',
  'job_positions',
  'employees',
  'attendance',
  'shifts',
  'schedules',
  'leave_types',
  'leave_balances',
  'leave_requests',
  'payroll',
  'employee_advances',
  'holidays',
  'project_stages',
  'project_labels',
  'projects',
  'project_members',
  'milestones',
  'tasks',
  'task_comments',
  'timesheets',
  'bugs',
  'credit_notes',
  'debit_notes',
  'bills',
  'expense_requests',
  'revenues',
  'leads',
  'notes',
  'announcements',
  'service_appointments',
  'asset_types',
  'assets',
  'vehicles',
  'vehicle_insurance',
  'vehicle_registration',
  'drivers',
  'vehicle_reservations',
  'vehicle_maintenance',
  'fuel_logs',
  'custom_fields',
  'warehouses',
  'warehouse_locations',
  'stock_movements',
  'purchase_orders',
  'stock_transfers',
  'proposals',
  'agreements',
  'agreement_annexes',
  'company_documents',
  'certificates',
  'chart_of_accounts',
  'journal_entries',
  'journal_lines',
  'pos_sessions',
  'pos_orders',
  'pos_config',
  'sales_orders',
];

const BATCH_SIZE = 200;

export async function runSchemaOnPersonalDb(databaseUrl) {
  const personalPool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    max: 3,
    connectionTimeoutMillis: 15000,
  });
  try {
    const schemaSql = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
    await personalPool.query(schemaSql);

    const migrateSql = readFileSync(join(__dirname, 'migrate.js'), 'utf8');
    const migrationMatch = migrateSql.match(/const migration = `([\s\S]*?)`;/);
    if (migrationMatch) {
      try {
        await personalPool.query(migrationMatch[1]);
      } catch (err) {
        console.warn('Migration SQL on personal DB had warnings (likely safe):', err.message);
      }
    }
  } finally {
    await personalPool.end();
  }
}

export async function migrateTenantData(tenantId, sharedPool, databaseUrl, onProgress) {
  const personalPool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    max: 5,
    connectionTimeoutMillis: 15000,
  });

  const results = { tables: {}, totalRows: 0, errors: [], criticalError: false };

  try {
    let processed = 0;
    const total = TENANT_TABLES.length;

    for (const table of TENANT_TABLES) {
      try {
        const tableExistsResult = await sharedPool.query(
          `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1)`,
          [table]
        );
        if (!tableExistsResult.rows[0].exists) {
          processed++;
          if (onProgress) onProgress({ table, status: 'skipped', processed, total });
          continue;
        }

        const hasTenantId = await sharedPool.query(
          `SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_name = 'tenant_id')`,
          [table]
        );

        if (!hasTenantId.rows[0].exists) {
          results.tables[table] = 0;
          processed++;
          if (onProgress) onProgress({ table, status: 'done', rows: 0, processed, total });
          continue;
        }

        const personalTableExists = await personalPool.query(
          `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1)`,
          [table]
        );
        if (!personalTableExists.rows[0].exists) {
          results.tables[table] = 0;
          results.errors.push(`Table ${table} not found in personal DB`);
          processed++;
          if (onProgress) onProgress({ table, status: 'error', error: 'Table not in personal DB', processed, total });
          continue;
        }

        const countRes = await sharedPool.query(
          `SELECT COUNT(*) FROM ${table} WHERE tenant_id = $1`,
          [tenantId]
        );
        const totalCount = parseInt(countRes.rows[0].count);

        if (totalCount === 0) {
          results.tables[table] = 0;
          processed++;
          if (onProgress) onProgress({ table, status: 'done', rows: 0, processed, total });
          continue;
        }

        let inserted = 0;
        let offset = 0;

        while (offset < totalCount) {
          const batchRes = await sharedPool.query(
            `SELECT * FROM ${table} WHERE tenant_id = $1 ORDER BY id LIMIT $2 OFFSET $3`,
            [tenantId, BATCH_SIZE, offset]
          );
          const rows = batchRes.rows;
          if (rows.length === 0) break;

          const columns = Object.keys(rows[0]);
          const colList = columns.map(c => `"${c}"`).join(', ');

          for (const row of rows) {
            const vals = columns.map(c => {
              const v = row[c];
              if (v !== null && typeof v === 'object') return JSON.stringify(v);
              return v;
            });
            const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');
            await personalPool.query(
              `INSERT INTO ${table} (${colList}) VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING`,
              vals
            );
            inserted++;
          }
          offset += rows.length;
        }

        results.tables[table] = inserted;
        results.totalRows += inserted;
        processed++;
        if (onProgress) onProgress({ table, status: 'done', rows: inserted, processed, total });
      } catch (err) {
        results.errors.push(`${table}: ${err.message}`);
        if (CRITICAL_TABLES.has(table)) {
          results.criticalError = true;
        }
        processed++;
        if (onProgress) onProgress({ table, status: 'error', error: err.message, processed, total });
      }
    }
  } finally {
    await personalPool.end();
  }

  return results;
}
