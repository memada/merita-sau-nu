import { execFileSync } from 'node:child_process';
const paths = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);
const blocked = paths.filter(
  (path) =>
    path
      .split('/')
      .some(
        (p) =>
          [
            '.git',
            'data',
            'backups',
            '.next',
            'node_modules',
            '.DS_Store',
            'dist',
            'artifacts',
            'test-results',
            'playwright-report',
          ].includes(p) ||
          (p.startsWith('.env') && p !== '.env.example'),
      ) || /\.sqlite(?:-wal|-shm)?$/.test(path),
);
if (blocked.length) {
  console.error(
    'Repository contains forbidden tracked paths (contents not printed):\n' + blocked.join('\n'),
  );
  process.exit(1);
}
console.log('Repository hygiene: OK');
