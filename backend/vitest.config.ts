import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // The unit tests never touch the database (auth guards bail out before any
    // query), but Prisma reads these env vars when the client is constructed.
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'file:./dev.db',
      JWT_SECRET: 'craft2market-test-secret',
    },
  },
});
