/**
 * Restores a MongoDB backup created by backup-db.ts into MONGODB_URI.
 * DESTRUCTIVE: drops and replaces existing collections in the target
 * database.
 *
 * Requires the MongoDB Database Tools (`mongorestore`) on PATH:
 * https://www.mongodb.com/try/download/database-tools
 *
 * Run with `pnpm --filter api restore -- --yes [path-to-archive]`.
 * If no path is given, restores the most recent archive in ./backups.
 * Requires --yes to actually run -- without it, prints what it would do
 * and exits, so this can't be triggered by a fat-fingered Enter.
 */
import { spawnSync } from 'child_process';
import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

function findLatestBackup(backupsDir: string): string | null {
  if (!existsSync(backupsDir)) return null;

  const files = readdirSync(backupsDir)
    .filter((f) => f.endsWith('.gz'))
    .map((f) => ({ name: f, mtime: statSync(join(backupsDir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);

  return files[0] ? join(backupsDir, files[0].name) : null;
}

function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set.');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const confirmed = args.includes('--yes') || args.includes('-y');
  const archivePath =
    args.find((a) => !a.startsWith('-')) ??
    findLatestBackup(join(__dirname, '..', 'backups'));

  const backupsDir = join(__dirname, '..', 'backups');

  if (!archivePath || !existsSync(archivePath)) {
    console.error(
      archivePath
        ? `Archive not found: ${archivePath}`
        : `No backup archives found in ${backupsDir}. Pass a path explicitly.`,
    );
    process.exit(1);
  }

  console.log(`Restoring ${archivePath}`);

  console.log(`-> ${uri.replace(/\/\/[^@]+@/, '//<redacted>@')}`);

  console.log('This drops and replaces existing collections.');

  if (!confirmed) {
    console.log(
      'Re-run with --yes to actually perform the restore. Nothing was done.',
    );
    return;
  }

  const result = spawnSync(
    'mongorestore',
    ['--uri', uri, '--gzip', `--archive=${archivePath}`, '--drop'],
    { stdio: 'inherit' },
  );

  if (result.error) {
    const err = result.error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      console.error(
        'mongorestore not found. Install the MongoDB Database Tools: ' +
          'https://www.mongodb.com/try/download/database-tools',
      );
    } else {
      console.error(err);
    }
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`mongorestore exited with code ${result.status}`);
    process.exit(result.status ?? 1);
  }

  console.log('Restore complete.');
}

main();
