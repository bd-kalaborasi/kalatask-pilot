/**
 * Tailwind config — KalaTask
 * Source: docs/BRAND.md v1.0 + src/styles/theme.css
 *
 * Strategi: theme.css adalah source of truth untuk runtime values
 * (CSS vars). Tailwind config di-map ke CSS vars supaya:
 *   1. Dark mode otomatis ikut (cukup toggle <html class="dark">)
 *   2. Token bisa dipakai dari CSS plain (var(--kt-deep)) maupun
 *      Tailwind class (bg-brand-deep)
 *   3. Tidak ada duplikasi nilai hex di 2 tempat
 *
 * Untuk update token: edit theme.css dulu, lalu sync mapping di sini
 * jika perlu nama Tailwind class baru.
 */

import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // ============================================================
      // COLORS
      // ============================================================
      colors: {
        // Primary brand
        'brand-deep': {
          DEFAULT: 'var(--kt-deep)',
          50:  'var(--kt-deep-50)',
          100: 'var(--kt-deep-100)',
          200: 'var(--kt-deep-200)',
          300: 'var(--kt-deep-300)',
          400: 'var(--kt-deep-400)',
          500: 'var(--kt-deep-500)',
          600: 'var(--kt-deep-600)',
          700: 'var(--kt-deep-700)',
          800: 'var(--kt-deep-800)',
        },
        'brand-sky': {
          DEFAULT: 'var(--kt-sky)',
          50:  'var(--kt-sky-50)',
          100: 'var(--kt-sky-100)',
          200: 'var(--kt-sky-200)',
          300: 'var(--kt-sky-300)',
          400: 'var(--kt-sky-400)',
          500: 'var(--kt-sky-500)',
          600: 'var(--kt-sky-600)',
          700: 'var(--kt-sky-700)',
          800: 'var(--kt-sky-800)',
        },

        // Status (PRD F1, F3, F4)
        status: {
          'todo':         'var(--kt-status-todo)',
          'todo-bg':      'var(--kt-status-todo-bg)',
          'progress':     'var(--kt-status-progress)',
          'progress-bg':  'var(--kt-status-progress-bg)',
          'review':       'var(--kt-status-review)',
          'review-bg':    'var(--kt-status-review-bg)',
          'done':         'var(--kt-status-done)',
          'done-bg':      'var(--kt-status-done-bg)',
          'blocked':      'var(--kt-status-blocked)',
          'blocked-bg':   'var(--kt-status-blocked-bg)',
        },

        // Notification tier (PRD F7)
        notif: {
          'normal':   'var(--kt-notif-normal)',
          'warning':  'var(--kt-notif-warning)',
          'urgent':   'var(--kt-notif-urgent)',
          'critical': 'var(--kt-notif-critical)',
        },

        // Source indicator (PRD F9, F15)
        source: {
          'manual': 'var(--kt-source-manual)',
          'cowork': 'var(--kt-source-cowork)',
          'csv':    'var(--kt-source-csv)',
        },

        // Semantic surface tokens (untuk dark mode handling)
        surface: 'var(--kt-surface)',
        canvas:  'var(--kt-bg)',

        // ============================================================
        // v2.1 Surface tonal scale (Sprint 6 holistic overhaul)
        // Use these instead of raw bg-zinc-* refs.
        // ============================================================
        'surface-bright':         'var(--kt-surface-bright)',
        'surface-container':      'var(--kt-surface-container)',
        'surface-container-low':  'var(--kt-surface-container-low)',
        'surface-container-high': 'var(--kt-surface-container-high)',
        'surface-dim':            'var(--kt-surface-dim)',

        // ============================================================
        // v2.1 Semantic feedback colors (replaces raw emerald/amber/red)
        // Pattern: bg-feedback-success, bg-feedback-success-bg, etc
        // ============================================================
        feedback: {
          success: {
            DEFAULT: 'var(--kt-success)',
            bg:      'var(--kt-success-bg)',
            border:  'var(--kt-success-border)',
          },
          warning: {
            DEFAULT: 'var(--kt-warning)',
            bg:      'var(--kt-warning-bg)',
            border:  'var(--kt-warning-border)',
          },
          danger: {
            DEFAULT: 'var(--kt-danger)',
            bg:      'var(--kt-danger-bg)',
            border:  'var(--kt-danger-border)',
          },
          info: {
            DEFAULT: 'var(--kt-info)',
            bg:      'var(--kt-info-bg)',
            border:  'var(--kt-info-border)',
          },
        },

        // ============================================================
        // shadcn/ui semantic tokens (HSL CSS vars di globals.css)
        // Dipakai oleh komponen yang di-generate via `npx shadcn add`.
        // KalaTask custom components tetap pakai brand-deep / brand-sky.
        // ============================================================
        border: 'hsl(var(--border))',
        'border-strong': 'var(--kt-border-strong)',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },

      // ============================================================
      // TYPOGRAPHY
      // ============================================================
      fontFamily: {
        sans: ['Inter', 'Helvetica Neue', 'Arial', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Consolas', 'monospace'],
      },

      // ============================================================
      // v2.1 M3-INSPIRED SEMANTIC TYPE SCALE
      // Each: [size, { lineHeight, fontWeight }]. Use semantic names.
      // ============================================================
      fontSize: {
        'display':  ['var(--kt-text-display)',  { lineHeight: 'var(--kt-text-display-lh)',  fontWeight: '700' }],
        'headline': ['var(--kt-text-headline)', { lineHeight: 'var(--kt-text-headline-lh)', fontWeight: '600' }],
        'title':    ['var(--kt-text-title)',    { lineHeight: 'var(--kt-text-title-lh)',    fontWeight: '600' }],
        'body':     ['var(--kt-text-body)',     { lineHeight: 'var(--kt-text-body-lh)',     fontWeight: '400' }],
        'label':    ['var(--kt-text-label)',    { lineHeight: 'var(--kt-text-label-lh)',    fontWeight: '500' }],
      },

      // ============================================================
      // v2.1 SEMANTIC SPACING (paired with Tailwind 4px scale)
      // Use for layout-level rhythm: gap-section, p-card, etc.
      // ============================================================
      spacing: {
        'card':    'var(--kt-pad-card)',
        'page':    'var(--kt-pad-page)',
        'section': 'var(--kt-gap-section)',
      },
      gap: {
        'card':    'var(--kt-gap-card)',
        'section': 'var(--kt-gap-section)',
        'page':    'var(--kt-gap-page)',
      },

      // ============================================================
      // v2.1 MOTION TOKENS (Emil Kowalski-aligned, ≤ 300ms, eased)
      // ============================================================
      transitionDuration: {
        'fast': 'var(--kt-motion-fast)',
        'base': 'var(--kt-motion-base)',
        'slow': 'var(--kt-motion-slow)',
      },
      transitionTimingFunction: {
        'brand': 'var(--kt-ease-brand)',
      },

      // ============================================================
      // SPACING — Tailwind default sudah 4px-based (1=4px, 2=8px, dst).
      // Tidak perlu override. Token di theme.css untuk usage non-Tailwind.
      // ============================================================

      // ============================================================
      // BORDER RADIUS
      // ============================================================
      borderRadius: {
        'kt-sm':   'var(--kt-radius-sm)',
        'kt-md':   'var(--kt-radius-md)',
        'kt-lg':   'var(--kt-radius-lg)',
        'kt-full': 'var(--kt-radius-full)',

        // shadcn/ui radii — derive dari --radius CSS var
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },

      // ============================================================
      // CONTAINER WIDTHS
      // ============================================================
      maxWidth: {
        'app':       'var(--kt-container-app)',
        'dashboard': 'var(--kt-container-dashboard)',
        'reading':   'var(--kt-container-reading)',
      },

      // ============================================================
      // SHADOW (brand-tinted)
      // ============================================================
      boxShadow: {
        'brand-sm': 'var(--kt-shadow-sm)',
        'brand-md': 'var(--kt-shadow-md)',
        'brand-lg': 'var(--kt-shadow-lg)',
      },

      // ============================================================
      // LETTER SPACING (untuk wordmark "KalaTask" — BRAND.md §3.3)
      // ============================================================
      letterSpacing: {
        'wordmark': '-0.05em', /* approx -3px pada 60px font-size */
      },
    },
  },
  plugins: [
    animate, // tailwindcss-animate — dipakai shadcn/ui untuk transition states
  ],
};

export default config;
