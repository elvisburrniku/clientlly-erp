# ERP Finance – Albanian Business Management System

## Overview

A comprehensive ERP (Enterprise Resource Planning) application for Albanian-speaking businesses, featuring invoicing, quotes, expenses, cash management, inventory, and reporting. The UI is in Albanian.

## Architecture

**Full-stack JavaScript application:**
- **Frontend:** React 18 + Vite (port 5000 in dev), React Router v6, shadcn/ui + Tailwind CSS, Recharts, jsPDF
- **Backend:** Express.js (port 3001 in dev), PostgreSQL (Replit built-in database)
- **Auth:** Session-based (express-session + connect-pg-simple), bcrypt password hashing
- **ORM:** Raw SQL via `pg` (node-postgres)

## Key Files

| Path | Purpose |
|------|---------|
| `server/index.js` | Express API server (auth + entity CRUD + function stubs) |
| `server/entityRouter.js` | Generic entity CRUD router used by all 23 entities |
| `server/db.js` | PostgreSQL pool connection |
| `server/schema.sql` | Database schema (all tables) |
| `src/api/base44Client.js` | Frontend API client replacing Base44 SDK |
| `src/lib/AuthContext.jsx` | React auth context |
| `src/lib/TenantContext.jsx` | Multi-tenant context |
| `src/pages/Login.jsx` | Login/register page |
| `src/App.jsx` | Root router |

## Entities (23 total)

Tenant, Client, Supplier, Product, Unit, ServiceCategory, Invoice, InvoiceSettings, InvoiceTemplate, Quote, QuoteTemplate, Expense, ExpenseCategory, CategoryBudget, Payment, CashTransaction, CashboxSettings, CashHandover, Transfer, Inventory, Reminder, ReportTemplate, User

## Scripts

```bash
npm run dev    # Run both Express API (port 3001) and Vite (port 5000) concurrently
npm run build  # Build frontend for production
npm start      # Run Express server only (serves built frontend)
```

## Deployment

- **Build:** `npm run build` (Vite outputs to `dist/`)
- **Run:** `node server/index.js` (serves `dist/` as static + API on port 5000)
- Production server uses `PORT` env var (default 5000 in production)

## Important Conventions

- **Field aliasing:** Frontend uses `created_date`/`updated_date` (from Base44), DB uses `created_at`/`updated_at`. The `addVirtualFields()` function in `server/entityRouter.js` handles this by adding virtual fields to all API responses.
- **User security:** The User entity router excludes `password_hash` from all query results using a specific column list.
- **Multi-tenant:** All entities are scoped by `tenant_id`. Frontend filters data by `user.tenant_id`.

## Migration Notes

- Migrated from Base44 platform to Replit (April 2026)
- All Base44 SDK calls replaced with `src/api/base44Client.js` which calls local Express API
- Authentication replaced with local session-based auth (register/login/logout)
- Email/file upload integrations are stubbed — need external service (e.g., SendGrid, Cloudinary) to enable

## Features

- **Invoices:** Create, edit, PDF export (jsPDF), status tracking, payments
- **Quotes:** Create quotes, approve/convert to invoice
- **Expenses:** Track expenses with PDF attachments
- **Cash Management:** Cashbox balance, cash handovers, transactions
- **Clients/Suppliers:** Full CRUD, balance tracking
- **Inventory:** Stock management
- **Reports:** Financial summaries, charts (Recharts)
- **Settings:** Tenant configuration, invoice templates
- **Super Admin:** Multi-tenant management
