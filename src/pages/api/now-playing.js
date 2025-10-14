import fetch from 'node-fetch';

// Replace with your mount base (no trailing slash)
const MOUNT_URL = 'https://stream.zeno.fm/wngolqwah00tv';
const STATUS_JSON = `${MOUNT_URL.replace(/\/$/, '')}/status-json.xsl`;

export async function get({ request }) {
  // Proxy to Icecast status-json.xsl to avoid CORS in browser
  try {
    const res = await fetch(STATUS_JSON, { timeout: 5000 });
    if (!res.ok) {
      return new Response(JSON.stringify({ error: 'status fetch failed' }), { status: 502 });
    }

    const json = await res.json();

    // Icecast status JSON shape: { icestats: { source: {...} } }
    let source = json.icestats && json.icestats.source;
    // if multiple mounts, source can be array
    if (Array.isArray(source)) {
      // find matching mount by mount property
      source = source.find(s => s.listenurl && s.listenurl.includes(MOUNT_URL)) || source[0];
    }

    // Extract title
    let title = '';
    let artist = '';
    if (source && source.title) {
      title = source.title;
      // optional split if format "Artist - Title"
      const parts = title.split(' - ');
      if (parts.length >= 2) {
        artist = parts[0].trim();
        title = parts.slice(1).join(' - ').trim();
      }
    }

    const payload = { title: title || (source && source.server_name) || 'Live', artist };
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.warn('now-playing proxy error', err);
    return new Response(JSON.stringify({ error: 'internal' }), { status: 500 });
  }
}