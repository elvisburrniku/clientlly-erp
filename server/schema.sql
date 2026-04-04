-- Users table (for authentication)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  full_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user',
  tenant_id UUID,
  tenant_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Sessions table
CREATE TABLE IF NOT EXISTS session (
  sid VARCHAR NOT NULL COLLATE "default",
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL,
  CONSTRAINT session_pkey PRIMARY KEY (sid)
);
CREATE INDEX IF NOT EXISTS idx_session_expire ON session(expire);

-- Tenants
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  nup VARCHAR(100),
  tvsh VARCHAR(100),
  address VARCHAR(500),
  city VARCHAR(100),
  phone VARCHAR(100),
  email VARCHAR(255),
  bank_account VARCHAR(255),
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Clients
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(100),
  address VARCHAR(500),
  city VARCHAR(100),
  nuis VARCHAR(100),
  tvsh VARCHAR(100),
  contact_person VARCHAR(255),
  notes TEXT,
  balance DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(100),
  address VARCHAR(500),
  city VARCHAR(100),
  nuis VARCHAR(100),
  contact_person VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(15,2) DEFAULT 0,
  unit VARCHAR(100),
  category VARCHAR(255),
  sku VARCHAR(100),
  stock_quantity DECIMAL(15,2) DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 20,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Units
CREATE TABLE IF NOT EXISTS units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  name VARCHAR(255) NOT NULL,
  abbreviation VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Service Categories
CREATE TABLE IF NOT EXISTS service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  invoice_number VARCHAR(100),
  invoice_type VARCHAR(50) DEFAULT 'standard',
  template VARCHAR(50) DEFAULT 'classic',
  company_name VARCHAR(255),
  company_nup VARCHAR(100),
  company_tvsh VARCHAR(100),
  company_city VARCHAR(100),
  company_address VARCHAR(500),
  company_phone VARCHAR(100),
  company_email VARCHAR(255),
  company_bank VARCHAR(255),
  company_logo_url TEXT,
  client_id UUID,
  client_name VARCHAR(255),
  client_address VARCHAR(500),
  client_city VARCHAR(100),
  client_nuis VARCHAR(100),
  client_email VARCHAR(255),
  client_phone VARCHAR(100),
  issue_date DATE,
  due_date DATE,
  items JSONB DEFAULT '[]',
  subtotal DECIMAL(15,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) DEFAULT 0,
  paid_amount DECIMAL(15,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'draft',
  notes TEXT,
  payment_terms TEXT,
  currency VARCHAR(10) DEFAULT 'ALL',
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Invoice Settings
CREATE TABLE IF NOT EXISTS invoice_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  next_invoice_number INTEGER DEFAULT 1,
  invoice_prefix VARCHAR(50) DEFAULT 'INV',
  default_payment_terms TEXT,
  default_notes TEXT,
  default_currency VARCHAR(10) DEFAULT 'ALL',
  default_tax_rate DECIMAL(5,2) DEFAULT 20,
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Invoice Templates
CREATE TABLE IF NOT EXISTS invoice_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  name VARCHAR(255) NOT NULL,
  template_type VARCHAR(50),
  content JSONB DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Quotes
CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  quote_number VARCHAR(100),
  client_id UUID,
  client_name VARCHAR(255),
  client_email VARCHAR(255),
  client_address VARCHAR(500),
  issue_date DATE,
  expiry_date DATE,
  items JSONB DEFAULT '[]',
  subtotal DECIMAL(15,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'draft',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Quote Templates
CREATE TABLE IF NOT EXISTS quote_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  name VARCHAR(255) NOT NULL,
  content JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  supplier_id UUID,
  supplier_name VARCHAR(255),
  category_id UUID,
  category_name VARCHAR(255),
  description TEXT,
  amount DECIMAL(15,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) DEFAULT 0,
  expense_date DATE,
  payment_method VARCHAR(100),
  pdf_url TEXT,
  receipt_pdf_url TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Expense Categories
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Category Budgets
CREATE TABLE IF NOT EXISTS category_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  category_id UUID,
  category_name VARCHAR(255),
  month INTEGER,
  year INTEGER,
  budget_amount DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  invoice_id UUID,
  invoice_number VARCHAR(100),
  client_id UUID,
  client_name VARCHAR(255),
  amount DECIMAL(15,2) DEFAULT 0,
  payment_date DATE,
  payment_method VARCHAR(100),
  reference VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Cash Transactions
CREATE TABLE IF NOT EXISTS cash_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  type VARCHAR(50),
  amount DECIMAL(15,2) DEFAULT 0,
  description TEXT,
  reference_type VARCHAR(100),
  reference_id UUID,
  transaction_date TIMESTAMP DEFAULT NOW(),
  balance_after DECIMAL(15,2),
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Cashbox Settings
CREATE TABLE IF NOT EXISTS cashbox_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  min_balance DECIMAL(15,2) DEFAULT 0,
  notification_email VARCHAR(255),
  current_balance DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Cash Handovers
CREATE TABLE IF NOT EXISTS cash_handovers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  handover_date DATE,
  from_user_id UUID,
  from_user_name VARCHAR(255),
  to_user_id UUID,
  to_user_name VARCHAR(255),
  amount DECIMAL(15,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending',
  notes TEXT,
  pdf_url TEXT,
  user_email VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Transfers
CREATE TABLE IF NOT EXISTS transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  from_account VARCHAR(255),
  to_account VARCHAR(255),
  amount DECIMAL(15,2) DEFAULT 0,
  transfer_date DATE,
  description TEXT,
  status VARCHAR(50) DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Inventory
CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  product_id UUID,
  product_name VARCHAR(255),
  quantity DECIMAL(15,2) DEFAULT 0,
  unit_cost DECIMAL(15,2) DEFAULT 0,
  total_cost DECIMAL(15,2) DEFAULT 0,
  location VARCHAR(255),
  notes TEXT,
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Reminders
CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  due_date TIMESTAMP,
  status VARCHAR(50) DEFAULT 'pending',
  priority VARCHAR(50) DEFAULT 'medium',
  related_type VARCHAR(100),
  related_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Report Templates
CREATE TABLE IF NOT EXISTS report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100),
  schedule VARCHAR(100),
  recipients JSONB DEFAULT '[]',
  filters JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
