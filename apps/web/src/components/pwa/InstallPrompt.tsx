/**
 * InstallPrompt — surface "Install KalaTask" button kalau browser
 * dukung beforeinstallprompt (Chrome/Edge desktop + Chrome Android).
 *
 * Safari iOS tidak fire beforeinstallprompt — mereka pakai "Add to
 * Home Screen" manual flow. Document di Checkpoint 5 instructions.
 *
 * Display logic:
 *   - Hide kalau sudah running di standalone mode (display-mode: standalone)
 *   - Hide kalau prompt event tidak fire (browser tidak support / sudah installed)
 *   - Show button → klik triggers prompt() + log result
 */
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(display-mode: standalone)').matches;
  });

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  if (installed || !deferredPrompt) return null;

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => void handleInstall()}
      data-testid="pwa-install-button"
    >
      <span aria-hidden="true">⤓</span>
      <span>Install app</span>
    </Button>
  );
}
