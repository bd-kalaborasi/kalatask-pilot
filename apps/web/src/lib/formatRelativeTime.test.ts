import { describe, expect, it } from 'vitest';
import { formatRelativeTimeID } from './formatRelativeTime';

const NOW = new Date('2026-04-28T12:00:00Z');

describe('formatRelativeTimeID', () => {
  it('< 1 menit → "Baru saja"', () => {
    expect(formatRelativeTimeID('2026-04-28T11:59:30Z', NOW)).toBe('Baru saja');
  });

  it('5 menit lalu', () => {
    expect(formatRelativeTimeID('2026-04-28T11:55:00Z', NOW)).toBe('5 menit lalu');
  });

  it('2 jam lalu', () => {
    expect(formatRelativeTimeID('2026-04-28T10:00:00Z', NOW)).toBe('2 jam lalu');
  });

  it('3 hari lalu', () => {
    expect(formatRelativeTimeID('2026-04-25T12:00:00Z', NOW)).toBe('3 hari lalu');
  });

  it('2 minggu lalu', () => {
    expect(formatRelativeTimeID('2026-04-14T12:00:00Z', NOW)).toBe('2 minggu lalu');
  });

  it('> 30 hari → fallback DD-MM-YYYY', () => {
    expect(formatRelativeTimeID('2026-03-01T12:00:00Z', NOW)).toBe('01-03-2026');
  });

  it('null safe', () => {
    expect(formatRelativeTimeID(null, NOW)).toBe('—');
  });

  it('invalid date → em-dash', () => {
    expect(formatRelativeTimeID('not-a-date', NOW)).toBe('—');
  });
});
