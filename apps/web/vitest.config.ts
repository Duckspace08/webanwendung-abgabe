import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],

      /**
       * Wichtig:
       * Ohne Einschränkung zieht Vitest in einem Next.js Projekt sehr viele Dateien in die Coverage
       * (app/, components/, config), die wir hier nicht unit-testen.
       * Deshalb: Coverage auf "lib" begrenzen (typische Shared-/HTTP-/Error-Logik).
       */
      all: false,
      include: ['lib/**/*.{ts,tsx}'],
      exclude: [
        '**/*.d.ts',
        '**/node_modules/**',
        '**/.next/**',
        '**/dist/**',
        '**/coverage/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@webanwendung/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
});