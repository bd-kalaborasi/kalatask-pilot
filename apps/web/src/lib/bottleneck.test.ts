import { describe, expect, it } from 'vitest';
import { daysSinceUpdate, isBottleneck } from './bottleneck';

const NOW = new Date('2026-04-28T12:00:00Z');

describe('isBottleneck', () => {
  it('todo task > threshold → true', () => {
    expect(
      isBottleneck(
        { status: 'todo', updated_at: '2026-04-20T12:00:00Z' },
        3,
        NOW,
      ),
    ).toBe(true);
  });

  it('in_progress task < threshold → false', () => {
    expect(
      isBottleneck(
        { status: 'in_progress', updated_at: '2026-04-27T12:00:00Z' },
        3,
        NOW,
      ),
    ).toBe(false);
  });

  it('done task even if old → false (excluded by status)', () => {
    expect(
      isBottleneck(
        { status: 'done', updated_at: '2026-04-01T12:00:00Z' },
        3,
        NOW,
      ),
    ).toBe(false);
  });

  it('blocked task even if old → false', () => {
    expect(
      isBottleneck(
        { status: 'blocked', updated_at: '2026-04-01T12:00:00Z' },
        3,
        NOW,
      ),
    ).toBe(false);
  });

  it('review task = 4 days old, threshold 3 → true', () => {
    expect(
      isBottleneck(
        { status: 'review', updated_at: '2026-04-24T11:00:00Z' },
        3,
        NOW,
      ),
    ).toBe(true);
  });
});

describe('daysSinceUpdate', () => {
  it('5 days ago', () => {
    expect(daysSinceUpdate('2026-04-23T12:00:00Z', NOW)).toBe(5);
  });

  it('today', () => {
    expect(daysSinceUpdate('2026-04-28T11:00:00Z', NOW)).toBe(0);
  });
});
