import { describe, expect, it } from 'vitest';

import { getPublicUrl } from '../src/services/storage.service';

describe('getPublicUrl', () => {
  it('joins the public base URL and object key without duplicate slashes', () => {
    expect(getPublicUrl('/products/abc/main.webp')).toBe(
      'https://media.example.test/products/abc/main.webp',
    );
  });
});
