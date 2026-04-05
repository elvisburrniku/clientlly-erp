import pool from './db.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');

const migration = `
-- Roles & Permissions
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
  id SERIAL PRIMARY KEY,
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  module VARCHAR(100) NOT NULL,
  can_view BOOLEAN DEFAULT FALSE,
  can_create BOOLEAN DEFAULT FALSE,
  can_edit BOOLEAN DEFAULT FALSE,
  can_delete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role_id, module)
);

-- Insert default roles
INSERT INTO roles (name, display_name, description, is_system) VALUES
  ('admin', 'Administrator', 'Full access to all modules', TRUE),
  ('owner', 'Owner', 'Company owner with admin access', TRUE),
  ('manager', 'Manager', 'Can manage most modules', TRUE),
  ('accountant', 'Accountant', 'Access to financial modules', TRUE),
  ('user', 'User', 'Basic access', TRUE)
ON CONFLICT (name) DO NOTHING;

-- Insert default permissions for admin (all modules, all actions)
INSERT INTO permissions (role_id, module, can_view, can_create, can_edit, can_delete)
SELECT r.id, m.module, TRUE, TRUE, TRUE, TRUE
FROM roles r
CROSS JOIN (VALUES
  ('dashboard'), ('invoices'), ('quotes'), ('expenses'), ('products'),
  ('clients'), ('suppliers'), ('cashbox'), ('transfers'), ('debtors'),
  ('cash_handover'), ('reports'), ('royalties'), ('inventory'), ('settings'),
  ('report_templates'), ('reminders'), ('activity_log'), ('users')
) AS m(module)
WHERE r.name = 'admin'
ON CONFLICT (role_id, module) DO NOTHING;

-- Insert default permissions for owner (same access as admin)
INSERT INTO permissions (role_id, module, can_view, can_create, can_edit, can_delete)
SELECT r.id, m.module, TRUE, TRUE, TRUE, TRUE
FROM roles r
CROSS JOIN (VALUES
  ('dashboard'), ('invoices'), ('quotes'), ('expenses'), ('products'),
  ('clients'), ('suppliers'), ('cashbox'), ('transfers'), ('debtors'),
  ('cash_handover'), ('reports'), ('royalties'), ('inventory'), ('settings'),
  ('report_templates'), ('reminders'), ('activity_log'), ('users')
) AS m(module)
WHERE r.name = 'owner'
ON CONFLICT (role_id, module) DO NOTHING;

-- Insert default permissions for manager
INSERT INTO permissions (role_id, module, can_view, can_create, can_edit, can_delete)
SELECT r.id, m.module, m.can_view, m.can_create, m.can_edit, m.can_delete
FROM roles r
CROSS JOIN (VALUES
  ('dashboard', TRUE, FALSE, FALSE, FALSE),
  ('invoices', TRUE, TRUE, TRUE, FALSE),
  ('quotes', TRUE, TRUE, TRUE, FALSE),
  ('expenses', TRUE, TRUE, TRUE, FALSE),
  ('products', TRUE, TRUE, TRUE, FALSE),
  ('clients', TRUE, TRUE, TRUE, FALSE),
  ('suppliers', TRUE, TRUE, TRUE, FALSE),
  ('cashbox', TRUE, TRUE, TRUE, FALSE),
  ('transfers', TRUE, TRUE, TRUE, FALSE),
  ('debtors', TRUE, FALSE, FALSE, FALSE),
  ('cash_handover', TRUE, TRUE, TRUE, FALSE),
  ('reports', TRUE, FALSE, FALSE, FALSE),
  ('inventory', TRUE, TRUE, TRUE, FALSE),
  ('settings', TRUE, FALSE, TRUE, FALSE),
  ('reminders', TRUE, TRUE, TRUE, FALSE)
) AS m(module, can_view, can_create, can_edit, can_delete)
WHERE r.name = 'manager'
ON CONFLICT (role_id, module) DO NOTHING;

-- Insert default permissions for accountant
INSERT INTO permissions (role_id, module, can_view, can_create, can_edit, can_delete)
SELECT r.id, m.module, m.can_view, m.can_create, m.can_edit, m.can_delete
FROM roles r
CROSS JOIN (VALUES
  ('dashboard', TRUE, FALSE, FALSE, FALSE),
  ('invoices', TRUE, TRUE, TRUE, FALSE),
  ('expenses', TRUE, TRUE, TRUE, FALSE),
  ('cashbox', TRUE, TRUE, TRUE, FALSE),
  ('transfers', TRUE, TRUE, TRUE, FALSE),
  ('reports', TRUE, TRUE, FALSE, FALSE),
  ('debtors', TRUE, FALSE, FALSE, FALSE),
  ('cash_handover', TRUE, TRUE, TRUE, FALSE)
) AS m(module, can_view, can_create, can_edit, can_delete)
WHERE r.name = 'accountant'
ON CONFLICT (role_id, module) DO NOTHING;

-- Insert default permissions for user
INSERT INTO permissions (role_id, module, can_view, can_create, can_edit, can_delete)
SELECT r.id, m.module, TRUE, FALSE, FALSE, FALSE
FROM roles r
CROSS JOIN (VALUES
  ('dashboard'), ('invoices'), ('products'), ('clients')
) AS m(module)
WHERE r.name = 'user'
ON CONFLICT (role_id, module) DO NOTHING;

-- Add language column to users if not exists
DO $$ BEGIN
  ALTER TABLE users ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'sq';
EXCEPTION WHEN others THEN NULL;
END $$;

-- Notifications table (user_id is UUID to match users table)
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  tenant_id VARCHAR(100),
  title VARCHAR(255) NOT NULL,
  message TEXT,
  type VARCHAR(50) DEFAULT 'info',
  entity_type VARCHAR(100),
  entity_id VARCHAR(100),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON notifications(tenant_id);

-- Activity logs table (user_id is UUID)
CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID,
  user_email VARCHAR(255),
  user_name VARCHAR(255),
  tenant_id VARCHAR(100),
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id VARCHAR(100),
  entity_name VARCHAR(255),
  details JSONB,
  ip_address VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_tenant ON activity_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type, entity_id);

-- Uploaded files table (user_id is UUID)
CREATE TABLE IF NOT EXISTS uploaded_files (
  id SERIAL PRIMARY KEY,
  user_id UUID,
  tenant_id VARCHAR(100),
  original_name VARCHAR(500) NOT NULL,
  stored_name VARCHAR(500) NOT NULL,
  mime_type VARCHAR(200),
  size INTEGER,
  category VARCHAR(50) DEFAULT 'document',
  entity_type VARCHAR(100),
  entity_id VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_uploaded_files_tenant ON uploaded_files(tenant_id);

-- ============ PROPOSALS, AGREEMENTS & DOCUMENTS MODULE ============

CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  proposal_number VARCHAR(100) UNIQUE,
  client_id UUID,
  client_name VARCHAR(255),
  client_email VARCHAR(255),
  client_phone VARCHAR(100),
  client_address VARCHAR(500),
  client_nipt VARCHAR(100),
  title VARCHAR(500),
  description TEXT,
  items JSONB DEFAULT '[]',
  subtotal DECIMAL(15,2) DEFAULT 0,
  discount_type VARCHAR(50) DEFAULT 'none',
  discount_value DECIMAL(15,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'draft',
  valid_until DATE,
  validity_days INTEGER DEFAULT 30,
  template VARCHAR(50) DEFAULT 'classic',
  color_theme VARCHAR(50) DEFAULT '#4338ca',
  notes TEXT,
  terms TEXT,
  token VARCHAR(255) UNIQUE,
  viewed_at TIMESTAMP,
  accepted_at TIMESTAMP,
  rejected_at TIMESTAMP,
  rejection_reason TEXT,
  converted_invoice_id UUID,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============ ACCOUNTING MODULE ============

CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  code VARCHAR(20) NOT NULL,
  name VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),
  account_type VARCHAR(50) NOT NULL,
  parent_id UUID,
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  normal_balance VARCHAR(10) DEFAULT 'debit',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  entry_number VARCHAR(100),
  entry_date DATE NOT NULL,
  description TEXT,
  reference_type VARCHAR(100),
  reference_id UUID,
  reference_number VARCHAR(100),
  total_debit DECIMAL(15,2) DEFAULT 0,
  total_credit DECIMAL(15,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'draft',
  created_by UUID,
  created_by_name VARCHAR(255),
  posted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  agreement_number VARCHAR(100),
  client_id UUID,
  client_name VARCHAR(255),
  title VARCHAR(500),
  description TEXT,
  start_date DATE,
  end_date DATE,
  renewal_date DATE,
  value DECIMAL(15,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active',
  terms TEXT,
  payment_terms TEXT,
  auto_renew BOOLEAN DEFAULT false,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Invoice settings schema compatibility
DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'invoice_settings'
  ) THEN
    ALTER TABLE invoice_settings ADD COLUMN IF NOT EXISTS invoice_number_format VARCHAR(100) DEFAULT 'INV-{###}';
    ALTER TABLE invoice_settings ADD COLUMN IF NOT EXISTS invoice_number_counter INTEGER DEFAULT 1;
    ALTER TABLE invoice_settings ADD COLUMN IF NOT EXISTS default_due_days INTEGER DEFAULT 10;
    ALTER TABLE invoice_settings ADD COLUMN IF NOT EXISTS default_template VARCHAR(50) DEFAULT 'classic';
    ALTER TABLE invoice_settings ADD COLUMN IF NOT EXISTS payment_reminder_days_before INTEGER DEFAULT 3;
    ALTER TABLE invoice_settings ADD COLUMN IF NOT EXISTS payment_reminder_days_after INTEGER DEFAULT 5;
    ALTER TABLE invoice_settings ADD COLUMN IF NOT EXISTS auto_send_reminders BOOLEAN DEFAULT false;
    ALTER TABLE invoice_settings ADD COLUMN IF NOT EXISTS default_payment_notes TEXT;
    ALTER TABLE invoice_settings ADD COLUMN IF NOT EXISTS royalty_percentage DECIMAL(5,2) DEFAULT 6;
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'invoice_settings'
  ) THEN
    UPDATE invoice_settings
    SET
      invoice_number_format = COALESCE(invoice_number_format, invoice_prefix || '-{###}', 'INV-{###}'),
      invoice_number_counter = COALESCE(invoice_number_counter, next_invoice_number, 1),
      default_due_days = COALESCE(default_due_days, 10),
      default_template = COALESCE(default_template, 'classic'),
      payment_reminder_days_before = COALESCE(payment_reminder_days_before, 3),
      payment_reminder_days_after = COALESCE(payment_reminder_days_after, 5),
      auto_send_reminders = COALESCE(auto_send_reminders, false),
      royalty_percentage = COALESCE(royalty_percentage, 6)
    WHERE
      invoice_number_format IS NULL
      OR invoice_number_counter IS NULL
      OR default_due_days IS NULL
      OR default_template IS NULL
      OR payment_reminder_days_before IS NULL
      OR payment_reminder_days_after IS NULL
      OR auto_send_reminders IS NULL
      OR royalty_percentage IS NULL;
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS agreement_annexes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  agreement_id UUID,
  title VARCHAR(500),
  description TEXT,
  annex_number VARCHAR(100),
  annex_date DATE,
  file_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS company_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  title VARCHAR(500) NOT NULL,
  category VARCHAR(100),
  description TEXT,
  file_url TEXT,
  file_name VARCHAR(500),
  version INTEGER DEFAULT 1,
  status VARCHAR(50) DEFAULT 'active',
  uploaded_by UUID,
  uploaded_by_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  certificate_number VARCHAR(100),
  client_id UUID,
  client_name VARCHAR(255),
  client_email VARCHAR(255),
  title VARCHAR(500),
  description TEXT,
  issue_date DATE,
  expiry_date DATE,
  status VARCHAR(50) DEFAULT 'active',
  template VARCHAR(50) DEFAULT 'standard',
  notes TEXT,
  sent_at TIMESTAMP,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add proposals module permissions for admin role
INSERT INTO permissions (role_id, module, can_view, can_create, can_edit, can_delete)
SELECT r.id, m.module, TRUE, TRUE, TRUE, TRUE
FROM roles r
CROSS JOIN (VALUES
  ('proposals'), ('agreements'), ('company_documents'), ('certificates')
) AS m(module)
WHERE r.name = 'admin'
ON CONFLICT (role_id, module) DO NOTHING;

-- Mirror proposals module permissions to owner
INSERT INTO permissions (role_id, module, can_view, can_create, can_edit, can_delete)
SELECT r.id, m.module, TRUE, TRUE, TRUE, TRUE
FROM roles r
CROSS JOIN (VALUES
  ('proposals'), ('agreements'), ('company_documents'), ('certificates')
) AS m(module)
WHERE r.name = 'owner'
ON CONFLICT (role_id, module) DO NOTHING;

-- Add proposals module permissions for manager role
INSERT INTO permissions (role_id, module, can_view, can_create, can_edit, can_delete)
SELECT r.id, m.module, TRUE, TRUE, TRUE, FALSE
FROM roles r
CROSS JOIN (VALUES
  ('proposals'), ('agreements'), ('company_documents'), ('certificates')
) AS m(module)
WHERE r.name = 'manager'
ON CONFLICT (role_id, module) DO NOTHING;

CREATE TABLE IF NOT EXISTS journal_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id UUID REFERENCES chart_of_accounts(id),
  account_code VARCHAR(20),
  account_name VARCHAR(255),
  debit DECIMAL(15,2) DEFAULT 0,
  credit DECIMAL(15,2) DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_tenant ON chart_of_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_tenant ON journal_entries(tenant_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_lines_tenant ON journal_lines(tenant_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_entry ON journal_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON journal_lines(account_id);

-- Add accounting permissions for existing roles
INSERT INTO permissions (role_id, module, can_view, can_create, can_edit, can_delete)
SELECT r.id, m.module, TRUE, TRUE, TRUE, TRUE
FROM roles r
CROSS JOIN (VALUES ('accounting')) AS m(module)
WHERE r.name = 'admin'
ON CONFLICT (role_id, module) DO NOTHING;

INSERT INTO permissions (role_id, module, can_view, can_create, can_edit, can_delete)
SELECT r.id, m.module, TRUE, TRUE, TRUE, TRUE
FROM roles r
CROSS JOIN (VALUES ('accounting')) AS m(module)
WHERE r.name = 'owner'
ON CONFLICT (role_id, module) DO NOTHING;

INSERT INTO permissions (role_id, module, can_view, can_create, can_edit, can_delete)
SELECT r.id, m.module, TRUE, TRUE, TRUE, FALSE
FROM roles r
CROSS JOIN (VALUES ('accounting')) AS m(module)
WHERE r.name = 'accountant'
ON CONFLICT (role_id, module) DO NOTHING;

INSERT INTO permissions (role_id, module, can_view, can_create, can_edit, can_delete)
SELECT r.id, m.module, TRUE, FALSE, FALSE, FALSE
FROM roles r
CROSS JOIN (VALUES ('accounting')) AS m(module)
WHERE r.name = 'manager'
ON CONFLICT (role_id, module) DO NOTHING;

-- Add accounting permissions for user role
INSERT INTO permissions (role_id, module, can_view, can_create, can_edit, can_delete)
SELECT r.id, m.module, TRUE, FALSE, FALSE, FALSE
FROM roles r
CROSS JOIN (VALUES ('accounting')) AS m(module)
WHERE r.name = 'user'
ON CONFLICT (role_id, module) DO NOTHING;

-- Link existing employees to users when the email matches
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'employees'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'users'
  ) THEN
    EXECUTE 'ALTER TABLE employees ADD COLUMN IF NOT EXISTS user_id UUID';
    BEGIN
      EXECUTE 'ALTER TABLE employees ADD CONSTRAINT employees_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_user ON employees(user_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_employees_tenant ON employees(tenant_id)';
    EXECUTE 'UPDATE employees e
             SET user_id = u.id
             FROM users u
             WHERE e.user_id IS NULL
               AND e.tenant_id = u.tenant_id
               AND e.email IS NOT NULL
               AND u.email IS NOT NULL
               AND LOWER(e.email) = LOWER(u.email)';
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Upgrade existing tenant creators from admin to owner
-- Users whose email matches their tenant's owner_email should be owner
-- Uses case-insensitive match to handle any legacy casing inconsistencies
UPDATE users u
SET role = 'owner', updated_at = NOW()
FROM tenants t
WHERE u.tenant_id = t.id
  AND LOWER(u.email) = LOWER(t.owner_email)
  AND u.role = 'admin';

-- ============ POS & SALES MODULE ============

CREATE TABLE IF NOT EXISTS pos_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  session_number VARCHAR(100),
  opened_by VARCHAR(255),
  opened_by_id UUID,
  opened_at TIMESTAMP DEFAULT NOW(),
  closed_at TIMESTAMP,
  opening_balance DECIMAL(15,2) DEFAULT 0,
  closing_balance DECIMAL(15,2) DEFAULT 0,
  total_sales DECIMAL(15,2) DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  cash_in DECIMAL(15,2) DEFAULT 0,
  cash_out DECIMAL(15,2) DEFAULT 0,
  cash_movements JSONB DEFAULT '[]',
  status VARCHAR(50) DEFAULT 'open',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pos_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  session_id UUID,
  order_number VARCHAR(100),
  items JSONB DEFAULT '[]',
  subtotal DECIMAL(15,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) DEFAULT 0,
  payments JSONB DEFAULT '[]',
  payment_status VARCHAR(50) DEFAULT 'pending',
  change_amount DECIMAL(15,2) DEFAULT 0,
  customer_name VARCHAR(255),
  customer_phone VARCHAR(100),
  notes TEXT,
  status VARCHAR(50) DEFAULT 'completed',
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pos_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  payment_methods JSONB DEFAULT '["cash", "card", "bank_transfer"]',
  pos_categories JSONB DEFAULT '[]',
  printer_config JSONB DEFAULT '{}',
  receipt_header TEXT,
  receipt_footer TEXT,
  auto_print_receipt BOOLEAN DEFAULT false,
  tax_inclusive BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  order_number VARCHAR(100),
  client_id UUID,
  client_name VARCHAR(255),
  client_email VARCHAR(255),
  client_phone VARCHAR(100),
  client_address VARCHAR(500),
  items JSONB DEFAULT '[]',
  subtotal DECIMAL(15,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'draft',
  payment_method VARCHAR(100),
  notes TEXT,
  invoice_id UUID,
  invoice_number VARCHAR(100),
  expected_delivery DATE,
  shipping_address VARCHAR(500),
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add POS permissions for admin role
INSERT INTO permissions (role_id, module, can_view, can_create, can_edit, can_delete)
SELECT r.id, 'pos', TRUE, TRUE, TRUE, TRUE
FROM roles r WHERE r.name = 'admin'
ON CONFLICT (role_id, module) DO NOTHING;

-- Add POS permissions for owner role
INSERT INTO permissions (role_id, module, can_view, can_create, can_edit, can_delete)
SELECT r.id, 'pos', TRUE, TRUE, TRUE, TRUE
FROM roles r WHERE r.name = 'owner'
ON CONFLICT (role_id, module) DO NOTHING;

-- Add POS permissions for manager role
INSERT INTO permissions (role_id, module, can_view, can_create, can_edit, can_delete)
SELECT r.id, 'pos', TRUE, TRUE, TRUE, FALSE
FROM roles r WHERE r.name = 'manager'
ON CONFLICT (role_id, module) DO NOTHING;

-- Add personal database columns to tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS database_url TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS supabase_project_id VARCHAR(100);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS database_status VARCHAR(50) DEFAULT 'none';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS database_provisioned_at TIMESTAMP;

-- Shared index for public proposal token lookups (proposals live in personal DB after migration)
CREATE TABLE IF NOT EXISTS proposal_token_index (
  token VARCHAR(255) PRIMARY KEY,
  tenant_id UUID NOT NULL,
  proposal_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Populate index from existing shared-pool proposals
INSERT INTO proposal_token_index (token, tenant_id, proposal_id)
SELECT token, tenant_id, id FROM proposals WHERE token IS NOT NULL
ON CONFLICT (token) DO NOTHING;
`;

async function runMigration() {
  try {
    await pool.query(schema);
    await pool.query(migration);
    console.log('Migration completed successfully');
  } catch (err) {
    console.error('Migration error:', err.message);
    throw err;
  }
}

export default runMigration;
