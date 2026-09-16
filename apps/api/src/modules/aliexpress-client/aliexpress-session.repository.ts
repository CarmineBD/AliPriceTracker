import { eq } from 'drizzle-orm';

import { getDatabase } from '../../db/client.js';
import { externalSessions } from '../../db/schema/external-sessions.js';

const aliexpressProvider = 'aliexpress';

export type PersistedAliExpressSession = {
  encryptedCookieJar: string;
  createdAt: Date;
  updatedAt: Date;
};

export class AliExpressSessionRepository {
  async find(): Promise<PersistedAliExpressSession | undefined> {
    const [session] = await getDatabase()
      .select({
        encryptedCookieJar: externalSessions.encryptedCookieJar,
        createdAt: externalSessions.createdAt,
        updatedAt: externalSessions.updatedAt,
      })
      .from(externalSessions)
      .where(eq(externalSessions.provider, aliexpressProvider));

    return session;
  }

  async save(encryptedCookieJar: string): Promise<void> {
    await getDatabase()
      .insert(externalSessions)
      .values({ provider: aliexpressProvider, encryptedCookieJar })
      .onConflictDoUpdate({
        target: externalSessions.provider,
        set: { encryptedCookieJar, updatedAt: new Date() },
      });
  }
}
