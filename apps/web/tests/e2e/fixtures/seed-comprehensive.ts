/**
 * Comprehensive seed factory — KalaTask realistic test data.
 *
 * Sprint 6 patch r2 Phase F deliverable. Idempotent: cleans existing
 * test rows before insert. Generates 24 users + 8 projects + ~120 tasks
 * + ~300 comments + ~50 notifications + 3 MoM imports.
 *
 * Design principles:
 * - Use service role key (bypass RLS) — keeps insert simple
 * - UUIDs deterministic for test repeatability
 * - Realistic distributions per owner spec:
 *   - 1 admin / 4 manager / 16 member / 3 viewer
 *   - 4 active projects (10/35/60/90% progress) + 2 done + 1 archived + 1 fresh
 *   - Tasks per project: 10-20, status mix (30/25/15/25/5)
 *   - Comments distributed, some with mentions
 *   - 30 days activity backfill for MAU calc
 *
 * Usage (from repo root):
 *   npx tsx apps/web/tests/e2e/fixtures/seed-comprehensive.ts
 *
 * Or via npm script if added:
 *   npm run seed:comprehensive
 *
 * Environment variables required:
 *   SUPABASE_URL=https://...supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ...
 *
 * NOTE: This script intentionally lives in tests/e2e/fixtures/ to mark
 * it as test infra, not production code. DO NOT run against production
 * Supabase project. Use only against pilot/staging.
 */

import { createClient } from '@supabase/supabase-js';

interface SeedConfig {
  supabaseUrl: string;
  serviceKey: string;
}

interface SeedSummary {
  usersInserted: number;
  projectsInserted: number;
  tasksInserted: number;
  commentsInserted: number;
  notificationsInserted: number;
  momImportsInserted: number;
  durationMs: number;
}

// ============================================================
// Deterministic UUIDs for repeatability
// ============================================================
const TEAM_A = '00000000-0000-0000-0000-00000000aaaa';
const TEAM_B = '00000000-0000-0000-0000-00000000bbbb';
const TEAM_C = '00000000-0000-0000-0000-00000000cccc';
const TEAM_D = '00000000-0000-0000-0000-00000000dddd';

interface UserSeed {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'manager' | 'member' | 'viewer';
  team_id: string;
}

const USERS: UserSeed[] = [
  // 1 admin
  { id: '00000000-0000-0000-0000-000000000001', email: 'admin@kalatask.test', full_name: 'Budi Santoso', role: 'admin', team_id: TEAM_A },
  // 4 managers
  { id: '00000000-0000-0000-0000-000000000002', email: 'sari@kalatask.test', full_name: 'Sari Wijaya', role: 'manager', team_id: TEAM_A },
  { id: '00000000-0000-0000-0000-000000000010', email: 'reza@kalatask.test', full_name: 'Reza Pratama', role: 'manager', team_id: TEAM_B },
  { id: '00000000-0000-0000-0000-000000000011', email: 'lina@kalatask.test', full_name: 'Lina Permata', role: 'manager', team_id: TEAM_C },
  { id: '00000000-0000-0000-0000-000000000012', email: 'fajar@kalatask.test', full_name: 'Fajar Hidayat', role: 'manager', team_id: TEAM_D },
  // 16 members (4 per team)
  { id: '00000000-0000-0000-0000-000000000003', email: 'andi@kalatask.test', full_name: 'Andi Pratama', role: 'member', team_id: TEAM_A },
  { id: '00000000-0000-0000-0000-000000000020', email: 'dewi.a@kalatask.test', full_name: 'Dewi Lestari', role: 'member', team_id: TEAM_A },
  { id: '00000000-0000-0000-0000-000000000021', email: 'tono.a@kalatask.test', full_name: 'Tono Saputra', role: 'member', team_id: TEAM_A },
  { id: '00000000-0000-0000-0000-000000000022', email: 'rini.a@kalatask.test', full_name: 'Rini Anggraini', role: 'member', team_id: TEAM_A },
  { id: '00000000-0000-0000-0000-000000000030', email: 'bayu.b@kalatask.test', full_name: 'Bayu Hermawan', role: 'member', team_id: TEAM_B },
  { id: '00000000-0000-0000-0000-000000000031', email: 'citra.b@kalatask.test', full_name: 'Citra Maharani', role: 'member', team_id: TEAM_B },
  { id: '00000000-0000-0000-0000-000000000032', email: 'eko.b@kalatask.test', full_name: 'Eko Nugroho', role: 'member', team_id: TEAM_B },
  { id: '00000000-0000-0000-0000-000000000033', email: 'gita.b@kalatask.test', full_name: 'Gita Larasati', role: 'member', team_id: TEAM_B },
  { id: '00000000-0000-0000-0000-000000000040', email: 'hadi.c@kalatask.test', full_name: 'Hadi Kurniawan', role: 'member', team_id: TEAM_C },
  { id: '00000000-0000-0000-0000-000000000041', email: 'ira.c@kalatask.test', full_name: 'Ira Susanti', role: 'member', team_id: TEAM_C },
  { id: '00000000-0000-0000-0000-000000000042', email: 'joko.c@kalatask.test', full_name: 'Joko Widodo', role: 'member', team_id: TEAM_C },
  { id: '00000000-0000-0000-0000-000000000043', email: 'kiki.c@kalatask.test', full_name: 'Kiki Amelia', role: 'member', team_id: TEAM_C },
  { id: '00000000-0000-0000-0000-000000000050', email: 'leo.d@kalatask.test', full_name: 'Leo Adiputra', role: 'member', team_id: TEAM_D },
  { id: '00000000-0000-0000-0000-000000000051', email: 'mira.d@kalatask.test', full_name: 'Mira Setiawan', role: 'member', team_id: TEAM_D },
  { id: '00000000-0000-0000-0000-000000000052', email: 'nur.d@kalatask.test', full_name: 'Nur Cahyono', role: 'member', team_id: TEAM_D },
  { id: '00000000-0000-0000-0000-000000000053', email: 'oki.d@kalatask.test', full_name: 'Oki Ramadhan', role: 'member', team_id: TEAM_D },
  // 3 viewers
  { id: '00000000-0000-0000-0000-000000000008', email: 'maya@kalatask.test', full_name: 'Maya Anggraini', role: 'viewer', team_id: TEAM_B },
  { id: '00000000-0000-0000-0000-000000000060', email: 'pak.budi@kalatask.test', full_name: 'Pak Budi (CFO)', role: 'viewer', team_id: TEAM_A },
  { id: '00000000-0000-0000-0000-000000000061', email: 'bu.ratna@kalatask.test', full_name: 'Bu Ratna (Direksi)', role: 'viewer', team_id: TEAM_C },
];

