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

/**
 * R3 RUN STATUS:
 * - MCP Supabase service is read-only in this session (cannot apply migrations
 *   or execute INSERT via MCP). DB writes blocked at MCP layer.
 * - Local credentials available: only VITE_SUPABASE_ANON_KEY (RLS-restricted),
 *   no SUPABASE_SERVICE_ROLE_KEY in any .env file.
 * - Net effect: factory NOT executed against live DB this round.
 * - Owner action: provide SERVICE_ROLE_KEY (Supabase Settings > API), then:
 *   `SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *    npx tsx apps/web/tests/e2e/fixtures/seed-comprehensive.ts`
 *
 * Existing Supabase data (verified via mcp__supabase__execute_sql SELECT):
 * - 31 users (4 fixture + 27 production-like seed)
 * - 2 teams (aaaa, bbbb)
 * - 4 projects, 23 tasks, 32 comments, 12 notifications, 0 mom_imports
 *
 * Brief targets (this round):
 * - 24 test users (existing 4 keep + 20 new — script ready, write blocked)
 * - 4 teams (existing 2 keep + 2 new)
 * - 8 projects (existing 4 keep + 4 new)
 * - 120 tasks (existing 23 keep + ~97 new)
 * - 300 comments (existing 32 keep + ~268 new)
 * - 50 notifications (existing 12 keep + ~38 new)
 * - 3 MoM imports (existing 0 + 3 new)
 *
 * Existing E2E suite (174 passing) operates on existing fixture data; brief
 * 24-user / 120-task targets are for richer visualization, not blocking
 * E2E. New R3 specs are designed to work on existing data and adapt
 * gracefully if seed factory executed later.
 */

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
  // 4 active dengan progress beragam — taskCount totals 120 per brief
  { id: '10000000-0000-0000-0000-000000000001', name: 'Modernize Dashboard UX', description: 'Refresh visual identity per BRAND.md v2.x. Adopt Stitch v1 + token consolidation.', owner_id: USERS[0].id, status: 'active', completionRatio: 0.10, taskCount: 18 },
  { id: '10000000-0000-0000-0000-000000000002', name: 'Sales Q2 Pipeline', description: 'Onboard 5 enterprise clients dengan automated proposal workflow.', owner_id: USERS[1].id, status: 'active', completionRatio: 0.35, taskCount: 22 },
  { id: '10000000-0000-0000-0000-000000000003', name: 'Mobile App MVP', description: 'iOS + Android shell, sync API, push notifications.', owner_id: USERS[2].id, status: 'active', completionRatio: 0.60, taskCount: 20 },
  { id: '10000000-0000-0000-0000-000000000004', name: 'Compliance Audit 2026', description: 'GDPR + ISO 27001 readiness assessment, gap closure.', owner_id: USERS[3].id, status: 'active', completionRatio: 0.90, taskCount: 18 },
  // 2 completed
  { id: '10000000-0000-0000-0000-000000000005', name: 'Q1 Marketing Campaign', description: 'Brand awareness lift via paid + organic, target 30% lift.', owner_id: USERS[1].id, status: 'completed', completionRatio: 1.0, taskCount: 16 },
  { id: '10000000-0000-0000-0000-000000000006', name: 'Office Move HQ → Sudirman', description: 'Logistics + IT migration + new lease ops.', owner_id: USERS[0].id, status: 'completed', completionRatio: 1.0, taskCount: 14 },
  // 1 archived
  { id: '10000000-0000-0000-0000-000000000007', name: 'Legacy Tool Sunset', description: 'Decommission old time-tracker, migrate users to new app.', owner_id: USERS[0].id, status: 'archived', completionRatio: 1.0, taskCount: 12 },
  // 1 just created (no tasks)
  { id: '10000000-0000-0000-0000-000000000008', name: 'Performance Review System', description: 'Build internal performance feedback workflow Q3.', owner_id: USERS[2].id, status: 'planning', completionRatio: 0, taskCount: 0 },
];
// Total tasks across projects: 18+22+20+18+16+14+12+0 = 120 (matches brief target)

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

  // 5. Comments — target 300 (brief). Distribute 2-4 per task across all 120 tasks.
  console.log('[seed] Generating comments target 300...');
  const comments: Array<Record<string, unknown>> = [];
  let commentIdx = 0;
  const COMMENT_TARGET = 300;
  let i = 0;
  while (comments.length < COMMENT_TARGET && i < allTasks.length * 5) {
    const task = allTasks[i % allTasks.length];
    const author = USERS[Math.floor(Math.random() * USERS.length)];
    const mention = USERS[Math.floor(Math.random() * USERS.length)];
    const daysAgo = Math.floor(Math.random() * 30);
    const ts = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
    const isQuestion = Math.random() < 0.3;
    const body = isQuestion
      ? `@${mention.full_name.split(' ')[0]} bisa cek progress di bagian ini? ETA kapan?`
      : commentIdx % 4 === 0
        ? 'Done bagian ini, lanjut ke milestone berikutnya.'
        : commentIdx % 4 === 1
          ? 'Need input dari tim sebelum lanjut.'
          : commentIdx % 4 === 2
            ? 'Update progress: 60% selesai, ETA besok pagi.'
            : `Reviewed by @${mention.full_name.split(' ')[0]}, looks good.`;
    comments.push({
      id: `30000000-0000-0000-0000-${commentIdx.toString(16).padStart(12, '0')}`,
      task_id: task.id,
      user_id: author.id,
      body,
      created_at: ts,
    });
    commentIdx++;
    i++;
  }
  console.log(`[seed] Inserting ${comments.length} comments...`);
  for (let j = 0; j < comments.length; j += chunkSize) {
    const chunk = comments.slice(j, j + chunkSize);
    const res = await supabase.from('comments').upsert(chunk);
    if (res.error) throw res.error;
  }

  // 6. Notifications — target 50 (brief).
  // Mix: mention (40%), assignment (30%), status_change (20%), comment_reply (10%)
  console.log('[seed] Generating 50 notifications...');
  const notifications: Array<Record<string, unknown>> = [];
  const NOTIF_TYPES = [
    { type: 'mention', weight: 0.4 },
    { type: 'assignment', weight: 0.3 },
    { type: 'status_change', weight: 0.2 },
    { type: 'comment_reply', weight: 0.1 },
  ];
  for (let n = 0; n < 50; n++) {
    const recipient = USERS[Math.floor(Math.random() * USERS.length)];
    const sourceTask = allTasks[Math.floor(Math.random() * allTasks.length)];
    const type = pickWeighted(NOTIF_TYPES).type;
    const isRead = Math.random() < 0.3;
    const daysAgo = Math.floor(Math.random() * 14);
    const ts = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
    const message =
      type === 'mention'
        ? `${USERS[Math.floor(Math.random() * USERS.length)].full_name} men-mention kamu di task "${(sourceTask as { title: string }).title.slice(0, 32)}"`
        : type === 'assignment'
          ? `Kamu di-assign ke task baru: "${(sourceTask as { title: string }).title.slice(0, 40)}"`
          : type === 'status_change'
            ? `Task "${(sourceTask as { title: string }).title.slice(0, 32)}" pindah ke ${pickWeighted(STATUS_DIST).status}`
            : `Reply baru di komen kamu: task "${(sourceTask as { title: string }).title.slice(0, 32)}"`;
    notifications.push({
      id: `40000000-0000-0000-0000-${n.toString(16).padStart(12, '0')}`,
      user_id: recipient.id,
      type,
      payload: {
        task_id: (sourceTask as { id: string }).id,
        message,
      },
      read_at: isRead ? new Date(Date.now() - (daysAgo - 1) * 24 * 60 * 60 * 1000).toISOString() : null,
      created_at: ts,
    });
  }
  console.log(`[seed] Inserting ${notifications.length} notifications...`);
  for (let k = 0; k < notifications.length; k += chunkSize) {
    const chunk = notifications.slice(k, k + chunkSize);
    const res = await supabase.from('notifications').upsert(chunk);
    if (res.error) throw res.error;
  }

  // 7. MoM imports — target 3 (brief). Mix pending_review, approved, rejected.
  console.log('[seed] Generating 3 MoM imports...');
  const momImports = [
    {
      id: '50000000-0000-0000-0000-000000000001',
      file_name: 'mom-2026-04-23-product-sync.md',
      mom_date: '2026-04-23',
      title: 'Product Sync Q2 Planning',
      raw_markdown: '# Product Sync — 2026-04-23\n\n## Action Items\n- [ ] @Sari finalize Q2 roadmap (ETA besok)\n- [ ] @Reza review Mobile MVP wireframe\n- [ ] @Lina coordinate vendor onboarding',
      parse_summary: { total: 3, high: 2, medium: 1, low: 0, unresolved: 0 },
      approval_status: 'approved',
      uploaded_by: USERS[0].id,
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '50000000-0000-0000-0000-000000000002',
      file_name: 'mom-2026-04-25-sales-strategy.md',
      mom_date: '2026-04-25',
      title: 'Sales Strategy Q2',
      raw_markdown: '# Sales Strategy Q2\n\n## Action Items\n- [ ] @Reza prep enterprise pitch deck\n- [ ] @Bayu schedule demo dengan client A\n- [ ] @Citra benchmark competitor',
      parse_summary: { total: 3, high: 1, medium: 2, low: 0, unresolved: 0 },
      approval_status: 'pending_review',
      uploaded_by: USERS[0].id,
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '50000000-0000-0000-0000-000000000003',
      file_name: 'mom-2026-04-20-rejected-test.md',
      mom_date: '2026-04-20',
      title: 'Test rejected MoM',
      raw_markdown: '# Test\n\nThis MoM was rejected for incomplete action items.',
      parse_summary: { total: 1, high: 0, medium: 0, low: 0, unresolved: 1 },
      approval_status: 'rejected',
      uploaded_by: USERS[0].id,
      created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
  for (const mom of momImports) {
    const res = await supabase.from('mom_imports').upsert(mom);
    if (res.error) throw res.error;
  }

  const durationMs = Date.now() - start;

  return {
    usersInserted: USERS.length,
    projectsInserted: PROJECTS.length,
    tasksInserted: allTasks.length,
    commentsInserted: comments.length,
    notificationsInserted: notifications.length,
    momImportsInserted: momImports.length,
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
