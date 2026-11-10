import { describe, it, expect } from 'vitest';
import { isValidUrl } from '../utils/validation';

describe('validation utils', () => {
  it('accepts valid http/https URLs', () => {
    expect(isValidUrl('https://example.com')).toBe(true);
    expect(isValidUrl('http://localhost')).toBe(true);
  });

  it('rejects invalid URLs', () => {
    expect(isValidUrl('ftp://example.com')).toBe(false);
    expect(isValidUrl('not-a-url')).toBe(false);
  });
});
