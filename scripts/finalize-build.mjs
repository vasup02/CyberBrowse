import { cp, readdir, rename } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const distDirectory = join(projectRoot, 'dist');
const assetsDirectory = join(distDirectory, 'assets');

await cp(join(projectRoot, 'manifest.json'), join(distDirectory, 'manifest.json'));
const backgroundChunks = (await readdir(assetsDirectory)).filter(name => /^background-[\w-]+\.js$/.test(name));
if (backgroundChunks.length !== 1) {
  throw new Error(`Expected one compiled background worker, found ${backgroundChunks.length}.`);
}
await rename(join(assetsDirectory, backgroundChunks[0]), join(distDirectory, 'background.js'));
