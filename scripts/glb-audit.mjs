/**
 * GLBアセット監査スクリプト
 * assets/characters/*.glb のファイルサイズと存在チェックを行う
 * 使用方法: node scripts/glb-audit.mjs
 */

import { readdir, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const CHARACTERS_DIR = join(REPO_ROOT, 'assets', 'characters');

// packages/shared/types.ts の CharacterId と一致させること
const REQUIRED_IDS = [
  'k2',
  'hyouga',
  'shuto',
  'daichi',
  'katsuya',
  'tsuchiga',
  'hide',
  'yugo',
  'iru',
];

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

async function main() {
  console.log('=== GLBアセット監査 ===');
  console.log(`対象ディレクトリ: ${CHARACTERS_DIR}`);
  console.log(`最大ファイルサイズ: ${MAX_FILE_SIZE_MB} MB`);
  console.log('');

  // ディレクトリ存在チェック
  if (!existsSync(CHARACTERS_DIR)) {
    console.error(`エラー: ディレクトリが存在しません: ${CHARACTERS_DIR}`);
    process.exit(1);
  }

  // 全GLBファイルを取得
  let allFiles;
  try {
    const entries = await readdir(CHARACTERS_DIR, { withFileTypes: true });
    allFiles = entries
      .filter((e) => e.isFile() && e.name.endsWith('.glb'))
      .map((e) => e.name);
  } catch (err) {
    console.error('ディレクトリ読み込みエラー:', err.message);
    process.exit(1);
  }

  // 各キャラクターのチェック
  const results = [];
  for (const id of REQUIRED_IDS) {
    const fileName = `${id}.glb`;
    const filePath = join(CHARACTERS_DIR, fileName);
    const exists = existsSync(filePath);

    if (!exists) {
      results.push({ id, exists: false, size: 0, sizeStr: '-', ok: false });
      continue;
    }

    const stats = await stat(filePath);
    const size = stats.size;
    const sizeOk = size <= MAX_FILE_SIZE_BYTES;
    results.push({
      id,
      exists: true,
      size,
      sizeStr: formatBytes(size),
      ok: sizeOk,
    });
  }

  // 結果テーブル表示
  const colId = 12;
  const colExists = 8;
  const colSize = 12;
  const colStatus = 16;

  const header =
    'ID'.padEnd(colId) +
    '存在'.padEnd(colExists) +
    'サイズ'.padEnd(colSize) +
    'ステータス';
  console.log(header);
  console.log('-'.repeat(colId + colExists + colSize + colStatus));

  let missingCount = 0;
  let oversizeCount = 0;

  for (const r of results) {
    const existsStr = r.exists ? 'あり' : 'なし';
    let statusStr;
    if (!r.exists) {
      statusStr = '*** 未生成 ***';
      missingCount++;
    } else if (!r.ok) {
      statusStr = `*** サイズ超過 (最大${MAX_FILE_SIZE_MB}MB) ***`;
      oversizeCount++;
    } else {
      statusStr = 'OK';
    }

    console.log(
      r.id.padEnd(colId) +
        existsStr.padEnd(colExists) +
        r.sizeStr.padEnd(colSize) +
        statusStr
    );
  }

  // 未知のGLBファイル（命名規則外）
  const knownFiles = new Set(REQUIRED_IDS.map((id) => `${id}.glb`));
  const unknownFiles = allFiles.filter((f) => !knownFiles.has(f));
  if (unknownFiles.length > 0) {
    console.log('');
    console.log('命名規則外のGLBファイル（CharacterId未定義）:');
    for (const f of unknownFiles) {
      const s = await stat(join(CHARACTERS_DIR, f));
      console.log(`  ${f} (${formatBytes(s.size)})`);
    }
  }

  // サマリ
  console.log('');
  console.log('=== サマリ ===');
  const presentCount = results.filter((r) => r.exists).length;
  console.log(`生成済み: ${presentCount} / ${REQUIRED_IDS.length} 体`);
  if (missingCount > 0) {
    console.log(`未生成: ${missingCount} 体 → Tripo/Meshyで変換が必要`);
  }
  if (oversizeCount > 0) {
    console.log(`サイズ超過: ${oversizeCount} 体 → ポリゴン削減・圧縮が必要`);
  }
  if (missingCount === 0 && oversizeCount === 0) {
    console.log('全キャラクター OK');
  }

  // 終了コード
  process.exit(missingCount > 0 || oversizeCount > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('予期しないエラー:', err);
  process.exit(1);
});
