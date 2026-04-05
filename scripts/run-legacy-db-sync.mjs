import pool from '../server/db.js';
import {
  parseSyncCliArgs,
  runLegacyMysqlSync,
  listStoredSyncSources,
  listSyncRuns,
} from '../server/sync/legacyMysqlSync.js';

async function main() {
  const command = process.argv[2];

  if (command === 'list-sources') {
    const sources = await listStoredSyncSources(pool);
    console.log(JSON.stringify(sources, null, 2));
    return;
  }

  if (command === 'list-runs') {
    const sourceId = process.argv[3] || null;
    const runs = await listSyncRuns(pool, sourceId);
    console.log(JSON.stringify(runs, null, 2));
    return;
  }

  if (command === 'sync') {
    const parsed = parseSyncCliArgs(process.argv.slice(3));
    const summary = await runLegacyMysqlSync(pool, parsed, console);
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  console.log(`Usage:
  node scripts/run-legacy-db-sync.mjs list-sources
  node scripts/run-legacy-db-sync.mjs list-runs [sourceId]
  node scripts/run-legacy-db-sync.mjs sync --config ./scripts/legacy-sync-source.example.json
  node scripts/run-legacy-db-sync.mjs sync --source-name "Truly Nolen Legacy"
  node scripts/run-legacy-db-sync.mjs sync --source-name "Truly Nolen Legacy" --target-tenant-name "Truly Nolen" --target-tenant-code "truly-nolen" --ssh-host 5.189.182.104 --ssh-username root --ssh-password ... --db-host 127.0.0.1 --db-name truly_nolen --db-user clientlly --db-password ...
`);
}

main()
  .catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
