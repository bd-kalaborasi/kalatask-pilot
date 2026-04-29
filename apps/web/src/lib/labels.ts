/**
 * Centralized i18n labels — refined Asana/Monday-style microcopy.
 *
 * Sprint 6 directive: action-oriented, conversational professional, specific
 * over generic, brevity, empty states sebagai opportunity, error states
 * sebagai recovery path.
 *
 * Source of truth untuk consistency across UI. BRAND.md v2 §"Microcopy
 * Guidelines" akan reference file ini.
 */
import type { TaskStatus, TaskPriority } from './tasks';

// ============================================================
// Status labels — refined per Stitch Phase 3 inspiration
// ============================================================
// Old: Todo / In Progress / Review / Done / Blocked (literal English)
// New: refined per project context profesional Indonesia (Asana/Monday-style)
export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  todo: 'Belum mulai',
  in_progress: 'Sedang dikerjakan',
  review: 'Cek ulang',
  done: 'Selesai',
  blocked: 'Tertahan',
};

export const TASK_STATUS_LABEL_SHORT: Record<TaskStatus, string> = {
  todo: 'Belum mulai',
  in_progress: 'Dikerjakan',
  review: 'Cek',
  done: 'Selesai',
  blocked: 'Tertahan',
};

// ============================================================
// Priority labels
// ============================================================
export const TASK_PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: 'Rendah',
  medium: 'Sedang',
  high: 'Tinggi',
  urgent: 'Sangat penting',
};

// ============================================================
// Project status labels
// ============================================================
export const PROJECT_STATUS_LABEL: Record<string, string> = {
  planning: 'Perencanaan',
  active: 'Aktif',
  on_hold: 'Ditahan',
  completed: 'Selesai',
  archived: 'Diarsipkan',
};

// ============================================================
// Action button labels — verb-led, concise
// ============================================================
export const ACTION = {
  // Task primary actions
  CREATE_TASK: 'Buat tugas',
  CREATE_TASK_FIRST: 'Buat tugas pertama',
  EDIT_TASK: 'Edit tugas',
  DELETE_TASK: 'Hapus tugas',
  MARK_DONE: 'Tandai selesai',
  REASSIGN: 'Ganti penanggung jawab',

  // Generic
  SAVE: 'Simpan',
  CANCEL: 'Batal',
  CONFIRM: 'Konfirmasi',
  DELETE: 'Hapus',
  CLOSE: 'Tutup',
  REFRESH: 'Refresh',
  RETRY: 'Coba lagi',
  SUBMIT: 'Kirim',
  SEARCH: 'Cari',
  FILTER: 'Filter',

  // Project
  CREATE_PROJECT: 'Buat project',
  OPEN_PROJECT: 'Buka project',
  ARCHIVE_PROJECT: 'Arsipkan',

  // Comment
  POST_COMMENT: 'Kirim komen',
  EDIT_COMMENT: 'Edit',
  DELETE_COMMENT: 'Hapus',

  // Auth
  SIGN_IN: 'Masuk',
  SIGN_OUT: 'Keluar',

  // MoM Import
  UPLOAD_MOM: 'Unggah MoM',
  APPROVE_HIGH: 'Approve HIGH saja',
  APPROVE_COMMIT: 'Approve & buat tugas',
  CREATE: 'Buat',
  SKIP: 'Lewati',
  REJECT: 'Tolak',

  // CSV Import
  UPLOAD_CSV: 'Unggah CSV',
  COMMIT_IMPORT: 'Import sekarang',
  DOWNLOAD_ERRORS: 'Unduh laporan error',

  // Tutorial
  REOPEN_TUTORIAL: 'Buka tutorial lagi',
  NEXT_STEP: 'Lanjut',
  PREV_STEP: 'Mundur',
  SKIP_TUTORIAL: 'Lewati tutorial',
  FINISH_TUTORIAL: 'Selesai',
} as const;

