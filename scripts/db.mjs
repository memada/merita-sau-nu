import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
export function openDatabase() {
  const url = process.env.DATABASE_URL || 'file:./data/leads.sqlite';
  if (!url.startsWith('file:')) throw new Error('DATABASE_URL trebuie să înceapă cu file:');
  const path = url.slice(5) === ':memory:' ? ':memory:' : resolve(url.slice(5));
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  return db;
}
export function migrate(db) {
  db.exec(
    'CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, appliedAt TEXT NOT NULL)',
  );
  for (const file of readdirSync(resolve('db/migrations'))
    .filter((f) => f.endsWith('.sql'))
    .sort()) {
    if (db.prepare('SELECT version FROM schema_migrations WHERE version = ?').get(file)) continue;
    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec(readFileSync(resolve('db/migrations', file), 'utf8'));
      db.prepare('INSERT INTO schema_migrations VALUES (?, ?)').run(file, new Date().toISOString());
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }
}
