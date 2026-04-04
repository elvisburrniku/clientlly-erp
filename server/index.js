import express from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import bcrypt from 'bcrypt';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pool from './db.js';
import { createEntityRouter } from './entityRouter.js';

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

// Auth middleware
const requireAuth = (req, res, next) => {
  if (req.session?.user) {
    return next();
  }
  res.status(401).json({ error: 'Authentication required', status: 401 });
};

// ============ AUTH ROUTES ============

app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, email, full_name, role, tenant_id, tenant_name FROM users WHERE id = $1', [req.session.user.id]);
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
    res.json({ id: user.id, email: user.email, full_name: user.full_name, role: user.role, tenant_id: user.tenant_id, tenant_name: user.tenant_name });
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
    const { full_name, tenant_id, tenant_name } = req.body;
    const result = await pool.query(
      'UPDATE users SET full_name = COALESCE($1, full_name), tenant_id = COALESCE($2, tenant_id), tenant_name = COALESCE($3, tenant_name), updated_at = NOW() WHERE id = $4 RETURNING id, email, full_name, role, tenant_id, tenant_name',
      [full_name, tenant_id, tenant_name, req.session.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const user = result.rows[0];
    req.session.user = { id: user.id, email: user.email, role: user.role, tenant_id: user.tenant_id };
    res.json(user);
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

for (const [entityName, tableName] of Object.entries(entityTableMap)) {
  app.use(`/api/entities/${entityName}`, requireAuth, createEntityRouter(pool, tableName, entityName));
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

// ============ INTEGRATIONS (stubs) ============

app.post('/api/integrations/Core/SendEmail', requireAuth, async (req, res) => {
  res.json({ success: true, message: 'Email functionality requires email service configuration' });
});

app.post('/api/integrations/Core/UploadFile', requireAuth, async (req, res) => {
  res.json({ success: true, file_url: null, message: 'File upload not yet configured' });
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

const PORT = process.env.SERVER_PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
