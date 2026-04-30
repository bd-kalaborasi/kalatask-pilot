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
        // v2.1 → v2.2 Surface tonal scale (Sprint 6 final overhaul)
        // 9-level scale per Stitch v1. Use instead of raw bg-zinc-*.
        // ============================================================
        'surface-bright':            'var(--kt-surface-bright)',
        'surface-container-lowest':  'var(--kt-surface-container-lowest)',
        'surface-container-low':     'var(--kt-surface-container-low)',
        'surface-container':         'var(--kt-surface-container)',
        'surface-container-high':    'var(--kt-surface-container-high)',
        'surface-container-highest': 'var(--kt-surface-container-highest)',
        'surface-dim':               'var(--kt-surface-dim)',
        'surface-variant':           'var(--kt-surface-variant)',

        // ============================================================
        // v2.2 M3 color triads (D1, D4 split)
        // ============================================================
        'on-surface':              'var(--kt-on-surface)',
        'on-surface-variant':      'var(--kt-on-surface-variant)',
        'inverse-surface':         'var(--kt-inverse-surface)',
        'inverse-on-surface':      'var(--kt-inverse-on-surface)',
        'on-primary':              'var(--kt-on-primary)',
        'primary-container':       'var(--kt-primary-container)',
        'on-primary-container':    'var(--kt-on-primary-container)',
        'inverse-primary':         'var(--kt-inverse-primary)',
        'on-secondary':            'var(--kt-on-secondary)',
        'secondary-container':     'var(--kt-secondary-container)',
        'on-secondary-container':  'var(--kt-on-secondary-container)',
        tertiary: {
          DEFAULT:                 'var(--kt-tertiary)',
          container:               'var(--kt-tertiary-container)',
          'on-container':          'var(--kt-on-tertiary-container)',
        },
        'on-tertiary':             'var(--kt-on-tertiary)',
        'on-tertiary-container':   'var(--kt-on-tertiary-container)',
        'on-error':                'var(--kt-on-error)',
        'error-container':         'var(--kt-error-container)',
        'on-error-container':      'var(--kt-on-error-container)',
        outline:                   'var(--kt-outline)',
        'outline-variant':         'var(--kt-outline-variant)',

        // ============================================================
        // v2.2 status fg+bg pair (Monday-inspired prominent badges)
        // Coexists with v2.1 status.* for migration window.
        // ============================================================
        'status-todo': {
          bg: 'var(--kt-status-todo-bg)',
          fg: 'var(--kt-status-todo-fg)',
        },
        'status-in-progress': {
          bg: 'var(--kt-status-in-progress-bg)',
          fg: 'var(--kt-status-in-progress-fg)',
        },
        'status-review': {
          bg: 'var(--kt-status-review-bg)',
          fg: 'var(--kt-status-review-fg)',
        },
        'status-done': {
          bg: 'var(--kt-status-done-bg)',
          fg: 'var(--kt-status-done-fg)',
        },
        'status-blocked': {
          bg: 'var(--kt-status-blocked-bg)',
          fg: 'var(--kt-status-blocked-fg)',
        },

        // v2.2 source attribution alias (D5 keeps csv violet legacy)
        'source-mom': 'var(--kt-source-mom)',

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
        // v2.2 D3: split Inter Display from Inter sans
        display: ['Inter Display', 'Inter', 'Helvetica Neue', 'Arial', 'sans-serif'],
        sans:    ['Inter', 'Helvetica Neue', 'Arial', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'SF Mono', 'Consolas', 'monospace'],
      },

      // ============================================================
      // v2.1 → v2.2 M3-INSPIRED SEMANTIC TYPE SCALE
      // Each: [size, { lineHeight, fontWeight, letterSpacing, fontFamily }].
      // Plain v2.1 names (display/headline/title/body/label) are aliases
      // and remain backward compatible — they map to the *-md variant.
      // Use full *-lg/-md/-sm hierarchy for new code.
      // ============================================================
      fontSize: {
        // Backward-compat v2.1 aliases (resolve to -md tier)
        'display':  ['var(--kt-text-display)',  { lineHeight: 'var(--kt-text-display-lh)',  fontWeight: '700' }],
        'headline': ['var(--kt-text-headline)', { lineHeight: 'var(--kt-text-headline-lh)', fontWeight: '600' }],
        'title':    ['var(--kt-text-title)',    { lineHeight: 'var(--kt-text-title-lh)',    fontWeight: '600' }],
        'body':     ['var(--kt-text-body)',     { lineHeight: 'var(--kt-text-body-lh)',     fontWeight: '400' }],
        'label':    ['var(--kt-text-label)',    { lineHeight: 'var(--kt-text-label-lh)',    fontWeight: '500' }],

        // v2.2 full hierarchy
        'display-lg':  ['var(--kt-text-display-lg-size)',  { lineHeight: 'var(--kt-text-display-lg-line)',  fontWeight: '700', letterSpacing: 'var(--kt-text-display-lg-tracking)', fontFamily: 'var(--kt-text-display-lg-family)' }],
        'display-md':  ['var(--kt-text-display-md-size)',  { lineHeight: 'var(--kt-text-display-md-line)',  fontWeight: '700', letterSpacing: 'var(--kt-text-display-md-tracking)', fontFamily: 'var(--kt-text-display-md-family)' }],
        'display-sm':  ['var(--kt-text-display-sm-size)',  { lineHeight: 'var(--kt-text-display-sm-line)',  fontWeight: '700', letterSpacing: 'var(--kt-text-display-sm-tracking)', fontFamily: 'var(--kt-text-display-sm-family)' }],

        'headline-lg': ['var(--kt-text-headline-lg-size)', { lineHeight: 'var(--kt-text-headline-lg-line)', fontWeight: '600', fontFamily: 'var(--kt-text-headline-lg-family)' }],
        'headline-md': ['var(--kt-text-headline-md-size)', { lineHeight: 'var(--kt-text-headline-md-line)', fontWeight: '600', fontFamily: 'var(--kt-text-headline-md-family)' }],
        'headline-sm': ['var(--kt-text-headline-sm-size)', { lineHeight: 'var(--kt-text-headline-sm-line)', fontWeight: '600', fontFamily: 'var(--kt-text-headline-sm-family)' }],

        'title-lg':    ['var(--kt-text-title-lg-size)',    { lineHeight: 'var(--kt-text-title-lg-line)',    fontWeight: '500', fontFamily: 'var(--kt-text-title-lg-family)' }],
        'title-md':    ['var(--kt-text-title-md-size)',    { lineHeight: 'var(--kt-text-title-md-line)',    fontWeight: '500', fontFamily: 'var(--kt-text-title-md-family)' }],
        'title-sm':    ['var(--kt-text-title-sm-size)',    { lineHeight: 'var(--kt-text-title-sm-line)',    fontWeight: '500', fontFamily: 'var(--kt-text-title-sm-family)' }],

        'body-lg':     ['var(--kt-text-body-lg-size)',     { lineHeight: 'var(--kt-text-body-lg-line)',     fontWeight: '400', letterSpacing: 'var(--kt-text-body-lg-tracking)' }],
        'body-md':     ['var(--kt-text-body-md-size)',     { lineHeight: 'var(--kt-text-body-md-line)',     fontWeight: '400', letterSpacing: 'var(--kt-text-body-md-tracking)' }],
        'body-sm':     ['var(--kt-text-body-sm-size)',     { lineHeight: 'var(--kt-text-body-sm-line)',     fontWeight: '400', letterSpacing: 'var(--kt-text-body-sm-tracking)' }],

        'label-lg':    ['var(--kt-text-label-lg-size)',    { lineHeight: 'var(--kt-text-label-lg-line)',    fontWeight: '500', letterSpacing: 'var(--kt-text-label-lg-tracking)' }],
        'label-md':    ['var(--kt-text-label-md-size)',    { lineHeight: 'var(--kt-text-label-md-line)',    fontWeight: '500', letterSpacing: 'var(--kt-text-label-md-tracking)' }],
        'label-sm':    ['var(--kt-text-label-sm-size)',    { lineHeight: 'var(--kt-text-label-sm-line)',    fontWeight: '500', letterSpacing: 'var(--kt-text-label-sm-tracking)' }],

        'caption':     ['var(--kt-text-caption-size)',     { lineHeight: 'var(--kt-text-caption-line)',     fontWeight: '400', letterSpacing: 'var(--kt-text-caption-tracking)' }],
      },

      // ============================================================
      // v2.1 → v2.2 SEMANTIC SPACING (paired with Tailwind 4px scale)
      // Use for layout-level rhythm: gap-section, p-card, gutter, etc.
      // ============================================================
      spacing: {
        'card':           'var(--kt-pad-card)',
        'page':           'var(--kt-pad-page)',
        'section':        'var(--kt-gap-section)',
        // v2.2 Stitch additions
        'gutter':         'var(--kt-space-gutter)',
        'margin-desktop': 'var(--kt-margin-desktop)',
        'margin-mobile':  'var(--kt-margin-mobile)',
      },
      gap: {
        'card':    'var(--kt-gap-card)',
        'section': 'var(--kt-gap-section)',
        'page':    'var(--kt-gap-page)',
        'gutter':  'var(--kt-space-gutter)',
      },

      // ============================================================
      // v2.1 → v2.2 MOTION TOKENS
      // v2.1: Emil-aligned ease-brand, fast/base/slow.
      // v2.2: granular durations (fast 100, base 200, medium 300,
      //       slow 500), full easing palette.
      // ============================================================
      transitionDuration: {
        'fast':    'var(--kt-duration-fast)',   // v2.2 100ms (was v2.1 150ms)
        'base':    'var(--kt-duration-base)',
        'medium':  'var(--kt-duration-medium)', // v2.2 NEW
        'slow':    'var(--kt-duration-slow)',
      },
      transitionTimingFunction: {
        'brand':   'var(--kt-ease-brand)',
        'in':      'var(--kt-ease-in)',
        'out':     'var(--kt-ease-out)',
        'in-out':  'var(--kt-ease-in-out)',
        'spring':  'var(--kt-ease-spring)',
      },

      // v2.2 Animation keyframes + utilities (matches globals.css recipes)
      keyframes: {
        'fade-in':  { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'fade-up':  {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%':   { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in':  'fade-in var(--kt-duration-base) var(--kt-ease-out)',
        'fade-up':  'fade-up var(--kt-duration-medium) var(--kt-ease-out)',
        'scale-in': 'scale-in var(--kt-duration-base) var(--kt-ease-out)',
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
        'kt-lg':   'var(--kt-radius-lg)',  // v2.2: bumped to 16px per D2
        'kt-xl':   'var(--kt-radius-xl)',  // v2.2 NEW
        'kt-full': 'var(--kt-radius-full)',

        // shadcn/ui radii — derive dari --radius CSS var
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },

      // ============================================================
      // CONTAINER WIDTHS (v2.2 adds Stitch container alias)
      // ============================================================
      maxWidth: {
        'app':       'var(--kt-container-app)',
        'dashboard': 'var(--kt-container-dashboard)',
        'reading':   'var(--kt-container-reading)',
        'container': 'var(--kt-space-container)', // v2.2 Stitch alias = 1280px
      },

      // ============================================================
      // SHADOW (brand-tinted, v2.2 adds xl tier)
      // ============================================================
      boxShadow: {
        'brand-sm': 'var(--kt-shadow-sm)',
        'brand-md': 'var(--kt-shadow-md)',
        'brand-lg': 'var(--kt-shadow-lg)',
        'brand-xl': 'var(--kt-shadow-xl)',
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
