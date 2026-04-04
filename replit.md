# ERP Finance – Albanian Business Management System

## Overview

A comprehensive ERP (Enterprise Resource Planning) application for Albanian-speaking businesses, featuring invoicing, quotes, expenses, cash management, inventory, and reporting. The UI supports Albanian and English.

## Architecture

**Full-stack JavaScript application:**
- **Frontend:** React 18 + Vite (port 5000 in dev), React Router v6, shadcn/ui + Tailwind CSS, Recharts, jsPDF
- **Backend:** Express.js (port 3001 in dev), PostgreSQL (Replit built-in database)
- **Auth:** Session-based (express-session + connect-pg-simple), bcrypt password hashing
- **ORM:** Raw SQL via `pg` (node-postgres)

## Key Files

| Path | Purpose |
|------|---------|
| `server/index.js` | Express API server (auth, entity CRUD, uploads, notifications, search, permissions, activity logs) |
| `server/entityRouter.js` | Generic entity CRUD router with activity logging |
| `server/db.js` | PostgreSQL pool connection |
| `server/migrate.js` | Auto-migration for roles, permissions, notifications, activity_logs, uploaded_files tables |
| `server/permissions.js` | Role-based permission middleware and API |
| `server/activityLog.js` | Activity/audit logging helper and API |
| `src/api/base44Client.js` | Frontend API client |
| `src/lib/AuthContext.jsx` | React auth context |
| `src/lib/TenantContext.jsx` | Multi-tenant context |
| `src/lib/usePermissions.jsx` | Permissions context and hooks (canView, canCreate, canEdit, canDelete) |
| `src/lib/useLanguage.jsx` | Language provider with server-side persistence |
| `src/components/layout/NotificationBell.jsx` | Notification bell with unread count and popover |
| `src/components/layout/GlobalSearch.jsx` | Global search bar with results dropdown |
| `src/pages/ActivityLog.jsx` | Admin activity log viewer with filters |
| `src/pages/RoleManagement.jsx` | Admin role and permission management UI |
| `src/pages/Login.jsx` | Login/register page |
| `src/App.jsx` | Root router |

## Entities (45 total)

Tenant, Client, Supplier, Product, Unit, ServiceCategory, Invoice, InvoiceSettings, InvoiceTemplate, Quote, QuoteTemplate, Expense, ExpenseCategory, CategoryBudget, Payment, CashTransaction, CashboxSettings, CashHandover, Transfer, Inventory, Reminder, ReportTemplate, User, Department, JobPosition, Employee, Attendance, Shift, Schedule, LeaveType, LeaveBalance, LeaveRequest, Payroll, EmployeeAdvance, Holiday, ProjectStage, ProjectLabel, Project, ProjectMember, Milestone, Task, TaskComment, Timesheet, Bug

## Roles & Permissions

- **4 default roles:** admin (full access), manager, accountant, user
- **Granular permissions:** per-module can_view, can_create, can_edit, can_delete
- **Middleware enforcement:** `requirePermission(entityName)` checks role permissions on API routes
- **Frontend guards:** `usePermissions()` hook provides `canView`, `canCreate`, `canEdit`, `canDelete`
- **Admin UI:** `/role-management` page for configuring role permissions

## File Uploads

- Multer-based upload to `uploads/` directory (organized by category)
- Endpoints: `POST /api/upload/:category`, `GET /api/files/:category/:filename`
- Categories: avatar, attachment, document, general
- Max file size: 10MB, supports images, PDFs, office docs

## Notifications

- In-app notification bell with unread count badge
- API: `GET /api/notifications`, `GET /api/notifications/unread-count`, `PATCH /api/notifications/:id/read`, `PATCH /api/notifications/mark-all-read`
- Polling every 30 seconds for new notifications

## Activity/Audit Log

- Auto-logs all entity CRUD operations (create, update, delete)
- Records user, action, entity type/name, timestamp, IP address
- Admin page at `/activity-log` with entity type and action filters
- API: `GET /api/activity-logs` (admin only)

## Global Search

- Single endpoint `GET /api/search?q=term` searches across clients, invoices, products, suppliers, expenses
- Frontend search bar in header with keyboard navigation and results dropdown
- Routes to entity detail pages on selection

## Localization

- Language switcher persists preference to user profile (server-side) and localStorage
- Translations for Albanian (sq), English (en), Spanish (es), German (de), Macedonian (mk)
- Fallback chain: selected language → English → key name

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
- Database migration runs automatically on server start

## Important Conventions

- **Field aliasing:** Frontend uses `created_date`/`updated_date` (from Base44), DB uses `created_at`/`updated_at`. The `addVirtualFields()` function handles this.
- **User security:** The User entity router excludes `password_hash` from all query results.
- **Multi-tenant:** All entities are scoped by `tenant_id`. Frontend filters data by `user.tenant_id`.
- **Users table uses UUID** for the `id` column (not integer).

## Features

- **Invoices:** Create, edit, PDF export (jsPDF), status tracking, payments
- **Quotes:** Create quotes, approve/convert to invoice
- **Expenses:** Track expenses with PDF attachments
- **Cash Management:** Cashbox balance, cash handovers, transactions
- **Clients/Suppliers:** Full CRUD, balance tracking
- **Inventory:** Stock management
- **Reports:** Financial summaries, charts (Recharts)
- **Settings:** Tenant configuration, invoice templates
- **HR Module:** Employee profiles, departments, job positions, attendance tracking, shift scheduling, leave management with approval workflow, payroll processing with PDF/CSV export, employee advances with repayment tracking, holiday calendar
- **Projects:** Project management with client linking, status workflow, team members
- **Task Board:** Kanban-style task board with drag-and-drop, task detail with checklists/comments
- **Milestones:** Project milestones with due dates and completion tracking
- **Timesheets:** Time tracking against projects/tasks, weekly view, CSV export
- **Bug Tracking:** Bug reporting with severity levels, Kanban and list views, CSV export
- **Super Admin:** Multi-tenant management
- **Role Management:** Admin page to configure role permissions
- **Activity Log:** Admin page to view/filter system activity
- **Notifications:** In-app notification bell with unread count
- **Global Search:** Header search bar across all entities
- **File Upload:** Upload avatars, attachments, documents
