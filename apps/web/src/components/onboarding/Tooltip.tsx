/**
 * Tooltip — first-time contextual hint, dismiss-on-seen (F10 Sprint 4 Step 6).
 *
 * Tracks dismissal di users.onboarding_state.tooltips_seen[] (existing JSONB).
 * Each tooltip identified by `tooltipKey` — once dismissed, won't show again.
 *
 * Usage:
 *   <Tooltip tooltipKey="kanban-drag" anchor="below">
 *     Drag kartu antar kolom untuk update status. Coba dulu!
 *   </Tooltip>
 *
 * Visual: small popover dengan brand sky background, dismiss "x" di kanan.
 * Anchor position: below | above | right | left.
 */
import { useState, type ReactNode } from 'react';
import { useOnboarding } from '@/hooks/useOnboarding';

interface TooltipProps {
  tooltipKey: string;
  children: ReactNode;
  anchor?: 'below' | 'above' | 'right' | 'left';
  className?: string;
}

export function Tooltip({
  tooltipKey,
  children,
  anchor = 'below',
  className,
}: TooltipProps) {
  const { tooltipSeen, markTooltipSeen } = useOnboarding();
  const [dismissed, setDismissed] = useState(false);

  const seen = tooltipSeen(tooltipKey);
  if (seen || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    void markTooltipSeen(tooltipKey);
  };

  const anchorClasses: Record<NonNullable<TooltipProps['anchor']>, string> = {
    below: 'top-full mt-2 left-1/2 -translate-x-1/2',
    above: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
    right: 'left-full ml-2 top-1/2 -translate-y-1/2',
    left: 'right-full mr-2 top-1/2 -translate-y-1/2',
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={`absolute z-30 max-w-xs animate-wizard-in ${anchorClasses[anchor]} ${className ?? ''}`}
    >
      <div
        className="rounded-lg px-3 py-2 pr-8 text-xs font-medium shadow-lg ring-1"
        style={{
          backgroundColor: 'var(--kt-deep)',
          color: 'white',
          // Replace ring with inline border ring color via Tailwind not enough
        }}
      >
        {children}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Tutup tip"
          className="absolute top-1.5 right-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-white/80 hover:bg-white/20"
        >
          ×
        </button>
      </div>
    </div>
  );
}
