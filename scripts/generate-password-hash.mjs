import { randomBytes, scrypt } from 'node:crypto';
import { promisify } from 'node:util';
import { stdin, stdout } from 'node:process';

const derive = promisify(scrypt);
if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
  console.error('Run this script in an interactive terminal so the password can be entered without echo.');
  process.exit(1);
}
stdout.write('Password (hidden): ');
stdin.setRawMode(true);
stdin.resume();
const password = await new Promise((resolve) => {
  let value = '';
  stdin.on('data', (chunk) => {
    for (const char of chunk.toString()) {
      if (char === '\u0003') process.exit(1);
      if (char === '\r' || char === '\n') {
        stdin.setRawMode(false);
        stdin.pause();
        stdout.write('\n');
        resolve(value);
        return;
      }
      if (char === '\u007f' || char === '\b') value = value.slice(0, -1);
      else value += char;
    }
  });
});
if (password.length < 12) {
  console.error('Choose a password with at least 12 characters.');
  process.exit(1);
}
const salt = randomBytes(16);
const digest = await derive(password, salt, 64);
console.log(`${salt.toString('hex')}:${digest.toString('hex')}`);
