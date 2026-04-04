import express from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import bcrypt from 'bcrypt';
import cors from 'cors';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import pool from './db.js';
import { createEntityRouter } from './entityRouter.js';
import { requirePermission, getPermissionsApi, clearPermissionsCache } from './permissions.js';
import { logActivity, getActivityApi, notifyTenantAdmins } from './activityLog.js';
import runMigration from './migrate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
        [tenant.id, tenant.name, 'admin', req.session.user.id]
      );
      await client.query('COMMIT');

      req.session.user.tenant_id = tenant.id;
      req.session.user.role = 'admin';
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
      const clientsResult = await pool.query(
        `SELECT id, name, email, phone FROM clients WHERE tenant_id = $2 AND (LOWER(COALESCE(name,'')) LIKE $1 OR LOWER(COALESCE(email,'')) LIKE $1 OR LOWER(COALESCE(phone,'')) LIKE $1) LIMIT 5`,
        [searchTerm, tenantId]
      );
      results.push(...clientsResult.rows.map(r => ({ ...r, type: 'client', label: r.name, sub: r.email })));
    }

    if (canSearch('invoices')) {
      const invoicesResult = await pool.query(
        `SELECT id, invoice_number, client_name, total, status FROM invoices WHERE tenant_id = $2 AND (LOWER(COALESCE(invoice_number,'')) LIKE $1 OR LOWER(COALESCE(client_name,'')) LIKE $1) LIMIT 5`,
        [searchTerm, tenantId]
      );
      results.push(...invoicesResult.rows.map(r => ({ ...r, type: 'invoice', label: r.invoice_number || `Invoice #${r.id}`, sub: r.client_name })));
    }

    if (canSearch('products')) {
      const productsResult = await pool.query(
        `SELECT id, name, price FROM products WHERE tenant_id = $2 AND LOWER(COALESCE(name,'')) LIKE $1 LIMIT 5`,
        [searchTerm, tenantId]
      );
      results.push(...productsResult.rows.map(r => ({ ...r, type: 'product', label: r.name, sub: r.price ? `${r.price}` : '' })));
    }

    if (canSearch('suppliers')) {
      const suppliersResult = await pool.query(
        `SELECT id, name, email FROM suppliers WHERE tenant_id = $2 AND (LOWER(COALESCE(name,'')) LIKE $1 OR LOWER(COALESCE(email,'')) LIKE $1) LIMIT 5`,
        [searchTerm, tenantId]
      );
      results.push(...suppliersResult.rows.map(r => ({ ...r, type: 'supplier', label: r.name, sub: r.email })));
    }

    if (canSearch('expenses')) {
      const expensesResult = await pool.query(
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
  app.use(`/api/entities/${entityName}`, ...middlewares, createEntityRouter(pool, tableName, entityName, entityOpts));
}

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

app.get('/{*path}', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  res.sendFile(join(distPath, 'index.html'));
});

// ============ START ============

async function start() {
  try {
    await runMigration();
    console.log('Database migration completed');
  } catch (err) {
    console.error('Migration warning:', err.message);
  }

  const PORT = process.env.SERVER_PORT || 3001;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start();
