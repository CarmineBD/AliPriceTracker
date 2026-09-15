import { CookieJar } from 'tough-cookie';
import { describe, expect, it, vi } from 'vitest';

import {
  AliExpressSessionService,
  decryptCookieJar,
  encryptCookieJar,
  extractMtopToken,
} from '../src/modules/aliexpress-debug/aliexpress-session.service';

const encryptionKey = 'a long secret used only by this test suite';

describe('AliExpress session persistence', () => {
  it('extracts the token and expiry from _m_h5_tk', () => {
    expect(extractMtopToken('abc_def%2Fghi_1893456000000')).toEqual({
      token: 'abc_def/ghi',
      expiresAt: '2030-01-01T00:00:00.000Z',
    });
  });

  it('encrypts and decrypts a Cookie Jar', async () => {
    const jar = new CookieJar();
    await jar.setCookie('_m_h5_tk=token_1893456000000', 'https://acs.aliexpress.com/');
    const encrypted = encryptCookieJar(await jar.serialize(), encryptionKey);
    const restoredJar = await CookieJar.deserialize(decryptCookieJar(encrypted, encryptionKey));

    expect(encrypted).not.toContain('token_1893456000000');
    expect((await restoredJar.getCookies('https://acs.aliexpress.com/'))[0]?.value).toBe(
      'token_1893456000000',
    );
  });

  it('uses ALIEXPRESS_COOKIE only when no database session exists', async () => {
    const storedJar = new CookieJar();
    await storedJar.setCookie('_m_h5_tk=database-token_1893456000000', 'https://acs.aliexpress.com/');
    const persistedSession = {
      encryptedCookieJar: encryptCookieJar(await storedJar.serialize(), encryptionKey),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const repository = {
      find: vi.fn().mockResolvedValueOnce(undefined).mockResolvedValueOnce(persistedSession),
      save: vi.fn().mockResolvedValue(undefined),
    };
    const sessionService = new AliExpressSessionService(
      repository,
      encryptionKey,
      '_m_h5_tk=bootstrap-token_1893456000000',
    );

    const first = await sessionService.withSession((session) => session.getToken());
    const second = await sessionService.withSession((session) => session.getToken());

    expect(first?.token).toBe('bootstrap-token');
    expect(second?.token).toBe('database-token');
    expect(repository.save).toHaveBeenCalled();
  });
});
