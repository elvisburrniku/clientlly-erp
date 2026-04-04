import express from 'express';

const FIELD_ALIASES = {
  'created_date': 'created_at',
  'updated_date': 'updated_at',
};

function mapField(field) {
  return FIELD_ALIASES[field] || field;
}

function addVirtualFields(row) {
  if (!row) return row;
  if (row.created_at) row.created_date = row.created_at;
  if (row.updated_at) row.updated_date = row.updated_at;
  return row;
}

export function createEntityRouter(pool, tableName, entityName) {
  const router = express.Router();

  const selectColumns = tableName === 'users'
    ? 'id, email, full_name, role, tenant_id, tenant_name, cash_on_hand, phone, avatar_url, created_at, updated_at'
    : '*';

  const buildWhereClause = (filters, startIdx = 1) => {
    const conditions = [];
    const values = [];
    let idx = startIdx;

    for (const [key, value] of Object.entries(filters)) {
      if (value === null || value === undefined) continue;
      if (key === '_sort' || key === '_limit' || key === '_offset') continue;
      const dbField = mapField(key);
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
      orderClause = ` ORDER BY "${mapField(sortField)}" ${sortDir}`;
    }
    return { orderClause, limit: parseInt(_limit) || 1000, offset: parseInt(_offset) || 0 };
  };

  router.get('/', async (req, res) => {
    try {
      const { _sort, _limit = 1000, _offset = 0, ...filters } = req.query;
      let query = `SELECT ${selectColumns} FROM ${tableName}`;
      const { conditions, values } = buildWhereClause(filters);
      if (conditions.length > 0) query += ` WHERE ${conditions.join(' AND ')}`;
      const { orderClause, limit, offset } = parseSortAndLimit(_sort, _limit, _offset);
      query += orderClause;
      query += ` LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
      values.push(limit, offset);
      const result = await pool.query(query, values);
      res.json(result.rows.map(addVirtualFields));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/filter', async (req, res) => {
    try {
      const { _sort, _limit = 1000, _offset = 0, ...filters } = req.body || {};
      let query = `SELECT ${selectColumns} FROM ${tableName}`;
      const { conditions, values } = buildWhereClause(filters);
      if (conditions.length > 0) query += ` WHERE ${conditions.join(' AND ')}`;
      const { orderClause, limit, offset } = parseSortAndLimit(_sort, _limit, _offset);
      query += orderClause;
      query += ` LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
      values.push(limit, offset);
      const result = await pool.query(query, values);
      res.json(result.rows.map(addVirtualFields));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/:id', async (req, res) => {
    try {
      const result = await pool.query(`SELECT ${selectColumns} FROM ${tableName} WHERE id = $1`, [req.params.id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(addVirtualFields(result.rows[0]));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/', async (req, res) => {
    try {
      const data = req.body;
      if (!data || Object.keys(data).length === 0) {
        return res.status(400).json({ error: 'No data provided' });
      }
      const fields = Object.keys(data).filter(k => k !== 'id' && k !== 'created_date' && k !== 'updated_date');
      const values = fields.map(k => {
        const v = data[k];
        if (typeof v === 'object' && v !== null) return JSON.stringify(v);
        return v;
      });
      const dbFields = fields.map(mapField);
      const placeholders = dbFields.map((_, i) => `$${i + 1}`);
      const query = `INSERT INTO ${tableName} ("${dbFields.join('", "')}") VALUES (${placeholders.join(', ')}) RETURNING ${selectColumns}`;
      const result = await pool.query(query, values);
      res.status(201).json(addVirtualFields(result.rows[0]));
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
      const fields = Object.keys(data).filter(k => k !== 'id' && k !== 'created_date' && k !== 'updated_date');
      const values = fields.map(k => {
        const v = data[k];
        if (typeof v === 'object' && v !== null) return JSON.stringify(v);
        return v;
      });
      const dbFields = fields.map(mapField);
      const setClause = dbFields.map((f, i) => `"${f}" = $${i + 1}`).join(', ');
      values.push(req.params.id);
      const query = `UPDATE ${tableName} SET ${setClause}, updated_at = NOW() WHERE id = $${values.length} RETURNING ${selectColumns}`;
      const result = await pool.query(query, values);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(addVirtualFields(result.rows[0]));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.delete('/:id', async (req, res) => {
    try {
      const result = await pool.query(`DELETE FROM ${tableName} WHERE id = $1 RETURNING ${selectColumns}`, [req.params.id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json({ success: true, deleted: addVirtualFields(result.rows[0]) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
