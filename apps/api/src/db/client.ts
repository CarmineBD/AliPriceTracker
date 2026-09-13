import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { env } from '../config/env';

const queryClient = env.DATABASE_URL
  ? postgres(env.DATABASE_URL, {
      max: 10,
      prepare: false,
    })
  : undefined;

export const db = queryClient ? drizzle({ client: queryClient }) : undefined;
