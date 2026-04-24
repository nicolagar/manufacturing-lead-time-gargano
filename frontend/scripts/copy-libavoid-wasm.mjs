import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const src = resolve('node_modules/libavoid-js/dist/libavoid.wasm');
const dst = resolve('public/libavoid.wasm');

if (existsSync(src)) {
  mkdirSync(dirname(dst), { recursive: true });
  copyFileSync(src, dst);
  console.log('Copied libavoid.wasm to public/');
} else {
  console.warn('libavoid.wasm not found during postinstall; run npm install again after dependencies are available.');
}
