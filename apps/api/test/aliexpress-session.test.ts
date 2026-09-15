import { describe, expect, it, vi } from 'vitest';

import {
  AliExpressSessionService,
  applySetCookies,
  buildCookieHeader,
  decryptCookieMap,
  encryptCookieMap,
  parseCookieHeader,
} from '../src/modules/aliexpress-debug/aliexpress-session.service';

const encryptionKey = 'a long secret used only by this test suite';

describe('AliExpress session persistence', () => {
  it('parses a Cookie header without truncating values containing equals signs', () => {
    expect(parseCookieHeader('first=one==two; second=abc%3Ddef==; third=value')).toEqual({
      first: 'one==two',
      second: 'abc%3Ddef==',
      third: 'value',
    });
  });

  it('builds a Cookie header from the persisted map without altering values', () => {
    expect(
      buildCookieHeader({ first: 'one==two', second: 'abc%3Ddef==', third: 'value' }),
    ).toBe('first=one==two; second=abc%3Ddef==; third=value');
  });

  it('applies Set-Cookie values without saving attributes in the map', () => {
    const cookies = { existing: 'unchanged' };

    const changed = applySetCookies(
      cookies,
      ['_m_h5_tk=token==value; Path=/; Domain=.aliexpress.com; Secure; HttpOnly; SameSite=None'],
      new Date('2030-01-01T00:00:00.000Z'),
    );

    expect(changed).toEqual(['_m_h5_tk']);
    expect(cookies).toEqual({ existing: 'unchanged', _m_h5_tk: 'token==value' });
  });

  it('removes cookies expired by Max-Age or Expires', () => {
    const cookies = { byMaxAge: 'one', byExpires: 'two', active: 'three' };

    applySetCookies(
      cookies,
      [
        'byMaxAge=updated; Max-Age=0',
        'byExpires=updated; Expires=Mon, 01 Jan 2001 00:00:00 GMT',
      ],
      new Date('2030-01-01T00:00:00.000Z'),
    );

    expect(cookies).toEqual({ active: 'three' });
  });

  it('encrypts and decrypts a cookie map', () => {
    const cookies = { _m_h5_tk: 'token_1893456000000', valueWithEquals: 'one==two' };
    const encrypted = encryptCookieMap(cookies, encryptionKey);
    const decrypted = decryptCookieMap(encrypted, encryptionKey);

    expect(encrypted).not.toContain('token_1893456000000');
    expect(decrypted).toEqual({ cookies, requiresMigration: false });
  });

  it('uses ALIEXPRESS_COOKIE only when no database session exists', async () => {
    const repository = {
      find: vi.fn().mockResolvedValueOnce(undefined).mockResolvedValueOnce({
        encryptedCookieJar: encryptCookieMap(
          { _m_h5_tk: 'database-token_1893456000000' },
          encryptionKey,
        ),
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      save: vi.fn().mockResolvedValue(undefined),
    };
    const sessionService = new AliExpressSessionService(
      repository,
      encryptionKey,
      '_m_h5_tk=bootstrap-token_1893456000000',
    );

    const first = await sessionService.withSession(async (session) => session.getToken());
    const second = await sessionService.withSession(async (session) => session.getToken());

    expect(first?.token).toBe('bootstrap-token');
    expect(second?.token).toBe('database-token');
    expect(repository.save).toHaveBeenCalledTimes(1);
  });

  it('reseeds by replacing the stored session without reading the previous one', async () => {
    const repository = {
      find: vi.fn(),
      save: vi.fn().mockResolvedValue(undefined),
    };
    const sessionService = new AliExpressSessionService(
      repository,
      encryptionKey,
      '_m_h5_tk=reseed-token_1893456000000; valueWithEquals=one==two',
    );

    const result = await sessionService.reseed();
    const encryptedCookies = repository.save.mock.calls[0]?.[0];

    expect(repository.find).not.toHaveBeenCalled();
    expect(decryptCookieMap(encryptedCookies, encryptionKey).cookies).toEqual({
      _m_h5_tk: 'reseed-token_1893456000000',
      valueWithEquals: 'one==two',
    });
    expect(result).toEqual({
      cookieCount: 2,
      tokenExpiresAt: '2030-01-01T00:00:00.000Z',
    });
  });
});
