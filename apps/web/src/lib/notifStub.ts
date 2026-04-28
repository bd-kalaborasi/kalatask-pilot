/**
 * Notification emission stub — Sprint 2 Q3 owner answer:
 * defer notif ke watchers ke Sprint 3 (task_watchers + notifications
 * table belum exist).
 *
 * Pattern: panggil emitTaskNotifStub() di tempat yang seharusnya emit notif
 * untuk audit trail. Saat Sprint 3, replace body dengan real Supabase
 * Realtime broadcast atau RPC ke notifications table.
 *
 * TODO Sprint 3 (KT-S3-NOTIF-01): Replace stub dengan real notif emission.
 *   Dependencies: task_watchers table, notifications table, RLS policies.
 *   Refer: PRD F7 (notification escalation), PRD F3 AC-2 (notif ke watchers
 *   saat Kanban drag).
 */

interface NotifStubArgs {
  /** Event yang trigger notif. */
  event: 'task_status_changed';
  /** Task affected */
  taskId: string;
  /** Field detail untuk help debugging */
  detail?: Record<string, unknown>;
}

export function emitTaskNotifStub(args: NotifStubArgs): void {
  // Sprint 2 stub — log only, no side effect.
  // Sprint 3 akan implement: insert ke notifications + broadcast Realtime.
  if (typeof console !== 'undefined') {
    // eslint-disable-next-line no-console
    console.debug('[notif-stub:Sprint3-defer]', args);
  }
}
