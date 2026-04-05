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

-- ============ CRM & COMMUNICATION MODULE ============

-- Leads
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(100),
  company VARCHAR(255),
  stage VARCHAR(50) DEFAULT 'new',
  source VARCHAR(100),
  label VARCHAR(100),
  value DECIMAL(15,2) DEFAULT 0,
  notes TEXT,
  assigned_to VARCHAR(255),
  converted_client_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Notes (polymorphic)
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  entity_type VARCHAR(100),
  entity_id UUID,
  title VARCHAR(255),
  content TEXT,
  color VARCHAR(50) DEFAULT 'default',
  is_pinned BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Announcements
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  is_pinned BOOLEAN DEFAULT false,
  priority VARCHAR(50) DEFAULT 'normal',
  read_by JSONB DEFAULT '[]',
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Portal Tokens
CREATE TABLE IF NOT EXISTS portal_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============ HR MODULE ============

-- Departments
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  manager_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Job Positions
CREATE TABLE IF NOT EXISTS job_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  title VARCHAR(255) NOT NULL,
  department_id UUID,
  department_name VARCHAR(255),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Employees
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(100),
  address VARCHAR(500),
  city VARCHAR(100),
  date_of_birth DATE,
  gender VARCHAR(20),
  id_number VARCHAR(100),
  department_id UUID,
  department_name VARCHAR(255),
  position_id UUID,
  position_title VARCHAR(255),
  hire_date DATE,
  contract_type VARCHAR(50) DEFAULT 'full_time',
  contract_end_date DATE,
  base_salary DECIMAL(15,2) DEFAULT 0,
  bank_account VARCHAR(255),
  emergency_contact VARCHAR(255),
  emergency_phone VARCHAR(100),
  notes TEXT,
  status VARCHAR(50) DEFAULT 'active',
  avatar_url TEXT,
  documents JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Attendance
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  employee_id UUID,
  employee_name VARCHAR(255),
  attendance_date DATE NOT NULL,
  check_in TIME,
  check_out TIME,
  hours_worked DECIMAL(5,2),
  status VARCHAR(50) DEFAULT 'present',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Shifts
CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  name VARCHAR(255) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  color VARCHAR(50) DEFAULT '#3b82f6',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Schedules
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  employee_id UUID,
  employee_name VARCHAR(255),
  shift_id UUID,
  shift_name VARCHAR(255),
  schedule_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Leave Types
CREATE TABLE IF NOT EXISTS leave_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  name VARCHAR(255) NOT NULL,
  days_allowed INTEGER DEFAULT 20,
  color VARCHAR(50) DEFAULT '#3b82f6',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Leave Balances
CREATE TABLE IF NOT EXISTS leave_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  employee_id UUID,
  employee_name VARCHAR(255),
  leave_type_id UUID,
  leave_type_name VARCHAR(255),
  year INTEGER,
  total_days INTEGER DEFAULT 0,
  used_days INTEGER DEFAULT 0,
  remaining_days INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Leave Requests
CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  employee_id UUID,
  employee_name VARCHAR(255),
  leave_type_id UUID,
  leave_type_name VARCHAR(255),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_count INTEGER DEFAULT 1,
  reason TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  approved_by VARCHAR(255),
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Payroll
CREATE TABLE IF NOT EXISTS payroll (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  employee_id UUID,
  employee_name VARCHAR(255),
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  base_salary DECIMAL(15,2) DEFAULT 0,
  additions DECIMAL(15,2) DEFAULT 0,
  deductions DECIMAL(15,2) DEFAULT 0,
  net_pay DECIMAL(15,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'draft',
  paid_at TIMESTAMP,
  notes TEXT,
  items JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Employee Advances
CREATE TABLE IF NOT EXISTS employee_advances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  employee_id UUID,
  employee_name VARCHAR(255),
  amount DECIMAL(15,2) DEFAULT 0,
  amount_repaid DECIMAL(15,2) DEFAULT 0,
  advance_date DATE,
  reason TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  repayment_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Holidays
CREATE TABLE IF NOT EXISTS holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  name VARCHAR(255) NOT NULL,
  holiday_date DATE NOT NULL,
  holiday_type VARCHAR(50) DEFAULT 'public',
  recurring BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============ PROJECT MANAGEMENT MODULE ============

-- Project Stages
CREATE TABLE IF NOT EXISTS project_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  name VARCHAR(255) NOT NULL,
  color VARCHAR(50) DEFAULT '#6366f1',
  sort_order INTEGER DEFAULT 0,
  stage_type VARCHAR(50) DEFAULT 'task',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Project Labels
CREATE TABLE IF NOT EXISTS project_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  name VARCHAR(255) NOT NULL,
  color VARCHAR(50) DEFAULT '#6366f1',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  client_id UUID,
  client_name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'planning',
  priority VARCHAR(50) DEFAULT 'medium',
  start_date DATE,
  end_date DATE,
  labels JSONB DEFAULT '[]',
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============ BILLING MODULE ============

-- Credit Notes
CREATE TABLE IF NOT EXISTS credit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  credit_note_number VARCHAR(100),
  invoice_id UUID,
  invoice_number VARCHAR(100),
  client_name VARCHAR(255),
  client_email VARCHAR(255),
  client_phone VARCHAR(100),
  client_nipt VARCHAR(100),
  client_address VARCHAR(500),
  reason TEXT,
  items JSONB DEFAULT '[]',
  subtotal DECIMAL(15,2) DEFAULT 0,
  vat_amount DECIMAL(15,2) DEFAULT 0,
  amount DECIMAL(15,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'draft',
  issued_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Project Members
CREATE TABLE IF NOT EXISTS project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  project_id UUID,
  user_id UUID,
  user_name VARCHAR(255),
  user_email VARCHAR(255),
  role VARCHAR(50) DEFAULT 'member',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Debit Notes
CREATE TABLE IF NOT EXISTS debit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  debit_note_number VARCHAR(100),
  bill_id UUID,
  bill_number VARCHAR(100),
  supplier_name VARCHAR(255),
  supplier_email VARCHAR(255),
  supplier_phone VARCHAR(100),
  reason TEXT,
  items JSONB DEFAULT '[]',
  subtotal DECIMAL(15,2) DEFAULT 0,
  vat_amount DECIMAL(15,2) DEFAULT 0,
  amount DECIMAL(15,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'draft',
  issued_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Milestones
CREATE TABLE IF NOT EXISTS milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  project_id UUID,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  due_date DATE,
  status VARCHAR(50) DEFAULT 'pending',
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  project_id UUID,
  milestone_id UUID,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  stage VARCHAR(100) DEFAULT 'to_do',
  assignee_id UUID,
  assignee_name VARCHAR(255),
  priority VARCHAR(50) DEFAULT 'medium',
  due_date DATE,
  labels JSONB DEFAULT '[]',
  checklist JSONB DEFAULT '[]',
  sort_order INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Vendor Bills
CREATE TABLE IF NOT EXISTS bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  bill_number VARCHAR(100),
  supplier_name VARCHAR(255),
  supplier_email VARCHAR(255),
  supplier_phone VARCHAR(100),
  supplier_nipt VARCHAR(100),
  supplier_address VARCHAR(500),
  items JSONB DEFAULT '[]',
  subtotal DECIMAL(15,2) DEFAULT 0,
  vat_amount DECIMAL(15,2) DEFAULT 0,
  amount DECIMAL(15,2) DEFAULT 0,
  paid_amount DECIMAL(15,2) DEFAULT 0,
  payment_method VARCHAR(100),
  payment_records JSONB DEFAULT '[]',
  due_date DATE,
  description TEXT,
  status VARCHAR(50) DEFAULT 'draft',
  is_open BOOLEAN DEFAULT true,
  issued_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Task Comments
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  task_id UUID,
  user_id UUID,
  user_name VARCHAR(255),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Timesheets
CREATE TABLE IF NOT EXISTS timesheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  project_id UUID,
  project_name VARCHAR(255),
  task_id UUID,
  task_title VARCHAR(255),
  user_id UUID,
  user_name VARCHAR(255),
  date DATE,
  hours DECIMAL(5,2) DEFAULT 0,
  description TEXT,
  billable BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Expense Requests
CREATE TABLE IF NOT EXISTS expense_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  title VARCHAR(255),
  description TEXT,
  amount DECIMAL(15,2) DEFAULT 0,
  category VARCHAR(255),
  requested_by VARCHAR(255),
  approved_by VARCHAR(255),
  status VARCHAR(50) DEFAULT 'submitted',
  rejection_reason TEXT,
  expense_date DATE,
  receipt_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============ PROPOSALS, AGREEMENTS & DOCUMENTS MODULE ============

-- Proposals
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

-- Agreements
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

-- Agreement Annexes
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

-- Company Documents
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

-- Certificates
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

-- Bugs
CREATE TABLE IF NOT EXISTS bugs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  project_id UUID,
  project_name VARCHAR(255),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  severity VARCHAR(50) DEFAULT 'medium',
  priority VARCHAR(50) DEFAULT 'medium',
  status VARCHAR(50) DEFAULT 'open',
  assignee_id UUID,
  assignee_name VARCHAR(255),
  reported_by UUID,
  reported_by_name VARCHAR(255),
  due_date DATE,
  labels JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Revenue Entries
CREATE TABLE IF NOT EXISTS revenues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  title VARCHAR(255),
  description TEXT,
  amount DECIMAL(15,2) DEFAULT 0,
  category VARCHAR(255),
  source VARCHAR(255),
  revenue_date DATE,
  payment_method VARCHAR(100),
  reference VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============ SERVICE & FLEET MODULE ============

-- Service Appointments
CREATE TABLE IF NOT EXISTS service_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  client_id UUID,
  client_name VARCHAR(255),
  assigned_to VARCHAR(255),
  assigned_user_id UUID,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  status VARCHAR(50) DEFAULT 'scheduled',
  priority VARCHAR(50) DEFAULT 'medium',
  service_type VARCHAR(255),
  location VARCHAR(500),
  notes TEXT,
  color VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Asset Types
CREATE TABLE IF NOT EXISTS asset_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  depreciation_rate DECIMAL(5,2) DEFAULT 0,
  depreciation_method VARCHAR(50) DEFAULT 'straight_line',
  useful_life_years INTEGER DEFAULT 5,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Assets
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  name VARCHAR(255) NOT NULL,
  asset_type_id UUID,
  asset_type_name VARCHAR(255),
  serial_number VARCHAR(255),
  purchase_date DATE,
  purchase_price DECIMAL(15,2) DEFAULT 0,
  current_value DECIMAL(15,2) DEFAULT 0,
  depreciation_rate DECIMAL(5,2) DEFAULT 0,
  location VARCHAR(500),
  status VARCHAR(50) DEFAULT 'active',
  assigned_to VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Vehicles
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  make VARCHAR(255),
  model VARCHAR(255),
  year INTEGER,
  plate_number VARCHAR(100),
  vin VARCHAR(100),
  color VARCHAR(100),
  fuel_type VARCHAR(50) DEFAULT 'diesel',
  odometer DECIMAL(15,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'available',
  purchase_date DATE,
  purchase_price DECIMAL(15,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Vehicle Insurance
CREATE TABLE IF NOT EXISTS vehicle_insurance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  vehicle_id UUID,
  policy_number VARCHAR(255),
  provider VARCHAR(255),
  coverage_type VARCHAR(100),
  start_date DATE,
  end_date DATE,
  premium DECIMAL(15,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Vehicle Registration
CREATE TABLE IF NOT EXISTS vehicle_registration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  vehicle_id UUID,
  registration_number VARCHAR(255),
  issue_date DATE,
  expiry_date DATE,
  issuing_authority VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Drivers
CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(100),
  license_number VARCHAR(255),
  license_type VARCHAR(100),
  license_expiry DATE,
  status VARCHAR(50) DEFAULT 'active',
  assigned_vehicle_id UUID,
  assigned_vehicle_plate VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Vehicle Reservations
CREATE TABLE IF NOT EXISTS vehicle_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  vehicle_id UUID,
  vehicle_plate VARCHAR(100),
  driver_id UUID,
  driver_name VARCHAR(255),
  purpose TEXT,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  pickup_odometer DECIMAL(15,2),
  return_odometer DECIMAL(15,2),
  status VARCHAR(50) DEFAULT 'reserved',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Vehicle Maintenance
CREATE TABLE IF NOT EXISTS vehicle_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  vehicle_id UUID,
  vehicle_plate VARCHAR(100),
  maintenance_type VARCHAR(255),
  description TEXT,
  service_date DATE,
  next_service_date DATE,
  odometer_at_service DECIMAL(15,2),
  cost DECIMAL(15,2) DEFAULT 0,
  provider VARCHAR(255),
  status VARCHAR(50) DEFAULT 'completed',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Fuel Logs
CREATE TABLE IF NOT EXISTS fuel_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  vehicle_id UUID,
  vehicle_plate VARCHAR(100),
  driver_id UUID,
  driver_name VARCHAR(255),
  fuel_date DATE,
  fuel_type VARCHAR(50),
  liters DECIMAL(10,2) DEFAULT 0,
  price_per_liter DECIMAL(10,2) DEFAULT 0,
  total_cost DECIMAL(15,2) DEFAULT 0,
  odometer DECIMAL(15,2) DEFAULT 0,
  station VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============ POS & SALES MODULE ============

-- POS Sessions
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

-- POS Orders
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

-- POS Configuration
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

-- Sales Orders
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

-- Custom Fields
CREATE TABLE IF NOT EXISTS custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  entity_type VARCHAR(100) NOT NULL,
  field_name VARCHAR(255) NOT NULL,
  field_label VARCHAR(255),
  field_type VARCHAR(50) DEFAULT 'text',
  options JSONB DEFAULT '[]',
  is_required BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============ WAREHOUSE MODULE ============

-- Warehouses
CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  address VARCHAR(500),
  city VARCHAR(100),
  phone VARCHAR(100),
  manager_name VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============ ACCOUNTING MODULE ============

-- Chart of Accounts
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

-- Warehouse Locations (zones/bins)
CREATE TABLE IF NOT EXISTS warehouse_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
  warehouse_name VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  zone VARCHAR(100),
  aisle VARCHAR(50),
  rack VARCHAR(50),
  shelf VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Stock Movements
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  product_id UUID,
  product_name VARCHAR(255),
  warehouse_id UUID,
  warehouse_name VARCHAR(255),
  location_id UUID,
  type VARCHAR(50) NOT NULL,
  quantity DECIMAL(15,2) DEFAULT 0,
  unit_cost DECIMAL(15,2) DEFAULT 0,
  reference_type VARCHAR(100),
  reference_id UUID,
  reference_number VARCHAR(100),
  notes TEXT,
  created_by UUID,
  created_by_name VARCHAR(255),
  movement_date TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Journal Entries
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

-- Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  po_number VARCHAR(100),
  supplier_id UUID,
  supplier_name VARCHAR(255),
  warehouse_id UUID,
  warehouse_name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'draft',
  order_date DATE,
  expected_date DATE,
  received_date DATE,
  items JSONB DEFAULT '[]',
  subtotal DECIMAL(15,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) DEFAULT 0,
  notes TEXT,
  approved_by UUID,
  approved_by_name VARCHAR(255),
  approved_date TIMESTAMP,
  created_by UUID,
  created_by_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Stock Transfers
CREATE TABLE IF NOT EXISTS stock_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  transfer_number VARCHAR(100),
  from_warehouse_id UUID,
  from_warehouse_name VARCHAR(255),
  to_warehouse_id UUID,
  to_warehouse_name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'draft',
  items JSONB DEFAULT '[]',
  notes TEXT,
  transfer_date DATE,
  approved_by UUID,
  approved_by_name VARCHAR(255),
  approved_date TIMESTAMP,
  created_by UUID,
  created_by_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add reorder & barcode columns to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS reorder_point DECIMAL(15,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS reorder_qty DECIMAL(15,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price DECIMAL(15,2) DEFAULT 0;

-- Add warehouse_id to inventory
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS warehouse_id UUID;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS warehouse_name VARCHAR(255);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS min_quantity DECIMAL(15,2) DEFAULT 0;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS last_restocked DATE;

-- Journal Lines
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

-- Accounting Indexes
CREATE INDEX IF NOT EXISTS idx_coa_tenant ON chart_of_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_coa_code ON chart_of_accounts(code);
CREATE INDEX IF NOT EXISTS idx_journal_tenant ON journal_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_journal_date ON journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_lines_entry ON journal_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON journal_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_tenant ON journal_lines(tenant_id);

-- Account Groups (hierarchical grouping by code prefix ranges)
CREATE TABLE IF NOT EXISTS account_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  name VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),
  code_prefix_start VARCHAR(20) NOT NULL,
  code_prefix_end VARCHAR(20) NOT NULL,
  parent_id UUID REFERENCES account_groups(id),
  account_type VARCHAR(50),
  sequence INTEGER DEFAULT 10,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Journals (Sales, Purchase, Bank, Cash, Misc)
CREATE TABLE IF NOT EXISTS journals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  name VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),
  type VARCHAR(50) NOT NULL DEFAULT 'general',
  sequence_prefix VARCHAR(20) NOT NULL DEFAULT 'JE',
  default_account_id UUID REFERENCES chart_of_accounts(id),
  is_active BOOLEAN DEFAULT true,
  sequence INTEGER DEFAULT 10,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enhanced chart_of_accounts columns
ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS reconcile BOOLEAN DEFAULT false;
ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS account_subtype VARCHAR(50) DEFAULT 'other';
ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS account_group_id UUID REFERENCES account_groups(id);

-- Add journal_id to journal_entries
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS journal_id UUID REFERENCES journals(id);

-- Indexes for new tables
CREATE INDEX IF NOT EXISTS idx_account_groups_tenant ON account_groups(tenant_id);
CREATE INDEX IF NOT EXISTS idx_journals_tenant ON journals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_coa_group ON chart_of_accounts(account_group_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_journal ON journal_entries(journal_id);

-- Unique constraint: account codes are unique per tenant (prevents duplicate codes even under concurrent writes)
CREATE UNIQUE INDEX IF NOT EXISTS idx_coa_tenant_code ON chart_of_accounts(tenant_id, code) WHERE is_active = true;

-- Tax Rates (TVSh)
CREATE TABLE IF NOT EXISTS tax_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  name VARCHAR(255) NOT NULL,
  rate DECIMAL(5,2) NOT NULL,
  is_inclusive BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
