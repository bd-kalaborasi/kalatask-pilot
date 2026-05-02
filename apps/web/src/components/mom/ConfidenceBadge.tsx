/**
 * ConfidenceBadge — visual indicator untuk PIC matching confidence.
 * Sprint 5 F9.
 */

type Confidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNRESOLVED';

interface ConfidenceBadgeProps {
  confidence: Confidence;
}

const STYLES: Record<Confidence, { bg: string; text: string; label: string }> = {
  HIGH:       { bg: 'bg-feedback-success-bg', text: 'text-feedback-success', label: '✅ HIGH' },
  MEDIUM:     { bg: 'bg-feedback-warning-bg', text: 'text-feedback-warning', label: '⚠️ MEDIUM' },
  LOW:        { bg: 'bg-feedback-warning-bg', text: 'text-feedback-warning', label: '🔍 LOW' },
  UNRESOLVED: { bg: 'bg-feedback-danger-bg', text: 'text-feedback-danger',   label: '❌ UNRESOLVED' },
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
