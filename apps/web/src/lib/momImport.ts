/**
 * MoM Import client lib — parser + RPC wrappers.
 *
 * Sprint 5 F9. Plaud Template v2 format:
 *   - Heading `# Notulensi Rapat`
 *   - Metadata block (Tanggal, Judul, Project Terkait, Peserta)
 *   - `## ACTION ITEMS` section
 *   - `### [ACTION-XXX]` per item dengan field bullets:
 *     - Tugas, PIC, Deadline, Prioritas, Project, Estimasi Jam, Konteks, Status Awal
 *
 * Parser tolerant: trim whitespace, regex bullet detection, skip
 * malformed sections (collect parse_errors).
 */
import { supabase } from '@/lib/supabase';

export interface ParsedAction {
  action_id: string;
  title: string;
  pic: string;
  deadline: string | null;
  priority: string;
  project: string;
  estimated_hours: string;
  description: string;
  status_initial: string;
}

export interface ParsedMoM {
  title: string | null;
  mom_date: string | null;
  participants: string[];
  actions: ParsedAction[];
  parse_errors: string[];
}

const ACTION_HEADER_RE = /^###\s+\[(ACTION-\d+)\]\s*$/;
const FIELD_RE = /^-\s+([^:]+):\s*(.*)$/;

const FIELD_KEYS: Record<string, keyof ParsedAction> = {
  tugas: 'title',
  pic: 'pic',
  deadline: 'deadline',
  prioritas: 'priority',
  project: 'project',
  'estimasi jam': 'estimated_hours',
  konteks: 'description',
  'status awal': 'status_initial',
};

function normalizeKey(k: string): string {
  return k.toLowerCase().trim();
}

export function parseMoM(markdown: string): ParsedMoM {
  const lines = markdown.split(/\r?\n/);
  const result: ParsedMoM = {
    title: null,
    mom_date: null,
    participants: [],
    actions: [],
    parse_errors: [],
  };

  let inMetadata = false;
  let inActionItems = false;
  let inParticipants = false;
  let currentAction: ParsedAction | null = null;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();

    // Detect sections
    if (/^##\s+Metadata/i.test(trimmed)) {
      inMetadata = true;
      inActionItems = false;
      inParticipants = false;
      continue;
    }
    if (/^##\s+ACTION\s+ITEMS/i.test(trimmed)) {
      inActionItems = true;
      inMetadata = false;
      inParticipants = false;
      continue;
    }
    if (/^##\s+/i.test(trimmed)) {
      // Other section — exit state
      inMetadata = false;
      inActionItems = false;
      inParticipants = false;
    }

    // Metadata fields
    if (inMetadata) {
      const m = trimmed.match(FIELD_RE);
      if (m) {
        const key = normalizeKey(m[1]);
        const value = m[2].trim();
        if (key === 'tanggal') {
          result.mom_date = value;
        } else if (key === 'judul rapat') {
          result.title = value;
        } else if (key === 'peserta') {
          inParticipants = true;
        } else {
          inParticipants = false;
        }
      } else if (inParticipants && trimmed.startsWith('-')) {
        const participant = trimmed.replace(/^-\s+/, '').trim();
        if (participant) result.participants.push(participant);
      }
    }

    // ACTION items
    if (inActionItems) {
      const headerMatch = trimmed.match(ACTION_HEADER_RE);
      if (headerMatch) {
        if (currentAction) {
          result.actions.push(currentAction);
        }
        currentAction = {
          action_id: headerMatch[1],
          title: '',
          pic: '',
          deadline: null,
          priority: 'medium',
          project: '',
          estimated_hours: 'N/A',
          description: '',
          status_initial: 'todo',
        };
        continue;
      }

      if (currentAction) {
        const m = trimmed.match(FIELD_RE);
        if (m) {
          const fieldName = FIELD_KEYS[normalizeKey(m[1])];
          if (fieldName) {
            let val = m[2].trim();
            // Normalize values
            if (fieldName === 'priority') {
              val = val.toLowerCase();
            } else if (fieldName === 'deadline') {
              if (val === 'TBD' || val === '') {
                (currentAction as ParsedAction).deadline = null;
                continue;
              }
            } else if (fieldName === 'status_initial') {
              val = val.toLowerCase();
            }
            (currentAction as unknown as Record<string, unknown>)[fieldName] = val;
          }
        }
      }
    }
  }

  if (currentAction) {
    result.actions.push(currentAction);
  }

  // Validation pass
  if (result.actions.length === 0) {
    result.parse_errors.push('No ACTION items found di MoM body');
  }
  for (const a of result.actions) {
    if (!a.title) {
      result.parse_errors.push(`${a.action_id}: missing Tugas (title)`);
    }
    if (!a.pic) {
      result.parse_errors.push(`${a.action_id}: missing PIC`);
    }
  }

  return result;
}

