// src/utils/cacheArtwork.js
// Usage: import { cacheArtwork } from '../utils/cacheArtwork';

export async function cacheArtwork(songTitle, artUrl) {
    if (!songTitle) return artUrl;
    const safeTitle = songTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const localPath = `/artworks/${safeTitle}.jpg`;
  
    try {
      // 1) If there's a file already in /public/artworks (served by site), use it.
      try {
        const head = await fetch(localPath, { method: 'HEAD' });
        if (head.ok) {
          console.log('🪶 Using local /artworks cache:', localPath);
          return localPath;
        }
      } catch (err) {
        // HEAD might fail due to CORS or dev server behavior — ignore and continue.
        console.log('⚠️ HEAD check failed for localPath (continuing):', err?.message);
      }
  
      // 2) Development: save to /public/artworks by calling your backend endpoint
      //    (you already have /api/save-artwork implemented).
      if (import.meta.env && import.meta.env.DEV) {
        try {
          console.log('💾 DEV: asking backend to save artwork to /public/artworks');
          const res = await fetch('/api/save-artwork', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: artUrl, title: songTitle }),
          });
          if (!res.ok) {
            console.warn('⚠️ /api/save-artwork returned non-OK:', res.status);
          } else {
            const data = await res.json().catch(() => null);
            if (data && data.url) {
              console.log('✅ Saved artwork to (dev):', data.url);
              return data.url;
            } else {
              console.warn('⚠️ /api/save-artwork returned no url, falling back to remote');
            }
          }
        } catch (err) {
          console.warn('⚠️ DEV save-artwork failed:', err);
        }
        // fallback to remote artUrl below
      }
  
      // 3) Production: prefer cached responses in the browser Cache Storage.
      //    If we previously cached the remote URL, use it (browser will serve cached response).
      //    If not, fetch remote and cache it.
      if ('caches' in window) {
        const cacheName = 'ricalgen-artworks-v1';
        try {
          // If a cached response for localPath exists (maybe you pre-populated), return localPath
          const localCached = await caches.match(localPath);
          if (localCached) {
            console.log('🪣 Found artwork cached under localPath in Cache Storage:', localPath);
            return localPath;
          }
  
          // If remote URL has been cached before, return the remote URL (it will be served from cache)
          const remoteCached = await caches.match(artUrl);
          if (remoteCached) {
            console.log('🪣 Found artwork cached under remote URL in Cache Storage:', artUrl);
            return artUrl;
          }
  
          // Otherwise fetch the remote asset and add it to cache for next time
          console.log('🌐 Fetching remote artwork to cache:', artUrl);
          const resp = await fetch(artUrl, { mode: 'cors' });
          if (resp.ok) {
            const cache = await caches.open(cacheName);
            // store under the remote URL key (so subsequent calls with same remote URL hit cache)
            await cache.put(artUrl, resp.clone());
            console.log('✅ Artwork cached in Cache Storage under key:', artUrl);
            return artUrl;
          } else {
            console.warn('⚠️ Failed to fetch remote artwork:', resp.status);
          }
        } catch (err) {
          console.warn('⚠️ Cache Storage flow failed:', err);
        }
      }
  
      // 4) Final fallback: just return the remote URL (no caching possible)
      console.log('↩️ Returning remote artwork URL (no cache available):', artUrl);
      return artUrl;
    } catch (err) {
      console.warn('⚠️ cacheArtwork unexpected error, returning remote URL:', err);
      return artUrl;
    }
  }
  