// ============================================================
// Empty states — onboarding opportunity
// ============================================================
export const EMPTY_STATE = {
  PROJECTS_NO_PROJECTS: {
    icon: '📁',
    title: 'Belum ada project di sini',
    body:
      'Project membantu kamu kelompokkan tugas terkait. Yuk buat yang pertama untuk mulai kerja bareng tim.',
    cta: 'Buat project pertama',
  },
  PROJECTS_FILTER_NO_MATCH: {
    icon: '🔍',
    title: 'Tidak ada project yang cocok',
    body: 'Coba ubah filter atau reset semua untuk lihat semua project.',
    cta: 'Reset filter',
  },
  TASKS_EMPTY: {
    icon: '✨',
    title: 'Project ini siap dimulai',
    body:
      'Klik "Buat tugas" untuk tambah tugas pertama, atau biarkan Cowork agent generate dari MoM rapat besok.',
    cta: 'Buat tugas pertama',
  },
  TASKS_FILTER_NO_MATCH: {
    icon: '🔎',
    title: 'Tidak ada tugas yang cocok',
    body: 'Coba longgarkan filter atau reset untuk lihat semua tugas.',
    cta: 'Reset filter',
  },
  COMMENTS_EMPTY: {
    icon: '💬',
    title: 'Mulai diskusi tugas ini',
    body:
      'Tinggalkan komen untuk update progress, ajukan pertanyaan, atau mention rekan dengan @nama.',
  },
  WORKLOAD_EMPTY: {
    icon: '👥',
    title: 'Belum ada anggota di tim ini',
    body:
      'Tambah anggota tim dulu, baru workload akan menampilkan sebaran tugas mereka.',
  },
  BOTTLENECK_NONE: {
    icon: '🎉',
    title: 'Tidak ada bottleneck — semua lancar!',
    body: 'Tim kamu mengelola tugas dengan baik. Lanjutkan momentumnya.',
  },
  MOM_IMPORTS_EMPTY: {
    icon: '📋',
    title: 'Belum ada MoM yang diunggah',
    body:
      'Unggah file MoM Plaud untuk mulai proses parsing otomatis. Hasil parsing akan muncul di sini untuk direview.',
  },
  USAGE_NO_DATA: {
    icon: '📊',
    title: 'Sedang mengumpulkan data',
    body: 'Klik refresh untuk fetch data terbaru dari Supabase.',
    cta: 'Refresh data',
  },
  NOTIFICATIONS_EMPTY: {
    icon: '🔔',
    title: 'Inbox kamu bersih',
    body: 'Notifikasi baru akan muncul di sini ketika ada update tugas.',
  },
} as const;

// ============================================================
// Error messages — specific + actionable recovery
// ============================================================
export const ERROR = {
  GENERIC: {
    title: 'Sesuatu tidak beres',
    body: 'Coba lagi. Kalau masih bermasalah, hubungi admin.',
  },
  NETWORK: {
    title: 'Koneksi internet terputus',
    body: 'Cek koneksi kamu dan coba lagi.',
  },
  PERMISSION_DENIED: {
    title: 'Akses ditolak',
    body: 'Akun kamu tidak punya akses ke halaman ini. Hubungi admin kalau ini tidak benar.',
  },
  NOT_FOUND: {
    title: 'Tidak ditemukan',
    body: 'Halaman atau data ini sudah tidak ada, atau kamu salah klik link.',
  },
  TASK_SAVE_FAILED: {
    title: 'Gagal simpan tugas',
    body: 'Update tidak terkirim. Cek koneksi atau coba lagi.',
  },
  COMMENT_POST_FAILED: {
    title: 'Komen gagal terkirim',
    body: 'Mungkin koneksi terputus. Coba kirim ulang.',
  },
  UPLOAD_TOO_LARGE: {
    title: 'File terlalu besar',
    body: 'Maksimal 5 MB. Cek ukuran file dan coba lagi.',
  },
  UPLOAD_INVALID_FORMAT: {
    title: 'Format file tidak didukung',
    body: 'Pastikan file dalam format yang sesuai (.md untuk MoM, .csv untuk import bulk).',
  },
} as const;

// ============================================================
// Toast messages — short, friendly
// ============================================================
export const TOAST = {
  TASK_CREATED: 'Tugas berhasil dibuat',
  TASK_UPDATED: 'Tugas berhasil diupdate',
  TASK_DELETED: 'Tugas berhasil dihapus',
  COMMENT_POSTED: 'Komen terkirim',
  COMMENT_UPDATED: 'Komen diupdate',
  COMMENT_DELETED: 'Komen dihapus',
  PROJECT_CREATED: 'Project berhasil dibuat',
  PROJECT_ARCHIVED: 'Project diarsipkan',
  IMPORT_SUCCESS: 'Import selesai',
  COPIED: 'Tersalin ke clipboard',
} as const;

// ============================================================
// Form placeholders + helper text
// ============================================================
export const PLACEHOLDER = {
  TASK_TITLE: 'Apa yang perlu dikerjakan?',
  TASK_DESCRIPTION: 'Tambahkan konteks atau deskripsi (opsional)',
  COMMENT_BODY: 'Tulis komen... pakai @ untuk mention',
  PROJECT_NAME: 'Nama project',
  SEARCH_TASKS: 'Cari tugas...',
  SEARCH_PROJECTS: 'Cari project...',
  EMAIL: 'kamu@kalaborasi.com',
  PASSWORD: 'Kata sandi',
} as const;

// ============================================================
// Confirmation dialog copy
// ============================================================
export const CONFIRM = {
  DELETE_TASK: {
    title: 'Hapus tugas ini?',
    body: 'Tugas akan dihapus permanen dan tidak bisa dikembalikan.',
    confirm: 'Ya, hapus',
    cancel: 'Batal',
  },
  DELETE_COMMENT: {
    title: 'Hapus komen ini?',
    body: 'Komen akan dihapus permanen.',
    confirm: 'Ya, hapus',
    cancel: 'Batal',
  },
  ARCHIVE_PROJECT: {
    title: 'Arsipkan project?',
    body: 'Project tidak akan muncul di list, tapi data tetap aman dan bisa di-unarchive.',
    confirm: 'Ya, arsipkan',
    cancel: 'Batal',
  },
} as const;
