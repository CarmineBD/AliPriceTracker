import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'node:crypto';

import { CookieJar } from 'tough-cookie';

import { env } from '../../config/env';
import { AliExpressSessionRepository } from './aliexpress-session.repository';

const aliexpressMtopUrl = 'https://acs.aliexpress.com/h5/mtop.aliexpress.pdp.pc.query/1.0/';

type EncryptedCookieJar = {
  version: 1;
  salt: string;
  iv: string;
  authTag: string;
  ciphertext: string;
};

type SessionRepository = Pick<AliExpressSessionRepository, 'find' | 'save'>;

export type AliExpressSessionSource = 'bootstrap' | 'database';

export type MtopToken = {
  token: string;
  expiresAt: string | null;
};

export type AliExpressSessionContext = {
  jar: CookieJar;
  source: AliExpressSessionSource;
  getToken: () => Promise<MtopToken | null>;
  persist: () => Promise<void>;
};

type SerializedCookieJar = Awaited<ReturnType<CookieJar['serialize']>>;

class AsyncMutex {
  private tail: Promise<void> = Promise.resolve();

  async runExclusive<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.tail;
    let release: () => void;
    this.tail = new Promise<void>((resolve) => {
      release = resolve;
    });

    await previous;
    try {
      return await operation();
    } finally {
      release!();
    }
  }
}

const isEncryptedCookieJar = (value: unknown): value is EncryptedCookieJar => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const envelope = value as Record<string, unknown>;
  return (
    envelope.version === 1 &&
    typeof envelope.salt === 'string' &&
    typeof envelope.iv === 'string' &&
    typeof envelope.authTag === 'string' &&
    typeof envelope.ciphertext === 'string'
  );
};

const deriveEncryptionKey = (secret: string, salt: Buffer) => scryptSync(secret, salt, 32);

export function encryptCookieJar(serializedJar: SerializedCookieJar, secret: string): string {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', deriveEncryptionKey(secret, salt), iv);
  const plaintext = Buffer.from(JSON.stringify(serializedJar), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);

  return JSON.stringify({
    version: 1,
    salt: salt.toString('base64url'),
    iv: iv.toString('base64url'),
    authTag: cipher.getAuthTag().toString('base64url'),
    ciphertext: ciphertext.toString('base64url'),
  } satisfies EncryptedCookieJar);
}

export function decryptCookieJar(encryptedJar: string, secret: string): SerializedCookieJar {
  let parsed: unknown;
  try {
    parsed = JSON.parse(encryptedJar);
  } catch {
    throw new Error('The persisted AliExpress session cannot be decrypted.');
  }

  if (!isEncryptedCookieJar(parsed)) {
    throw new Error('The persisted AliExpress session has an invalid format.');
  }

  try {
    const salt = Buffer.from(parsed.salt, 'base64url');
    const iv = Buffer.from(parsed.iv, 'base64url');
    const authTag = Buffer.from(parsed.authTag, 'base64url');
    const ciphertext = Buffer.from(parsed.ciphertext, 'base64url');
    const decipher = createDecipheriv('aes-256-gcm', deriveEncryptionKey(secret, salt), iv);
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');

    return JSON.parse(plaintext) as SerializedCookieJar;
  } catch {
    throw new Error('The persisted AliExpress session cannot be decrypted.');
  }
}

export async function createCookieJarFromHeader(cookieHeader: string): Promise<CookieJar> {
  const jar = new CookieJar();
  const cookiePairs = cookieHeader
    .split(';')
    .map((pair) => pair.trim())
    .filter((pair) => pair.indexOf('=') > 0);

  if (cookiePairs.length === 0) {
    throw new Error('ALIEXPRESS_COOKIE does not contain valid cookie pairs.');
  }

  for (const pair of cookiePairs) {
    await jar.setCookie(`${pair}; Domain=acs.aliexpress.com; Path=/`, aliexpressMtopUrl);
  }

  return jar;
}

export function extractMtopToken(cookieValue: string): MtopToken | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(cookieValue);
  } catch {
    return null;
  }

  const lastUnderscore = decoded.lastIndexOf('_');
  if (lastUnderscore <= 0) {
    return null;
  }

  const token = decoded.slice(0, lastUnderscore);
  const expiresAtMilliseconds = Number(decoded.slice(lastUnderscore + 1));
  const expiresAt = new Date(expiresAtMilliseconds);

  return {
    token,
    expiresAt: Number.isFinite(expiresAtMilliseconds) && !Number.isNaN(expiresAt.valueOf())
      ? expiresAt.toISOString()
      : null,
  };
}

export async function getMtopTokenFromJar(jar: CookieJar): Promise<MtopToken | null> {
  const tokenCookie = (await jar.getCookies(aliexpressMtopUrl)).find(
    (cookie) => cookie.key === '_m_h5_tk',
  );

  return tokenCookie ? extractMtopToken(tokenCookie.value) : null;
}

export class AliExpressSessionService {
  private readonly mutex = new AsyncMutex();

  constructor(
    private readonly repository: SessionRepository = new AliExpressSessionRepository(),
    private readonly encryptionKey: string = env.ALIEXPRESS_SESSION_ENCRYPTION_KEY,
    private readonly bootstrapCookie: string | undefined = env.ALIEXPRESS_COOKIE,
  ) {}

  async withSession<T>(operation: (session: AliExpressSessionContext) => Promise<T>): Promise<T> {
    return this.mutex.runExclusive(async () => {
      const loadedSession = await this.loadSession();
      const persist = async () => {
        const serializedJar = await loadedSession.jar.serialize();
        await this.repository.save(encryptCookieJar(serializedJar, this.encryptionKey));
      };

      return operation({
        jar: loadedSession.jar,
        source: loadedSession.source,
        getToken: () => getMtopTokenFromJar(loadedSession.jar),
        persist,
      });
    });
  }

  private async loadSession(): Promise<{ jar: CookieJar; source: AliExpressSessionSource }> {
    const storedSession = await this.repository.find();
    if (storedSession) {
      return {
        jar: await CookieJar.deserialize(
          decryptCookieJar(storedSession.encryptedCookieJar, this.encryptionKey),
        ),
        source: 'database',
      };
    }

    if (!this.bootstrapCookie) {
      throw new Error('An AliExpress session has not been initialized.');
    }

    const jar = await createCookieJarFromHeader(this.bootstrapCookie);
    const serializedJar = await jar.serialize();
    await this.repository.save(encryptCookieJar(serializedJar, this.encryptionKey));

    return { jar, source: 'bootstrap' };
  }
}
