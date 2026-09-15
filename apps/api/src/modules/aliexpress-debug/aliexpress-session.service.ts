import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'node:crypto';

import { env } from '../../config/env';
import { AliExpressSessionRepository } from './aliexpress-session.repository';

type EncryptedCookieMap = {
  version: 1;
  salt: string;
  iv: string;
  authTag: string;
  ciphertext: string;
};

type SessionRepository = Pick<AliExpressSessionRepository, 'find' | 'save'>;

export type CookieMap = Record<string, string>;
export type AliExpressSessionSource = 'bootstrap' | 'database';

export type MtopToken = {
  token: string;
  expiresAt: string | null;
};

export type AliExpressSessionContext = {
  cookies: CookieMap;
  source: AliExpressSessionSource;
  getToken: () => MtopToken | null;
  applySetCookies: (setCookieHeaders: string[]) => Promise<string[]>;
};

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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isEncryptedCookieMap = (value: unknown): value is EncryptedCookieMap => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.version === 1 &&
    typeof value.salt === 'string' &&
    typeof value.iv === 'string' &&
    typeof value.authTag === 'string' &&
    typeof value.ciphertext === 'string'
  );
};

const deriveEncryptionKey = (secret: string, salt: Buffer) => scryptSync(secret, salt, 32);

function asCookieMap(value: unknown): CookieMap | null {
  if (!isRecord(value)) {
    return null;
  }

  const entries = Object.entries(value);
  if (entries.every(([, cookieValue]) => typeof cookieValue === 'string')) {
    return Object.fromEntries(entries) as CookieMap;
  }

  return null;
}

function legacyJarToCookieMap(value: unknown): CookieMap | null {
  if (!isRecord(value) || !Array.isArray(value.cookies)) {
    return null;
  }

  const cookies: CookieMap = {};
  for (const serializedCookie of value.cookies) {
    if (!isRecord(serializedCookie)) {
      continue;
    }

    if (typeof serializedCookie.key === 'string' && typeof serializedCookie.value === 'string') {
      cookies[serializedCookie.key] = serializedCookie.value;
    }
  }

  return Object.keys(cookies).length > 0 ? cookies : null;
}

export function parseCookieHeader(cookieHeader: string): CookieMap {
  const cookies: CookieMap = {};

  for (const rawSegment of cookieHeader.split(';')) {
    const segment = rawSegment.trimStart();
    const separator = segment.indexOf('=');
    if (separator <= 0) {
      continue;
    }

    const name = segment.slice(0, separator).trim();
    if (name === '') {
      continue;
    }

    cookies[name] = segment.slice(separator + 1);
  }

  return cookies;
}

export function buildCookieHeader(cookies: CookieMap): string {
  return Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}

export function applySetCookies(
  cookies: CookieMap,
  setCookieHeaders: string[],
  now: Date = new Date(),
): string[] {
  const changedCookieNames: string[] = [];

  for (const setCookieHeader of setCookieHeaders) {
    const parts = setCookieHeader.split(';');
    const firstPart = parts.shift()?.trimStart();
    const separator = firstPart?.indexOf('=') ?? -1;
    if (separator <= 0 || !firstPart) {
      continue;
    }

    const name = firstPart.slice(0, separator).trim();
    const value = firstPart.slice(separator + 1);
    let shouldDelete = false;

    for (const attribute of parts) {
      const trimmedAttribute = attribute.trim();
      const attributeSeparator = trimmedAttribute.indexOf('=');
      const attributeName = (
        attributeSeparator === -1 ? trimmedAttribute : trimmedAttribute.slice(0, attributeSeparator)
      ).toLowerCase();
      const attributeValue =
        attributeSeparator === -1 ? '' : trimmedAttribute.slice(attributeSeparator + 1).trim();

      if (attributeName === 'max-age' && Number(attributeValue) <= 0) {
        shouldDelete = true;
      }

      if (attributeName === 'expires') {
        const expiresAt = new Date(attributeValue);
        if (!Number.isNaN(expiresAt.valueOf()) && expiresAt <= now) {
          shouldDelete = true;
        }
      }
    }

    if (shouldDelete) {
      if (name in cookies) {
        delete cookies[name];
        changedCookieNames.push(name);
      }
      continue;
    }

    if (cookies[name] !== value) {
      cookies[name] = value;
      changedCookieNames.push(name);
    }
  }

  return changedCookieNames;
}

