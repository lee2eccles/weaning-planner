"use client";

import { useEffect, useState } from "react";

/**
 * Registers the service worker, and says so when the app is offline.
 *
 * A parent testing the shopping list found that one tap in a supermarket dead
 * spot gave a blank page nothing could recover. The ticks were always safe in
 * localStorage; it was the app shell that would not load. Registration is
 * production-only so a dev server never serves stale code.
 */
/** The `beforeinstallprompt` event, which TypeScript's DOM lib does not model. */
interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function OfflineReady() {
  const [offline, setOffline] = useState(false);
  const [installable, setInstallable] = useState<InstallPrompt | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Blocked, unsupported, or a private window. The app works online
        // exactly as before, so there is nothing to tell anyone about.
      });
    }

    const update = () => setOffline(!navigator.onLine);
    update();

    // Offered rather than nagged: the app works in a browser tab, but on a
    // home screen it opens in a supermarket dead spot without waiting on Safari.
    const onInstallable = (e: Event) => {
      e.preventDefault();
      setInstallable(e as InstallPrompt);
    };

    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    window.addEventListener("beforeinstallprompt", onInstallable);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      window.removeEventListener("beforeinstallprompt", onInstallable);
    };
  }, []);

  if (offline) {
    return (
      <p
        role="status"
        className="no-print bg-sage-tint px-4 py-2 text-center text-xs text-ink"
        style={{ paddingTop: "calc(0.5rem + env(safe-area-inset-top, 0px))" }}
      >
        Offline — your list and your ticks are safe on this phone, and still work.
      </p>
    );
  }

  if (!installable) return null;

  return (
    <div
      className="no-print flex flex-wrap items-center justify-center gap-3 bg-blush-tint px-4 py-2 text-center text-xs text-ink"
      style={{ paddingTop: "calc(0.5rem + env(safe-area-inset-top, 0px))" }}
    >
      <span>Add this to your home screen and the shopping list opens without a signal.</span>
      <button
        type="button"
        onClick={async () => {
          await installable.prompt();
          await installable.userChoice;
          setInstallable(null);
        }}
        className="min-h-[2.25rem] rounded-lg bg-blush px-3 py-1.5 font-medium text-ink hover:bg-blush-deep"
      >
        Add it
      </button>
      <button
        type="button"
        onClick={() => setInstallable(null)}
        className="min-h-[2.25rem] px-2 py-1.5 font-medium text-ink-muted underline underline-offset-2 hover:text-ink"
      >
        Not now
      </button>
    </div>
  );
}
