/**
 * Manual, local MongoDB backup. Dumps the database at MONGODB_URI to a
 * timestamped, gzip-compressed archive under apps/api/backups/ (gitignored).
 *
 * Requires the MongoDB Database Tools (`mongodump`) on PATH:
 * https://www.mongodb.com/try/download/database-tools
 *
 * Run with `pnpm --filter api backup`.
 */
import { spawnSync } from 'child_process';
import { mkdirSync } from 'fs';
import { join } from 'path';

function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set.');
    process.exit(1);
  }

  const backupsDir = join(__dirname, '..', 'backups');
  mkdirSync(backupsDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const archivePath = join(backupsDir, `pocketly-${timestamp}.gz`);

  console.log(`Backing up ${uri.replace(/\/\/[^@]+@/, '//<redacted>@')}`);

  console.log(`-> ${archivePath}`);

  const result = spawnSync(
    'mongodump',
    ['--uri', uri, '--gzip', `--archive=${archivePath}`],
    { stdio: 'inherit' },
  );

  if (result.error) {
    const err = result.error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      console.error(
        'mongodump not found. Install the MongoDB Database Tools: ' +
          'https://www.mongodb.com/try/download/database-tools',
      );
    } else {
      console.error(err);
    }
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`mongodump exited with code ${result.status}`);
    process.exit(result.status ?? 1);
  }

  console.log(`Backup written to ${archivePath}`);
}

main();
