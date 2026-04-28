/**
 * TypeScript declaration untuk frappe-gantt v1.2.2.
 *
 * Per ADR-003, library tidak ship .d.ts. Declaration ini cover hanya
 * surface yang dipakai di GanttView.tsx — keep minimal, expand kalau
 * use-case bertambah di Sprint berikutnya.
 *
 * Source of truth: official repo https://github.com/frappe/gantt
 *
 * Pin version 1.2.2 — kalau library upgrade, re-validate signature.
 */
declare module 'frappe-gantt' {
  export interface GanttTaskInput {
    id: string;
    name: string;
    /** ISO date string YYYY-MM-DD or full ISO timestamp */
    start: string;
    /** ISO date string YYYY-MM-DD or full ISO timestamp */
    end: string;
    /** Progress 0-100. Optional. */
    progress?: number;
    /** Comma-separated dependency task IDs. Out of scope pilot per PRD §3.3. */
    dependencies?: string;
    /** Custom CSS class to apply to task bar */
    custom_class?: string;
  }

  export type GanttViewMode =
    | 'Quarter Day'
    | 'Half Day'
    | 'Day'
    | 'Week'
    | 'Month'
    | 'Year';

  export interface GanttOptions {
    view_mode?: GanttViewMode;
    readonly?: boolean;
    bar_height?: number;
    bar_corner_radius?: number;
    padding?: number;
    /** Date format untuk popup, default 'MMM D' */
    date_format?: string;
    /** Click handler dipanggil dengan task data */
    on_click?: (task: GanttTaskInput) => void;
    /** Hover handler */
    custom_popup_html?: ((task: GanttTaskInput) => string) | null;
  }

  export default class Gantt {
    constructor(
      wrapper: string | HTMLElement | SVGElement,
      tasks: GanttTaskInput[],
      options?: GanttOptions,
    );
    /** Refresh dengan tasks baru */
    refresh(tasks: GanttTaskInput[]): void;
    /** Change view mode (Day/Week/Month/etc) */
    change_view_mode(mode: GanttViewMode): void;
  }
}
