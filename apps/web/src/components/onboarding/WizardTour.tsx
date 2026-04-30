/**
 * WizardTour — 5-step onboarding modal overlay (F10 sub-2).
 *
 * Q2 owner answer (b): step (c) tulis komen + step (d) attach file
 * di-substitute jadi "Lihat detail task" + "Filter task" karena
 * comments+Storage defer Sprint 5+.
 *
 * UX quality (owner mandate):
 *   - Brand colors: --kt-deep (#0060A0) + --kt-sky (#00A0E0)
 *   - Progress dots dengan animasi transition
 *   - Smooth fade-in modal + soft backdrop blur
 *   - Friendly Indonesian copy per BRAND.md microcopy
 *   - Keyboard nav: Esc = skip, Enter = lanjut
 *   - aria-modal + focus trap minimal
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useOnboarding } from '@/hooks/useOnboarding';

interface WizardStep {
  emoji: string;
  title: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
}

const STEPS: WizardStep[] = [
  {
    emoji: '✨',
    title: 'Yuk, kenalan dulu sama KalaTask',
    body:
      'Kami sudah siapin "Project Contoh" + 5 task biar kamu bisa langsung coba. Hapus saja kalau sudah selesai eksplorasi — sample data ini cuma untuk latihan.',
    ctaLabel: 'Buka Projects',
    ctaHref: '/projects',
  },
  {
    emoji: '🎯',
    title: 'Bikin task baru itu sederhana',
    body:
      'Klik tombol "Bikin task" di project, isi judul, pilih status. Selesai. Task baru langsung muncul di view List, Kanban, atau Gantt.',
    ctaLabel: 'Coba di Project Contoh',
    ctaHref: '/projects',
  },
  {
    emoji: '🗂️',
    title: 'Tiga cara lihat task — pilih yang nyaman',
    body:
      'Tab View di kanan atas: List untuk overview cepat, Kanban untuk drag-drop status, Gantt untuk timeline. Switch kapan saja, datanya sama.',
  },
  {
    emoji: '🔍',
    title: 'Detail task — buka, baca, update',
    body:
      'Klik judul task untuk lihat deskripsi, deadline, dan ubah status. Filter di toolbar bantu kamu fokus ke prioritas atau assignee tertentu.',
  },
  {
    emoji: '📊',
    title: 'Cek beban kerja kamu di Workload',
    body:
      'Menu Workload nampilin total task open + tier overdue/high-priority. Pakai untuk planning harian biar nggak kebanyakan task aktif.',
    ctaLabel: 'Buka Workload',
    ctaHref: '/workload',
  },
];

export function WizardTour() {
  const { showWizard, completeWizard, skipWizard } = useOnboarding();
  const [stepIndex, setStepIndex] = useState(0);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!showWizard) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        void handleSkip();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showWizard, stepIndex]);

  if (!showWizard) return null;

  const currentStep = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      void handleComplete();
    } else {
      setStepIndex((i) => Math.min(STEPS.length - 1, i + 1));
    }
  };

  const handleBack = () => {
    setStepIndex((i) => Math.max(0, i - 1));
  };

  const handleSkip = async () => {
    setClosing(true);
    await skipWizard();
  };

  const handleComplete = async () => {
    setClosing(true);
    await completeWizard();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="wizard-title"
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${
        closing ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Backdrop dengan soft blur */}
      <div
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
        aria-hidden="true"
      />

      {/* Modal card */}
      <div className="relative w-full max-w-md animate-wizard-in">
        <div className="overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-border">
          {/* Header gradient brand */}
          <div
            className="h-2"
            style={{
              background:
                'linear-gradient(90deg, var(--kt-deep) 0%, var(--kt-sky) 100%)',
            }}
            aria-hidden="true"
          />

          <div className="p-7 sm:p-8">
            {/* Progress dots */}
            <div className="mb-6 flex items-center justify-center gap-2">
              {STEPS.map((_, idx) => {
                const isActive = idx === stepIndex;
                const isPast = idx < stepIndex;
                return (
                  <div
                    key={idx}
                    aria-label={`Langkah ${idx + 1} dari ${STEPS.length}`}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      isActive
                        ? 'w-8'
                        : 'w-2'
                    }`}
                    style={{
                      backgroundColor: isActive
                        ? 'var(--kt-deep)'
                        : isPast
                        ? 'var(--kt-sky-300)'
                        : '#E4E4E7',
                    }}
                  />
                );
              })}
            </div>

            {/* Step counter */}
            <p className="mb-3 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Langkah {stepIndex + 1} dari {STEPS.length}
            </p>

            {/* Emoji + title */}
            <div className="mb-3 text-center">
              <div
                className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl text-3xl"
                style={{ backgroundColor: 'var(--kt-deep-50)' }}
              >
                <span aria-hidden="true">{currentStep.emoji}</span>
              </div>
              <h2
                id="wizard-title"
                className="text-xl font-semibold text-foreground"
                style={{ color: 'var(--kt-deep-700)' }}
              >
                {currentStep.title}
              </h2>
            </div>

            {/* Body */}
            <p className="mb-6 text-center text-sm leading-relaxed text-muted-foreground">
              {currentStep.body}
            </p>

            {/* CTA link kalau ada */}
            {currentStep.ctaHref && currentStep.ctaLabel && (
              <div className="mb-6 text-center">
                <Link
                  to={currentStep.ctaHref}
                  className="inline-flex items-center gap-1 text-sm font-medium underline-offset-2 hover:underline"
                  style={{ color: 'var(--kt-sky-700)' }}
                  onClick={() => {
                    // Klik CTA tidak otomatis advance — biar user explore dulu.
                    // Wizard tetap di state ini, user bisa lanjut manual.
                  }}
                >
                  {currentStep.ctaLabel} →
                </Link>
              </div>
            )}

            {/* Footer actions */}
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => void handleSkip()}
                className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                Skip tutorial
              </button>

              <div className="flex items-center gap-2">
                {stepIndex > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleBack}
                  >
                    Balik
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  onClick={handleNext}
                  style={
                    isLast
                      ? {
                          backgroundColor: 'var(--kt-deep)',
                          color: 'white',
                        }
                      : undefined
                  }
                >
                  {isLast ? 'Selesai 🎉' : 'Lanjut'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
