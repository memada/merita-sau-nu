import { randomBytes, scryptSync } from 'node:crypto';
import { emitKeypressEvents } from 'node:readline';
if (!process.stdin.isTTY) {
  let value = '';
  for await (const chunk of process.stdin) value += chunk;
  printHash(value.trimEnd());
} else {
  process.stderr.write('Parola admin (minimum 12 caractere, ascunsă): ');
  emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  let value = '';
  process.stdin.on('keypress', (str, key) => {
    if (key.ctrl && key.name === 'c') process.exit(130);
    if (key.name === 'return') {
      process.stdin.setRawMode(false);
      process.stderr.write('\n');
      printHash(value);
      process.exit(0);
    } else if (key.name === 'backspace') value = value.slice(0, -1);
    else if (str && !key.ctrl) value += str;
  });
}
function printHash(password) {
  if (password.length < 12) {
    console.error('Minimum 12 caractere.');
    process.exit(1);
  }
  const salt = randomBytes(16).toString('hex');
  console.log(`scrypt:${salt}:${scryptSync(password, salt, 64).toString('hex')}`);
}
