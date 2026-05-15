import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// renderer agent 担当の単体テスト用最小設定。
// React/R3F コンポーネントは Day1午後ではテスト対象外（純粋ロジックのみ）。
export default defineConfig({
  test: {
    environment: 'node',
    include: ['game/**/*.test.ts', 'lib/**/*.test.ts'],
    globals: false,
  },
  resolve: {
    alias: {
      '@arigato/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
      '@': path.resolve(__dirname, '.'),
    },
  },
});
