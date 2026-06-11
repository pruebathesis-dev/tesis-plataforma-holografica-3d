import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const docsDir = 'docs';
const docsAssets = join(docsDir, 'assets');
const rootAssets = 'assets';

if (!existsSync(join(docsDir, 'index.html'))) {
  console.error('publish-root: run vite build first (missing docs/index.html)');
  process.exit(1);
}

// Copiar assets del build a /assets (GitHub Pages desde raíz del repo)
if (existsSync(rootAssets)) {
  rmSync(rootAssets, { recursive: true, force: true });
}
cpSync(docsAssets, rootAssets, { recursive: true });

// Copiar index.html de producción a la raíz
copyFileSync(join(docsDir, 'index.html'), 'index.html');

// .nojekyll evita que Jekyll ignore archivos o cambie MIME types
writeFileSync(join(docsDir, '.nojekyll'), '');
writeFileSync('.nojekyll', '');

const assetCount = readdirSync(rootAssets).length;
console.log(`publish-root: synced docs → root (${assetCount} assets, index.html)`);

function copyFileSync(src, dest) {
  writeFileSync(dest, readFileSync(src));
}
