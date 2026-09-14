import 'dotenv/config';

import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema/*.ts',
  dialect: 'postgresql',
  dbCredentials: {
    // Generating a migration only needs the schema. Applying it still requires a real DATABASE_URL.
    url: process.env.DATABASE_URL ?? 'postgresql://user:password@localhost:5432/alitracker',
  },
});
