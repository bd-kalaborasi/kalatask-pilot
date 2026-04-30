/**
 * EmptyState — unified component untuk semua empty view (F10 Sprint 4 Step 5).
 *
 * Microcopy guideline (BRAND.md §6 Voice & Tone):
 *   - Indonesian friendly-professional
 *   - Action-oriented: explain WHY empty + WHAT user can do next
 *   - Optional CTA button untuk "Buat task pertama" / "Buka Projects" / dll
 *
 * Visual:
 *   - Center-aligned, soft padding
 *   - Icon (emoji atau simple char) di lingkaran subtle
 *   - Heading semibold, body muted
 *   - CTA primary atau ghost variant
 */
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: string;
  iconNode?: ReactNode;
  title: string;
  body?: string;
  cta?: ReactNode;
  ctaLabel?: string;
  ctaOnClick?: () => void;
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  icon,
  iconNode,
  title,
  body,
  cta,
  ctaLabel,
  ctaOnClick,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${
        compact ? 'py-8' : 'py-14'
      } px-6 ${className ?? ''}`}
    >
      {(icon || iconNode) && (
        <div
          className={`flex items-center justify-center rounded-2xl mb-4 ${
            compact ? 'h-12 w-12 text-2xl' : 'h-16 w-16 text-3xl'
          }`}
          style={{ backgroundColor: 'var(--kt-deep-50)' }}
          aria-hidden="true"
        >
          {iconNode ?? icon}
        </div>
      )}
      <h3
        className={`font-semibold mb-2 ${compact ? 'text-base' : 'text-lg'}`}
        style={{ color: 'var(--kt-deep-700)' }}
      >
        {title}
      </h3>
      {body && (
        <p className="text-sm leading-relaxed text-muted-foreground max-w-md">
          {body}
        </p>
      )}
      {(cta || (ctaLabel && ctaOnClick)) && (
        <div className="mt-5">
          {cta ?? (
            <Button onClick={ctaOnClick} size="sm">
              {ctaLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
