import React, { useEffect, useRef, useState } from "react";
import "./Player.css";

const STREAMS = {
  railway: "https://ricalgenfm.up.railway.app/live",
  zeno: "https://stream.zeno.fm/wngolqwah00tv",
};

const METADATA = {
  railway: "https://ricalgenfm.up.railway.app/status-json.xsl",
  zeno: "https://stream.zeno.fm/wngolqwah00tv",
};

export default function Player() {
  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);

  const [playing, setPlaying] = useState(false);
  const [status, setStatus] = useState("Idle");
  const [nowPlaying, setNowPlaying] = useState("RicalgenFM");
  const [albumArt, setAlbumArt] = useState("/default-art.jpg");
  const [currentServer, setCurrentServer] = useState("railway");
  const [volume, setVolume] = useState(1);

  // 🔊 Initialize Audio + Visualizer
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.crossOrigin = "anonymous";

    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const src = ctx.createMediaElementSource(audio);
    const analyser = ctx.createAnalyser();

    src.connect(analyser);
    analyser.connect(ctx.destination);
    analyser.fftSize = 256;

    audioCtxRef.current = ctx;
    analyserRef.current = analyser;

    const canvas = canvasRef.current;
    const c = canvas.getContext("2d");

    const render = () => {
      requestAnimationFrame(render);
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);

      c.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = dataArray[i];
        const gradient = c.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, "#00ffff");
        gradient.addColorStop(1, "#ff00ff");

        c.fillStyle = gradient;
        c.fillRect(x, canvas.height - barHeight / 2, barWidth, barHeight / 2);
        x += barWidth + 1;
      }
    };

    render();

    // Auto fallback if Railway fails
    audio.addEventListener("error", () => {
      if (currentServer === "railway") {
        console.warn("❌ Railway stream failed, switching to ZenoFM...");
        setCurrentServer("zeno");
        audio.src = STREAMS.zeno;
        audio.play().then(() => {
          setStatus("📻 Auto-switched to ZenoFM");
          setPlaying(true);
        });
      }
    });

    return () => {
      ctx.close();
    };
  }, [currentServer]);

  // 🎶 Fetch Now Playing Metadata
  useEffect(() => {
    const fetchNowPlaying = async () => {
      try {
        if (currentServer === "railway") {
          const res = await fetch(METADATA.railway);
          const json = await res.json();
          const title = json?.icestats?.source?.title || "RicalgenFM";
          setNowPlaying(title);
        } else {
          const res = await fetch(METADATA.zeno);
          const json = await res.json();
          const title =
            json?.icestats?.source?.title ||
            "ZenoFM Stream";
          setNowPlaying(title);
        }
      } catch (err) {
        console.error("Metadata fetch failed:", err);
      }
    };

    fetchNowPlaying();
    const interval = setInterval(fetchNowPlaying, 10000);
    return () => clearInterval(interval);
  }, [currentServer]);

  // 🎧 Play / Pause Logic
  const handlePlay = async () => {
    const audio = audioRef.current;
    const audioCtx = audioCtxRef.current;
    if (!audio || !audioCtx) return;

    if (audioCtx.state === "suspended") await audioCtx.resume();
    if (!audio.src) audio.src = STREAMS[currentServer];

    try {
      if (audio.paused) {
        await audio.play();
        setPlaying(true);
        setStatus(`🎧 Playing via ${currentServer === "railway" ? "Railway" : "ZenoFM"}`);
      } else {
        audio.pause();
        setPlaying(false);
        setStatus("⏸️ Paused");
      }
    } catch (err) {
      console.warn("Play error:", err);
      if (currentServer === "railway") {
        console.warn("Auto switching to ZenoFM...");
        setCurrentServer("zeno");
        audio.src = STREAMS.zeno;
        try {
          await audio.play();
          setPlaying(true);
          setStatus("📻 Auto-switched to ZenoFM");
        } catch {
          setStatus("❌ Both streams unavailable");
        }
      }
    }
  };

  // 🔈 Volume Control
  const handleVolume = (e) => {
    const newVol = e.target.value;
    setVolume(newVol);
    audioRef.current.volume = newVol;
  };

  return (
    <div className="player-container">
      <canvas ref={canvasRef} width="400" height="100"></canvas>

      <div className="info">
        <img
          src={albumArt}
          alt="Album Art"
          className="album-art"
          onError={(e) => (e.target.src = "/default-art.jpg")}
        />
        <div className="text-info">
          <h3>{nowPlaying}</h3>
          <p>{status}</p>
        </div>
      </div>

      <div className="controls-wrap">
        <button onClick={handlePlay} className="play-btn">
          {playing ? "⏸️ Pause" : "▶️ Play"}
        </button>

        <select
          value={currentServer}
          onChange={(e) => {
            const newServer = e.target.value;
            setCurrentServer(newServer);
            const audio = audioRef.current;
            audio.src = STREAMS[newServer];
            if (playing) audio.play();
            setStatus(`🎧 Playing via ${newServer === "railway" ? "Railway" : "ZenoFM"}`);
          }}
          className="bg-gray-800 text-white px-2 py-1 rounded ml-2"
        >
          <option value="railway">Railway</option>
          <option value="zeno">ZenoFM</option>
        </select>

        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={handleVolume}
          className="volume-slider ml-2"
        />
      </div>

      <audio ref={audioRef}></audio>
    </div>
  );
}
