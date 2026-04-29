/**
 * ConfidenceBadge — visual indicator untuk PIC matching confidence.
 * Sprint 5 F9.
 */

type Confidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNRESOLVED';

interface ConfidenceBadgeProps {
  confidence: Confidence;
}

const STYLES: Record<Confidence, { bg: string; text: string; label: string }> = {
  HIGH: { bg: 'bg-emerald-100', text: 'text-emerald-800', label: '✅ HIGH' },
  MEDIUM: { bg: 'bg-amber-100', text: 'text-amber-800', label: '⚠️ MEDIUM' },
  LOW: { bg: 'bg-orange-100', text: 'text-orange-800', label: '🔍 LOW' },
  UNRESOLVED: { bg: 'bg-red-100', text: 'text-red-800', label: '❌ UNRESOLVED' },
};

export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  const s = STYLES[confidence];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${s.bg} ${s.text}`}
    >
      {s.label}
    </span>
  );
}
