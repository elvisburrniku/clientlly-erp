import pool from './db.js';

const entityToModule = {
  Invoice: 'invoices',
  Quote: 'quotes',
  Expense: 'expenses',
  ExpenseCategory: 'expenses',
  CategoryBudget: 'expenses',
  Product: 'products',
  Client: 'clients',
  Supplier: 'suppliers',
  CashTransaction: 'cashbox',
  CashboxSettings: 'cashbox',
  CashHandover: 'cash_handover',
  Transfer: 'transfers',
  Inventory: 'inventory',
  Reminder: 'reminders',
  Payment: 'invoices',
  InvoiceSettings: 'settings',
  InvoiceTemplate: 'settings',
  QuoteTemplate: 'quotes',
  ReportTemplate: 'report_templates',
  Unit: 'settings',
  ServiceCategory: 'settings',
  User: 'users',
  Tenant: 'settings',
};

const methodToAction = {
  GET: 'can_view',
  POST: 'can_create',
  PATCH: 'can_edit',
  PUT: 'can_edit',
  DELETE: 'can_delete',
};

let permissionsCache = {};
let cacheTime = 0;
const CACHE_TTL = 30000;

async function getPermissionsForRole(roleName) {
  const now = Date.now();
  if (permissionsCache[roleName] && now - cacheTime < CACHE_TTL) {
    return permissionsCache[roleName];
  }

  const result = await pool.query(`
    SELECT p.module, p.can_view, p.can_create, p.can_edit, p.can_delete
    FROM permissions p
    JOIN roles r ON r.id = p.role_id
    WHERE r.name = $1
  `, [roleName]);

  const perms = {};
  for (const row of result.rows) {
    perms[row.module] = {
      can_view: row.can_view,
      can_create: row.can_create,
      can_edit: row.can_edit,
      can_delete: row.can_delete,
    };
  }

  permissionsCache[roleName] = perms;
  cacheTime = now;
  return perms;
}

export function clearPermissionsCache() {
  permissionsCache = {};
  cacheTime = 0;
}

export function requirePermission(entityName) {
  return async (req, res, next) => {
    const userRole = req.session?.user?.role;
    if (!userRole) return res.status(401).json({ error: 'Authentication required' });

    if (userRole === 'admin' || userRole === 'owner' || userRole === 'superadmin') return next();

    const module = entityToModule[entityName];
    if (!module) return next();

    let action = methodToAction[req.method];
    if (!action) return next();

    const isFilterRoute = req.method === 'POST' && req.path === '/filter';
    if (isFilterRoute) {
      action = 'can_view';
    }

    try {
      const perms = await getPermissionsForRole(userRole);
      const modulePerms = perms[module];
      if (!modulePerms || !modulePerms[action]) {
        return res.status(403).json({ error: 'Permission denied' });
      }
      return next();
    } catch (err) {
      return res.status(500).json({ error: 'Permission check failed' });
    }
  };
}

export function getPermissionsApi(pool) {
  return {
    async listRoles(req, res) {
      const result = await pool.query('SELECT * FROM roles ORDER BY id');
      res.json(result.rows);
    },

    async getRolePermissions(req, res) {
      const { roleId } = req.params;
      const result = await pool.query('SELECT * FROM permissions WHERE role_id = $1 ORDER BY module', [roleId]);
      res.json(result.rows);
    },

    async updateRolePermissions(req, res) {
      const { roleId } = req.params;
      const { permissions } = req.body;
      if (!Array.isArray(permissions)) return res.status(400).json({ error: 'permissions must be an array' });

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('DELETE FROM permissions WHERE role_id = $1', [roleId]);
        for (const perm of permissions) {
          await client.query(
            'INSERT INTO permissions (role_id, module, can_view, can_create, can_edit, can_delete) VALUES ($1, $2, $3, $4, $5, $6)',
            [roleId, perm.module, !!perm.can_view, !!perm.can_create, !!perm.can_edit, !!perm.can_delete]
          );
        }
        await client.query('COMMIT');
        clearPermissionsCache();
        res.json({ success: true });
      } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
      } finally {
        client.release();
      }
    },

    async getUserPermissions(req, res) {
      const userRole = req.session?.user?.role;
      if (!userRole) return res.status(401).json({ error: 'Authentication required' });
      if (userRole === 'admin' || userRole === 'owner' || userRole === 'superadmin') {
        return res.json({ role: userRole, fullAccess: true, permissions: {} });
      }
      const perms = await getPermissionsForRole(userRole);
      res.json({ role: userRole, fullAccess: false, permissions: perms });
    },

    async getAllModules(req, res) {
      const modules = [
        'dashboard', 'invoices', 'quotes', 'expenses', 'products',
        'clients', 'suppliers', 'cashbox', 'transfers', 'debtors',
        'cash_handover', 'reports', 'royalties', 'inventory', 'settings',
        'report_templates', 'reminders', 'activity_log', 'users'
      ];
      res.json(modules);
    }
  };
}

export { entityToModule };
