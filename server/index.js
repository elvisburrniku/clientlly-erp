import express from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import bcrypt from 'bcrypt';
import cors from 'cors';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import crypto from 'crypto';
import pool from './db.js';
import { createEntityRouter } from './entityRouter.js';
import { requirePermission, getPermissionsApi, clearPermissionsCache } from './permissions.js';
import { logActivity, getActivityApi, notifyTenantAdmins } from './activityLog.js';
import runMigration from './migrate.js';
import { resolvePoolForTenant, clearCachedTenantDb } from './tenantDb.js';
import { listOrganizations, createProject, waitForProjectReady, getProjectDatabaseUrl, generateDbPassword } from './supabaseService.js';
import { runSchemaOnPersonalDb, migrateTenantData } from './dbMigration.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function getPoolForReq(req) {
  const tenantId = req.session?.user?.tenant_id;
  return resolvePoolForTenant(tenantId, pool);
}

const app = express();
const PgSession = connectPgSimple(session);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(session({
  store: new PgSession({ pool, tableName: 'session' }),
  secret: process.env.SESSION_SECRET || 'erp-finance-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));

const requireAuth = (req, res, next) => {
  if (req.session?.user) {
    return next();
  }
  res.status(401).json({ error: 'Authentication required', status: 401 });
};

const requireAdmin = (req, res, next) => {
  if (req.session?.user?.role === 'admin' || req.session?.user?.role === 'superadmin') {
    return next();
  }
  res.status(403).json({ error: 'Admin access required' });
};

// ============ FILE UPLOAD SETUP ============

const uploadsDir = join(__dirname, '../uploads');
if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });

const UPLOAD_CATEGORIES = ['avatar', 'attachment', 'document', 'general'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const category = req.params.category || 'general';
    if (!UPLOAD_CATEGORIES.includes(category)) return cb(new Error('Invalid upload category'));
    const dir = join(uploadsDir, category);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|csv|txt|webp/;
    const ext = allowed.test(extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    cb(null, ext || mime);
  }
});

// ============ AUTH ROUTES ============

