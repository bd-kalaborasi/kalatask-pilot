/**
 * Unit tests untuk comments lib pure helpers.
 */
import { describe, expect, it } from 'vitest';
import { buildMentionToken, parseMentionUuids } from './comments';

describe('buildMentionToken', () => {
  it('builds Markdown-compatible token', () => {
    expect(
      buildMentionToken({
        id: '00000000-0000-0000-0000-000000000003',
        full_name: 'Andi Pratama',
      }),
    ).toBe('@[Andi Pratama](00000000-0000-0000-0000-000000000003)');
  });

  it('handles names with spaces and special chars', () => {
    expect(
      buildMentionToken({
        id: '00000000-0000-0000-0000-000000000099',
        full_name: 'Sari A. Wijaya',
      }),
    ).toBe('@[Sari A. Wijaya](00000000-0000-0000-0000-000000000099)');
  });
});

describe('parseMentionUuids', () => {
  it('returns empty for body without mentions', () => {
    expect(parseMentionUuids('Hello world')).toEqual([]);
  });

  it('extracts single UUID', () => {
    expect(
      parseMentionUuids(
        'Hi @[Andi](00000000-0000-0000-0000-000000000003) please review',
      ),
    ).toEqual(['00000000-0000-0000-0000-000000000003']);
  });

  it('extracts multiple distinct UUIDs', () => {
    const out = parseMentionUuids(
      '@[Andi](00000000-0000-0000-0000-000000000003) and @[Sari](00000000-0000-0000-0000-000000000002)',
    );
    expect(out.sort()).toEqual([
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000003',
    ]);
  });

  it('dedupes repeated UUID', () => {
    const out = parseMentionUuids(
      '@[Andi](00000000-0000-0000-0000-000000000003) and @[Andi again](00000000-0000-0000-0000-000000000003)',
    );
    expect(out).toEqual(['00000000-0000-0000-0000-000000000003']);
  });

  it('ignores invalid token format', () => {
    expect(parseMentionUuids('@[Bad](not-a-uuid)')).toEqual([]);
    expect(parseMentionUuids('@andi without brackets')).toEqual([]);
  });

  it('handles empty body', () => {
    expect(parseMentionUuids('')).toEqual([]);
  });
});