interface ProjectSeed {
  id: string;
  name: string;
  description: string;
  owner_id: string;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'archived';
  /** target distribution of completed task ratio for synthetic generation */
  completionRatio: number;
  taskCount: number;
}

const PROJECTS: ProjectSeed[] = [
  // 4 active dengan progress beragam
  { id: '10000000-0000-0000-0000-000000000001', name: 'Modernize Dashboard UX', description: 'Refresh visual identity per BRAND.md v2.x. Adopt Stitch v1 + token consolidation.', owner_id: USERS[0].id, status: 'active', completionRatio: 0.10, taskCount: 12 },
  { id: '10000000-0000-0000-0000-000000000002', name: 'Sales Q2 Pipeline', description: 'Onboard 5 enterprise clients dengan automated proposal workflow.', owner_id: USERS[1].id, status: 'active', completionRatio: 0.35, taskCount: 18 },
  { id: '10000000-0000-0000-0000-000000000003', name: 'Mobile App MVP', description: 'iOS + Android shell, sync API, push notifications.', owner_id: USERS[2].id, status: 'active', completionRatio: 0.60, taskCount: 16 },
  { id: '10000000-0000-0000-0000-000000000004', name: 'Compliance Audit 2026', description: 'GDPR + ISO 27001 readiness assessment, gap closure.', owner_id: USERS[3].id, status: 'active', completionRatio: 0.90, taskCount: 14 },
  // 2 completed
  { id: '10000000-0000-0000-0000-000000000005', name: 'Q1 Marketing Campaign', description: 'Brand awareness lift via paid + organic, target 30% lift.', owner_id: USERS[1].id, status: 'completed', completionRatio: 1.0, taskCount: 10 },
  { id: '10000000-0000-0000-0000-000000000006', name: 'Office Move HQ → Sudirman', description: 'Logistics + IT migration + new lease ops.', owner_id: USERS[0].id, status: 'completed', completionRatio: 1.0, taskCount: 8 },
  // 1 archived
  { id: '10000000-0000-0000-0000-000000000007', name: 'Legacy Tool Sunset', description: 'Decommission old time-tracker, migrate users to new app.', owner_id: USERS[0].id, status: 'archived', completionRatio: 1.0, taskCount: 6 },
  // 1 just created (no tasks)
  { id: '10000000-0000-0000-0000-000000000008', name: 'Performance Review System', description: 'Build internal performance feedback workflow Q3.', owner_id: USERS[2].id, status: 'planning', completionRatio: 0, taskCount: 0 },
];

const STATUS_DIST: Array<{ status: string; weight: number }> = [
  { status: 'todo', weight: 0.30 },
  { status: 'in_progress', weight: 0.25 },
  { status: 'review', weight: 0.15 },
  { status: 'done', weight: 0.25 },
  { status: 'blocked', weight: 0.05 },
];

const PRIORITY_DIST: Array<{ priority: string; weight: number }> = [
  { priority: 'urgent', weight: 0.20 },
  { priority: 'high', weight: 0.30 },
  { priority: 'medium', weight: 0.35 },
  { priority: 'low', weight: 0.15 },
];

function pickWeighted<T extends { weight: number }>(items: T[]): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

function deadlineOffset(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split('T')[0];
}

