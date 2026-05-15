// apps/client/public/assets → monorepo の assets/ への junction/symlink を作成。
// Windows は junction、Unix は symlink を使う。冪等。
import { existsSync, mkdirSync, symlinkSync, lstatSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { platform } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const monorepoRoot = resolve(__dirname, '..');
const target = resolve(monorepoRoot, 'assets');
const linkPath = resolve(monorepoRoot, 'apps/client/public/assets');

if (!existsSync(target)) {
  mkdirSync(target, { recursive: true });
}

if (existsSync(linkPath)) {
  const stat = lstatSync(linkPath);
  if (stat.isSymbolicLink() || stat.isDirectory()) {
    console.log(`[link-assets] 既に存在: ${linkPath}`);
    process.exit(0);
  }
}

const parentDir = dirname(linkPath);
if (!existsSync(parentDir)) {
  mkdirSync(parentDir, { recursive: true });
}

try {
  const type = platform() === 'win32' ? 'junction' : 'dir';
  symlinkSync(target, linkPath, type);
  console.log(`[link-assets] 作成: ${linkPath} -> ${target}`);
} catch (err) {
  console.error(`[link-assets] 失敗: ${err.message}`);
  console.error('Windowsの場合は管理者権限が必要なケースがあります。');
  process.exit(1);
}
