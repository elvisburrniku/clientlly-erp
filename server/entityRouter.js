import express from 'express';

export function createEntityRouter(pool, tableName, entityName) {
  const router = express.Router();

  const buildWhereClause = (filters, startIdx = 1) => {
    const conditions = [];
    const values = [];
    let idx = startIdx;

    for (const [key, value] of Object.entries(filters)) {
      if (value === null || value === undefined) continue;
      if (key === '_sort' || key === '_limit' || key === '_offset') continue;
      conditions.push(`"${key}" = $${idx}`);
      values.push(value);
      idx++;
    }

    return { conditions, values, nextIdx: idx };
  };

  // GET all (list)
  router.get('/', async (req, res) => {
    try {
      const { _sort, _limit = 1000, _offset = 0, ...filters } = req.query;

      let query = `SELECT * FROM ${tableName}`;
      const { conditions, values } = buildWhereClause(filters);

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      if (_sort) {
        const sortField = _sort.startsWith('-') ? _sort.slice(1) : _sort;
        const sortDir = _sort.startsWith('-') ? 'DESC' : 'ASC';
        query += ` ORDER BY "${sortField}" ${sortDir}`;
      } else {
        query += ` ORDER BY created_at DESC`;
      }

      query += ` LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
      values.push(parseInt(_limit), parseInt(_offset));

      const result = await pool.query(query, values);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST filter (for base44 .filter() method)
  router.post('/filter', async (req, res) => {
    try {
      const { _sort, _limit = 1000, _offset = 0, ...filters } = req.body || {};

      let query = `SELECT * FROM ${tableName}`;
      const { conditions, values } = buildWhereClause(filters);

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      if (_sort) {
        const sortField = _sort.startsWith('-') ? _sort.slice(1) : _sort;
        const sortDir = _sort.startsWith('-') ? 'DESC' : 'ASC';
        query += ` ORDER BY "${sortField}" ${sortDir}`;
      } else {
        query += ` ORDER BY created_at DESC`;
      }

      query += ` LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
      values.push(parseInt(_limit), parseInt(_offset));

      const result = await pool.query(query, values);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET by ID
  router.get('/:id', async (req, res) => {
    try {
      const result = await pool.query(`SELECT * FROM ${tableName} WHERE id = $1`, [req.params.id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST create
  router.post('/', async (req, res) => {
    try {
      const data = req.body;
      if (!data || Object.keys(data).length === 0) {
        return res.status(400).json({ error: 'No data provided' });
      }

      const fields = Object.keys(data).filter(k => k !== 'id');
      const values = fields.map(k => {
        const v = data[k];
        if (typeof v === 'object' && v !== null) return JSON.stringify(v);
        return v;
      });
      const placeholders = fields.map((_, i) => `$${i + 1}`);

      const query = `INSERT INTO ${tableName} ("${fields.join('", "')}") VALUES (${placeholders.join(', ')}) RETURNING *`;
      const result = await pool.query(query, values);
      res.status(201).json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // PATCH update
  router.patch('/:id', async (req, res) => {
    try {
      const data = req.body;
      if (!data || Object.keys(data).length === 0) {
        return res.status(400).json({ error: 'No data provided' });
      }

      const fields = Object.keys(data).filter(k => k !== 'id');
      const values = fields.map(k => {
        const v = data[k];
        if (typeof v === 'object' && v !== null) return JSON.stringify(v);
        return v;
      });

      const setClause = fields.map((f, i) => `"${f}" = $${i + 1}`).join(', ');
      values.push(req.params.id);

      const query = `UPDATE ${tableName} SET ${setClause}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`;
      const result = await pool.query(query, values);

      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE
  router.delete('/:id', async (req, res) => {
    try {
      const result = await pool.query(`DELETE FROM ${tableName} WHERE id = $1 RETURNING *`, [req.params.id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json({ success: true, deleted: result.rows[0] });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
