import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  define: {
    '__DEV__': 'true',
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    globals: true,
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      'obsidian': path.resolve(__dirname, 'tests/mocks/obsidian.ts'),
    }
  }
});
