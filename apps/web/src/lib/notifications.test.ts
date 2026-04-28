import { describe, expect, it } from 'vitest';
import { notifTier, type NotificationType } from './notifications';

describe('notifTier', () => {
  it.each<[NotificationType, 'normal' | 'warning' | 'urgent' | 'critical']>([
    ['assigned', 'normal'],
    ['status_done', 'normal'],
    ['mentioned', 'normal'],
    ['deadline_h3', 'warning'],
    ['deadline_h1', 'urgent'],
    ['overdue', 'critical'],
    ['escalation', 'critical'],
  ])('type "%s" → tier "%s"', (type, expected) => {
    expect(notifTier(type)).toBe(expected);
  });
});
