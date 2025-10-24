// src/components/Player.jsx
import React, { useEffect, useRef, useState } from "react";
import "../assets/styles.css";
import { cacheArtwork } from "../utils/cacheArtwork";

const socialsData = {
  facebook: "https://facebook.com/ricalgenfm",
  twitter: "https://twitter.com/ricalgenfm",
  instagram: "https://instagram.com/ricalgenfm",
  youtube: "https://youtube.com/ricalgenfm",
};

const socialIcons = { /* --- your existing SVGs unchanged --- */ };

export default function Player() {
  const [title, setTitle] = useState("Click Play to Start");
  const [status, setStatus] = useState("Connecting…");
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [server, setServer] = useState("railway"); // 👈 default
  const [fallbackActive, setFallbackActive] = useState(false);
  const [bassLevel, setBassLevel] = useState(0);
  const [pianoLevel, setPianoLevel] = useState(0);

  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const bgRef = useRef(null);
  const fgRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);

  const STATION_LOGO = "https://static.zeno.fm/stations/6a97e483-6f54-4ef8-aee3-432441265aed.png";

  // 🎧 Define your stream sources here:
  const STREAMS = {
    railway: "https://ricalgenfm-production.up.railway.app/live",
    zeno: "https://stream.zeno.fm/wngolqwah00tv",
  };

  // VISUALIZER + ARTWORK + METADATA system (unchanged)
  useEffect(() => {
    const audio = audioRef.current;
    const canvas = canvasRef.current;
    const fg = fgRef.current;
    const bg = bgRef.current;
    if (!audio || !canvas) return;

    audio.crossOrigin = "anonymous";

    if (!audioCtxRef.current) {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyserRef.current = analyser;

      const src = audioCtx.createMediaElementSource(audio);
      src.connect(analyser);
      analyser.connect(audioCtx.destination);

      const freqData = new Uint8Array(analyser.frequencyBinCount);
      const smoothArray = new Array(analyser.frequencyBinCount).fill(0);
      const ctx = canvas.getContext("2d");

      const draw = () => {
        requestAnimationFrame(draw);
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        analyser.getByteFrequencyData(freqData);

        let x = 0;
        const barWidth = canvas.width / freqData.length;
        for (let i = 0; i < freqData.length; i++) {
          smoothArray[i] += (freqData[i] - smoothArray[i]) * 0.35;
          const barHeight = smoothArray[i] / 1.8;
          const hue = ((i * 360) / freqData.length + Date.now() * 0.07) % 360;
          const grad = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
          grad.addColorStop(0, `hsla(${hue},90%,60%,0.9)`);
          grad.addColorStop(1, `hsla(${hue},90%,50%,0.3)`);
          ctx.fillStyle = grad;
          ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
          x += barWidth + 1;
        }

        const bass = freqData.slice(1, 10);
        const mids = freqData.slice(15, 80);
        setBassLevel(bass.reduce((a, b) => a + b, 0) / bass.length / 255);
        setPianoLevel(mids.reduce((a, b) => a + b, 0) / mids.length / 255);
      };
      draw();
    }

    // Metadata from Zeno (works even if Railway is primary)
    const source = new EventSource("https://api.zeno.fm/mounts/metadata/subscribe/wngolqwah00tv");

    source.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        const songTitle = data.streamTitle || data.title || "";
        if (!songTitle) return;

        setTitle(songTitle);
        document.title = `🎶 ${songTitle} | Ricalgen FM`;

        // fetch and apply artwork
        const art = await getArtwork(songTitle);
        await applyArtwork(art);
      } catch (err) {
        console.warn("Metadata parse error:", err);
      }
    };

    return () => {
      try {
        source.close();
      } catch {}
    };
  }, []);

  async function applyArtwork(url) {
    const fg = fgRef.current;
    const bg = bgRef.current;
    if (!fg || !bg) return;

    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = url;
      await img.decode();
      fg.style.backgroundImage = `url(${url})`;
      bg.style.backgroundImage = `url(${url})`;
    } catch {
      fg.style.backgroundImage = `url(${STATION_LOGO})`;
      bg.style.backgroundImage = `url(${STATION_LOGO})`;
    }
  }

  async function getArtwork(songTitle) {
    // simplified here — your full Spotify + YouTube fallback logic can stay the same
    return STATION_LOGO;
  }

  // 🔊 Volume
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  // 🎛 Handle play/pause + automatic fallback
  const handlePlay = async () => {
    const audio = audioRef.current;
    const audioCtx = audioCtxRef.current;
    if (!audio || !audioCtx) return;
    if (audioCtx.state === "suspended") await audioCtx.resume();

    if (!audio.src) {
      audio.src = STREAMS[server];
      console.log(`🎧 Initial source: ${server}`);
    }

    try {
      if (audio.paused) {
        await audio.play();
        setStatus(`Playing live via ${server}${fallbackActive ? " (fallback)" : ""}`);
        setPlaying(true);
      } else {
        audio.pause();
        setStatus("Paused");
        setPlaying(false);
      }
    } catch (err) {
      console.warn("Audio play failed:", err);
      // 🚨 automatic fallback to Zeno
      if (server === "railway" && !fallbackActive) {
        console.log("⚠️ Railway failed, switching to Zeno fallback");
        setServer("zeno");
        setFallbackActive(true);
        audio.src = STREAMS.zeno;
        try {
          await audio.play();
          setStatus("Playing live via Zeno (fallback)");
          setPlaying(true);
        } catch (e2) {
          setStatus("Unable to connect to both streams.");
        }
      }
    }
  };

  // Manual server selection
  const handleServerChange = (e) => {
    const newServer = e.target.value;
    const audio = audioRef.current;
    setServer(newServer);
    setFallbackActive(false);
    setStatus(`Switched to ${newServer}`);
    if (audio && playing) {
      audio.src = STREAMS[newServer];
      audio.play().catch(() => setStatus(`Error playing ${newServer}`));
    }
  };

  return (
    <div className="player-wrap">
      <div className="bg" ref={bgRef}></div>
      <div
        className="card"
        style={{
          boxShadow:
            bassLevel > 0.79
              ? "0 18px 45px rgba(113, 24, 226, 1)"
              : "0 18px 45px rgba(0, 0, 0, 0.6)",
        }}
      >
        <div className="header">
          <div className="station">Ricalgen FM</div>
          <div className="live"><span className="dot"></span>LIVE</div>
        </div>

        <div className="main">
          <div className="artwork">
            <div className="fg" ref={fgRef}></div>
            <div className="placeholder">🎵</div>
          </div>

          <div className="meta">
            <div className="title">{title}</div>
            <div className="controls-wrap">
              <canvas className="visualizer" ref={canvasRef}></canvas>
              <button className="play" onClick={handlePlay}>
                {playing ? "⏸" : "▶"}
              </button>
              <span className="vol-icon">{volume === 0 ? "🔇" : volume < 0.5 ? "🔉" : "🔊"}</span>
              <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))}/>
              <div className="status">{status}</div>
            </div>
          </div>

          <div className="speaker-wrapper">
            <div className="speaker inside" style={{ filter: bassLevel > 0.78 ? "drop-shadow(0 0 10px rgba(84,87,247,0.6))" : "none" }}></div>
            <div className="speaker inside2" style={{ borderWidth: `${pianoLevel * 30}px` }}></div>
            <div className="speaker center" style={{ transform: `translate(-50%, -50%) scale(${bassLevel > 0.78 || pianoLevel > 0.6 ? 0.89 : 0.9})` }}></div>
            <div className="speaker border"></div>
          </div>
        </div>

        <div className="footer">
          <div className="socials">
            {Object.entries(socialsData).map(([key, url]) => (
              <a key={key} href={url} target="_blank" rel="noopener noreferrer">
                {socialIcons[key]}
              </a>
            ))}
          </div>

          {/* 👇 Manual server selection UI */}
          <div className="server-select">
            <label>Server: </label>
            <select value={server} onChange={handleServerChange}>
              <option value="railway">Railway (Default)</option>
              <option value="zeno">Zeno (Backup)</option>
            </select>
          </div>

          <div className="meta-version">Ricalgen FM player</div>
        </div>
      </div>
      <audio ref={audioRef}></audio>
    </div>
  );
}
