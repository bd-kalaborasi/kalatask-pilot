/**
 * Sprint 5 Vitest — parseMoM unit tests dengan 2 sample MoM real.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseMoM } from './momImport';

const ROOT = path.resolve(__dirname, '../../../../');
const SAMPLE_04_23 = readFileSync(
  path.join(ROOT, 'docs/sample-mom/04-23_Rapat_Mingguan_v2.md'),
  'utf-8',
);
const SAMPLE_04_24 = readFileSync(
  path.join(ROOT, 'docs/sample-mom/04-24_SCRUM_v2.md'),
  'utf-8',
);

describe('parseMoM — golden samples', () => {
  it('extracts metadata + 47 actions dari 04-23 sample', () => {
    const result = parseMoM(SAMPLE_04_23);
    expect(result.mom_date).toBe('2026-04-23');
    expect(result.title).toContain('Daily Stand-up');
    expect(result.actions).toHaveLength(47);
    expect(result.parse_errors).toEqual([]);
  });

  it('extracts metadata + 60 actions dari 04-24 sample', () => {
    const result = parseMoM(SAMPLE_04_24);
    expect(result.mom_date).toBe('2026-04-24');
    expect(result.actions).toHaveLength(60);
    expect(result.parse_errors).toEqual([]);
  });

  it('first action di 04-23 has correct fields', () => {
    const result = parseMoM(SAMPLE_04_23);
    const a1 = result.actions[0];
    expect(a1.action_id).toBe('ACTION-001');
    expect(a1.title).toContain('Catat peserta');
    expect(a1.pic).toBe('Mas Dime');
    expect(a1.priority).toBe('medium');
    expect(a1.deadline).toBeNull(); // TBD
  });

  it('handles [NAMA_TIDAK_JELAS] PIC values', () => {
    const result = parseMoM(SAMPLE_04_23);
    const unclear = result.actions.filter((a) => a.pic.startsWith('[NAMA_TIDAK_JELAS'));
    expect(unclear.length).toBeGreaterThan(0);
  });

  it('parses Urgent priority correctly', () => {
    const result = parseMoM(SAMPLE_04_23);
    const urgent = result.actions.filter((a) => a.priority === 'urgent');
    expect(urgent.length).toBeGreaterThan(0);
  });

  it('parses YYYY-MM-DD deadline format', () => {
    const result = parseMoM(SAMPLE_04_23);
    const withDeadline = result.actions.filter((a) => a.deadline?.match(/^\d{4}-\d{2}-\d{2}$/));
    expect(withDeadline.length).toBeGreaterThan(0);
  });
});

describe('parseMoM — edge cases', () => {
  it('returns empty actions untuk empty markdown', () => {
    const result = parseMoM('');
    expect(result.actions).toHaveLength(0);
    expect(result.parse_errors).toContain('No ACTION items found di MoM body');
  });

  it('returns empty actions untuk markdown tanpa ACTION ITEMS section', () => {
    const result = parseMoM('# Just a title\n\nSome text without action items.');
    expect(result.actions).toHaveLength(0);
  });

  it('handles malformed action header gracefully', () => {
    const md = `## ACTION ITEMS

### [BADHEADER]
- Tugas: This should not be parsed
- PIC: Someone
`;
    const result = parseMoM(md);
    expect(result.actions).toHaveLength(0);
  });

  it('parses minimal valid action item', () => {
    const md = `# Notulensi
## Metadata
- Tanggal: 2026-05-01
## ACTION ITEMS
### [ACTION-001]
- Tugas: Minimal task
- PIC: Mas Yudi
- Deadline: TBD
- Prioritas: Medium
- Project: Test
- Estimasi Jam: N/A
- Konteks: Some context
- Status Awal: Todo
`;
    const result = parseMoM(md);
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].title).toBe('Minimal task');
    expect(result.actions[0].pic).toBe('Mas Yudi');
    expect(result.actions[0].deadline).toBeNull();
    expect(result.actions[0].priority).toBe('medium');
  });
});
