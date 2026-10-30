import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
let connection: DatabaseSync | undefined;
export function getDb() {
  if (connection) return connection;
  const url = process.env.DATABASE_URL || 'file:./data/leads.sqlite';
  if (!url.startsWith('file:')) throw new Error('DATABASE_URL invalid');
  const path = url.slice(5) === ':memory:' ? ':memory:' : resolve(url.slice(5));
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  connection = new DatabaseSync(path);
  connection.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  return connection;
}
