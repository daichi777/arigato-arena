import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Day1午後の最小 vitest 設定。
// - tsconfig の paths を反映するため alias を手動で記述。
// - tests は src/__test__/ 配下のみ。
export default defineConfig({
  resolve: {
    alias: {
      '@arigato/shared': fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/__test__/**/*.test.ts'],
    globals: false,
  },
});