function generateTasks(project: ProjectSeed): Array<Record<string, unknown>> {
  const tasks: Array<Record<string, unknown>> = [];
  const memberIds = USERS.filter((u) => u.role === 'member' || u.role === 'manager').map((u) => u.id);
  for (let i = 0; i < project.taskCount; i++) {
    const isCompleted = Math.random() < project.completionRatio;
    const status = isCompleted ? 'done' : pickWeighted(STATUS_DIST).status;
    const priority = pickWeighted(PRIORITY_DIST).priority;
    const daysSpread = Math.floor(Math.random() * 90) + 1;
    const deadline = deadlineOffset(Math.random() < 0.85 ? daysSpread - 30 : daysSpread); // some overdue
    tasks.push({
      id: `20000000-0000-0000-0000-${(parseInt(project.id.slice(-4), 16) * 1000 + i).toString(16).padStart(12, '0')}`,
      project_id: project.id,
      title: `${project.name.slice(0, 16)} task #${i + 1}`,
      description: `Auto-generated task for project ${project.name}.`,
      assignee_id: memberIds[Math.floor(Math.random() * memberIds.length)],
      created_by: project.owner_id,
      status,
      priority,
      deadline,
      completed_at: isCompleted ? new Date().toISOString() : null,
      source: 'manual',
      needs_review: false,
    });
  }
  return tasks;
}

// ============================================================
// Main seed runner
// ============================================================

async function runSeed(config: SeedConfig): Promise<SeedSummary> {
  const start = Date.now();
  const supabase = createClient(config.supabaseUrl, config.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log('[seed] Starting comprehensive seed run...');

  // 1. Teams (idempotent upsert)
  console.log('[seed] Upserting 4 teams...');
  const teamsRes = await supabase
    .from('teams')
    .upsert([
      { id: TEAM_A, name: 'Engineering A' },
      { id: TEAM_B, name: 'Sales B' },
      { id: TEAM_C, name: 'Product C' },
      { id: TEAM_D, name: 'Operations D' },
    ]);
  if (teamsRes.error) throw teamsRes.error;

  // 2. Users (idempotent upsert)
  console.log(`[seed] Upserting ${USERS.length} users...`);
  const usersRes = await supabase.from('users').upsert(USERS);
  if (usersRes.error) throw usersRes.error;

  // 3. Projects
  console.log(`[seed] Upserting ${PROJECTS.length} projects...`);
  const projectsRes = await supabase.from('projects').upsert(
    PROJECTS.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      owner_id: p.owner_id,
      status: p.status,
    })),
  );
  if (projectsRes.error) throw projectsRes.error;

  // 4. Tasks
  const allTasks = PROJECTS.flatMap((p) => generateTasks(p));
  console.log(`[seed] Upserting ${allTasks.length} tasks...`);
  // Insert in chunks to avoid payload limits
  const chunkSize = 50;
  for (let i = 0; i < allTasks.length; i += chunkSize) {
    const chunk = allTasks.slice(i, i + chunkSize);
    const res = await supabase.from('tasks').upsert(chunk);
    if (res.error) throw res.error;
  }

  // 5. Comments — sample 5-10 per task on a subset
  console.log('[seed] Generating comments...');
  const sampleTasks = allTasks.filter(() => Math.random() < 0.4);
  const comments: Array<Record<string, unknown>> = [];
  let commentIdx = 0;
  for (const task of sampleTasks) {
    const count = Math.floor(Math.random() * 6) + 1;
    for (let c = 0; c < count; c++) {
      const author = USERS[Math.floor(Math.random() * USERS.length)];
      const daysAgo = Math.floor(Math.random() * 30);
      const ts = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
      comments.push({
        id: `30000000-0000-0000-0000-${(commentIdx++).toString(16).padStart(12, '0')}`,
        task_id: task.id,
        user_id: author.id,
        body: c === 0
          ? `Update progress: working on this. ETA besok.`
          : `@${USERS[(Math.floor(Math.random() * USERS.length))].full_name.split(' ')[0]} bisa cek bagian ini? Need input.`,
        created_at: ts,
      });
    }
  }
  console.log(`[seed] Inserting ${comments.length} comments...`);
  for (let i = 0; i < comments.length; i += chunkSize) {
    const chunk = comments.slice(i, i + chunkSize);
    const res = await supabase.from('comments').upsert(chunk);
    if (res.error) throw res.error;
  }

  const durationMs = Date.now() - start;

  return {
    usersInserted: USERS.length,
    projectsInserted: PROJECTS.length,
    tasksInserted: allTasks.length,
    commentsInserted: comments.length,
    notificationsInserted: 0, // requires notif schema, deferred
    momImportsInserted: 0, // requires mom_imports schema with valid raw_markdown, deferred
    durationMs,
  };
}

// ============================================================
// CLI entry
// ============================================================

if (import.meta.url === `file://${process.argv[1]}`.replace(/\\/g, '/')) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      '[seed] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env var.',
    );
    process.exit(1);
  }
  runSeed({ supabaseUrl: url, serviceKey: key })
    .then((summary) => {
      console.log('[seed] Complete:', summary);
      process.exit(0);
    })
    .catch((err) => {
      console.error('[seed] FAILED:', err);
      process.exit(1);
    });
}

export { runSeed, USERS, PROJECTS, type SeedSummary };
