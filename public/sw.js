/*
 * Service worker — so the app opens in a supermarket dead spot.
 *
 * The shopping list is the one screen you use somewhere with no signal, and
 * without this, tapping a tab mid-aisle gave a blank page that a reload could
 * not recover. The plan and the ticks were never the problem: they live in
 * localStorage. It was the app itself that would not load.
 *
 * Strategy, deliberately conservative:
 *   - navigations: network first, falling back to the cached page. You always
 *     get fresh HTML when there is signal, and a working app when there is not.
 *   - /_next/static/*: cache first. Those URLs contain a build hash, so a
 *     cached one can never be stale — a new build means new URLs.
 *   - everything else same-origin: network first, cache as a fallback.
 * Anything not in the cache when offline fails as it always did.
 */

const VERSION = "v1";
const CACHE = `jm-food-${VERSION}`;
const ROUTES = ["/", "/today", "/shop", "/prep", "/recipes", "/settings"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // Best effort: one unreachable route must not fail the whole install.
      await Promise.allSettled(ROUTES.map((r) => cache.add(r)));
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request, fallbackToRoot = false) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (fallbackToRoot) {
      const root = await caches.match("/");
      if (root) return root;
    }
    throw error;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, true));
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(networkFirst(request));
});
