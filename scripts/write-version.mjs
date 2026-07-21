import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const packageJson = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const version = packageJson.version;
const buildId = process.env.GITHUB_SHA?.slice(0, 12) || `local-${Date.now()}`;
const generatedAt = new Date().toISOString();
const swTemplate = await readFile(resolve(root, 'scripts/sw-template.js'), 'utf8');

await writeFile(resolve(root, 'public/version.json'), `${JSON.stringify({ version, buildId, generatedAt }, null, 2)}\n`);
await writeFile(resolve(root, 'public/sw.js'), swTemplate.replaceAll('__APP_VERSION__', version));
console.log(`Version assets generated: ${version} (${buildId})`);
