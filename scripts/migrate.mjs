import { openDatabase, migrate } from './db.mjs';
const db = openDatabase();
migrate(db);
db.close();
console.log('Migrații aplicate.');
