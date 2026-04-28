import { describe, expect, it } from 'vitest';
import { formatDateID, formatDeadlineRelative } from './formatDate';

describe('formatDateID', () => {
  it('format ISO string ke DD-MM-YYYY', () => {
    expect(formatDateID('2026-05-15')).toBe('15-05-2026');
  });

  it('handle null/undefined dengan em-dash', () => {
    expect(formatDateID(null)).toBe('—');
    expect(formatDateID(undefined)).toBe('—');
  });

  it('handle Date object', () => {
    expect(formatDateID(new Date('2026-12-31T00:00:00Z'))).toBe('31-12-2026');
  });

  it('reject invalid date', () => {
    expect(formatDateID('not-a-date')).toBe('—');
  });
});

describe('formatDeadlineRelative', () => {
  const today = new Date('2026-04-28T05:00:00Z');

  it('hari ini', () => {
    expect(formatDeadlineRelative('2026-04-28', today)).toBe('Hari ini');
  });

  it('besok', () => {
    expect(formatDeadlineRelative('2026-04-29', today)).toBe('Besok');
  });

  it('kemarin', () => {
    expect(formatDeadlineRelative('2026-04-27', today)).toBe('Kemarin');
  });

  it('N hari lagi', () => {
    expect(formatDeadlineRelative('2026-05-03', today)).toBe('5 hari lagi');
  });

  it('N hari lalu', () => {
    expect(formatDeadlineRelative('2026-04-22', today)).toBe('6 hari lalu');
  });

  it('null safe', () => {
    expect(formatDeadlineRelative(null, today)).toBe('—');
  });
});
