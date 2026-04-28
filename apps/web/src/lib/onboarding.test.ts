/**
 * Unit tests untuk onboarding state machine helpers.
 * Pure functions — no Supabase mocking needed.
 */
import { describe, expect, it } from 'vitest';
import {
  shouldSeedSample,
  shouldShowWizard,
  tooltipSeen,
} from './onboarding';

describe('shouldSeedSample', () => {
  it('returns true when sample_seeded is undefined', () => {
    expect(shouldSeedSample({})).toBe(true);
  });

  it('returns true when sample_seeded is false', () => {
    expect(shouldSeedSample({ sample_seeded: false })).toBe(true);
  });

  it('returns false when sample_seeded is true', () => {
    expect(shouldSeedSample({ sample_seeded: true })).toBe(false);
  });
});

describe('shouldShowWizard', () => {
  it('shows wizard when both flags undefined', () => {
    expect(shouldShowWizard({})).toBe(true);
  });

  it('hides wizard when tutorial_done=true', () => {
    expect(shouldShowWizard({ tutorial_done: true })).toBe(false);
  });

  it('hides wizard when tutorial_skipped=true', () => {
    expect(shouldShowWizard({ tutorial_skipped: true })).toBe(false);
  });

  it('shows wizard when both flags reset to false (reopen)', () => {
    expect(
      shouldShowWizard({ tutorial_done: false, tutorial_skipped: false }),
    ).toBe(true);
  });
});

describe('tooltipSeen', () => {
  it('returns false for empty tooltips_seen', () => {
    expect(tooltipSeen({}, 'kanban-drag')).toBe(false);
  });

  it('returns false when key not in array', () => {
    expect(
      tooltipSeen({ tooltips_seen: ['view-toggle'] }, 'kanban-drag'),
    ).toBe(false);
  });

  it('returns true when key in array', () => {
    expect(
      tooltipSeen({ tooltips_seen: ['kanban-drag'] }, 'kanban-drag'),
    ).toBe(true);
  });
});
