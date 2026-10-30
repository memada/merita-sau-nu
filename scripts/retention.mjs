import { openDatabase } from './db.mjs';
const db = openDatabase();
const cutoff = new Date(Date.now() - 180 * 86400000).toISOString();
const count = db.prepare('SELECT COUNT(*) n FROM leads WHERE updatedAt < ?').get(cutoff).n;
console.log(`${count} leaduri mai vechi decât ${cutoff}.`);
if (process.argv.includes('--apply')) {
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('DELETE FROM leads WHERE updatedAt < ?').run(cutoff);
    db.exec('COMMIT');
    console.log('Ștergere aplicată. Verifică separat exporturile, backupurile și destinatarii.');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
} else console.log('Dry run. Folosește --apply doar după verificarea retenției și a backupurilor.');
db.close();
