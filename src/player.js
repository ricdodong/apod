// src/player.js
export default async function initPlayer({
    audioEl,
    canvasEl,
    bgEl,
    fgEl,
    placeholderEl,
    stationNameEl,
    titleEl,
    btnPlayEl,
    volEl,
    statusEl,
    socialsEl,
    liveIndicatorEl,
    volIconEl,
    setTitle,
    setStatus,
    setPlaying,
  }) {
    const audio = audioEl;
    const canvas = canvasEl;
    const bg = bgEl;
    const fg = fgEl;
    const placeholder = placeholderEl;
    const stationName = stationNameEl;
    const title = titleEl;
    const btnPlay = btnPlayEl;
    const vol = volEl;
    const status = statusEl;
    const socials = socialsEl;
    const liveIndicator = liveIndicatorEl;
    const volIcon = volIconEl;
  
    const ytKey = "AIzaSyC0gsNZZ_igtiP2CTjxrN62MP_MB2PIaVU";
    const mount = "wngolqwah00tv";
    const stationId = "6a97e483-6f54-4ef8-aee3-432441265aed";
  
    // ---------- SOCIALS ----------
    const icons = { /* same SVGs as before */ };
    const socialsData = {
      facebook: "https://facebook.com/ricalgenfm",
      twitter: "https://twitter.com/ricalgenfm",
      instagram: "https://instagram.com/ricalgenfm",
      youtube: "https://youtube.com/ricalgenfm",
    };
    socials.innerHTML = Object.entries(socialsData)
      .map(([key, url]) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${icons[key]}</a>`)
      .join(" ");
  
    // ---------- AUDIO SETUP ----------
    audio.crossOrigin = "anonymous";
    audio.volume = parseFloat(vol.value || "1");
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioCtx.createAnalyser();
    const src = audioCtx.createMediaElementSource(audio);
    src.connect(analyser);
    analyser.connect(audioCtx.destination);
    analyser.fftSize = 512;
    const freqData = new Uint8Array(analyser.frequencyBinCount);
    const smoothArray = new Array(analyser.frequencyBinCount).fill(0);
    let visualizerInitialized = false;
    const artCache = new Map();
    let eventSource = null;
  
    // ---------- UI HELPERS ----------
    function setBackground(url) {
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
  
    function updateTitle(text, marquee = false) {
      if (setTitle) return setTitle(text);
      if (marquee) title.innerHTML = `<span class="marquee">${text}</span>`;
      else title.textContent = text;
    }
  
    // ---------- FETCH FUNCTIONS ----------
    async function fetchStation(stationId) {
      // same as before, return { id, title, logo, streamURL }
    }
  
    async function fetchArtwork(title, stationLogo) {
      // same as before
    }
  
    // ---------- VISUALIZER ----------
    function initVisualizer() {
      if (visualizerInitialized) return;
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
    stationName.textContent = station.title || "Station";
    setBackground(station.logo);
    setForeground(station.logo);
    updateTitle("Click Play to Start", false);
    audio.src = station.streamURL || `https://stream.zeno.fm/${mount}`;
  
    btnPlay.addEventListener("click", async () => {
      if (audioCtx.state === "suspended") await audioCtx.resume();
      if (audio.paused) {
        await audio.play().catch(console.warn);
        btnPlay.textContent = "⏸";
        status.textContent = "Playing live";
        initVisualizer();
        const art = await fetchArtwork(title.textContent, station.logo);
        setBackground(art);
        setForeground(art);
        if (setPlaying) setPlaying(true);
      } else {
        audio.pause();
        btnPlay.textContent = "▶";
        status.textContent = "Paused";
        setBackground(station.logo);
        setForeground(station.logo);
        if (setPlaying) setPlaying(false);
      }
    });
  
    // Volume logic remains the same, just replace `els.*` with props
  }
  