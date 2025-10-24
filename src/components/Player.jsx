// src/components/Player.jsx
import React, { useEffect, useRef, useState } from "react";
import "../assets/styles.css";

const socialsData = {
  facebook: "https://facebook.com/ricalgenfm",
  twitter: "https://twitter.com/ricalgenfm",
  instagram: "https://instagram.com/ricalgenfm",
  youtube: "https://youtube.com/ricalgenfm",
};

const SERVERS = {
  railway: {
    name: "Railway (Primary)",
    stream: "https://ricalgenfm.up.railway.app/live",
    meta: "https://ricalgenfm.up.railway.app/status-json.xsl",
    type: "icecast",
  },
  zeno: {
    name: "Zeno.fm (Backup)",
    stream: "https://stream.zeno.fm/wngolqwah00tv",
    meta: "https://api.zeno.fm/mounts/metadata/subscribe/wngolqwah00tv",
    type: "zeno",
  },
};

export default function Player() {
  const [server, setServer] = useState("railway");
  const [manualServer, setManualServer] = useState(false);
  const [title, setTitle] = useState("Connecting…");
  const [status, setStatus] = useState("Idle");
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(1);

  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const metadataInterval = useRef(null);
  const heartbeatInterval = useRef(null);

  // 🎧 VISUALIZER
  useEffect(() => {
    const audio = audioRef.current;
    const canvas = canvasRef.current;
    if (!audio || !canvas) return;

    audio.crossOrigin = "anonymous";
    if (!audioCtxRef.current) {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      const src = ctx.createMediaElementSource(audio);
      src.connect(analyser);
      analyser.connect(ctx.destination);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;

      const freqData = new Uint8Array(analyser.frequencyBinCount);
      const smooth = new Array(analyser.frequencyBinCount).fill(0);
      const c = canvas.getContext("2d");

      const draw = () => {
        requestAnimationFrame(draw);
        c.clearRect(0, 0, canvas.width, canvas.height);
        analyser.getByteFrequencyData(freqData);

        let x = 0;
        const barWidth = canvas.width / freqData.length;
        for (let i = 0; i < freqData.length; i++) {
          smooth[i] += (freqData[i] - smooth[i]) * 0.35;
          const h = smooth[i] / 1.8;
          const hue = ((i * 360) / freqData.length + Date.now() * 0.07) % 360;
          const grad = c.createLinearGradient(0, canvas.height - h, 0, canvas.height);
          grad.addColorStop(0, `hsla(${hue},90%,60%,0.9)`);
          grad.addColorStop(1, `hsla(${hue},90%,50%,0.3)`);
          c.fillStyle = grad;
          c.fillRect(x, canvas.height - h, barWidth, h);
          x += barWidth + 1;
        }
      };
      draw();
    }
  }, []);

  // 🎶 METADATA FETCH
  useEffect(() => {
    clearInterval(metadataInterval.current);

    if (SERVERS[server].type === "zeno") {
      const src = new EventSource(SERVERS[server].meta);
      src.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          const song = data.streamTitle || data.title || "Ricalgen FM";
          setTitle(song);
          document.title = `🎶 ${song} | Ricalgen FM`;
        } catch {}
      };
      return () => src.close();
    }

    async function fetchMeta() {
      try {
        const res = await fetch(SERVERS[server].meta + "?_=" + Date.now());
        const json = await res.json();
        const song =
          json.icestats?.source?.title ||
          json.icestats?.source?.server_name ||
          "Ricalgen FM Live";
        setTitle(song);
        document.title = `🎶 ${song} | Ricalgen FM`;
      } catch (e) {
        console.warn("Metadata fetch failed:", e);
        if (!manualServer) autoFailover();
      }
    }

    fetchMeta();
    metadataInterval.current = setInterval(fetchMeta, 10000);
    return () => clearInterval(metadataInterval.current);
  }, [server, manualServer]);

  // 🔄 AUTO FAILOVER
  const autoFailover = () => {
    if (server === "railway") {
      console.warn("⚠️ Railway offline — switching to Zeno.fm backup");
      setServer("zeno");
      setStatus("Auto-switched to Zeno.fm backup");
      if (playing) handlePlay(true);
    }
  };

  // ♻️ AUTO RESTORE HEARTBEAT
  useEffect(() => {
    clearInterval(heartbeatInterval.current);

    heartbeatInterval.current = setInterval(async () => {
      if (server === "zeno" && !manualServer) {
        try {
          const res = await fetch(SERVERS.railway.meta, { cache: "no-store" });
          const json = await res.json();
          if (json.icestats?.source) {
            console.log("✅ Railway is back — restoring primary stream");
            setServer("railway");
            setStatus("Auto-restored to Railway (Primary)");
            if (playing) handlePlay(true);
          }
        } catch {
          // still down
        }
      }
    }, 15000);

    return () => clearInterval(heartbeatInterval.current);
  }, [server, manualServer, playing]);

  // ▶ PLAY / PAUSE
  const handlePlay = async (auto = false) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!audio.src || audio.src !== SERVERS[server].stream)
      audio.src = SERVERS[server].stream;

    if (audioCtxRef.current?.state === "suspended")
      await audioCtxRef.current.resume();

    try {
      if (audio.paused) {
        await audio.play();
        setStatus(`Playing via ${SERVERS[server].name}`);
        setPlaying(true);
      } else if (!auto) {
        audio.pause();
        setStatus("Paused");
        setPlaying(false);
      }
    } catch (err) {
      console.warn("Audio play failed:", err);
      if (!manualServer) autoFailover();
    }
  };

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  return (
    <div className="player-wrap">
      <div className="card">
        <div className="header">
          <div className="station">Ricalgen FM</div>
          <div className="live"><span className="dot"></span>LIVE</div>
        </div>

        <div className="main">
          <div className="meta">
            <div className="title">{title}</div>
            <div className="server-select">
              <label>Server:</label>
              <select
                value={server}
                onChange={(e) => {
                  const val = e.target.value;
                  setManualServer(true);
                  setServer(val);
                  setStatus(`Manually switched to ${SERVERS[val].name}`);
                  if (playing) handlePlay(true);
                }}
              >
                <option value="railway">Railway (Primary)</option>
                <option value="zeno">Zeno.fm (Backup)</option>
              </select>
              {manualServer && (
                <button
                  onClick={() => {
                    setManualServer(false);
                    setStatus("🔄 Auto mode re-enabled");
                  }}
                  className="auto-btn"
                >
                  Auto Mode
                </button>
              )}
            </div>

            <canvas className="visualizer" ref={canvasRef}></canvas>
            <div className="controls">
              <button onClick={() => handlePlay()}>
                {playing ? "⏸ Pause" : "▶ Play"}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
              />
            </div>
            <div className="status">{status}</div>
          </div>
        </div>

        <div className="footer">
          <div className="socials">
            {Object.entries(socialsData).map(([k, v]) => (
              <a key={k} href={v} target="_blank" rel="noreferrer">{k}</a>
            ))}
          </div>
          <div className="meta-version">Ricalgen FM Smart Dual Player</div>
        </div>
      </div>
      <audio ref={audioRef}></audio>
    </div>
  );
}