export interface MoMImportSummary {
  total: number;
  high: number;
  medium: number;
  low: number;
  unresolved: number;
}

export interface MoMImportRow {
  id: string;
  file_name: string;
  mom_date: string | null;
  title: string | null;
  approval_status: string;
  parse_summary: MoMImportSummary;
  created_at: string;
}

export interface MoMItemRow {
  id: string;
  mom_import_id: string;
  action_id: string;
  raw_pic: string | null;
  pic_resolved_user_id: string | null;
  pic_confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNRESOLVED';
  pic_candidates: { user_id: string; full_name: string; distance: number; match_type: string }[];
  title: string;
  description: string | null;
  deadline: string | null;
  priority: string | null;
  estimated_hours: number | null;
  project_name: string | null;
  decision: 'create' | 'update' | 'skip' | 'reject' | null;
  target_task_id: string | null;
  reviewed_at: string | null;
}

export async function uploadMoM(input: {
  file_name: string;
  raw_markdown: string;
  parsed: ParsedMoM;
}): Promise<string | null> {
  const { data, error } = await supabase.rpc('process_mom_upload', {
    p_file_name: input.file_name,
    p_mom_date: input.parsed.mom_date,
    p_title: input.parsed.title,
    p_raw_markdown: input.raw_markdown,
    p_actions: input.parsed.actions,
  });
  if (error) throw error;
  return (data as string | null) ?? null;
}

export async function approveMoMImport(importId: string): Promise<{
  tasks_created: number;
  items_processed: number;
}> {
  const { data, error } = await supabase.rpc('approve_mom_import', {
    p_import_id: importId,
  });
  if (error) throw error;
  return data as { tasks_created: number; items_processed: number };
}

export async function fetchMoMImports(): Promise<MoMImportRow[]> {
  const { data, error } = await supabase
    .from('mom_imports')
    .select('id, file_name, mom_date, title, approval_status, parse_summary, created_at')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) {
    console.error('[momImport] fetchMoMImports failed:', error);
    return [];
  }
  return (data as unknown as MoMImportRow[]) ?? [];
}

export async function fetchMoMImportById(id: string): Promise<{
  parent: MoMImportRow | null;
  items: MoMItemRow[];
}> {
  const [parentRes, itemsRes] = await Promise.all([
    supabase
      .from('mom_imports')
      .select('id, file_name, mom_date, title, approval_status, parse_summary, created_at')
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('mom_import_items')
      .select(
        'id, mom_import_id, action_id, raw_pic, pic_resolved_user_id, pic_confidence, pic_candidates, title, description, deadline, priority, estimated_hours, project_name, decision, target_task_id, reviewed_at',
      )
      .eq('mom_import_id', id)
      .order('action_id', { ascending: true }),
  ]);
  return {
    parent: (parentRes.data as MoMImportRow | null) ?? null,
    items: (itemsRes.data as unknown as MoMItemRow[]) ?? [],
  };
}

export async function updateItemDecision(
  itemId: string,
  decision: 'create' | 'update' | 'skip' | 'reject',
  pic_resolved_user_id: string | null,
): Promise<void> {
  const patch: Record<string, unknown> = { decision };
  if (pic_resolved_user_id !== undefined) {
    patch.pic_resolved_user_id = pic_resolved_user_id;
  }
  const { error } = await supabase
    .from('mom_import_items')
    .update(patch)
    .eq('id', itemId);
  if (error) throw error;
}
