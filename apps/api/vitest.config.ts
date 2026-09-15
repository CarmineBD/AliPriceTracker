import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      R2_ACCOUNT_ID: 'test-account',
      R2_ACCESS_KEY_ID: 'test-access-key',
      R2_SECRET_ACCESS_KEY: 'test-secret-key',
      R2_BUCKET: 'test-bucket',
      R2_PUBLIC_URL: 'https://media.example.test',
      ALIEXPRESS_COOKIE: '_m_h5_tk=test-token_12345; test=value',
      DEBUG_API_KEY: 'test-debug-api-key',
    },
  },
});
