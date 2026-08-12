import "server-only";

type Eintrag = { wert: unknown; laeuftAb: number };
const globalCache = globalThis as typeof globalThis & { novaCache?: Map<string, Eintrag>; novaCacheTreffer?: number; novaCacheFehler?: number };
const cache = globalCache.novaCache ?? new Map<string, Eintrag>();
globalCache.novaCache = cache;

export async function cacheLesen<T>(schluessel: string, dauerMs: number, laden: () => Promise<T>): Promise<T> {
  const jetzt = Date.now(); const vorhanden = cache.get(schluessel);
  if (vorhanden && vorhanden.laeuftAb > jetzt) { globalCache.novaCacheTreffer = (globalCache.novaCacheTreffer ?? 0) + 1; return vorhanden.wert as T; }
  globalCache.novaCacheFehler = (globalCache.novaCacheFehler ?? 0) + 1;
  const wert = await laden(); cache.set(schluessel, { wert, laeuftAb: jetzt + dauerMs }); return wert;
}

export function cacheLeeren(prefix?: string) { if (!prefix) cache.clear(); else for (const key of cache.keys()) if (key.startsWith(prefix)) cache.delete(key); }
export function cacheStatus() { return { eintraege: cache.size, treffer: globalCache.novaCacheTreffer ?? 0, neuGeladen: globalCache.novaCacheFehler ?? 0 }; }
