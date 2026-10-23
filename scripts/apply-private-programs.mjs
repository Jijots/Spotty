// Copies your own saved programs (kept out of git in /private) into the app before a personal build.
// Usage: node scripts/apply-private-programs.mjs        -> installs them
//        node scripts/apply-private-programs.mjs --reset -> restores the empty public file
import { copyFileSync, existsSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const target = join(root, 'src', 'data', 'personalPrograms.json');
const source = join(root, 'private', 'personal-programs.json');

if (process.argv.includes('--reset')) {
  writeFileSync(target, '{ "source": "", "exercises": {}, "programs": [] }\n');
  console.log('Restored the empty public file.');
} else if (existsSync(source)) {
  copyFileSync(source, target);
  console.log('Installed private programs. Run with --reset before committing.');
} else {
  console.log('No private/personal-programs.json found; nothing to install.');
}
