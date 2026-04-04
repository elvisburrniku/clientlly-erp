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

## Entities (80 total)

Tenant, Client, Supplier, Product, Unit, ServiceCategory, Invoice, InvoiceSettings, InvoiceTemplate, Quote, QuoteTemplate, Expense, ExpenseCategory, CategoryBudget, Payment, CashTransaction, CashboxSettings, CashHandover, Transfer, Inventory, Reminder, ReportTemplate, User, Lead, Note, Announcement, PortalToken, Department, JobPosition, Employee, Attendance, Shift, Schedule, LeaveType, LeaveBalance, LeaveRequest, Payroll, EmployeeAdvance, Holiday, Warehouse, WarehouseLocation, StockMovement, PurchaseOrder, StockTransfer, ProjectStage, ProjectLabel, Project, ProjectMember, Milestone, Task, TaskComment, Timesheet, Bug, CreditNote, DebitNote, Bill, ExpenseRequest, Revenue, ServiceAppointment, AssetType, Asset, Vehicle, VehicleInsurance, VehicleRegistration, Driver, VehicleReservation, VehicleMaintenance, FuelLog, CustomField

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

- **Invoices:** Create, edit, PDF export (jsPDF), status tracking (draft/sent/partially_paid/paid/overdue/cancelled), payments, duplicate, proforma conversion, overdue auto-detection
- **Credit Notes:** Issue credit notes against invoices with auto-balance adjustment, PDF generation
- **Debit Notes:** Issue debit notes against vendor bills, PDF generation
- **Vendor Bills:** Full CRUD, payment recording with partial payment support, status workflow, PDF generation
- **Expense Requests:** Submit/approve/reject workflow with approval tracking
- **Revenues:** Non-invoice income tracking with Excel/PDF export
- **Quotes:** Create quotes, approve/convert to invoice
- **Expenses:** Track expenses with PDF attachments
- **Cash Management:** Cashbox balance, cash handovers, transactions
- **Clients/Suppliers:** Full CRUD, balance tracking, merge duplicates, Excel/PDF export
- **CRM Leads:** Sales pipeline with Kanban board, lead stages (new/contacted/qualified/proposal/won/lost), convert-to-client
- **Notes:** Polymorphic note system with pin/unpin, color coding, linked to any entity
- **Announcements:** Company-wide announcements with read/unread tracking, pinned messages, priority levels
- **Customer Portal:** Token-based public portal for clients to view invoices and payment history
- **Vendor Portal:** Token-based public portal for suppliers to view bills and payments
- **Inventory:** Stock management with warehouse filtering
- **Warehouses:** Multiple warehouses with locations/zones, CRUD management
- **Stock Movements:** Track in/out/adjustment/transfer movements per product
- **Purchase Orders:** Full PO workflow (draft → submitted → approved → ordered → received → closed), PDF export
- **Stock Transfers:** Move stock between warehouses with approval workflow
- **Stock Alerts:** Low stock alerts with configurable reorder points per product
- **Stock Valuation:** Dashboard showing total value by warehouse and category
- **Procurement Analytics:** Supplier performance, stock aging, ABC analysis
- **Reports:** Financial summaries, charts (Recharts)
- **Service Calendar:** Appointment scheduling with monthly/weekly/daily views, status tracking, team assignment
- **Assets:** Asset tracking with types, depreciation, value summaries
- **Fleet Management:** Vehicle CRUD, insurance/registration tracking with expiry alerts
- **Drivers & Reservations:** Driver management, license tracking, vehicle reservation with pickup/return workflow
- **Vehicle Maintenance:** Maintenance logging, scheduling, cost tracking per vehicle
- **Fuel Logs:** Fuel consumption tracking with cost analytics per vehicle
- **Fleet Reports:** Dashboard with costs by vehicle, fuel trends, usage stats, document expiry alerts
- **Custom Fields:** Tenant-scoped custom field definitions for any entity type
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

## Public Portal Routes (No Auth Required)

- `/portal/client/:token` - Customer self-service portal
- `/portal/vendor/:token` - Vendor self-service portal
- Portal tokens generated from Clients/Suppliers pages via "Gjenero Link Portal" action
- Tokens expire after 90 days

## API Endpoints (Custom, Beyond Entity CRUD)

- `POST /api/portal/generate-token` - Generate portal access token
- `GET /api/portal/client/:token` - Get client portal data (public)
- `GET /api/portal/vendor/:token` - Get vendor portal data (public)
- `POST /api/merge/clients` - Merge duplicate client records
- `POST /api/merge/suppliers` - Merge duplicate supplier records
