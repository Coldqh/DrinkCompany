import { useCallback, useEffect, useRef, useState } from 'react';
import { isRemoteVersionNewer } from './version';

export interface VersionInfo {
  version: string;
  buildId: string;
  generatedAt: string;
}

export interface VersionGuard {
  currentVersion: string;
  currentBuildId: string;
  remote: VersionInfo | null;
  checking: boolean;
  updateRequired: boolean;
  applying: boolean;
  lastCheckedAt: number | null;
  checkNow: () => Promise<void>;
  forceUpdate: () => Promise<void>;
}

const CHECK_INTERVAL_MS = 60_000;

export function useVersionGuard(): VersionGuard {
  const [remote, setRemote] = useState<VersionInfo | null>(null);
  const [checking, setChecking] = useState(false);
  const [applying, setApplying] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);
  const activeRef = useRef(true);

  const checkNow = useCallback(async () => {
    setChecking(true);
    try {
      const versionUrl = new URL('./version.json', document.baseURI);
      versionUrl.searchParams.set('check', String(Date.now()));
      const response = await fetch(versionUrl, { cache: 'no-store', headers: { 'cache-control': 'no-cache' } });
      if (!response.ok) throw new Error(`Version check failed: ${response.status}`);
      const value = await response.json() as Partial<VersionInfo>;
      if (!value.version || !value.buildId || !value.generatedAt) throw new Error('Version manifest is invalid');
      if (activeRef.current) setRemote(value as VersionInfo);
      const registration = await navigator.serviceWorker?.getRegistration();
      await registration?.update();
    } catch (error) {
      console.warn('Проверка версии недоступна', error);
    } finally {
      if (activeRef.current) {
        setChecking(false);
        setLastCheckedAt(Date.now());
      }
    }
  }, []);

  const forceUpdate = useCallback(async () => {
    setApplying(true);
    try {
      const registrations = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistrations() : [];
      for (const registration of registrations) {
        registration.waiting?.postMessage({ type: 'FORCE_UPDATE' });
        registration.active?.postMessage({ type: 'FORCE_UPDATE' });
        await registration.unregister();
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
    } finally {
      const target = new URL(document.baseURI);
      target.searchParams.set('version', remote?.version ?? String(Date.now()));
      window.location.replace(target.toString());
    }
  }, [remote?.version]);

  useEffect(() => {
    activeRef.current = true;
    void checkNow();
    const timer = window.setInterval(() => void checkNow(), CHECK_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void checkNow();
    };
    window.addEventListener('focus', checkNow);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      activeRef.current = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', checkNow);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [checkNow]);

  return {
    currentVersion: __APP_VERSION__,
    currentBuildId: __BUILD_ID__,
    remote,
    checking,
    updateRequired: Boolean(remote && (isRemoteVersionNewer(remote.version, __APP_VERSION__) || (remote.version === __APP_VERSION__ && remote.buildId !== __BUILD_ID__))),
    applying,
    lastCheckedAt,
    checkNow,
    forceUpdate,
  };
}
