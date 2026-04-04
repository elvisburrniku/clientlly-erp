#!/bin/bash
set -e
npm install
node -e "
const pool = (await import('./server/db.js')).default;
const fs = (await import('fs')).default;
const schema = fs.readFileSync('./server/schema.sql', 'utf8');
await pool.query(schema);
console.log('Schema applied successfully');
await pool.end();
"
