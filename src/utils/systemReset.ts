export interface SystemResetReport {
  clearedLocalKeys: number;
  unregisteredServiceWorkers: number;
  deletedCaches: number;
  serverResetOk: boolean;
  clearedSupportThreads: number;
  clearedPaymentSessions: number;
}

const KNOWN_LOCAL_KEYS = [
  'sofra_atlas_cart',
  'sofra_atlas_orders',
  'sofra_atlas_commission_config',
  'sofra_atlas_lang',
  'sofra_atlas_pwa_dismissed',
  'atlassofra_lang',
];

export async function clearClientCachesAndStorage(): Promise<{
  clearedLocalKeys: number;
  unregisteredServiceWorkers: number;
  deletedCaches: number;
}> {
  let clearedLocalKeys = 0;
  let unregisteredServiceWorkers = 0;
  let deletedCaches = 0;

  if (typeof window !== 'undefined') {
    try {
      const toRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (!key) continue;
        if (
          KNOWN_LOCAL_KEYS.includes(key) ||
          key.startsWith('sofra_') ||
          key.startsWith('atlassofra_')
        ) {
          toRemove.push(key);
        }
      }
      for (const key of toRemove) {
        window.localStorage.removeItem(key);
        clearedLocalKeys++;
      }
    } catch {
      // Ignore storage access errors
    }

    try {
      window.sessionStorage.clear();
    } catch {
      // Ignore sessionStorage errors
    }

    if ('serviceWorker' in navigator) {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) {
          const ok = await reg.unregister();
          if (ok) unregisteredServiceWorkers++;
        }
      } catch {
        // Ignore SW unregister errors
      }
    }

    if ('caches' in window) {
      try {
        const keys = await window.caches.keys();
        for (const key of keys) {
          const ok = await window.caches.delete(key);
          if (ok) deletedCaches++;
        }
      } catch {
        // Ignore CacheStorage errors
      }
    }
  }

  return {
    clearedLocalKeys,
    unregisteredServiceWorkers,
    deletedCaches,
  };
}

export async function performFullSystemReset(
  includeServerReset = true
): Promise<SystemResetReport> {
  let serverResetOk = false;
  let clearedSupportThreads = 0;
  let clearedPaymentSessions = 0;

  if (includeServerReset) {
    try {
      const resp = await fetch('/api/system/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (resp.ok) {
        const data = (await resp.json()) as {
          ok?: boolean;
          clearedSupportThreads?: number;
          clearedPaymentSessions?: number;
        };
        serverResetOk = Boolean(data.ok);
        clearedSupportThreads = data.clearedSupportThreads ?? 0;
        clearedPaymentSessions = data.clearedPaymentSessions ?? 0;
      }
    } catch {
      serverResetOk = false;
    }
  }

  const clientResult = await clearClientCachesAndStorage();

  return {
    ...clientResult,
    serverResetOk,
    clearedSupportThreads,
    clearedPaymentSessions,
  };
}

export function reloadApplicationCleanly() {
  if (typeof window === 'undefined') return;
  const cleanUrl = `${window.location.origin}${window.location.pathname}`;
  window.location.replace(cleanUrl);
}
