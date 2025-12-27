import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'tests/',
        '**/*.test.ts',
        '**/*.config.ts',
        '**/*.config.mjs',
        '**/index.ts',
        '**/types.ts',
        '**/tree.ts', // Orchestration code, tested via integration
        '**/commandStubs.ts', // Stubs, not critical for coverage
        '**/DynamicTaskPool.ts', // Complex async, needs extensive mocking
        '**/TreeExecutionAdapter.ts' // Adapter layer, tested via integration
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70
      }
    }
  }
});

