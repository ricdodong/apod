// src/player.js
export default async function initPlayer({
    audioEl,
    canvasEl,
    bgEl,
    fgEl,
    placeholderEl,
    stationNameEl,
    btnPlayEl,
    volEl,
    statusEl,
    volIconEl,
    setTitle,
    setStatus,
    setPlaying,
  }) {
    if (!audioEl || !canvasEl) return;
  
    const audio = audioEl;
    const canvas = canvasEl;
    const bg = bgEl;
    const fg = fgEl;
    const placeholder = placeholderEl;
    const stationName = stationNameEl;
    const btnPlay = btnPlayEl;
    const vol = volEl;
    const status = statusEl;
    const volIcon = volIconEl;
  
    const ytKey = "AIzaSyC0gsNZZ_igtiP2CTjxrN62MP_MB2PIaVU";
    const mount = "wngolqwah00tv";
    const stationId = "6a97e483-6f54-4ef8-aee3-432441265aed";
  
    // ---------- AUDIO SETUP ----------
    audio.crossOrigin = "anonymous";
    audio.volume = parseFloat(vol?.value || 1);
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioCtx.createAnalyser();
    const src = audioCtx.createMediaElementSource(audio);
    src.connect(analyser);
    analyser.connect(audioCtx.destination);
    analyser.fftSize = 512;
  
    const freqData = new Uint8Array(analyser.frequencyBinCount);
    const smoothArray = new Array(analyser.frequencyBinCount).fill(0);
    let visualizerInitialized = false;
    let currentSongTitle = "";
  
    // ---------- UI HELPERS ----------
    function setBackground(url) {
      if (!bg) return;
      if (!url) {
        bg.style.opacity = "0";
        bg.style.backgroundImage = "";
        bg.classList.remove("animate");
        return;
      }
      bg.style.opacity = "0";
      setTimeout(() => {
        bg.style.backgroundImage = `url(${url})`;
        bg.style.opacity = "1";
        bg.classList.add("animate");
      }, 160);
    }
  
    function setForeground(url) {
      if (!fg || !placeholder) return;
      if (!url) {
        fg.style.opacity = "0";
        placeholder.style.display = "flex";
        fg.style.backgroundImage = "";
        return;
      }
      placeholder.style.display = "none";
      fg.classList.remove("show");
      fg.style.opacity = "0";
      fg.style.transform = "scale(0.98)";
      setTimeout(() => {
        fg.style.backgroundImage = `url(${url})`;
        fg.classList.add("show");
        fg.style.opacity = "1";
        fg.style.transform = "scale(1)";
      }, 180);
    }
  
    function updateTitle(text) {
      currentSongTitle = text;
      if (setTitle) setTitle(text);
    }
  
    function updateStatus(text) {
      if (setStatus) setStatus(text);
    }
  
    function updatePlaying(isPlaying) {
      if (setPlaying) setPlaying(isPlaying);
    }
  
    // ---------- FETCH FUNCTIONS ----------
    async function fetchStation(stationId) {
      try {
        const resp = await fetch(`https://zenoplay.zenomedia.com/api/zenofm/stations/${stationId}/`);
        if (!resp.ok) throw new Error("Station fetch failed");
        const data = await resp.json();
        const logo = `https://proxy.zeno.fm/content/stations/${data.objectID}/image/?u=${data.updated || ""}`;
        let streamURL = `https://stream.zeno.fm/${mount}`;
        if (data.live_streams?.length) {
          const live = data.live_streams.find(s => s.url && ["mp3", "aac"].includes(s.type));
          if (live?.url) streamURL = live.url;
        }
        return { id: data.objectID, title: data.station_name, logo, streamURL };
      } catch {
        return { id: stationId, title: stationId, logo: "", streamURL: `https://stream.zeno.fm/${mount}` };
      }
    }
  
    async function fetchArtwork(title, stationLogo) {
      // Simple placeholder logic: use station logo for now
      return stationLogo || "";
    }
  
    // ---------- VISUALIZER ----------
    function initVisualizer() {
      if (!canvas || visualizerInitialized) return;
      visualizerInitialized = true;
      const ctx = canvas.getContext("2d");
  
      function drawBars() {
        requestAnimationFrame(drawBars);
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        analyser.getByteFrequencyData(freqData);
        const barWidth = (canvas.width / freqData.length) * 2.5;
        let x = 0;
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
      }
      drawBars();
    }
  
    // ---------- INIT ----------
    const station = await fetchStation(stationId);
    if (stationName) stationName.textContent = station.title || "Station";
    setBackground(station.logo);
    setForeground(station.logo);
    updateTitle("Click Play to Start");
    audio.src = station.streamURL || `https://stream.zeno.fm/${mount}`;
  
    // Play button
    if (btnPlay) {
      btnPlay.addEventListener("click", async () => {
        if (audioCtx.state === "suspended") await audioCtx.resume();
        if (audio.paused) {
          await audio.play().catch(console.warn);
          btnPlay.textContent = "⏸";
          updateStatus("Playing live");
          initVisualizer();
          const art = await fetchArtwork(currentSongTitle, station.logo);
          setBackground(art);
          setForeground(art);
          updatePlaying(true);
        } else {
          audio.pause();
          btnPlay.textContent = "▶";
          updateStatus("Paused");
          setBackground(station.logo);
          setForeground(station.logo);
          updatePlaying(false);
        }
      });
    }
  
    // Volume
    function updateVolIcon() {
      if (!volIcon) return;
      if (audio.muted || audio.volume === 0) volIcon.textContent = "🔇";
      else if (audio.volume < 0.5) volIcon.textContent = "🔉";
      else volIcon.textContent = "🔊";
    }
  
    if (vol) {
      vol.addEventListener("input", e => {
        const v = Math.min(Math.max(parseFloat(e.target.value), 0), 1);
        audio.volume = v;
        audio.muted = v === 0;
        updateVolIcon();
      });
    }
  
    if (volIcon) {
      volIcon.addEventListener("click", () => {
        audio.muted = !audio.muted;
        if (vol) vol.value = audio.muted ? 0 : audio.volume;
        updateVolIcon();
      });
    }
  
    updateVolIcon();
  }
  