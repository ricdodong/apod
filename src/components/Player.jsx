import React, { useEffect, useState, useRef } from 'react';

const POLL_INTERVAL = 7000; // ms
const STREAM_URL = 'https://stream.zeno.fm/wngolqwah00tv'; // your mount base

export default function Player() {
  const [now, setNow] = useState({ title: 'Connecting...', artist: '' });
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    async function fetchNow() {
      try {
        const res = await fetch('/api/now-playing');
        if (!res.ok) throw new Error('now-playing failed');
        const json = await res.json();
        if (mounted && json) {
          setNow({ title: json.title || 'Live', artist: json.artist || '' });
        }
      } catch (err) {
        console.warn('now-playing error', err);
      }
    }

    fetchNow();
    const id = setInterval(fetchNow, POLL_INTERVAL);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  return (
    <div className="fixed left-0 right-0 bottom-0 p-3 backdrop-blur bg-black/40 border-t border-white/5">
      <div className="max-w-6xl mx-auto flex items-center gap-4">
        <div className="flex-1">
          <div className="text-sm text-white/70">Now playing</div>
          <div className="text-lg font-semibold">{now.title} {now.artist ? `— ${now.artist}` : ''}</div>
        </div>

        <div className="flex items-center gap-3">
          <audio ref={audioRef} src={STREAM_URL} preload="none" />
          <button
            className="px-4 py-2 rounded-xl bg-white/8 hover:bg-white/12"
            onClick={() => {
              const a = audioRef.current;
              if (!a) return;
              if (playing) { a.pause(); setPlaying(false); } else { a.play(); setPlaying(true); }
            }}
          >
            {playing ? 'Pause' : 'Play'}
          </button>
        </div>
      </div>
    </div>
  );
}