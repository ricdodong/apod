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

const socialIcons = {
  facebook: (
    <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
      <path d="M22 12a10 10 0 1 0-11 9.95v-7.05H8v-2.9h3v-2.2c0-3 1.8-4.6 4.5-4.6 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 1-2 2v2h3.4l-.5 2.9h-2.9V22A10 10 0 0 0 22 12z" />
    </svg>
  ),
  twitter: (
    <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
      <path d="M22.46 6c-.77.35-1.6.58-2.46.69a4.28 4.28 0 0 0 1.88-2.36 8.59 8.59 0 0 1-2.7 1.03 4.28 4.28 0 0 0-7.3 3.9A12.15 12.15 0 0 1 3.1 4.9a4.28 4.28 0 0 0 1.32 5.7 4.28 4.28 0 0 1-1.94-.53v.05a4.28 4.28 0 0 0 3.43 4.2 4.28 4.28 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.97 8.57 8.57 0 0 1-5.3 1.83A8.7 8.7 0 0 1 2 19.54 12.08 12.08 0 0 0 8.29 21c7.55 0 11.68-6.26 11.68-11.68 0-.18-.01-.35-.02-.53A8.36 8.36 0 0 0 22.46 6z" />
    </svg>
  ),
  instagram: (
    <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
      <path d="M7 2C4.24 2 2 4.24 2 7v10c0 2.76 2.24 5 5 5h10c2.76 0 5-2.24 5-5V7c0-2.76-2.24-5-5-5H7zm10 2a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h10zm-5 3a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm4.5-.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
    </svg>
  ),
  youtube: (
    <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
      <path d="M21.8 8s-.2-1.4-.8-2a3.3 3.3 0 0 0-2.3-.8C16.2 5 12 5 12 5s-4.2 0-6.7.2a3.3 3.3 0 0 0-2.3.8C2.4 6.6 2.2 8 2.2 8S2 9.6 2 11.2v1.6c0 1.6.2 3.2.2 3.2s.2 1.4.8 2a3.3 3.3 0 0 0 2.3.8c2.5.2 6.7.2 6.7.2s4.2 0 6.7-.2a3.3 3.3 0 0 0 2.3-.8c.6-.6.8-2 .8-2s.2-1.6.2-3.2v-1.6c0-1.6-.2-3.2-.2-3.2zM10 15V9l5 3-5 3z" />
    </svg>
  ),
};

export default function Player() {
  const [title, setTitle] = useState("Click Play to Start");
  const [status, setStatus] = useState("Connecting…");
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [bassLevel, setBassLevel] = useState(0);
  const [pianoLevel, setPianoLevel] = useState(0);
  const [currentServer, setCurrentServer] = useState("railway"); // default server

  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const bgRef = useRef(null);
  const fgRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);

  const STREAMS = {
    railway: "https://ricalgenfm-production.up.railway.app/live",
    zeno: "https://stream.zeno.fm/wngolqwah00tv",
  };

  const STATION_LOGO = "https://static.zeno.fm/stations/6a97e483-6f54-4ef8-aee3-432441265aed.png";

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

    const source = new EventSource(
      "https://api.zeno.fm/mounts/metadata/subscribe/wngolqwah00tv"
    );

    source.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        const songTitle = data.streamTitle || data.title || "";
        if (!songTitle) return;
        setTitle(songTitle);
        document.title = `🎶 ${songTitle} | Ricalgen FM`;
      } catch {}
    };

    return () => source.close();
  }, []);

  // Volume effect
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  // 🔄 Auto fallback
  const playWithFallback = async (audio) => {
    try {
      audio.src = STREAMS[currentServer];
      await audio.play();
      setStatus(`Playing from ${currentServer}`);
      setPlaying(true);
    } catch {
      if (currentServer === "railway") {
        console.warn("❌ Railway down, switching to Zeno");
        setCurrentServer("zeno");
        audio.src = STREAMS.zeno;
        await audio.play();
        setStatus("Playing fallback (Zeno)");
        setPlaying(true);
      }
    }
  };

  const handlePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      await playWithFallback(audio);
    } else {
      audio.pause();
      setStatus("Paused");
      setPlaying(false);
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
          <div className="live">
            <span className="dot"></span>LIVE
          </div>
          <div className="server-select">
            <select
              value={currentServer}
              onChange={(e) => setCurrentServer(e.target.value)}
              title="Select stream server"
            >
              <option value="railway">Railway (default)</option>
              <option value="zeno">Zeno</option>
            </select>
          </div>
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
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
              />
              <div className="status">{status}</div>
            </div>
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
          <div className="meta-version">Ricalgen FM player</div>
        </div>
      </div>
      <audio ref={audioRef}></audio>
    </div>
  );
}