app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, email, full_name, role, tenant_id, tenant_name, language FROM users WHERE id = $1', [req.session.user.id]);
    if (result.rows.length === 0) {
      req.session.destroy();
      return res.status(401).json({ error: 'User not found', status: 401 });
    }
    const user = result.rows[0];
    if (req.session.user.role !== user.role || req.session.user.tenant_id !== user.tenant_id) {
      req.session.user.role = user.role;
      req.session.user.tenant_id = user.tenant_id;
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    req.session.user = { id: user.id, email: user.email, role: user.role, tenant_id: user.tenant_id };
    res.json({ id: user.id, email: user.email, full_name: user.full_name, role: user.role, tenant_id: user.tenant_id, tenant_name: user.tenant_name, language: user.language });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, full_name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, full_name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, full_name, role, tenant_id',
      [email.toLowerCase(), hash, full_name || '', 'admin']
    );
    const user = result.rows[0];
    req.session.user = { id: user.id, email: user.email, role: user.role, tenant_id: user.tenant_id };
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.patch('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const { full_name, language } = req.body;
    const result = await pool.query(
      'UPDATE users SET full_name = COALESCE($1, full_name), language = COALESCE($2, language), updated_at = NOW() WHERE id = $3 RETURNING id, email, full_name, role, tenant_id, tenant_name, language',
      [full_name, language, req.session.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const user = result.rows[0];
    req.session.user = { id: user.id, email: user.email, role: user.role, tenant_id: user.tenant_id };
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ ROLES & PERMISSIONS ROUTES ============

const permissionsApi = getPermissionsApi(pool);

const requireSuperAdminOrAdmin = (req, res, next) => {
  const role = req.session?.user?.role;
  if (role === 'admin' || role === 'superadmin') return next();
  res.status(403).json({ error: 'Admin access required' });
};

app.get('/api/roles', requireAuth, requireSuperAdminOrAdmin, async (req, res) => {
  try { await permissionsApi.listRoles(req, res); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/roles/:roleId/permissions', requireAuth, requireSuperAdminOrAdmin, async (req, res) => {
  try { await permissionsApi.getRolePermissions(req, res); } catch (err) { res.status(500).json({ error: err.message }); }
});

const requireSuperAdmin = (req, res, next) => {
  if (req.session?.user?.role === 'superadmin') return next();
  res.status(403).json({ error: 'Superadmin access required' });
};

app.put('/api/roles/:roleId/permissions', requireAuth, requireSuperAdmin, async (req, res) => {
  try { await permissionsApi.updateRolePermissions(req, res); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/users/:userId/role', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    if (!role) return res.status(400).json({ error: 'role is required' });

    const validRoles = await pool.query('SELECT name FROM roles');
    const validRoleNames = validRoles.rows.map(r => r.name);
    if (!validRoleNames.includes(role)) return res.status(400).json({ error: 'Invalid role' });

    if (role === 'superadmin' && req.session.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Only superadmins can assign superadmin role' });
    }

    const tenantId = req.session.user.tenant_id;
    let query = 'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2';
    const values = [role, req.params.userId];
    if (req.session.user.role !== 'superadmin') {
      query += ' AND tenant_id = $3';
      values.push(tenantId);
    }
    query += ' RETURNING id, email, full_name, role';
    const result = await pool.query(query, values);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    clearPermissionsCache();
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/permissions/me', requireAuth, async (req, res) => {
  try { await permissionsApi.getUserPermissions(req, res); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/permissions/modules', requireAuth, requireSuperAdminOrAdmin, async (req, res) => {
  try { await permissionsApi.getAllModules(req, res); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/onboarding/create-tenant', requireAuth, async (req, res) => {
  try {
    if (req.session.user.tenant_id) {
      return res.status(400).json({ error: 'User already has a tenant' });
    }
    const { name, code, phone, address, nipt } = req.body;
    if (!name || !code) return res.status(400).json({ error: 'Name and code are required' });

    const existing = await pool.query('SELECT id FROM tenants WHERE code = $1', [code]);
    if (existing.rows.length > 0) return res.status(409).json({ error: 'Code already taken' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const tenantResult = await client.query(
        'INSERT INTO tenants (name, code, owner_email, status, plan, phone, address, nipt) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
        [name, code, req.session.user.email, 'active', 'free', phone || null, address || null, nipt || null]
      );
      const tenant = tenantResult.rows[0];

      await client.query(
        'UPDATE users SET tenant_id = $1, tenant_name = $2, role = $3, updated_at = NOW() WHERE id = $4',
        [tenant.id, tenant.name, 'superadmin', req.session.user.id]
      );
      await client.query('COMMIT');

      req.session.user.tenant_id = tenant.id;
      req.session.user.role = 'superadmin';
      res.status(201).json(tenant);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/tenant/me', requireAuth, async (req, res) => {
  try {
    const tenantId = req.session.user.tenant_id;
    if (!tenantId) return res.json(null);
    const result = await pool.query('SELECT * FROM tenants WHERE id = $1', [tenantId]);
    res.json(result.rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ FILE UPLOAD ROUTES ============

const ALLOWED_CATEGORIES = ['avatar', 'attachment', 'document', 'general'];

app.post('/api/upload/:category', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { category } = req.params;
    if (!ALLOWED_CATEGORIES.includes(category)) return res.status(400).json({ error: 'Invalid upload category' });
    const { entity_type, entity_id } = req.body;
    const result = await pool.query(
      `INSERT INTO uploaded_files (user_id, tenant_id, original_name, stored_name, mime_type, size, category, entity_type, entity_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [req.session.user.id, req.session.user.tenant_id, req.file.originalname, req.file.filename, req.file.mimetype, req.file.size, category, entity_type || null, entity_id || null]
    );
    const file = result.rows[0];
    res.json({ ...file, url: `/api/files/${category}/${file.stored_name}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/files/:category/:filename', requireAuth, async (req, res) => {
  const { category, filename } = req.params;
  if (!ALLOWED_CATEGORIES.includes(category)) return res.status(400).json({ error: 'Invalid category' });
  if (/[\/\\]|\.\./.test(filename)) return res.status(400).json({ error: 'Invalid filename' });
  const tenantId = req.session.user.tenant_id;
  const userId = req.session.user.id;
  const fileRecord = await pool.query(
    'SELECT * FROM uploaded_files WHERE stored_name = $1 AND category = $2 AND (tenant_id = $3 OR user_id = $4)',
    [filename, category, tenantId, userId]
  );
  if (fileRecord.rows.length === 0) return res.status(404).json({ error: 'File not found' });
  const filePath = join(uploadsDir, category, filename);
  if (!existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Disposition', `inline; filename="${fileRecord.rows[0].original_name}"`);
  res.sendFile(filePath);
});

app.get('/api/uploaded-files', requireAuth, async (req, res) => {
  try {
    const { entity_type, entity_id, category } = req.query;
    const tenantId = req.session.user.tenant_id;
    let query = 'SELECT * FROM uploaded_files WHERE (tenant_id = $1 OR user_id = $2)';
    const values = [tenantId, req.session.user.id];
    let idx = 3;
    if (entity_type) { query += ` AND entity_type = $${idx++}`; values.push(entity_type); }
    if (entity_id) { query += ` AND entity_id = $${idx++}`; values.push(entity_id); }
    if (category) { query += ` AND category = $${idx++}`; values.push(category); }
    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, values);
    res.json(result.rows.map(f => ({ ...f, url: `/api/files/${f.category}/${f.stored_name}` })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ NOTIFICATION ROUTES ============

app.get('/api/notifications', requireAuth, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const result = await pool.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [req.session.user.id, parseInt(limit), parseInt(offset)]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/notifications/unread-count', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE',
      [req.session.user.id]
    );
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/notifications/:id/read', requireAuth, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2', [req.params.id, req.session.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/notifications/mark-all-read', requireAuth, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE', [req.session.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ ACTIVITY LOG ROUTES ============

const activityApi = getActivityApi(pool);

app.get('/api/activity-logs', requireAuth, requireAdmin, async (req, res) => {
  try { await activityApi.list(req, res); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/activity-logs/count', requireAuth, requireAdmin, async (req, res) => {
  try { await activityApi.count(req, res); } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============ GLOBAL SEARCH ============

app.get('/api/search', requireAuth, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) return res.json([]);

    const searchTerm = `%${q.trim().toLowerCase()}%`;
    const tenantId = req.session.user.tenant_id;
    const userRole = req.session.user.role;
    const tPool = await getPoolForReq(req);
    const results = [];

    const isFullAccess = userRole === 'admin' || userRole === 'superadmin';
    let userPerms = {};
    if (!isFullAccess) {
      const permResult = await pool.query(`
        SELECT p.module, p.can_view FROM permissions p
        JOIN roles r ON r.id = p.role_id WHERE r.name = $1
      `, [userRole]);
      for (const row of permResult.rows) {
        if (row.can_view) userPerms[row.module] = true;
      }
    }

    const canSearch = (module) => isFullAccess || userPerms[module];

    if (canSearch('clients')) {
      const clientsResult = await tPool.query(
        `SELECT id, name, email, phone FROM clients WHERE tenant_id = $2 AND (LOWER(COALESCE(name,'')) LIKE $1 OR LOWER(COALESCE(email,'')) LIKE $1 OR LOWER(COALESCE(phone,'')) LIKE $1) LIMIT 5`,
        [searchTerm, tenantId]
      );
      results.push(...clientsResult.rows.map(r => ({ ...r, type: 'client', label: r.name, sub: r.email })));
    }

    if (canSearch('invoices')) {
      const invoicesResult = await tPool.query(
        `SELECT id, invoice_number, client_name, total, status FROM invoices WHERE tenant_id = $2 AND (LOWER(COALESCE(invoice_number,'')) LIKE $1 OR LOWER(COALESCE(client_name,'')) LIKE $1) LIMIT 5`,
        [searchTerm, tenantId]
      );
      results.push(...invoicesResult.rows.map(r => ({ ...r, type: 'invoice', label: r.invoice_number || `Invoice #${r.id}`, sub: r.client_name })));
    }

    if (canSearch('products')) {
      const productsResult = await tPool.query(
        `SELECT id, name, price FROM products WHERE tenant_id = $2 AND LOWER(COALESCE(name,'')) LIKE $1 LIMIT 5`,
        [searchTerm, tenantId]
      );
      results.push(...productsResult.rows.map(r => ({ ...r, type: 'product', label: r.name, sub: r.price ? `${r.price}` : '' })));
    }

    if (canSearch('suppliers')) {
      const suppliersResult = await tPool.query(
        `SELECT id, name, email FROM suppliers WHERE tenant_id = $2 AND (LOWER(COALESCE(name,'')) LIKE $1 OR LOWER(COALESCE(email,'')) LIKE $1) LIMIT 5`,
        [searchTerm, tenantId]
      );
      results.push(...suppliersResult.rows.map(r => ({ ...r, type: 'supplier', label: r.name, sub: r.email })));
    }

    if (canSearch('expenses')) {
      const expensesResult = await tPool.query(
        `SELECT id, description, amount, category_name FROM expenses WHERE tenant_id = $2 AND (LOWER(COALESCE(description,'')) LIKE $1 OR LOWER(COALESCE(category_name,'')) LIKE $1) LIMIT 5`,
        [searchTerm, tenantId]
      );
      results.push(...expensesResult.rows.map(r => ({ ...r, type: 'expense', label: r.description || `Expense #${r.id}`, sub: r.category_name })));
    }

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ ENTITY ROUTES ============

const entityTableMap = {
  Tenant: 'tenants',
  Client: 'clients',
  Supplier: 'suppliers',
  Product: 'products',
  Unit: 'units',
  ServiceCategory: 'service_categories',
  Invoice: 'invoices',
  InvoiceSettings: 'invoice_settings',
  InvoiceTemplate: 'invoice_templates',
  Quote: 'quotes',
  QuoteTemplate: 'quote_templates',
  Expense: 'expenses',
  ExpenseCategory: 'expense_categories',
  CategoryBudget: 'category_budgets',
  Payment: 'payments',
  CashTransaction: 'cash_transactions',
  CashboxSettings: 'cashbox_settings',
  CashHandover: 'cash_handovers',
  Transfer: 'transfers',
  Inventory: 'inventory',
  Reminder: 'reminders',
  ReportTemplate: 'report_templates',
  User: 'users',
  Department: 'departments',
  JobPosition: 'job_positions',
  Employee: 'employees',
  Attendance: 'attendance',
  Shift: 'shifts',
  Schedule: 'schedules',
  LeaveType: 'leave_types',
  LeaveBalance: 'leave_balances',
  LeaveRequest: 'leave_requests',
  Payroll: 'payroll',
  EmployeeAdvance: 'employee_advances',
  Holiday: 'holidays',
  ProjectStage: 'project_stages',
  ProjectLabel: 'project_labels',
  Project: 'projects',
  ProjectMember: 'project_members',
  Milestone: 'milestones',
  Task: 'tasks',
  TaskComment: 'task_comments',
  Timesheet: 'timesheets',
  Bug: 'bugs',
  CreditNote: 'credit_notes',
  DebitNote: 'debit_notes',
  Bill: 'bills',
  ExpenseRequest: 'expense_requests',
  Revenue: 'revenues',
  Lead: 'leads',
  Note: 'notes',
  Announcement: 'announcements',
  PortalToken: 'portal_tokens',
  ServiceAppointment: 'service_appointments',
  AssetType: 'asset_types',
  Asset: 'assets',
  Vehicle: 'vehicles',
  VehicleInsurance: 'vehicle_insurance',
  VehicleRegistration: 'vehicle_registration',
  Driver: 'drivers',
  VehicleReservation: 'vehicle_reservations',
  VehicleMaintenance: 'vehicle_maintenance',
  FuelLog: 'fuel_logs',
  CustomField: 'custom_fields',
  Warehouse: 'warehouses',
  WarehouseLocation: 'warehouse_locations',
  StockMovement: 'stock_movements',
  PurchaseOrder: 'purchase_orders',
  StockTransfer: 'stock_transfers',
  Proposal: 'proposals',
  Agreement: 'agreements',
  AgreementAnnex: 'agreement_annexes',
  CompanyDocument: 'company_documents',
  Certificate: 'certificates',
  ChartOfAccount: 'chart_of_accounts',
  JournalEntry: 'journal_entries',
  JournalLine: 'journal_lines',
  PosSession: 'pos_sessions',
  PosOrder: 'pos_orders',
  PosConfig: 'pos_config',
  SalesOrder: 'sales_orders',
};

const noTenantColumnEntities = new Set(['Tenant']);
const superAdminOnlyEntities = new Set(['Tenant']);

for (const [entityName, tableName] of Object.entries(entityTableMap)) {
  const entityOpts = {
    logActivity,
    notifyTenantAdmins,
    hasTenantColumn: !noTenantColumnEntities.has(entityName),
  };
  const middlewares = [requireAuth];
  if (superAdminOnlyEntities.has(entityName)) {
    middlewares.push(requireSuperAdmin);
  }
  middlewares.push(requirePermission(entityName));

  const alwaysSharedEntities = new Set(['Tenant', 'User', 'PortalToken']);
  const poolResolver = alwaysSharedEntities.has(entityName)
    ? pool
    : async (req) => resolvePoolForTenant(req.session?.user?.tenant_id, pool);

  if (entityName === 'Proposal') {
    const indexToken = async (row) => {
      if (row && row.token && row.tenant_id && row.id) {
        await pool.query(
          'INSERT INTO proposal_token_index (token, tenant_id, proposal_id) VALUES ($1, $2, $3) ON CONFLICT (token) DO UPDATE SET tenant_id = EXCLUDED.tenant_id, proposal_id = EXCLUDED.proposal_id',
          [row.token, row.tenant_id, row.id]
        ).catch(e => console.error('[proposal_token_index]', e.message));
      }
    };
    entityOpts.afterCreate = indexToken;
    entityOpts.afterUpdate = indexToken;
  }

  app.use(`/api/entities/${entityName}`, ...middlewares, createEntityRouter(poolResolver, tableName, entityName, entityOpts));
}

const mountedEntityCount = Object.keys(entityTableMap).length;
console.log(`[Routes] Entity registration loop completed: ${mountedEntityCount}/${mountedEntityCount} entity routers mounted (includes Announcement->announcements, Revenue->revenues, Lead->leads, CreditNote->credit_notes)`);

// ============ PORTAL (public, no auth) ============

app.post('/api/portal/generate-token', requireAuth, async (req, res) => {
  try {
    const { entity_type, entity_id } = req.body;
    if (!entity_type || !entity_id) {
      return res.status(400).json({ error: 'entity_type and entity_id required' });
    }
    const token = crypto.randomBytes(32).toString('hex');
    const result = await pool.query(
      'INSERT INTO portal_tokens (tenant_id, entity_type, entity_id, token, expires_at) VALUES ($1, $2, $3, $4, NOW() + INTERVAL \'90 days\') RETURNING *',
      [req.session.user.tenant_id, entity_type, entity_id, token]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/portal/client/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const tokenResult = await pool.query(
      'SELECT * FROM portal_tokens WHERE token = $1 AND entity_type = $2 AND is_active = true AND (expires_at IS NULL OR expires_at > NOW())',
      [token, 'client']
    );
    if (tokenResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid or expired token' });
    }
    const portalToken = tokenResult.rows[0];
    const tPool = await resolvePoolForTenant(portalToken.tenant_id, pool);
    const client = await tPool.query('SELECT * FROM clients WHERE id = $1', [portalToken.entity_id]);
    if (client.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    const invoices = await tPool.query('SELECT * FROM invoices WHERE client_id = $1 ORDER BY created_at DESC', [portalToken.entity_id]);
    const payments = await tPool.query('SELECT * FROM payments WHERE client_id = $1 ORDER BY created_at DESC', [portalToken.entity_id]);
    res.json({ client: client.rows[0], invoices: invoices.rows, payments: payments.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ PUBLIC PROPOSAL VIEW ============

app.get('/api/proposals/public/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const indexRow = await pool.query('SELECT tenant_id, proposal_id FROM proposal_token_index WHERE token = $1', [token]);
    if (indexRow.rows.length === 0) return res.status(404).json({ error: 'Proposal not found' });
    const { tenant_id, proposal_id } = indexRow.rows[0];
    const tPool = await resolvePoolForTenant(tenant_id, pool);
    const result = await tPool.query('SELECT id, tenant_id, proposal_number, title, description, client_name, client_email, items, subtotal, discount_type, discount_value, discount_amount, tax_amount, total, status, valid_until, template, color_theme, notes, terms, viewed_at, accepted_at, rejected_at, rejection_reason, created_at FROM proposals WHERE id = $1', [proposal_id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Proposal not found' });
    const proposal = result.rows[0];
    if (!proposal.viewed_at && (proposal.status === 'sent')) {
      await tPool.query('UPDATE proposals SET viewed_at = NOW(), status = \'viewed\', updated_at = NOW() WHERE id = $1', [proposal_id]);
      proposal.status = 'viewed';
      proposal.viewed_at = new Date();
    }
    res.json(proposal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/portal/vendor/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const tokenResult = await pool.query(
      'SELECT * FROM portal_tokens WHERE token = $1 AND entity_type = $2 AND is_active = true AND (expires_at IS NULL OR expires_at > NOW())',
      [token, 'supplier']
    );
    if (tokenResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid or expired token' });
    }
    const portalToken = tokenResult.rows[0];
    const tPool = await resolvePoolForTenant(portalToken.tenant_id, pool);
    const supplier = await tPool.query('SELECT * FROM suppliers WHERE id = $1', [portalToken.entity_id]);
    if (supplier.rows.length === 0) {
      return res.status(404).json({ error: 'Supplier not found' });
    }
    const expenses = await tPool.query('SELECT * FROM expenses WHERE supplier_id = $1 ORDER BY created_at DESC', [portalToken.entity_id]);
    const payments = await tPool.query('SELECT * FROM payments WHERE invoice_id IN (SELECT id FROM invoices WHERE client_id = $1) ORDER BY created_at DESC', [portalToken.entity_id]);
    res.json({ supplier: supplier.rows[0], expenses: expenses.rows, payments: payments.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ MERGE ENDPOINTS ============

app.post('/api/merge/clients', requireAuth, async (req, res) => {
  try {
    const { primary_id, merge_ids } = req.body;
    const tenantId = req.session.user.tenant_id;
    if (!primary_id || !merge_ids || merge_ids.length === 0) {
      return res.status(400).json({ error: 'primary_id and merge_ids required' });
    }
    const tPool = await getPoolForReq(req);
    const primaryCheck = await tPool.query('SELECT id FROM clients WHERE id = $1 AND tenant_id = $2', [primary_id, tenantId]);
    if (primaryCheck.rows.length === 0) return res.status(403).json({ error: 'Access denied' });
    for (const mergeId of merge_ids) {
      const mergeCheck = await tPool.query('SELECT id FROM clients WHERE id = $1 AND tenant_id = $2', [mergeId, tenantId]);
      if (mergeCheck.rows.length === 0) continue;
      await tPool.query('UPDATE invoices SET client_id = $1, client_name = (SELECT name FROM clients WHERE id = $1) WHERE client_id = $2 AND tenant_id = $3', [primary_id, mergeId, tenantId]);
      await tPool.query('UPDATE payments SET client_id = $1, client_name = (SELECT name FROM clients WHERE id = $1) WHERE client_id = $2 AND tenant_id = $3', [primary_id, mergeId, tenantId]);
      await tPool.query('UPDATE quotes SET client_id = $1, client_name = (SELECT name FROM clients WHERE id = $1) WHERE client_id = $2 AND tenant_id = $3', [primary_id, mergeId, tenantId]);
      await tPool.query('DELETE FROM clients WHERE id = $1 AND tenant_id = $2', [mergeId, tenantId]);
    }
    const result = await tPool.query('SELECT * FROM clients WHERE id = $1', [primary_id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/merge/suppliers', requireAuth, async (req, res) => {
  try {
    const { primary_id, merge_ids } = req.body;
    const tenantId = req.session.user.tenant_id;
    if (!primary_id || !merge_ids || merge_ids.length === 0) {
      return res.status(400).json({ error: 'primary_id and merge_ids required' });
    }
    const tPool = await getPoolForReq(req);
    const primaryCheck = await tPool.query('SELECT id FROM suppliers WHERE id = $1 AND tenant_id = $2', [primary_id, tenantId]);
    if (primaryCheck.rows.length === 0) return res.status(403).json({ error: 'Access denied' });
    for (const mergeId of merge_ids) {
      const mergeCheck = await tPool.query('SELECT id FROM suppliers WHERE id = $1 AND tenant_id = $2', [mergeId, tenantId]);
      if (mergeCheck.rows.length === 0) continue;
      await tPool.query('UPDATE expenses SET supplier_id = $1, supplier_name = (SELECT name FROM suppliers WHERE id = $1) WHERE supplier_id = $2 AND tenant_id = $3', [primary_id, mergeId, tenantId]);
      await tPool.query('DELETE FROM suppliers WHERE id = $1 AND tenant_id = $2', [mergeId, tenantId]);
    }
    const result = await tPool.query('SELECT * FROM suppliers WHERE id = $1', [primary_id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/proposals/public/:token/respond', async (req, res) => {
  try {
    const { token } = req.params;
    const { action, rejection_reason } = req.body;
    const indexRow = await pool.query('SELECT tenant_id, proposal_id FROM proposal_token_index WHERE token = $1', [token]);
    if (indexRow.rows.length === 0) return res.status(404).json({ error: 'Proposal not found' });
    const { tenant_id, proposal_id } = indexRow.rows[0];
    const tPool = await resolvePoolForTenant(tenant_id, pool);
    const result = await tPool.query('SELECT * FROM proposals WHERE id = $1', [proposal_id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Proposal not found' });
    const proposal = result.rows[0];
    if (proposal.status !== 'sent' && proposal.status !== 'viewed') {
      return res.status(400).json({ error: 'Proposal cannot be responded to in its current status' });
    }
    if (proposal.valid_until && new Date(proposal.valid_until) < new Date()) {
      return res.status(400).json({ error: 'Proposal has expired' });
    }
    if (action === 'accept') {
      await tPool.query('UPDATE proposals SET status = $1, accepted_at = NOW(), updated_at = NOW() WHERE id = $2', ['accepted', proposal_id]);
    } else if (action === 'reject') {
      await tPool.query('UPDATE proposals SET status = $1, rejected_at = NOW(), rejection_reason = $2, updated_at = NOW() WHERE id = $3', ['rejected', rejection_reason || null, proposal_id]);
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ ACCOUNTING API ROUTES ============

const requireAccountingView = (req, res, next) => {
  const role = req.session?.user?.role;
  if (role === 'admin' || role === 'superadmin') return next();
  pool.query(
    `SELECT p.can_view FROM permissions p JOIN roles r ON r.id = p.role_id WHERE r.name = $1 AND p.module = 'accounting'`,
    [role]
  ).then(result => {
    if (result.rows.length > 0 && result.rows[0].can_view) return next();
    res.status(403).json({ error: 'Access denied' });
  }).catch(() => res.status(403).json({ error: 'Access denied' }));
};

const requireAccountingCreate = (req, res, next) => {
  const role = req.session?.user?.role;
  if (role === 'admin' || role === 'superadmin') return next();
  pool.query(
    `SELECT p.can_create FROM permissions p JOIN roles r ON r.id = p.role_id WHERE r.name = $1 AND p.module = 'accounting'`,
    [role]
  ).then(result => {
    if (result.rows.length > 0 && result.rows[0].can_create) return next();
    res.status(403).json({ error: 'Access denied' });
  }).catch(() => res.status(403).json({ error: 'Access denied' }));
};

async function autoGenerateJournalEntry(tenantId, userId, userEmail, { referenceType, referenceId, referenceNumber, description, lines }, tPool = pool) {
  try {
    const accounts = await tPool.query('SELECT id, code, name FROM chart_of_accounts WHERE tenant_id = $1', [tenantId]);
    if (accounts.rows.length === 0) return null;

    const findAccount = (code) => accounts.rows.find(a => a.code === code);

    const validLines = lines.filter(l => {
      const acc = findAccount(l.code);
      return acc && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0);
    }).map(l => {
      const acc = findAccount(l.code);
      return { account_id: acc.id, account_code: acc.code, account_name: acc.name, debit: parseFloat(l.debit) || 0, credit: parseFloat(l.credit) || 0 };
    });

    if (validLines.length < 2) return null;

    const totalDebit = validLines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = validLines.reduce((s, l) => s + l.credit, 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) return null;

    const client = await tPool.connect();
    try {
      await client.query('BEGIN');
      const countResult = await client.query(
        'SELECT COALESCE(MAX(CAST(SUBSTRING(entry_number FROM 4) AS INTEGER)), 0) + 1 as next_num FROM journal_entries WHERE tenant_id = $1 AND entry_number LIKE $2',
        [tenantId, 'JE-%']
      );
      const entryNumber = `JE-${String(countResult.rows[0].next_num).padStart(5, '0')}`;

      const entryResult = await client.query(
        `INSERT INTO journal_entries (tenant_id, entry_number, entry_date, description, reference_type, reference_id, reference_number, total_debit, total_credit, status, created_by, created_by_name, posted_at)
         VALUES ($1, $2, NOW(), $3, $4, $5, $6, $7, $8, 'posted', $9, $10, NOW()) RETURNING *`,
        [tenantId, entryNumber, description, referenceType, referenceId, referenceNumber, totalDebit, totalCredit, userId, userEmail]
      );
      const entry = entryResult.rows[0];

      for (const line of validLines) {
        await client.query(
          `INSERT INTO journal_lines (tenant_id, journal_entry_id, account_id, account_code, account_name, debit, credit)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [tenantId, entry.id, line.account_id, line.account_code, line.account_name, line.debit, line.credit]
        );
      }

      await client.query('COMMIT');
      return entry;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Auto journal entry error:', err.message);
      return null;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Auto journal entry error:', err.message);
    return null;
  }
}

app.post('/api/accounting/auto-journal/invoice', requireAuth, requireAccountingCreate, async (req, res) => {
  try {
    const tenantId = req.session.user.tenant_id;
    const { invoice_id, invoice_number, subtotal, tax_amount, total, client_name } = req.body;
    const tPool = await getPoolForReq(req);

    const entry = await autoGenerateJournalEntry(tenantId, req.session.user.id, req.session.user.email, {
      referenceType: 'invoice',
      referenceId: invoice_id,
      referenceNumber: invoice_number,
      description: `Faturë ${invoice_number} - ${client_name || ''}`,
      lines: [
        { code: '1300', debit: total, credit: 0 },
        { code: '4100', debit: 0, credit: subtotal },
        { code: '2200', debit: 0, credit: tax_amount || 0 },
      ].filter(l => l.debit > 0 || l.credit > 0),
    }, tPool);

    res.json({ success: !!entry, entry });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate journal entry' });
  }
});

app.post('/api/accounting/auto-journal/expense', requireAuth, requireAccountingCreate, async (req, res) => {
  try {
    const tenantId = req.session.user.tenant_id;
    const { expense_id, description, amount, tax_amount, total, supplier_name } = req.body;
    const tPool = await getPoolForReq(req);

    const entry = await autoGenerateJournalEntry(tenantId, req.session.user.id, req.session.user.email, {
      referenceType: 'expense',
      referenceId: expense_id,
      referenceNumber: null,
      description: `Shpenzim: ${description || supplier_name || ''}`,
      lines: [
        { code: '5900', debit: amount, credit: 0 },
        { code: '2300', debit: tax_amount || 0, credit: 0 },
        { code: '2100', debit: 0, credit: total },
      ].filter(l => l.debit > 0 || l.credit > 0),
    }, tPool);

    res.json({ success: !!entry, entry });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate journal entry' });
  }
});

app.post('/api/accounting/auto-journal/payment', requireAuth, requireAccountingCreate, async (req, res) => {
  try {
    const tenantId = req.session.user.tenant_id;
    const { payment_id, invoice_number, amount, client_name, payment_method } = req.body;
    const tPool = await getPoolForReq(req);

    const bankCode = payment_method === 'cash' ? '1100' : '1200';
    const entry = await autoGenerateJournalEntry(tenantId, req.session.user.id, req.session.user.email, {
      referenceType: 'payment',
      referenceId: payment_id,
      referenceNumber: invoice_number,
      description: `Pagesë ${invoice_number} - ${client_name || ''}`,
      lines: [
        { code: bankCode, debit: amount, credit: 0 },
        { code: '1300', debit: 0, credit: amount },
      ],
    }, tPool);

    res.json({ success: !!entry, entry });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate journal entry' });
  }
});

// Helper: find the most specific account_group for a given account code (integer range comparison)
async function computeAccountGroup(tPool, tenantId, code) {
  const result = await tPool.query(
    `SELECT id,
       CAST(code_prefix_end AS INTEGER) - CAST(code_prefix_start AS INTEGER) AS range_size
     FROM account_groups
     WHERE tenant_id = $1
       AND CAST(code_prefix_start AS INTEGER) <= CAST($2 AS INTEGER)
       AND CAST(code_prefix_end AS INTEGER) >= CAST($2 AS INTEGER)
     ORDER BY range_size ASC
     LIMIT 1`,
    [tenantId, code]
  );
  return result.rows.length > 0 ? result.rows[0].id : null;
}

app.post('/api/accounting/seed-accounts', requireAuth, requireAdmin, async (req, res) => {
  try {
    const tenantId = req.session.user.tenant_id;
    const tPool = await getPoolForReq(req);
    const existing = await tPool.query('SELECT COUNT(*) FROM chart_of_accounts WHERE tenant_id = $1', [tenantId]);
    if (parseInt(existing.rows[0].count) > 0) {
      return res.json({ message: 'Accounts already seeded', count: parseInt(existing.rows[0].count) });
    }

    const client = await tPool.connect();
    try {
      await client.query('BEGIN');

      // 1. Seed account groups (hierarchical)
      const groups = [
        { name: '1 - Mjetet', name_en: 'Assets', start: '1000', end: '1999', account_type: 'asset', sequence: 10, parentKey: null },
        { name: '11 - Arka (Kasa)', name_en: 'Cash', start: '1100', end: '1199', account_type: 'asset', sequence: 11, parentKey: '1000' },
        { name: '12 - Banka', name_en: 'Bank', start: '1200', end: '1299', account_type: 'asset', sequence: 12, parentKey: '1000' },
        { name: '13 - Llogaritë Arkëtueshme', name_en: 'Accounts Receivable', start: '1300', end: '1399', account_type: 'asset', sequence: 13, parentKey: '1000' },
        { name: '14 - Inventari', name_en: 'Inventory', start: '1400', end: '1499', account_type: 'asset', sequence: 14, parentKey: '1000' },
        { name: '15 - Parapagimet', name_en: 'Prepaid Expenses', start: '1500', end: '1599', account_type: 'asset', sequence: 15, parentKey: '1000' },
        { name: '16 - Mjetet Fikse', name_en: 'Fixed Assets', start: '1600', end: '1699', account_type: 'asset', sequence: 16, parentKey: '1000' },
        { name: '17 - Amortizimi i Akumuluar', name_en: 'Accumulated Depreciation', start: '1700', end: '1799', account_type: 'asset', sequence: 17, parentKey: '1000' },
        { name: '2 - Detyrimet', name_en: 'Liabilities', start: '2000', end: '2999', account_type: 'liability', sequence: 20, parentKey: null },
        { name: '21 - Llogaritë e Pagueshme', name_en: 'Accounts Payable', start: '2100', end: '2199', account_type: 'liability', sequence: 21, parentKey: '2000' },
        { name: '22 - TVSH e Mbledhur', name_en: 'VAT Collected', start: '2200', end: '2299', account_type: 'liability', sequence: 22, parentKey: '2000' },
        { name: '23 - TVSH e Paguar', name_en: 'VAT Paid', start: '2300', end: '2399', account_type: 'liability', sequence: 23, parentKey: '2000' },
        { name: '24 - Pagat e Pagueshme', name_en: 'Wages Payable', start: '2400', end: '2499', account_type: 'liability', sequence: 24, parentKey: '2000' },
        { name: '25 - Detyrime Tatimore', name_en: 'Tax Payable', start: '2500', end: '2599', account_type: 'liability', sequence: 25, parentKey: '2000' },
        { name: '26 - Hua Afatshkurtra', name_en: 'Short-term Loans', start: '2600', end: '2699', account_type: 'liability', sequence: 26, parentKey: '2000' },
        { name: '27 - Hua Afatgjata', name_en: 'Long-term Loans', start: '2700', end: '2799', account_type: 'liability', sequence: 27, parentKey: '2000' },
        { name: '3 - Kapitali', name_en: 'Equity', start: '3000', end: '3999', account_type: 'equity', sequence: 30, parentKey: null },
        { name: '31 - Kapitali i Pronarit', name_en: "Owner's Capital", start: '3100', end: '3199', account_type: 'equity', sequence: 31, parentKey: '3000' },
        { name: '32 - Fitimi i Mbajtur', name_en: 'Retained Earnings', start: '3200', end: '3299', account_type: 'equity', sequence: 32, parentKey: '3000' },
        { name: '33 - Tërheqjet e Pronarit', name_en: 'Owner Drawings', start: '3300', end: '3399', account_type: 'equity', sequence: 33, parentKey: '3000' },
        { name: '4 - Të Ardhurat', name_en: 'Revenue', start: '4000', end: '4999', account_type: 'revenue', sequence: 40, parentKey: null },
        { name: '41 - Të Ardhura nga Shitjet', name_en: 'Sales Revenue', start: '4100', end: '4199', account_type: 'revenue', sequence: 41, parentKey: '4000' },
        { name: '42 - Të Ardhura nga Shërbimet', name_en: 'Service Revenue', start: '4200', end: '4299', account_type: 'revenue', sequence: 42, parentKey: '4000' },
        { name: '43 - Të Ardhura të Tjera', name_en: 'Other Revenue', start: '4300', end: '4399', account_type: 'revenue', sequence: 43, parentKey: '4000' },
        { name: '44 - Zbritje në Shitje', name_en: 'Sales Discounts', start: '4400', end: '4499', account_type: 'revenue', sequence: 44, parentKey: '4000' },
        { name: '5 - Shpenzimet', name_en: 'Expenses', start: '5000', end: '6999', account_type: 'expense', sequence: 50, parentKey: null },
        { name: '51 - Kosto e Mallrave', name_en: 'Cost of Goods Sold', start: '5100', end: '5199', account_type: 'expense', sequence: 51, parentKey: '5000' },
        { name: '52 - Paga dhe Mëditje', name_en: 'Salaries & Wages', start: '5200', end: '5299', account_type: 'expense', sequence: 52, parentKey: '5000' },
        { name: '53 - Qiraja', name_en: 'Rent Expense', start: '5300', end: '5399', account_type: 'expense', sequence: 53, parentKey: '5000' },
        { name: '54 - Shërbime Komunale', name_en: 'Utilities', start: '5400', end: '5499', account_type: 'expense', sequence: 54, parentKey: '5000' },
        { name: '55 - Furnizime Zyre', name_en: 'Office Supplies', start: '5500', end: '5599', account_type: 'expense', sequence: 55, parentKey: '5000' },
        { name: '56 - Transport', name_en: 'Transport', start: '5600', end: '5699', account_type: 'expense', sequence: 56, parentKey: '5000' },
        { name: '57 - Marketingu', name_en: 'Marketing', start: '5700', end: '5799', account_type: 'expense', sequence: 57, parentKey: '5000' },
        { name: '58 - Amortizimi', name_en: 'Depreciation', start: '5800', end: '5899', account_type: 'expense', sequence: 58, parentKey: '5000' },
        { name: '59 - Shpenzime të Tjera', name_en: 'Other Expenses', start: '5900', end: '5999', account_type: 'expense', sequence: 59, parentKey: '5000' },
        { name: '60 - Shpenzime Interesi', name_en: 'Interest Expense', start: '6000', end: '6099', account_type: 'expense', sequence: 60, parentKey: '5000' },
      ];

      // Insert root groups first, then child groups
      const groupIdMap = {}; // parentKey (start code) -> inserted UUID
      for (const g of groups) {
        const parentId = g.parentKey ? groupIdMap[g.parentKey] : null;
        const r = await client.query(
          `INSERT INTO account_groups (tenant_id, name, name_en, code_prefix_start, code_prefix_end, account_type, sequence, parent_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
          [tenantId, g.name, g.name_en, g.start, g.end, g.account_type, g.sequence, parentId]
        );
        groupIdMap[g.start] = r.rows[0].id;
      }

      // 2. Seed accounts with enhanced fields
      const accounts = [
        { code: '1000', name: 'Mjetet', name_en: 'Assets', account_type: 'asset', normal_balance: 'debit', account_subtype: 'other', reconcile: false },
        { code: '1100', name: 'Arka (Cash)', name_en: 'Cash', account_type: 'asset', normal_balance: 'debit', account_subtype: 'liquidity', reconcile: false },
        { code: '1200', name: 'Banka', name_en: 'Bank', account_type: 'asset', normal_balance: 'debit', account_subtype: 'liquidity', reconcile: false },
        { code: '1300', name: 'Llogaritë e Arkëtueshme', name_en: 'Accounts Receivable', account_type: 'asset', normal_balance: 'debit', account_subtype: 'receivable', reconcile: true },
        { code: '1400', name: 'Inventari', name_en: 'Inventory', account_type: 'asset', normal_balance: 'debit', account_subtype: 'other', reconcile: false },
        { code: '1500', name: 'Parapagimet', name_en: 'Prepaid Expenses', account_type: 'asset', normal_balance: 'debit', account_subtype: 'other', reconcile: false },
        { code: '1600', name: 'Mjetet Fikse', name_en: 'Fixed Assets', account_type: 'asset', normal_balance: 'debit', account_subtype: 'other', reconcile: false },
        { code: '1700', name: 'Amortizimi i Akumuluar', name_en: 'Accumulated Depreciation', account_type: 'asset', normal_balance: 'credit', account_subtype: 'other', reconcile: false },
        { code: '2000', name: 'Detyrimet', name_en: 'Liabilities', account_type: 'liability', normal_balance: 'credit', account_subtype: 'other', reconcile: false },
        { code: '2100', name: 'Llogaritë e Pagueshme', name_en: 'Accounts Payable', account_type: 'liability', normal_balance: 'credit', account_subtype: 'payable', reconcile: true },
        { code: '2200', name: 'TVSH e Mbledhur', name_en: 'VAT Collected', account_type: 'liability', normal_balance: 'credit', account_subtype: 'other', reconcile: false },
        { code: '2300', name: 'TVSH e Paguar', name_en: 'VAT Paid', account_type: 'liability', normal_balance: 'debit', account_subtype: 'other', reconcile: false },
        { code: '2400', name: 'Pagat e Pagueshme', name_en: 'Wages Payable', account_type: 'liability', normal_balance: 'credit', account_subtype: 'other', reconcile: false },
        { code: '2500', name: 'Detyrime Tatimore', name_en: 'Tax Payable', account_type: 'liability', normal_balance: 'credit', account_subtype: 'other', reconcile: false },
        { code: '2600', name: 'Huatë Afatshkurtra', name_en: 'Short-term Loans', account_type: 'liability', normal_balance: 'credit', account_subtype: 'other', reconcile: false },
        { code: '2700', name: 'Huatë Afatgjata', name_en: 'Long-term Loans', account_type: 'liability', normal_balance: 'credit', account_subtype: 'other', reconcile: false },
        { code: '3000', name: 'Kapitali', name_en: 'Equity', account_type: 'equity', normal_balance: 'credit', account_subtype: 'other', reconcile: false },
        { code: '3100', name: 'Kapitali i Pronarit', name_en: 'Owner Equity', account_type: 'equity', normal_balance: 'credit', account_subtype: 'other', reconcile: false },
        { code: '3200', name: 'Fitimi i Mbajtur', name_en: 'Retained Earnings', account_type: 'equity', normal_balance: 'credit', account_subtype: 'equity_unaffected', reconcile: false },
        { code: '3300', name: 'Tërheqjet e Pronarit', name_en: 'Owner Drawings', account_type: 'equity', normal_balance: 'debit', account_subtype: 'other', reconcile: false },
        { code: '4000', name: 'Të Ardhurat', name_en: 'Revenue', account_type: 'revenue', normal_balance: 'credit', account_subtype: 'other', reconcile: false },
        { code: '4100', name: 'Të Ardhura nga Shitjet', name_en: 'Sales Revenue', account_type: 'revenue', normal_balance: 'credit', account_subtype: 'other', reconcile: false },
        { code: '4200', name: 'Të Ardhura nga Shërbimet', name_en: 'Service Revenue', account_type: 'revenue', normal_balance: 'credit', account_subtype: 'other', reconcile: false },
        { code: '4300', name: 'Të Ardhura të Tjera', name_en: 'Other Revenue', account_type: 'revenue', normal_balance: 'credit', account_subtype: 'other', reconcile: false },
        { code: '4400', name: 'Zbritje në Shitje', name_en: 'Sales Discounts', account_type: 'revenue', normal_balance: 'debit', account_subtype: 'other', reconcile: false },
        { code: '5000', name: 'Shpenzimet', name_en: 'Expenses', account_type: 'expense', normal_balance: 'debit', account_subtype: 'other', reconcile: false },
        { code: '5100', name: 'Kosto e Mallrave të Shitura', name_en: 'Cost of Goods Sold', account_type: 'expense', normal_balance: 'debit', account_subtype: 'other', reconcile: false },
        { code: '5200', name: 'Paga dhe Mëditje', name_en: 'Salaries & Wages', account_type: 'expense', normal_balance: 'debit', account_subtype: 'other', reconcile: false },
        { code: '5300', name: 'Qiraja', name_en: 'Rent Expense', account_type: 'expense', normal_balance: 'debit', account_subtype: 'other', reconcile: false },
        { code: '5400', name: 'Shërbime Komunale', name_en: 'Utilities', account_type: 'expense', normal_balance: 'debit', account_subtype: 'other', reconcile: false },
        { code: '5500', name: 'Furnizime Zyre', name_en: 'Office Supplies', account_type: 'expense', normal_balance: 'debit', account_subtype: 'other', reconcile: false },
        { code: '5600', name: 'Shpenzime Transporti', name_en: 'Transport Expenses', account_type: 'expense', normal_balance: 'debit', account_subtype: 'other', reconcile: false },
        { code: '5700', name: 'Shpenzime Marketingu', name_en: 'Marketing Expenses', account_type: 'expense', normal_balance: 'debit', account_subtype: 'other', reconcile: false },
        { code: '5800', name: 'Shpenzime Amortizimi', name_en: 'Depreciation Expense', account_type: 'expense', normal_balance: 'debit', account_subtype: 'other', reconcile: false },
        { code: '5900', name: 'Shpenzime të Tjera', name_en: 'Other Expenses', account_type: 'expense', normal_balance: 'debit', account_subtype: 'other', reconcile: false },
        { code: '6000', name: 'Shpenzime Interesi', name_en: 'Interest Expense', account_type: 'expense', normal_balance: 'debit', account_subtype: 'other', reconcile: false },
      ];

      const insertedAccounts = {};
      for (const acc of accounts) {
        // Find group using range logic
        let groupId = null;
        let bestRange = Infinity;
        for (const [startCode, gId] of Object.entries(groupIdMap)) {
          const g = groups.find(g => g.start === startCode);
          if (g && acc.code >= g.start && acc.code <= g.end) {
            const range = parseInt(g.end) - parseInt(g.start);
            if (range < bestRange) {
              bestRange = range;
              groupId = gId;
            }
          }
        }
        const r = await client.query(
          `INSERT INTO chart_of_accounts (tenant_id, code, name, name_en, account_type, normal_balance, account_subtype, reconcile, account_group_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
          [tenantId, acc.code, acc.name, acc.name_en, acc.account_type, acc.normal_balance, acc.account_subtype, acc.reconcile, groupId]
        );
        insertedAccounts[acc.code] = r.rows[0].id;
      }

      // 3. Seed default journals with wired default accounts
      const journalDefs = [
        { name: 'Shitje', name_en: 'Sales', type: 'sale', sequence_prefix: 'INV', default_code: '1300', sequence: 10 },
        { name: 'Blerje', name_en: 'Purchase', type: 'purchase', sequence_prefix: 'BILL', default_code: '2100', sequence: 20 },
        { name: 'Bankë', name_en: 'Bank', type: 'bank', sequence_prefix: 'BANK', default_code: '1200', sequence: 30 },
        { name: 'Arkë', name_en: 'Cash', type: 'cash', sequence_prefix: 'CASH', default_code: '1100', sequence: 40 },
        { name: 'Ndryshime të Tjera', name_en: 'Miscellaneous', type: 'general', sequence_prefix: 'MISC', default_code: null, sequence: 50 },
      ];

      for (const j of journalDefs) {
        const defaultAccId = j.default_code ? (insertedAccounts[j.default_code] || null) : null;
        await client.query(
          `INSERT INTO journals (tenant_id, name, name_en, type, sequence_prefix, default_account_id, sequence)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [tenantId, j.name, j.name_en, j.type, j.sequence_prefix, defaultAccId, j.sequence]
        );
      }

      await client.query('COMMIT');
      res.json({ message: 'Plani kontabël u krijua me sukses', count: accounts.length, groups: groups.length });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Seed accounts error:', err.message);
    res.status(500).json({ error: 'Failed to seed accounts' });
  }
});

app.post('/api/accounting/journal-entry', requireAuth, requireAccountingCreate, async (req, res) => {
  try {
    const tenantId = req.session.user.tenant_id;
    const { entry_date, description, reference_type, reference_id, reference_number, lines, status, journal_id } = req.body;
    const tPool = await getPoolForReq(req);

    if (!lines || lines.length < 2) {
      return res.status(400).json({ error: 'At least 2 journal lines required' });
    }

    for (const line of lines) {
      const debit = parseFloat(line.debit) || 0;
      const credit = parseFloat(line.credit) || 0;
      if (debit < 0 || credit < 0) return res.status(400).json({ error: 'Amounts must be non-negative' });
      if (debit > 0 && credit > 0) return res.status(400).json({ error: 'A line cannot have both debit and credit' });
    }

    const totalDebit = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
    const totalCredit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);

    if (totalDebit === 0) return res.status(400).json({ error: 'Total must be non-zero' });
    if (Math.abs(totalDebit - totalCredit) > 0.01) return res.status(400).json({ error: 'Debits must equal credits' });

    const accountIds = lines.map(l => l.account_id).filter(Boolean);
    if (accountIds.length > 0) {
      const validAccounts = await tPool.query(
        'SELECT id FROM chart_of_accounts WHERE id = ANY($1) AND tenant_id = $2 AND is_active = true',
        [accountIds, tenantId]
      );
      if (validAccounts.rows.length !== accountIds.length) {
        return res.status(400).json({ error: 'One or more accounts are invalid' });
      }
    }

    // Determine journal and sequence prefix
    let resolvedJournalId = journal_id || null;
    let sequencePrefix = 'JE';
    if (resolvedJournalId) {
      const journalRow = await tPool.query(
        'SELECT id, sequence_prefix FROM journals WHERE id = $1 AND tenant_id = $2',
        [resolvedJournalId, tenantId]
      );
      if (journalRow.rows.length > 0) {
        sequencePrefix = journalRow.rows[0].sequence_prefix;
      }
    }

    const client = await tPool.connect();
    try {
      await client.query('BEGIN');

      const prefixPattern = `${sequencePrefix}-%`;
      const prefixLen = sequencePrefix.length + 1;
      const countResult = await client.query(
        `SELECT COALESCE(MAX(CAST(SUBSTRING(entry_number FROM $1) AS INTEGER)), 0) + 1 as next_num
         FROM journal_entries WHERE tenant_id = $2 AND entry_number LIKE $3`,
        [prefixLen + 1, tenantId, prefixPattern]
      );
      const entryNumber = `${sequencePrefix}-${String(countResult.rows[0].next_num).padStart(5, '0')}`;

      const entryResult = await client.query(
        `INSERT INTO journal_entries (tenant_id, entry_number, entry_date, description, reference_type, reference_id, reference_number, total_debit, total_credit, status, created_by, created_by_name, posted_at, journal_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
        [tenantId, entryNumber, entry_date, description, reference_type || null, reference_id || null, reference_number || null,
         totalDebit, totalCredit, status || 'posted', req.session.user.id, req.session.user.email,
         (status || 'posted') === 'posted' ? new Date() : null, resolvedJournalId]
      );
      const entry = entryResult.rows[0];

      for (const line of lines) {
        await client.query(
          `INSERT INTO journal_lines (tenant_id, journal_entry_id, account_id, account_code, account_name, debit, credit, description)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [tenantId, entry.id, line.account_id, line.account_code, line.account_name,
           parseFloat(line.debit) || 0, parseFloat(line.credit) || 0, line.description || null]
        );
      }

      await client.query('COMMIT');

      const fullLines = await tPool.query('SELECT * FROM journal_lines WHERE journal_entry_id = $1', [entry.id]);
      res.json({ ...entry, lines: fullLines.rows });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to create journal entry' });
  }
});

app.get('/api/accounting/trial-balance', requireAuth, requireAccountingView, async (req, res) => {
  try {
    const tenantId = req.session.user.tenant_id;
    const { from, to } = req.query;
    const tPool = await getPoolForReq(req);

    let dateFilter = '';
    const params = [tenantId];
    if (from) { dateFilter += ` AND je.entry_date >= $${params.length + 1}`; params.push(from); }
    if (to) { dateFilter += ` AND je.entry_date <= $${params.length + 1}`; params.push(to); }

    const result = await tPool.query(`
      SELECT
        coa.id, coa.code, coa.name, coa.name_en, coa.account_type, coa.normal_balance,
        coa.account_subtype, coa.reconcile,
        ag.id as group_id, ag.name as group_name, ag.name_en as group_name_en,
        ag.code_prefix_start, ag.sequence as group_sequence,
        COALESCE(bal.total_debit, 0) as total_debit,
        COALESCE(bal.total_credit, 0) as total_credit,
        COALESCE(bal.total_debit, 0) - COALESCE(bal.total_credit, 0) as balance
      FROM chart_of_accounts coa
      LEFT JOIN account_groups ag ON ag.id = coa.account_group_id
      LEFT JOIN (
        SELECT jl.account_id, SUM(jl.debit) as total_debit, SUM(jl.credit) as total_credit
        FROM journal_lines jl
        JOIN journal_entries je ON je.id = jl.journal_entry_id
          AND je.status = 'posted' AND je.tenant_id = $1 ${dateFilter}
        WHERE jl.tenant_id = $1
        GROUP BY jl.account_id
      ) bal ON bal.account_id = coa.id
      WHERE coa.tenant_id = $1 AND coa.is_active = true
        AND (COALESCE(bal.total_debit, 0) != 0 OR COALESCE(bal.total_credit, 0) != 0)
      ORDER BY coa.code
    `, params);

    res.json(result.rows);
  } catch (err) {
    console.error('Trial balance error:', err.message);
    res.status(500).json({ error: 'Failed to load trial balance' });
  }
});

app.get('/api/accounting/income-statement', requireAuth, requireAccountingView, async (req, res) => {
  try {
    const tenantId = req.session.user.tenant_id;
    const { from, to } = req.query;
    const tPool = await getPoolForReq(req);

    let dateFilter = '';
    const params = [tenantId];
    if (from) { dateFilter += ` AND je.entry_date >= $${params.length + 1}`; params.push(from); }
    if (to) { dateFilter += ` AND je.entry_date <= $${params.length + 1}`; params.push(to); }

    const result = await tPool.query(`
      SELECT 
        coa.id, coa.code, coa.name, coa.name_en, coa.account_type, coa.normal_balance,
        ag.id as group_id, ag.name as group_name, ag.name_en as group_name_en,
        ag.code_prefix_start, ag.sequence as group_sequence,
        COALESCE(SUM(jl.debit), 0) as total_debit,
        COALESCE(SUM(jl.credit), 0) as total_credit
      FROM chart_of_accounts coa
      LEFT JOIN account_groups ag ON ag.id = coa.account_group_id
      LEFT JOIN journal_lines jl ON jl.account_id = coa.id AND jl.tenant_id = $1
      LEFT JOIN journal_entries je ON je.id = jl.journal_entry_id AND je.status = 'posted' ${dateFilter}
      WHERE coa.tenant_id = $1 AND coa.is_active = true AND coa.account_type IN ('revenue', 'expense')
      GROUP BY coa.id, coa.code, coa.name, coa.name_en, coa.account_type, coa.normal_balance,
               ag.id, ag.name, ag.name_en, ag.code_prefix_start, ag.sequence
      HAVING COALESCE(SUM(jl.debit), 0) != 0 OR COALESCE(SUM(jl.credit), 0) != 0
      ORDER BY coa.code
    `, params);

    res.json(result.rows);
  } catch (err) {
    console.error('Income statement error:', err.message);
    res.status(500).json({ error: 'Failed to load income statement' });
  }
});

app.get('/api/accounting/balance-sheet', requireAuth, requireAccountingView, async (req, res) => {
  try {
    const tenantId = req.session.user.tenant_id;
    const { to } = req.query;
    const tPool = await getPoolForReq(req);

    let dateFilter = '';
    const params = [tenantId];
    if (to) { dateFilter += ` AND je.entry_date <= $${params.length + 1}`; params.push(to); }

    const result = await tPool.query(`
      SELECT 
        coa.id, coa.code, coa.name, coa.name_en, coa.account_type, coa.normal_balance,
        ag.id as group_id, ag.name as group_name, ag.name_en as group_name_en,
        ag.code_prefix_start, ag.sequence as group_sequence,
        COALESCE(SUM(jl.debit), 0) as total_debit,
        COALESCE(SUM(jl.credit), 0) as total_credit
      FROM chart_of_accounts coa
      LEFT JOIN account_groups ag ON ag.id = coa.account_group_id
      LEFT JOIN journal_lines jl ON jl.account_id = coa.id AND jl.tenant_id = $1
      LEFT JOIN journal_entries je ON je.id = jl.journal_entry_id AND je.status = 'posted' ${dateFilter}
      WHERE coa.tenant_id = $1 AND coa.is_active = true AND coa.account_type IN ('asset', 'liability', 'equity')
      GROUP BY coa.id, coa.code, coa.name, coa.name_en, coa.account_type, coa.normal_balance,
               ag.id, ag.name, ag.name_en, ag.code_prefix_start, ag.sequence
      ORDER BY coa.code
    `, params);

    res.json(result.rows);
  } catch (err) {
    console.error('Balance sheet error:', err.message);
    res.status(500).json({ error: 'Failed to load balance sheet' });
  }
});

app.get('/api/accounting/atk-sales-book', requireAuth, requireAccountingView, async (req, res) => {
  try {
    const tenantId = req.session.user.tenant_id;
    const { from, to } = req.query;
    const tPool = await getPoolForReq(req);

    let dateFilter = '';
    const params = [tenantId];
    if (from) { dateFilter += ` AND issue_date >= $${params.length + 1}`; params.push(from); }
    if (to) { dateFilter += ` AND issue_date <= $${params.length + 1}`; params.push(to); }

    const result = await tPool.query(`
      SELECT id, invoice_number, issue_date, client_name, client_nuis,
        subtotal, tax_amount, total, status
      FROM invoices
      WHERE tenant_id = $1 AND status != 'cancelled' ${dateFilter}
      ORDER BY issue_date ASC, invoice_number ASC
    `, params);

    res.json(result.rows);
  } catch (err) {
    console.error('ATK sales book error:', err.message);
    res.status(500).json({ error: 'Failed to load ATK sales book' });
  }
});

app.get('/api/accounting/atk-purchase-book', requireAuth, requireAccountingView, async (req, res) => {
  try {
    const tenantId = req.session.user.tenant_id;
    const { from, to } = req.query;
    const tPool = await getPoolForReq(req);

    let dateFilter = '';
    const params = [tenantId];
    if (from) { dateFilter += ` AND expense_date >= $${params.length + 1}`; params.push(from); }
    if (to) { dateFilter += ` AND expense_date <= $${params.length + 1}`; params.push(to); }

    const result = await tPool.query(`
      SELECT id, description, expense_date, supplier_name, category_name,
        amount as subtotal, tax_amount, total, status
      FROM expenses
      WHERE tenant_id = $1 AND status != 'cancelled' ${dateFilter}
      ORDER BY expense_date ASC
    `, params);

    res.json(result.rows);
  } catch (err) {
    console.error('ATK purchase book error:', err.message);
    res.status(500).json({ error: 'Failed to load ATK purchase book' });
  }
});

app.get('/api/accounting/tax-summary', requireAuth, requireAccountingView, async (req, res) => {
  try {
    const tenantId = req.session.user.tenant_id;
    const { from, to } = req.query;
    const tPool = await getPoolForReq(req);

    let invDateFilter = '';
    let expDateFilter = '';
    const invParams = [tenantId];
    const expParams = [tenantId];
    if (from) {
      invDateFilter += ` AND issue_date >= $${invParams.length + 1}`; invParams.push(from);
      expDateFilter += ` AND expense_date >= $${expParams.length + 1}`; expParams.push(from);
    }
    if (to) {
      invDateFilter += ` AND issue_date <= $${invParams.length + 1}`; invParams.push(to);
      expDateFilter += ` AND expense_date <= $${expParams.length + 1}`; expParams.push(to);
    }

    const salesResult = await tPool.query(`
      SELECT 
        COALESCE(SUM(subtotal), 0) as total_sales,
        COALESCE(SUM(tax_amount), 0) as vat_collected,
        COALESCE(SUM(total), 0) as total_with_vat,
        COUNT(*) as invoice_count
      FROM invoices
      WHERE tenant_id = $1 AND status != 'cancelled' ${invDateFilter}
    `, invParams);

    const purchaseResult = await tPool.query(`
      SELECT 
        COALESCE(SUM(amount), 0) as total_purchases,
        COALESCE(SUM(tax_amount), 0) as vat_paid,
        COALESCE(SUM(total), 0) as total_with_vat,
        COUNT(*) as expense_count
      FROM expenses
      WHERE tenant_id = $1 AND status != 'cancelled' ${expDateFilter}
    `, expParams);

    const sales = salesResult.rows[0];
    const purchases = purchaseResult.rows[0];

    res.json({
      sales,
      purchases,
      net_vat: parseFloat(sales.vat_collected) - parseFloat(purchases.vat_paid),
      vat_collected: parseFloat(sales.vat_collected),
      vat_paid: parseFloat(purchases.vat_paid),
    });
  } catch (err) {
    console.error('Tax summary error:', err.message);
    res.status(500).json({ error: 'Failed to load tax summary' });
  }
});

app.get('/api/accounting/financial-card/:type/:id', requireAuth, requireAccountingView, async (req, res) => {
  try {
    const tenantId = req.session.user.tenant_id;
    const { type, id } = req.params;
    const { from, to } = req.query;
    const tPool = await getPoolForReq(req);

    if (type === 'customer') {
      let dateFilter = '';
      const params = [tenantId, id];
      if (from) { dateFilter += ` AND issue_date >= $${params.length + 1}`; params.push(from); }
      if (to) { dateFilter += ` AND issue_date <= $${params.length + 1}`; params.push(to); }

      const client = await tPool.query('SELECT * FROM clients WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
      const invoices = await tPool.query(`
        SELECT id, invoice_number, issue_date, subtotal, tax_amount, total, paid_amount, status
        FROM invoices WHERE tenant_id = $1 AND client_id = $2 ${dateFilter}
        ORDER BY issue_date ASC
      `, params);

      const payments = await tPool.query(`
        SELECT id, amount, payment_date, payment_method, reference, invoice_number
        FROM payments WHERE tenant_id = $1 AND client_id = $2
        ORDER BY payment_date ASC
      `, [tenantId, id]);

      res.json({
        entity: client.rows[0] || null,
        invoices: invoices.rows,
        payments: payments.rows,
      });
    } else if (type === 'vendor') {
      let dateFilter = '';
      const params = [tenantId, id];
      if (from) { dateFilter += ` AND expense_date >= $${params.length + 1}`; params.push(from); }
      if (to) { dateFilter += ` AND expense_date <= $${params.length + 1}`; params.push(to); }

      const supplier = await tPool.query('SELECT * FROM suppliers WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
      const expenses = await tPool.query(`
        SELECT id, description, expense_date, amount as subtotal, tax_amount, total, status, category_name
        FROM expenses WHERE tenant_id = $1 AND supplier_id = $2 ${dateFilter}
        ORDER BY expense_date ASC
      `, params);

      res.json({
        entity: supplier.rows[0] || null,
        expenses: expenses.rows,
        payments: [],
      });
    } else {
      res.status(400).json({ error: 'Invalid type. Use customer or vendor.' });
    }
  } catch (err) {
    console.error('Financial card error:', err.message);
    res.status(500).json({ error: 'Failed to load financial card' });
  }
});

// ============ JOURNAL ENTRIES LIST ============

app.get('/api/accounting/journal-entries', requireAuth, requireAccountingView, async (req, res) => {
  try {
    const tenantId = req.session.user.tenant_id;
    const tPool = await getPoolForReq(req);
    const result = await tPool.query(
      `SELECT * FROM journal_entries WHERE tenant_id = $1 ORDER BY entry_date DESC, entry_number DESC LIMIT 1000`,
      [tenantId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load journal entries' });
  }
});

app.get('/api/accounting/journal-entries/:id/lines', requireAuth, requireAccountingView, async (req, res) => {
  try {
    const tenantId = req.session.user.tenant_id;
    const { id } = req.params;
    const tPool = await getPoolForReq(req);
    const result = await tPool.query(
      'SELECT * FROM journal_lines WHERE journal_entry_id = $1 AND tenant_id = $2 ORDER BY id',
      [id, tenantId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load journal lines' });
  }
});

// ============ ACCOUNT GROUPS ============

app.get('/api/accounting/account-groups', requireAuth, requireAccountingView, async (req, res) => {
  try {
    const tenantId = req.session.user.tenant_id;
    const tPool = await getPoolForReq(req);
    const result = await tPool.query(
      'SELECT * FROM account_groups WHERE tenant_id = $1 ORDER BY sequence ASC, code_prefix_start ASC',
      [tenantId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load account groups' });
  }
});

app.post('/api/accounting/account-groups', requireAuth, requireAdmin, async (req, res) => {
  try {
    const tenantId = req.session.user.tenant_id;
    const { name, name_en, code_prefix_start, code_prefix_end, account_type, sequence, parent_id } = req.body;
    if (!name || !code_prefix_start || !code_prefix_end) {
      return res.status(400).json({ error: 'name, code_prefix_start, and code_prefix_end are required' });
    }
    const tPool = await getPoolForReq(req);
    const result = await tPool.query(
      `INSERT INTO account_groups (tenant_id, name, name_en, code_prefix_start, code_prefix_end, account_type, sequence, parent_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [tenantId, name, name_en || null, code_prefix_start, code_prefix_end, account_type || null, sequence || 10, parent_id || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create account group' });
  }
});

app.put('/api/accounting/account-groups/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const tenantId = req.session.user.tenant_id;
    const { id } = req.params;
    const { name, name_en, code_prefix_start, code_prefix_end, account_type, sequence, parent_id } = req.body;
    const tPool = await getPoolForReq(req);
    const result = await tPool.query(
      `UPDATE account_groups SET name=$1, name_en=$2, code_prefix_start=$3, code_prefix_end=$4, account_type=$5, sequence=$6, parent_id=$7, updated_at=NOW()
       WHERE id=$8 AND tenant_id=$9 RETURNING *`,
      [name, name_en || null, code_prefix_start, code_prefix_end, account_type || null, sequence || 10, parent_id || null, id, tenantId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Group not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update account group' });
  }
});

app.delete('/api/accounting/account-groups/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const tenantId = req.session.user.tenant_id;
    const { id } = req.params;
    const tPool = await getPoolForReq(req);
    await tPool.query('DELETE FROM account_groups WHERE id=$1 AND tenant_id=$2', [id, tenantId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete account group' });
  }
});

// ============ JOURNALS ============

app.get('/api/accounting/journals', requireAuth, requireAccountingView, async (req, res) => {
  try {
    const tenantId = req.session.user.tenant_id;
    const tPool = await getPoolForReq(req);
    const result = await tPool.query(
      `SELECT j.*, coa.code as default_account_code, coa.name as default_account_name
       FROM journals j
       LEFT JOIN chart_of_accounts coa ON coa.id = j.default_account_id
       WHERE j.tenant_id = $1 ORDER BY j.sequence ASC`,
      [tenantId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load journals' });
  }
});

app.post('/api/accounting/journals', requireAuth, requireAdmin, async (req, res) => {
  try {
    const tenantId = req.session.user.tenant_id;
    const { name, name_en, type, sequence_prefix, default_account_id, sequence } = req.body;
    if (!name || !sequence_prefix) return res.status(400).json({ error: 'name and sequence_prefix are required' });
    const tPool = await getPoolForReq(req);
    const result = await tPool.query(
      `INSERT INTO journals (tenant_id, name, name_en, type, sequence_prefix, default_account_id, sequence)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [tenantId, name, name_en || null, type || 'general', sequence_prefix, default_account_id || null, sequence || 10]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create journal' });
  }
});

app.put('/api/accounting/journals/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const tenantId = req.session.user.tenant_id;
    const { id } = req.params;
    const { name, name_en, type, sequence_prefix, default_account_id, is_active, sequence } = req.body;
    const tPool = await getPoolForReq(req);
    const result = await tPool.query(
      `UPDATE journals SET name=$1, name_en=$2, type=$3, sequence_prefix=$4, default_account_id=$5, is_active=$6, sequence=$7, updated_at=NOW()
       WHERE id=$8 AND tenant_id=$9 RETURNING *`,
      [name, name_en || null, type || 'general', sequence_prefix, default_account_id || null, is_active !== false, sequence || 10, id, tenantId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Journal not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update journal' });
  }
});

app.delete('/api/accounting/journals/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const tenantId = req.session.user.tenant_id;
    const { id } = req.params;
    const tPool = await getPoolForReq(req);
    await tPool.query('DELETE FROM journals WHERE id=$1 AND tenant_id=$2', [id, tenantId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete journal' });
  }
});

// ============ ACCOUNTS WITH BALANCES ============

app.get('/api/accounting/accounts-with-balances', requireAuth, requireAccountingView, async (req, res) => {
  try {
    const tenantId = req.session.user.tenant_id;
    const tPool = await getPoolForReq(req);
    const result = await tPool.query(`
      SELECT
        coa.id, coa.code, coa.name, coa.name_en, coa.account_type, coa.normal_balance,
        coa.reconcile, coa.account_subtype, coa.is_active, coa.description,
        coa.account_group_id,
        ag.name as group_name, ag.name_en as group_name_en,
        ag.code_prefix_start, ag.sequence as group_sequence,
        ag.parent_id as group_parent_id,
        COALESCE(bal.total_debit, 0) as total_debit,
        COALESCE(bal.total_credit, 0) as total_credit,
        COALESCE(bal.total_debit, 0) - COALESCE(bal.total_credit, 0) as raw_balance
      FROM chart_of_accounts coa
      LEFT JOIN account_groups ag ON ag.id = coa.account_group_id
      LEFT JOIN (
        SELECT jl.account_id,
               SUM(jl.debit) as total_debit,
               SUM(jl.credit) as total_credit
        FROM journal_lines jl
        JOIN journal_entries je ON je.id = jl.journal_entry_id
          AND je.status = 'posted'
          AND je.tenant_id = $1
        WHERE jl.tenant_id = $1
        GROUP BY jl.account_id
      ) bal ON bal.account_id = coa.id
      WHERE coa.tenant_id = $1 AND coa.is_active = true
      ORDER BY coa.code
    `, [tenantId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Accounts with balances error:', err.message);
    res.status(500).json({ error: 'Failed to load accounts' });
  }
});

// ============ ACCOUNTS CRUD (dedicated, with computeAccountGroup + duplicate validation) ============

app.post('/api/accounting/accounts', requireAuth, requireAdmin, async (req, res) => {
  try {
    const tenantId = req.session.user.tenant_id;
    const { code, name, name_en, account_type, normal_balance, account_subtype, reconcile, description, account_group_id } = req.body;
    if (!code || !name) return res.status(400).json({ error: 'code and name are required' });
    const tPool = await getPoolForReq(req);

    // Duplicate code check
    const dup = await tPool.query('SELECT id FROM chart_of_accounts WHERE code = $1 AND tenant_id = $2', [code, tenantId]);
    if (dup.rows.length > 0) return res.status(409).json({ error: `Kodi ${code} ekziston tashmë` });

    // Auto-compute group if not provided
    const groupId = account_group_id || await computeAccountGroup(tPool, tenantId, code);

    const result = await tPool.query(
      `INSERT INTO chart_of_accounts (tenant_id, code, name, name_en, account_type, normal_balance, account_subtype, reconcile, description, account_group_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [tenantId, code, name, name_en || null, account_type || 'asset', normal_balance || 'debit',
       account_subtype || 'other', reconcile || false, description || null, groupId || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Create account error:', err.message);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

app.put('/api/accounting/accounts/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const tenantId = req.session.user.tenant_id;
    const { id } = req.params;
    const { code, name, name_en, account_type, normal_balance, account_subtype, reconcile, description, account_group_id } = req.body;
    if (!code || !name) return res.status(400).json({ error: 'code and name are required' });
    const tPool = await getPoolForReq(req);

    // Duplicate code check (exclude self)
    const dup = await tPool.query('SELECT id FROM chart_of_accounts WHERE code = $1 AND tenant_id = $2 AND id != $3', [code, tenantId, id]);
    if (dup.rows.length > 0) return res.status(409).json({ error: `Kodi ${code} ekziston tashmë` });

    // Auto-compute group if not provided
    const groupId = account_group_id || await computeAccountGroup(tPool, tenantId, code);

    const result = await tPool.query(
      `UPDATE chart_of_accounts SET code=$1, name=$2, name_en=$3, account_type=$4, normal_balance=$5,
       account_subtype=$6, reconcile=$7, description=$8, account_group_id=$9, updated_at=NOW()
       WHERE id=$10 AND tenant_id=$11 RETURNING *`,
      [code, name, name_en || null, account_type || 'asset', normal_balance || 'debit',
       account_subtype || 'other', reconcile || false, description || null, groupId || null, id, tenantId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Account not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update account error:', err.message);
    res.status(500).json({ error: 'Failed to update account' });
  }
});

app.delete('/api/accounting/accounts/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const tenantId = req.session.user.tenant_id;
    const { id } = req.params;
    const tPool = await getPoolForReq(req);
    // Check if account is used in any journal lines
    const used = await tPool.query('SELECT COUNT(*) FROM journal_lines WHERE account_id = $1 AND tenant_id = $2', [id, tenantId]);
    if (parseInt(used.rows[0].count) > 0) {
      return res.status(409).json({ error: 'Kjo llogari ka regjistrime dhe nuk mund të fshihet' });
    }
    await tPool.query('DELETE FROM chart_of_accounts WHERE id=$1 AND tenant_id=$2', [id, tenantId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete account error:', err.message);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// ============ SUPERADMIN DATABASE MANAGEMENT ============

const migrationJobs = new Map();

app.get('/api/superadmin/tenants/database-status', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, database_status, supabase_project_id, database_provisioned_at FROM tenants ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/superadmin/tenants/:tenantId/create-database', requireAuth, requireSuperAdmin, async (req, res) => {
  const { tenantId } = req.params;
  try {
    const tenantResult = await pool.query('SELECT * FROM tenants WHERE id = $1', [tenantId]);
    if (tenantResult.rows.length === 0) return res.status(404).json({ error: 'Tenant not found' });
    const tenant = tenantResult.rows[0];

    if (tenant.database_status === 'active') {
      return res.status(409).json({ error: 'Tenant already has an active personal database' });
    }
    if (tenant.database_status === 'provisioning') {
      return res.status(409).json({ error: 'Database provisioning already in progress' });
    }

    if (!process.env.SUPABASE_ACCESS_TOKEN) {
      return res.status(500).json({ error: 'SUPABASE_ACCESS_TOKEN is not configured. Please set this environment variable before provisioning a database.' });
    }

    await pool.query(
      'UPDATE tenants SET database_status = $1, updated_at = NOW() WHERE id = $2',
      ['provisioning', tenantId]
    );
    clearCachedTenantDb(tenantId);

    const jobId = tenantId;
    migrationJobs.set(jobId, { status: 'provisioning', progress: [], startedAt: new Date() });

    res.json({ success: true, jobId, message: 'Database provisioning started' });

    setImmediate(async () => {
      const addProgress = (msg) => {
        const job = migrationJobs.get(jobId);
        if (job) job.progress.push({ time: new Date(), message: msg });
        console.log(`[DB Provision ${tenantId}] ${msg}`);
      };

      try {
        addProgress('Fetching Supabase organizations...');
        const orgs = await listOrganizations();
        if (!orgs || orgs.length === 0) throw new Error('No Supabase organizations found. Please create an organization at supabase.com first.');
        const orgId = orgs[0].id;
        addProgress(`Using organization: ${orgs[0].name}`);

        const dbPassword = generateDbPassword();
        const projectName = `erp-tenant-${tenant.code || tenantId.slice(0, 8)}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
        addProgress(`Creating Supabase project: ${projectName}...`);

        const project = await createProject({
          name: projectName,
          organizationId: orgId,
          dbPassword,
          region: 'eu-central-1',
          plan: 'free',
        });

        addProgress(`Project created (ref: ${project.ref}). Waiting for it to become ready...`);
        migrationJobs.get(jobId).projectRef = project.ref;

        await waitForProjectReady(project.ref, 300000);
        addProgress('Project is ready. Building connection string...');

        const databaseUrl = await getProjectDatabaseUrl(project.ref, dbPassword);

        addProgress('Running schema migrations on personal database...');
        await runSchemaOnPersonalDb(databaseUrl);
        addProgress('Schema migration complete.');

        addProgress('Migrating tenant data...');
        const migrationResult = await migrateTenantData(tenantId, pool, databaseUrl, (p) => {
          if (p.status === 'done' && p.rows > 0) {
            addProgress(`  Migrated ${p.rows} rows from ${p.table}`);
          }
        });
        addProgress(`Data migration complete. ${migrationResult.totalRows} rows migrated.`);

        if (migrationResult.errors.length > 0) {
          addProgress(`Warnings: ${migrationResult.errors.join('; ')}`);
          if (migrationResult.criticalError) {
            throw new Error(`Migration failed with critical errors: ${migrationResult.errors[0]}`);
          }
        }

        addProgress('Indexing proposal tokens...');
        await pool.query(
          `INSERT INTO proposal_token_index (token, tenant_id, proposal_id)
           SELECT token, $1, id FROM proposals WHERE tenant_id = $1 AND token IS NOT NULL
           ON CONFLICT (token) DO UPDATE SET tenant_id = EXCLUDED.tenant_id, proposal_id = EXCLUDED.proposal_id`,
          [tenantId]
        );

        await pool.query(
          'UPDATE tenants SET database_url = $1, supabase_project_id = $2, database_status = $3, database_provisioned_at = NOW(), updated_at = NOW() WHERE id = $4',
          [databaseUrl, project.ref, 'active', tenantId]
        );
        clearCachedTenantDb(tenantId);

        const job = migrationJobs.get(jobId);
        if (job) {
          job.status = 'active';
          job.completedAt = new Date();
        }
        addProgress('Done! Personal database is now active.');
      } catch (err) {
        console.error(`[DB Provision ${tenantId}] Error:`, err.message);
        await pool.query(
          'UPDATE tenants SET database_status = $1, updated_at = NOW() WHERE id = $2',
          ['failed', tenantId]
        ).catch(() => {});
        clearCachedTenantDb(tenantId);
        const job = migrationJobs.get(jobId);
        if (job) {
          job.status = 'failed';
          job.error = err.message;
          job.progress.push({ time: new Date(), message: `Error: ${err.message}` });
        }
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/superadmin/tenants/:tenantId/database-job', requireAuth, requireSuperAdmin, async (req, res) => {
  const { tenantId } = req.params;
  const job = migrationJobs.get(tenantId);
  if (!job) {
    const result = await pool.query(
      'SELECT database_status, supabase_project_id, database_provisioned_at FROM tenants WHERE id = $1',
      [tenantId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Tenant not found' });
    return res.json({ status: result.rows[0].database_status || 'none', progress: [] });
  }
  res.json({
    status: job.status,
    progress: job.progress,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    error: job.error,
  });
});

// ============ FUNCTIONS (stubs) ============

app.post('/api/functions/:name', requireAuth, async (req, res) => {
  const { name } = req.params;
  try {
    if (name === 'checkCashboxBalance') {
      res.json({ success: true, message: 'Balance checked' });
    } else if (name === 'generateHandoverPdf') {
      res.json({ success: true, data: { file_url: null }, message: 'PDF generation not yet available' });
    } else if (name === 'sendHandoverEmail') {
      res.json({ success: true, message: 'Email functionality requires email service configuration' });
    } else if (name === 'generateAndSendReport') {
      res.json({ success: true, message: 'Report generation not yet available' });
    } else {
      res.json({ success: true, message: `Function ${name} acknowledged` });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ INTEGRATIONS ============

app.post('/api/integrations/Core/SendEmail', requireAuth, async (req, res) => {
  res.json({ success: true, message: 'Email functionality requires email service configuration' });
});

app.post('/api/integrations/Core/UploadFile', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const result = await pool.query(
      `INSERT INTO uploaded_files (user_id, tenant_id, original_name, stored_name, mime_type, size, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.session.user.id, req.session.user.tenant_id, req.file.originalname, req.file.filename, req.file.mimetype, req.file.size, 'general']
    );
    const file = result.rows[0];
    res.json({ success: true, file_url: `/api/files/general/${file.stored_name}`, file });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ SERVE FRONTEND ============

const distPath = join(__dirname, '../dist');
app.use(express.static(distPath));

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

app.get('/{*path}', (req, res) => {
  res.sendFile(join(distPath, 'index.html'));
});

// ============ STARTUP ROUTE HEALTH CHECK ============

async function verifyRoutesNotReturning404(port) {
  const { default: http } = await import('http');

  const criticalRoutes = [
    { method: 'GET', path: '/api/tenant/me' },
    { method: 'GET', path: '/api/permissions/me' },
    { method: 'GET', path: '/api/notifications/unread-count' },
    { method: 'POST', path: '/api/entities/Announcement/filter' },
    { method: 'GET', path: '/api/superadmin/tenants/database-status' },
    { method: 'POST', path: '/api/superadmin/tenants/test-id/create-database' },
  ];

  const results = await Promise.all(criticalRoutes.map(({ method, path }) =>
    new Promise((resolve) => {
      const body = method === 'POST' ? '{}' : null;
      const options = {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: { 'Content-Type': 'application/json', ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {}) },
      };
      const req = http.request(options, (res) => {
        resolve({ method, path, status: res.statusCode, ok: res.statusCode !== 404 });
      });
      req.on('error', (e) => resolve({ method, path, status: 'ERR', ok: false, err: e.message }));
      if (body) req.write(body);
      req.end();
    })
  ));

  const statusSummary = results.map(r => `${r.method} ${r.path} -> ${r.status}`).join(', ');
  const failed = results.filter(r => !r.ok);

  if (failed.length === 0) {
    console.log(`[Routes] Health check PASSED: all ${criticalRoutes.length} critical routes respond (not 404). A 401 status proves route is registered (auth gate); 403 proves role gate. Statuses: ${statusSummary}`);
  } else {
    const failedList = failed.map(r => `${r.method} ${r.path} (got ${r.status})`).join(', ');
    console.error(`[Routes] Health check FAILED - routes returning 404 (not registered): ${failedList}`);
    process.exitCode = 1;
  }
}

// ============ START ============

async function start() {
  try {
    await runMigration();
    console.log('Database migration completed');
  } catch (err) {
    console.error('Migration warning:', err.message);
  }

  const entityCount = Object.keys(entityTableMap).length;
  console.log(`[Routes] ${entityCount} entity types registered via entityTableMap; Announcement -> "announcements" table: ${'Announcement' in entityTableMap}`);

  const PORT = process.env.PORT || process.env.SERVER_PORT || 3001;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    const runHealthCheck = process.env.STARTUP_HEALTH_CHECK === 'true' || (process.env.NODE_ENV !== 'production' && process.env.STARTUP_HEALTH_CHECK !== 'false');
    if (runHealthCheck) {
      verifyRoutesNotReturning404(PORT).catch(e => console.error('[Routes] Health check error:', e.message));
    }
  });
}

start();
