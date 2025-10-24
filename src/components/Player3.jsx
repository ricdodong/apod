import React, { useEffect, useRef, useState } from "react";
import "../assets/styles.css";

const SERVERS = [
  {
    name: "Railway (Main)",
    url: "https://ricalgenfm.up.railway.app/live",
  },
  {
    name: "ZenoFM (Backup)",
    url: "https://stream.zeno.fm/wngolqwah00tv",
  },
];

export default function Player() {
  const [title, setTitle] = useState("Ricalgen FM Live Stream");
  const [status, setStatus] = useState("Idle");
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentServer, setCurrentServer] = useState(SERVERS[0]);

  const audioRef = useRef(null);

  // Handle auto fallback if Railway down
  async function tryStream(url) {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.src = url;
      audio.crossOrigin = "anonymous";

      audio.addEventListener("canplay", () => {
        console.log(`✅ Stream available: ${url}`);
        resolve(url);
      });

      audio.addEventListener("error", () => {
        console.warn(`❌ Stream failed: ${url}`);
        reject(url);
      });

      audio.load();
    });
  }

  async function initStream() {
    setStatus("Checking streams...");
    try {
      await tryStream(SERVERS[0].url);
      setCurrentServer(SERVERS[0]);
      setStatus("Connected to Railway ✅");
    } catch {
      console.warn("⚠️ Railway down — switching to Zeno");
      setCurrentServer(SERVERS[1]);
      setStatus("Connected to ZenoFM 🔄");
    }
  }

  useEffect(() => {
    initStream();
  }, []);

  const handlePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!audio.src) audio.src = currentServer.url;
    try {
      if (audio.paused) {
        await audio.play();
        setStatus(`Playing (${currentServer.name})`);
        setPlaying(true);
      } else {
        audio.pause();
        setStatus("Paused");
        setPlaying(false);
      }
    } catch (err) {
      console.warn("Audio play failed:", err);
      setStatus("Error playing audio");
    }
  };

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  return (
    <div className="player-wrap">
      <h2>🎙️ Ricalgen FM</h2>
      <p>{title}</p>

      <div className="controls">
        <button onClick={handlePlay}>{playing ? "⏸ Pause" : "▶ Play"}</button>
        <label>
          Volume:
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
          />
        </label>
      </div>

      <div className="server-select">
        <label>Server:</label>
        <select
          value={currentServer.name}
          onChange={(e) => {
            const selected = SERVERS.find((s) => s.name === e.target.value);
            setCurrentServer(selected);
            if (audioRef.current) {
              audioRef.current.src = selected.url;
              audioRef.current.play();
              setStatus(`Switched to ${selected.name}`);
              setPlaying(true);
            }
          }}
        >
          {SERVERS.map((s) => (
            <option key={s.name} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <p>Status: {status}</p>

      <audio ref={audioRef} controls hidden />
    </div>
  );
}
