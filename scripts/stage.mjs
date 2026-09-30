import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from './build.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, '.cache', 'public');
// Clear only this generated staging directory so removed games are not deployed.
if (path.resolve(out) !== path.join(root, '.cache', 'public')) throw new Error('Unexpected staging path');
await fs.rm(out, { recursive: true, force: true });
await fs.mkdir(out, { recursive: true });
for (const file of [...await build(), 'style.css', 'site.js', '.nojekyll']) {
  await fs.mkdir(path.dirname(path.join(out, file)), { recursive: true });
  await fs.copyFile(path.join(root, file), path.join(out, file));
}
await fs.cp(path.join(root, 'assets'), path.join(out, 'assets'), { recursive: true });
