import { backup, DatabaseSync } from 'node:sqlite';
import { mkdirSync, chmodSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { openDatabase } from './db.mjs';
const directory = process.env.BACKUP_DIR || 'backups';
mkdirSync(directory, { recursive: true, mode: 0o700 });
chmodSync(directory, 0o700);
if (process.argv.includes('--prune-only')) {
  const index = process.argv.indexOf('--retention-days');
  const days = Number(process.argv[index + 1]);
  if (index < 0 || !Number.isInteger(days) || days < 1) throw new Error('Invalid retention days');
  const cutoff = Date.now() - days * 86400000;
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    if (/^leads-[0-9TZ-]+\.sqlite$/.test(name) && statSync(path).mtimeMs < cutoff) unlinkSync(path);
  }
} else {
  const filename = `leads-${new Date().toISOString().replace(/[:.]/g, '-')}.sqlite`;
  const path = join(directory, filename);
  const db = openDatabase();
  try {
    await backup(db, path);
  } finally {
    db.close();
  }
  chmodSync(path, 0o600);
  const copy = new DatabaseSync(path, { readOnly: true });
  try {
    if (copy.prepare('PRAGMA quick_check').get().quick_check !== 'ok')
      throw new Error('Backup integrity failed');
  } finally {
    copy.close();
  }
  console.log(
    process.argv.includes('--json') ? JSON.stringify({ filename }) : `Backup creat: ${path}`,
  );
}