export function encryptCookieMap(cookies: CookieMap, secret: string): string {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', deriveEncryptionKey(secret, salt), iv);
  const plaintext = Buffer.from(JSON.stringify(cookies), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);

  return JSON.stringify({
    version: 1,
    salt: salt.toString('base64url'),
    iv: iv.toString('base64url'),
    authTag: cipher.getAuthTag().toString('base64url'),
    ciphertext: ciphertext.toString('base64url'),
  } satisfies EncryptedCookieMap);
}

export function decryptCookieMap(encryptedCookies: string, secret: string): {
  cookies: CookieMap;
  requiresMigration: boolean;
} {
  let parsedEnvelope: unknown;
  try {
    parsedEnvelope = JSON.parse(encryptedCookies);
  } catch {
    throw new Error('The persisted AliExpress session cannot be decrypted.');
  }

  if (!isEncryptedCookieMap(parsedEnvelope)) {
    throw new Error('The persisted AliExpress session has an invalid format.');
  }

  try {
    const salt = Buffer.from(parsedEnvelope.salt, 'base64url');
    const iv = Buffer.from(parsedEnvelope.iv, 'base64url');
    const authTag = Buffer.from(parsedEnvelope.authTag, 'base64url');
    const ciphertext = Buffer.from(parsedEnvelope.ciphertext, 'base64url');
    const decipher = createDecipheriv('aes-256-gcm', deriveEncryptionKey(secret, salt), iv);
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    const parsedCookies: unknown = JSON.parse(plaintext);
    const cookies = asCookieMap(parsedCookies);

    if (cookies) {
      return { cookies, requiresMigration: false };
    }

    const legacyCookies = legacyJarToCookieMap(parsedCookies);
    if (legacyCookies) {
      return { cookies: legacyCookies, requiresMigration: true };
    }
  } catch {
    throw new Error('The persisted AliExpress session cannot be decrypted.');
  }

  throw new Error('The persisted AliExpress session has an invalid format.');
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

export function getMtopTokenFromCookieMap(cookies: CookieMap): MtopToken | null {
  const tokenCookie = cookies._m_h5_tk;
  return tokenCookie ? extractMtopToken(tokenCookie) : null;
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
        await this.repository.save(encryptCookieMap(loadedSession.cookies, this.encryptionKey));
      };

      return operation({
        cookies: loadedSession.cookies,
        source: loadedSession.source,
        getToken: () => getMtopTokenFromCookieMap(loadedSession.cookies),
        applySetCookies: async (setCookieHeaders) => {
          const changedCookieNames = applySetCookies(loadedSession.cookies, setCookieHeaders);
          if (changedCookieNames.length > 0) {
            await persist();
          }
          return changedCookieNames;
        },
      });
    });
  }

  async reseed(): Promise<{ cookieCount: number; tokenExpiresAt: string | null }> {
    return this.mutex.runExclusive(async () => {
      if (!this.bootstrapCookie) {
        throw new Error('ALIEXPRESS_COOKIE is required to reseed the session.');
      }

      const cookies = parseCookieHeader(this.bootstrapCookie);
      if (Object.keys(cookies).length === 0) {
        throw new Error('ALIEXPRESS_COOKIE does not contain valid cookie pairs.');
      }

      await this.repository.save(encryptCookieMap(cookies, this.encryptionKey));
      return {
        cookieCount: Object.keys(cookies).length,
        tokenExpiresAt: getMtopTokenFromCookieMap(cookies)?.expiresAt ?? null,
      };
    });
  }

  private async loadSession(): Promise<{ cookies: CookieMap; source: AliExpressSessionSource }> {
    const storedSession = await this.repository.find();
    if (storedSession) {
      const decryptedSession = decryptCookieMap(storedSession.encryptedCookieJar, this.encryptionKey);
      if (decryptedSession.requiresMigration) {
        await this.repository.save(encryptCookieMap(decryptedSession.cookies, this.encryptionKey));
      }

      return { cookies: decryptedSession.cookies, source: 'database' };
    }

    if (!this.bootstrapCookie) {
      throw new Error('An AliExpress session has not been initialized.');
    }

    const cookies = parseCookieHeader(this.bootstrapCookie);
    if (Object.keys(cookies).length === 0) {
      throw new Error('ALIEXPRESS_COOKIE does not contain valid cookie pairs.');
    }

    await this.repository.save(encryptCookieMap(cookies, this.encryptionKey));
    return { cookies, source: 'bootstrap' };
  }
}

export const aliexpressSessionService = new AliExpressSessionService();
