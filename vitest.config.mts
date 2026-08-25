import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // First run downloads MongoDB binary (~780MB). Allow 5 minutes.
    testTimeout: 300000,
    hookTimeout: 300000,
    sequence: {
      // Run test files serially (only one file in any case)
      concurrent: false,
    },
  },
});
