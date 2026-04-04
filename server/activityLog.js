import pool from './db.js';

export async function logActivity({ userId, userEmail, userName, tenantId, action, entityType, entityId, entityName, details, ipAddress }) {
  try {
    await pool.query(
      `INSERT INTO activity_logs (user_id, user_email, user_name, tenant_id, action, entity_type, entity_id, entity_name, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [userId, userEmail, userName, tenantId, action, entityType, entityId?.toString(), entityName, details ? JSON.stringify(details) : null, ipAddress]
    );
  } catch (err) {
    console.error('Activity log error:', err.message);
  }
}

export async function createNotification(pool, { userId, tenantId, title, message, type = 'info', entityType, entityId }) {
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, tenant_id, title, message, type, entity_type, entity_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, tenantId, title, message, type, entityType || null, entityId?.toString() || null]
    );
  } catch (err) {
    console.error('Notification creation error:', err.message);
  }
}

export async function notifyTenantAdmins(pool, { tenantId, title, message, type = 'info', entityType, entityId, excludeUserId }) {
  try {
    const admins = await pool.query(
      `SELECT id FROM users WHERE tenant_id = $1 AND role IN ('admin', 'manager')`,
      [tenantId]
    );
    for (const admin of admins.rows) {
      if (excludeUserId && admin.id === excludeUserId) continue;
      await createNotification(pool, { userId: admin.id, tenantId, title, message, type, entityType, entityId });
    }
  } catch (err) {
    console.error('Notify admins error:', err.message);
  }
}

export function getActivityApi(pool) {
  return {
    async list(req, res) {
      const { entity_type, action, user_id, limit = 100, offset = 0 } = req.query;
      const tenantId = req.session.user.tenant_id;
      const isSuperAdmin = req.session.user.role === 'superadmin';

      let query = 'SELECT * FROM activity_logs WHERE 1=1';
      const values = [];
      let idx = 1;

      if (!isSuperAdmin && tenantId) {
        query += ` AND tenant_id = $${idx++}`;
        values.push(tenantId);
      }

      if (entity_type) {
        query += ` AND entity_type = $${idx++}`;
        values.push(entity_type);
      }
      if (action) {
        query += ` AND action = $${idx++}`;
        values.push(action);
      }
      if (user_id) {
        query += ` AND user_id = $${idx++}`;
        values.push(user_id);
      }

      query += ` ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
      values.push(parseInt(limit), parseInt(offset));

      const result = await pool.query(query, values);
      res.json(result.rows);
    },

    async count(req, res) {
      const tenantId = req.session.user.tenant_id;
      const isSuperAdmin = req.session.user.role === 'superadmin';

      let query = 'SELECT COUNT(*) FROM activity_logs';
      const values = [];

      if (!isSuperAdmin && tenantId) {
        query += ' WHERE tenant_id = $1';
        values.push(tenantId);
      }

      const result = await pool.query(query, values);
      res.json({ count: parseInt(result.rows[0].count) });
    }
  };
}
