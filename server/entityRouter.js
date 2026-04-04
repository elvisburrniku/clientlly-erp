import express from 'express';

const FIELD_ALIASES = {
  'created_date': 'created_at',
  'updated_date': 'updated_at',
};

function mapField(field) {
  return FIELD_ALIASES[field] || field;
}

const VALID_FIELD_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function sanitizeFieldName(field) {
  const mapped = mapField(field);
  if (!VALID_FIELD_PATTERN.test(mapped)) throw new Error(`Invalid field name: ${field}`);
  return mapped;
}

function addVirtualFields(row) {
  if (!row) return row;
  if (row.created_at) row.created_date = row.created_at;
  if (row.updated_at) row.updated_date = row.updated_at;
  return row;
}

function getEntityDisplayName(row, entityName) {
  return row.name || row.full_name || row.invoice_number || row.title || row.description || `${entityName} #${row.id}`;
}

const SENSITIVE_FIELDS_BY_TABLE = {
  users: new Set(['role', 'password_hash', 'password', 'tenant_id', 'tenant_name']),
};

export function createEntityRouter(pool, tableName, entityName, options = {}) {
  const router = express.Router();
  const { logActivity, notifyTenantAdmins, hasTenantColumn = true } = options;
  const sensitiveFields = SENSITIVE_FIELDS_BY_TABLE[tableName] || new Set();

  const selectColumns = tableName === 'users'
    ? 'id, email, full_name, role, tenant_id, tenant_name, cash_on_hand, phone, avatar_url, language, created_at, updated_at'
    : '*';
  const isSuperAdmin = (req) => req.session?.user?.role === 'superadmin';

  function getTenantId(req) {
    return req.session?.user?.tenant_id;
  }

  function shouldScopeTenant(req) {
    if (!hasTenantColumn) return false;
    if (tableName === 'users') return true;
    if (isSuperAdmin(req)) return false;
    return true;
  }

  const buildWhereClause = (filters, startIdx = 1) => {
    const conditions = [];
    const values = [];
    let idx = startIdx;

    for (const [key, value] of Object.entries(filters)) {
      if (value === null || value === undefined) continue;
      if (key === '_sort' || key === '_limit' || key === '_offset') continue;
      const dbField = sanitizeFieldName(key);
      if (typeof value === 'boolean' || value === 'true' || value === 'false') {
        conditions.push(`"${dbField}" = $${idx}`);
        values.push(value === 'true' || value === true);
      } else {
        conditions.push(`"${dbField}" = $${idx}`);
        values.push(value);
      }
      idx++;
    }

    return { conditions, values, nextIdx: idx };
  };

  const parseSortAndLimit = (_sort, _limit, _offset) => {
    let orderClause = ' ORDER BY created_at DESC';
    if (_sort) {
      const sortField = _sort.startsWith('-') ? _sort.slice(1) : _sort;
      const sortDir = _sort.startsWith('-') ? 'DESC' : 'ASC';
      orderClause = ` ORDER BY "${sanitizeFieldName(sortField)}" ${sortDir}`;
    }
    return { orderClause, limit: parseInt(_limit) || 1000, offset: parseInt(_offset) || 0 };
  };

  router.get('/', async (req, res) => {
    try {
      const { _sort, _limit = 1000, _offset = 0, ...filters } = req.query;
      const tenantId = getTenantId(req);
      let startIdx = 1;
      const tenantConditions = [];
      const tenantValues = [];
      if (shouldScopeTenant(req) && tenantId) {
        tenantConditions.push(`"tenant_id" = $1`);
        tenantValues.push(tenantId);
        startIdx = 2;
      }
      const { conditions, values } = buildWhereClause(filters, startIdx);
      const allConditions = [...tenantConditions, ...conditions];
      const allValues = [...tenantValues, ...values];
      let query = `SELECT ${selectColumns} FROM ${tableName}`;
      if (allConditions.length > 0) query += ` WHERE ${allConditions.join(' AND ')}`;
      const { orderClause, limit, offset } = parseSortAndLimit(_sort, _limit, _offset);
      query += orderClause;
      query += ` LIMIT $${allValues.length + 1} OFFSET $${allValues.length + 2}`;
      allValues.push(limit, offset);
      const result = await pool.query(query, allValues);
      res.json(result.rows.map(addVirtualFields));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/filter', async (req, res) => {
    try {
      const { _sort, _limit = 1000, _offset = 0, ...filters } = req.body || {};
      const tenantId = getTenantId(req);
      let startIdx = 1;
      const tenantConditions = [];
      const tenantValues = [];
      if (shouldScopeTenant(req) && tenantId) {
        tenantConditions.push(`"tenant_id" = $1`);
        tenantValues.push(tenantId);
        startIdx = 2;
      }
      const { conditions, values } = buildWhereClause(filters, startIdx);
      const allConditions = [...tenantConditions, ...conditions];
      const allValues = [...tenantValues, ...values];
      let query = `SELECT ${selectColumns} FROM ${tableName}`;
      if (allConditions.length > 0) query += ` WHERE ${allConditions.join(' AND ')}`;
      const { orderClause, limit, offset } = parseSortAndLimit(_sort, _limit, _offset);
      query += orderClause;
      query += ` LIMIT $${allValues.length + 1} OFFSET $${allValues.length + 2}`;
      allValues.push(limit, offset);
      const result = await pool.query(query, allValues);
      res.json(result.rows.map(addVirtualFields));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/:id', async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      let query = `SELECT ${selectColumns} FROM ${tableName} WHERE id = $1`;
      const values = [req.params.id];
      if (shouldScopeTenant(req) && tenantId) {
        query += ` AND "tenant_id" = $2`;
        values.push(tenantId);
      }
      const result = await pool.query(query, values);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(addVirtualFields(result.rows[0]));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/', async (req, res) => {
    try {
      const data = { ...req.body };
      if (!data || Object.keys(data).length === 0) {
        return res.status(400).json({ error: 'No data provided' });
      }
      if (hasTenantColumn && !isSuperAdmin(req)) {
        const sessionTenantId = getTenantId(req);
        if (sessionTenantId) {
          data.tenant_id = sessionTenantId;
        }
      }
      const isSA = isSuperAdmin(req);
      const fields = Object.keys(data).filter(k => {
        if (k === 'id' || k === 'created_date' || k === 'updated_date') return false;
        if (!isSA && sensitiveFields.has(k)) return false;
        return true;
      });
      const values = fields.map(k => {
        const v = data[k];
        if (typeof v === 'object' && v !== null) return JSON.stringify(v);
        return v;
      });
      const dbFields = fields.map(sanitizeFieldName);
      const placeholders = dbFields.map((_, i) => `$${i + 1}`);
      const query = `INSERT INTO ${tableName} ("${dbFields.join('", "')}") VALUES (${placeholders.join(', ')}) RETURNING ${selectColumns}`;
      const result = await pool.query(query, values);
      const created = addVirtualFields(result.rows[0]);

      if (logActivity && req.session?.user) {
        logActivity({
          userId: req.session.user.id,
          userEmail: req.session.user.email,
          userName: req.session.user.full_name || req.session.user.email,
          tenantId: req.session.user.tenant_id,
          action: 'create',
          entityType: entityName,
          entityId: created.id,
          entityName: getEntityDisplayName(created, entityName),
          ipAddress: req.ip
        });
      }

      if (notifyTenantAdmins && req.session?.user?.tenant_id) {
        const displayName = getEntityDisplayName(created, entityName);
        const userName = req.session.user.full_name || req.session.user.email;
        const notifyEntities = {
          Invoice: { title: 'New Invoice Created', message: `${userName} created invoice ${displayName}`, type: 'info' },
          Payment: { title: 'Payment Received', message: `${userName} recorded a payment for ${displayName}`, type: 'success' },
          Expense: { title: 'New Expense Added', message: `${userName} added expense: ${displayName}`, type: 'info' },
          Quote: { title: 'New Quote Created', message: `${userName} created quote ${displayName}`, type: 'info' },
          Client: { title: 'New Client Added', message: `${userName} added client: ${displayName}`, type: 'info' },
          CashHandover: { title: 'Cash Handover Submitted', message: `${userName} submitted a cash handover`, type: 'warning' },
        };
        const notifyConfig = notifyEntities[entityName];
        if (notifyConfig) {
          notifyTenantAdmins(pool, {
            tenantId: req.session.user.tenant_id,
            title: notifyConfig.title,
            message: notifyConfig.message,
            type: notifyConfig.type,
            entityType: entityName,
            entityId: created.id,
            excludeUserId: req.session.user.id,
          });
        }
      }

      res.status(201).json(created);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.patch('/:id', async (req, res) => {
    try {
      const data = req.body;
      if (!data || Object.keys(data).length === 0) {
        return res.status(400).json({ error: 'No data provided' });
      }
      const isSA = isSuperAdmin(req);
      const fields = Object.keys(data).filter(k => {
        if (k === 'id' || k === 'created_date' || k === 'updated_date' || k === 'tenant_id') return false;
        if (!isSA && sensitiveFields.has(k)) return false;
        return true;
      });
      const values = fields.map(k => {
        const v = data[k];
        if (typeof v === 'object' && v !== null) return JSON.stringify(v);
        return v;
      });
      const dbFields = fields.map(sanitizeFieldName);
      const setClause = dbFields.map((f, i) => `"${f}" = $${i + 1}`).join(', ');
      values.push(req.params.id);
      let query = `UPDATE ${tableName} SET ${setClause}, updated_at = NOW() WHERE id = $${values.length}`;
      const tenantId = getTenantId(req);
      if (shouldScopeTenant(req) && tenantId) {
        values.push(tenantId);
        query += ` AND "tenant_id" = $${values.length}`;
      }
      query += ` RETURNING ${selectColumns}`;
      const result = await pool.query(query, values);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      const updated = addVirtualFields(result.rows[0]);

      if (logActivity && req.session?.user) {
        logActivity({
          userId: req.session.user.id,
          userEmail: req.session.user.email,
          userName: req.session.user.full_name || req.session.user.email,
          tenantId: req.session.user.tenant_id,
          action: 'update',
          entityType: entityName,
          entityId: updated.id,
          entityName: getEntityDisplayName(updated, entityName),
          details: { fields: fields },
          ipAddress: req.ip
        });
      }

      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.delete('/:id', async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      let query = `DELETE FROM ${tableName} WHERE id = $1`;
      const values = [req.params.id];
      if (shouldScopeTenant(req) && tenantId) {
        query += ` AND "tenant_id" = $2`;
        values.push(tenantId);
      }
      query += ` RETURNING ${selectColumns}`;
      const result = await pool.query(query, values);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      const deleted = addVirtualFields(result.rows[0]);

      if (logActivity && req.session?.user) {
        logActivity({
          userId: req.session.user.id,
          userEmail: req.session.user.email,
          userName: req.session.user.full_name || req.session.user.email,
          tenantId: req.session.user.tenant_id,
          action: 'delete',
          entityType: entityName,
          entityId: deleted.id,
          entityName: getEntityDisplayName(deleted, entityName),
          ipAddress: req.ip
        });
      }

      res.json({ success: true, deleted });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
