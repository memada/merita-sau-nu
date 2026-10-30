import { cpSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
const entry = resolve('.next/standalone/server.js');
if (!existsSync(entry)) {
  console.error('Rulează npm run build înainte de npm start.');
  process.exit(1);
}
cpSync('.next/static', '.next/standalone/.next/static', { recursive: true });
const url = process.env.DATABASE_URL || 'file:./data/leads.sqlite';
const database = url.startsWith('file:') ? `file:${resolve(url.slice(5))}` : url;
const child = spawn(process.execPath, [entry], {
  stdio: 'inherit',
  env: {
    ...process.env,
    DATABASE_URL: database,
    HOSTNAME: process.env.HOSTNAME || '127.0.0.1',
    PORT: process.env.PORT || '3002',
  },
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', (code) => process.exit(code || 0));
