import { copyFileSync } from 'node:fs';

copyFileSync('index.dev.html', 'index.html');
console.log('use-dev-index: index.dev.html → index.html');
