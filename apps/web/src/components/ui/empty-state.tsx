/**
 * EmptyState — unified component untuk semua empty view.
 *
 * Sprint 6 final v2.2 upgrade:
 *  - Token migration: --kt-deep-{50,700} inline → primary-container +
 *    on-surface semantic classes
 *  - Typography: text-{base,lg,sm} → title-lg / body-md
 *  - Optional secondaryAction (link-style) per spec §7.5
 *
 * Microcopy guideline (BRAND.md §6 Voice & Tone):
 *   - Indonesian friendly-professional
 *   - Action-oriented: explain WHY empty + WHAT user can do next
 *
 * Backward compat: existing call sites with `icon` / `iconNode` /
 * `ctaLabel` / `ctaOnClick` / `compact` continue to work unchanged.
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
  /** v2.2 spec §7.5: secondary action as link-style label + href. */
  secondaryActionLabel?: string;
  secondaryActionHref?: string;
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
  secondaryActionLabel,
  secondaryActionHref,
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
          className={`flex items-center justify-center rounded-2xl mb-4 bg-primary-container/15 text-on-primary-container ${
            compact ? 'h-12 w-12 text-2xl' : 'h-16 w-16 text-3xl'
          }`}
          aria-hidden="true"
        >
          {iconNode ?? icon}
        </div>
      )}
      <h3
        className={`font-semibold mb-2 text-on-surface ${
          compact ? 'text-title-md' : 'text-title-lg'
        }`}
      >
        {title}
      </h3>
      {body && (
        <p className="text-body-md leading-relaxed text-on-surface-variant max-w-md">
          {body}
        </p>
      )}
      {(cta || (ctaLabel && ctaOnClick) || secondaryActionLabel) && (
        <div className="mt-5 flex flex-col sm:flex-row items-center gap-3">
          {cta ??
            (ctaLabel && ctaOnClick && (
              <Button onClick={ctaOnClick} size="sm" variant="brand">
                {ctaLabel}
              </Button>
            ))}
          {secondaryActionLabel && secondaryActionHref && (
            <a
              href={secondaryActionHref}
              className="text-body-md text-primary-container underline-offset-4 hover:underline"
            >
              {secondaryActionLabel}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
