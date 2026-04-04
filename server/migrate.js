import pool from './db.js';

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
`;

async function runMigration() {
  try {
    await pool.query(migration);
    console.log('Migration completed successfully');
  } catch (err) {
    console.error('Migration error:', err.message);
    throw err;
  }
}

export default runMigration;
