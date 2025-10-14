/* player.js — Safe, full-width Zeno.fm–style player */

class ZenoPlayer extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    this._ytKey = 'AIzaSyC0gsNZZ_igtiP2CTjxrN62MP_MB2PIaVU';
    this._mount = null;
    this._station = null;
    this._artCache = new Map();
    this.audio = new Audio();
    this.eventSource = null;

    // --- HTML + CSS ---
    this.shadowRoot.innerHTML = `
      <style>
        :host { display:block; width:100%; box-sizing:border-box; --accent:#ff005a; font-family:Inter,system-ui,Segoe UI,Roboto,Helvetica,Arial }
        .player-wrap { position:relative; width:100%; min-height:220px; overflow:hidden; }
        .bg { position:absolute; inset:0; z-index:0; pointer-events:none; background-size:cover; background-position:center; filter:blur(24px) saturate(0.9) contrast(0.9); transform-origin:center center; transition:opacity 520ms ease, transform 18s linear; opacity:0; }
        .bg.animate { animation: kenburns 18s linear infinite; opacity:1; }
        @keyframes kenburns { 0%{transform:scale(1)} 50%{transform:scale(1.06)} 100%{transform:scale(1)} }
        .bg::after { content:''; position:absolute; inset:0; background:linear-gradient(rgba(8,8,8,0.4), rgba(8,8,8,0.55)); }
        .card { position:relative; z-index:2; margin:18px auto; box-sizing:border-box; background: rgba(20,20,20,0.42); backdrop-filter: blur(6px) saturate(1.05); border-radius:16px; padding:18px; width:100%; max-width:1100px; color:#fff; box-shadow: 0 18px 45px rgba(0,0,0,0.6); }
        .header { display:flex; align-items:center; justify-content:space-between; gap:12px }
        .station { font-weight:700; font-size:18px; letter-spacing:0.2px }
        .live { display:flex; align-items:center; gap:8px; font-size:13px; color:#ffd6e6; }
        .dot { width:10px; height:10px; border-radius:50%; background:var(--accent); box-shadow:0 0 10px rgba(255,0,90,0.45); }
        .main { display:flex; gap:18px; align-items:center; margin-top:14px; flex-wrap:wrap; }
        .artwork { width:220px; height:220px; flex:0 0 220px; border-radius:14px; overflow:hidden; position:relative; background:linear-gradient(180deg,#222,#171717); box-shadow:0 20px 40px rgba(0,0,0,0.6); }
        .fg { position:absolute; inset:0; background-size:cover; background-position:center; transition:opacity 420ms ease, transform 420ms ease; opacity:0; transform:scale(0.98); }
        .fg.show { opacity:1; transform:scale(1); }
        .placeholder { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; color:#9aa0a6; font-size:44px; }
        .meta { flex:1; min-width:220px; display:flex; flex-direction:column; gap:12px; position:relative; z-index:2; }
        .title { font-weight:700; font-size:18px; white-space:nowrap; overflow:hidden; min-height:24px; }
        .marquee { display:inline-block; padding-left:100%; animation:marquee 12s linear infinite; }
        @keyframes marquee { 0%{transform:translateX(0)} 100%{transform:translateX(-100%)} }
        .controls-wrap { position:relative; display:flex; align-items:center; gap:8px; flex-wrap:wrap; padding:8px 12px; border-radius:12px; background: rgba(20,20,20,0.38); backdrop-filter: blur(8px) saturate(1.05); box-shadow: 0 6px 18px rgba(0,0,0,0.35); overflow:hidden; }
        .visualizer { position:absolute; inset:0; z-index:1; border-radius:12px; pointer-events:none; width:100%; }
        .play { padding-bottom: 5px; width:70px; height:70px; border-radius:50%; border:none; background:var(--accent); color:#fff; font-size:24px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; box-shadow:0 14px 34px rgba(0,0,0,0.55); transition:transform 200ms ease, box-shadow 200ms ease; z-index:2; }
        .play:hover { box-shadow:0 18px 40px rgba(255,0,90,0.55); transform:scale(1.05); }
        .play:active { transform:scale(0.98); }
        .vol-icon { cursor:pointer; font-size:20px; z-index:2; display:flex; align-items:center; }
        .vol { width:260px; accent-color:var(--accent); cursor:pointer; z-index:2; }
        .status { font-size:13px; color:#d0d0d0; margin:6px; z-index:2; }
        .footer { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-top:14px; flex-wrap:wrap; z-index:3; position:relative; }
        .meta-version { z-index:4; position:relative; font-weight:600; }
        .socials { display:flex; gap:12px }
        .socials a { color:#d0d0d0; text-decoration:none; font-size:14px }
        @media (max-width:980px) { .artwork { width:200px; height:200px; flex:0 0 200px; } .play { width:64px; height:64px; font-size:20px; } .vol { width:200px; } }
        @media (max-width:640px) { .card { padding:14px; border-radius:12px; } .main { flex-direction:column; align-items:center; gap:12px; } .artwork { width:260px; height:260px; } .vol { width:160px; } }
      </style>

      <div class="player-wrap" part="player-wrap">
        <div class="bg" id="bg" role="img" aria-hidden="true"></div>
        <div class="card" part="card">
          <div class="header">
            <div class="station" id="stationName">Loading…</div>
            <div class="live" id="liveIndicator"><span class="dot"></span><span>LIVE</span></div>
          </div>
          <div class="main">
            <div class="artwork" aria-hidden="true">
              <div class="fg" id="fg"></div>
              <div class="placeholder" id="placeholder">🎵</div>
            </div>
            <div class="meta">
              <div class="title" id="title"><span class="marquee">Loading…</span></div>
              <div class="controls-wrap">
                <canvas class="visualizer" id="visualizer"></canvas>
                <button class="play" id="btnPlay" aria-label="Play/Pause">▶</button>
                <span class="vol-icon">🔊</span>
                <input class="vol" id="vol" type="range" min="0" max="1" step="0.01" value="1" aria-label="Volume">
                <div class="status" id="status">Connecting…</div>
              </div>
            </div>
          </div>
          <div class="footer">
            <div class="socials" id="socials" ></div>
            <div class="meta-version">Ricalgen FM player</div>
          </div>
        </div>
      </div>
    `;

    // --- Elements cache ---
    this._els = {
      bg: this.shadowRoot.getElementById('bg'),
      fg: this.shadowRoot.getElementById('fg'),
      placeholder: this.shadowRoot.getElementById('placeholder'),
      stationName: this.shadowRoot.getElementById('stationName'),
      title: this.shadowRoot.getElementById('title'),
      btnPlay: this.shadowRoot.getElementById('btnPlay'),
      vol: this.shadowRoot.getElementById('vol'),
      status: this.shadowRoot.getElementById('status'),
      socials: this.shadowRoot.getElementById('socials'),
      liveIndicator: this.shadowRoot.getElementById('liveIndicator'),
      visualizer: this.shadowRoot.getElementById('visualizer'),
      volIcon: this.shadowRoot.querySelector('.vol-icon')
    };
  }

  // --- Fetch station safely ---
  async _fetchStation(stationId) {
    try {
      const resp = await fetch(`https://zenoplay.zenomedia.com/api/zenofm/stations/${stationId}/`);
      if (!resp.ok) throw new Error('station fetch failed');
      const data = await resp.json();
      const logo = `https://proxy.zeno.fm/content/stations/${data.objectID}/image/?u=${data.updated || ''}`;
      let streamURL = `https://stream.zeno.fm/${this._mount}`;
      if (data.live_streams?.length) {
        const live = data.live_streams.find(s => s.url && ['mp3','aac'].includes(s.type));
        if (live?.url) streamURL = live.url;
      }
      return { id: data.objectID, title: data.station_name, logo, streamURL };
    } catch (e) {
      console.warn('station fetch failed', e);
      return { id: stationId, title: stationId, logo: '', streamURL: `https://stream.zeno.fm/${this._mount}` };
    }
  }

  // --- Fetch artwork safely ---
  async _fetchArtwork(title, stationLogo) {
    const key = title || '';
    if (this._artCache.has(key)) return this._artCache.get(key);
    let img = stationLogo || '';

    // YouTube first
    if (this._ytKey) {
      try {
        const r = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=${encodeURIComponent(title)}&key=${this._ytKey}`);
        if (r.ok) {
          const j = await r.json();
          const thumb = j.items?.[0]?.snippet?.thumbnails?.maxres?.url
                     || j.items?.[0]?.snippet?.thumbnails?.high?.url
                     || j.items?.[0]?.snippet?.thumbnails?.default?.url;
          if (thumb) { img = thumb; this._artCache.set(key,img); return img; }
        }
      } catch (e) { console.warn('youtube lookup failed', e); }
    }

    // iTunes fallback
    try {
      const r2 = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(title)}&limit=1`);
      if (r2.ok) {
        const j2 = await r2.json();
        const a = j2.results?.[0]?.artworkUrl100;
        if (a) { img = a.replace('100x100','600x600'); this._artCache.set(key,img); return img; }
      }
    } catch(e) { console.warn('itunes lookup failed', e); }

    this._artCache.set(key,img);
    return img;
  }

  // --- Set background/foreground safely ---
  _setBackground(url) {
    const bg = this._els.bg;
    if (!url) { bg.style.opacity='0'; bg.style.backgroundImage=''; bg.classList.remove('animate'); return; }
    bg.style.opacity='0';
    setTimeout(()=>{ bg.style.backgroundImage=`url(${url})`; bg.style.opacity='1'; bg.classList.add('animate'); },160);
  }

  _setForeground(url) {
    const fg = this._els.fg, ph=this._els.placeholder;
    if (!url) { fg.style.opacity='0'; ph.style.display='flex'; fg.style.backgroundImage=''; return; }
    ph.style.display='none';
    fg.classList.remove('show'); fg.style.opacity='0'; fg.style.transform='scale(0.98)';
    setTimeout(()=>{ fg.style.backgroundImage=`url(${url})`; fg.classList.add('show'); fg.style.opacity='1'; fg.style.transform='scale(1)'; },180);
  }

  _setTitle(text) {
    const t=(text||'').trim() || this._station?.title || '—';
    this._els.title.innerHTML = `<span class="marquee">${t}</span>`;
  }

  // --- Visualizer ---
  _initVisualizer() {
    try {
      const canvas=this._els.visualizer;
      const ctx=canvas.getContext('2d');
      const audioCtx=new (window.AudioContext||window.webkitAudioContext)();
      const analyser=audioCtx.createAnalyser();
      const source=audioCtx.createMediaElementSource(this.audio);
      source.connect(analyser); analyser.connect(audioCtx.destination);
      analyser.fftSize=512; analyser.smoothingTimeConstant=0.85;
      const bufferLength=analyser.frequencyBinCount;
      const dataArray=new Uint8Array(bufferLength);
      const smoothArray=new Array(bufferLength).fill(0);
      const draw=()=>{
        canvas.width=canvas.clientWidth; canvas.height=canvas.clientHeight;
        ctx.clearRect(0,0,canvas.width,canvas.height);
        analyser.getByteFrequencyData(dataArray);
        const barWidth=(canvas.width/bufferLength)*2.5;
        let x=0;
        for(let i=0;i<bufferLength;i++){
          smoothArray[i]+=(dataArray[i]-smoothArray[i])*0.35;
          const barHeight=smoothArray[i]/1.8;
          const hue=(i*360/bufferLength+Date.now()*0.07)%360;
          const grad=ctx.createLinearGradient(0,canvas.height-barHeight,0,canvas.height);
          grad.addColorStop(0,`hsla(${hue},90%,60%,0.9)`); grad.addColorStop(1,`hsla(${hue},90%,50%,0.3)`);
          ctx.fillStyle=grad; ctx.fillRect(x,canvas.height-barHeight,barWidth,barHeight);
          x+=barWidth+1;
        }
        requestAnimationFrame(draw);
      };
      draw();
    } catch(e){ console.warn('visualizer failed',e);}
  }

  // --- ConnectedCallback ---
  async connectedCallback() {
    this._mount=this.getAttribute('mount')||'wngolqwah00tv';
    const stationId=this.getAttribute('station-id')||'6a97e483-6f54-4ef8-aee3-432441265aed';

    this._station=await this._fetchStation(stationId);
    this._els.stationName.textContent=this._station.title||'Station';
    this._setBackground(this._station.logo);
    this._setForeground(this._station.logo);
    this._setTitle(this._station.title);

    // Socials
    try {
      const r=await fetch(`https://stream-tools.zenomedia.com/public/zenofm/${this._station.id}/dashboardCards`);
      if(r.ok){
        const cards=await r.json();
        const social=(cards||[]).find(c=>c.type==='CardSocialMedia');
        if(social){
          const links=[];
          if(social.facebook) links.push({k:'fb',u:social.facebook.url});
          if(social.instagram) links.push({k:'ig',u:social.instagram.url});
          if(social.twitter) links.push({k:'tw',u:social.twitter.url});
          if(social.youtube) links.push({k:'yt',u:social.youtube.url});
          if(links.length) this._els.socials.innerHTML=links.map(l=>`<a href="${l.u}" target="_blank" rel="noopener noreferrer">${l.k.toUpperCase()}</a>`).join(' ');
        }
      }
    } catch(e){}

    const socialsData = {
      facebook: 'https://facebook.com/ricalgenfm',
      twitter: 'https://twitter.com/ricalgenfm',
      instagram: 'https://instagram.com/ricalgenfm',
      youtube: 'https://youtube.com/ricalgenfm'
    };
    
    const icons = {
      facebook: `<svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor"><path d="M22 12a10 10 0 1 0-11 9.95v-7.05H8v-2.9h3v-2.2c0-3 1.8-4.6 4.5-4.6 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 1-2 2v2h3.4l-.5 2.9h-2.9V22A10 10 0 0 0 22 12z"/></svg>`,
      twitter: `<svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor"><path d="M22.46 6c-.77.35-1.6.58-2.46.69a4.28 4.28 0 0 0 1.88-2.36 8.59 8.59 0 0 1-2.7 1.03 4.28 4.28 0 0 0-7.3 3.9A12.15 12.15 0 0 1 3.1 4.9a4.28 4.28 0 0 0 1.32 5.7 4.28 4.28 0 0 1-1.94-.53v.05a4.28 4.28 0 0 0 3.43 4.2 4.28 4.28 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.97 8.57 8.57 0 0 1-5.3 1.83A8.7 8.7 0 0 1 2 19.54 12.08 12.08 0 0 0 8.29 21c7.55 0 11.68-6.26 11.68-11.68 0-.18-.01-.35-.02-.53A8.36 8.36 0 0 0 22.46 6z"/></svg>`,
      instagram: `<svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor"><path d="M7 2C4.24 2 2 4.24 2 7v10c0 2.76 2.24 5 5 5h10c2.76 0 5-2.24 5-5V7c0-2.76-2.24-5-5-5H7zm10 2a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h10zm-5 3a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm4.5-.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/></svg>`,
      youtube: `<svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor"><path d="M21.8 8s-.2-1.4-.8-2a3.3 3.3 0 0 0-2.3-.8C16.2 5 12 5 12 5s-4.2 0-6.7.2a3.3 3.3 0 0 0-2.3.8C2.4 6.6 2.2 8 2.2 8S2 9.6 2 11.2v1.6c0 1.6.2 3.2.2 3.2s.2 1.4.8 2a3.3 3.3 0 0 0 2.3.8c2.5.2 6.7.2 6.7.2s4.2 0 6.7-.2a3.3 3.3 0 0 0 2.3-.8c.6-.6.8-2 .8-2s.2-1.6.2-3.2v-1.6c0-1.6-.2-3.2-.2-3.2zM10 15V9l5 3-5 3z"/></svg>`
    };
    
    this._els.socials.innerHTML = Object.entries(socialsData)
      .map(([key, url]) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${icons[key]}</a>`)
      .join(' ');
    
    
    // Audio setup
    this.audio.src=this._station.streamURL||`https://stream.zeno.fm/${this._mount}`;
    this.audio.crossOrigin='anonymous';
    this.audio.volume=parseFloat(this._els.vol.value||'1');

    // --- Safe Play/Pause ---
    this._els.btnPlay.addEventListener('click',()=>{
      try {
        if(this.audio.paused){
          this.audio.play().catch(e=>{ console.warn('play failed',e); });
          this._els.btnPlay
          this._els.btnPlay.textContent = '⏸';
          this._els.status.textContent = 'Playing live';
          this._initVisualizer();
        } else {
          this.audio.pause();
          this._els.btnPlay.textContent = '▶';
          this._els.status.textContent = 'Paused';
        }
      } catch (e) {
        console.warn('Play/pause error', e);
        this._els.status.textContent = 'Playback error';
      }
    });

    // --- Safe Volume Slider ---
// Function to update volume icon based on current volume
const updateVolIcon = () => {
  const vol = this.audio.muted ? 0 : this.audio.volume;
  if (vol === 0) this._els.volIcon.textContent = '🔇';
  else if (vol <= 0.33) this._els.volIcon.textContent = '🔈';
  else if (vol <= 0.66) this._els.volIcon.textContent = '🔉';
  else this._els.volIcon.textContent = '🔊';
};

// Volume slider input
this._els.vol.addEventListener('input', (e) => {
  let val = parseFloat(e.target.value);
  if (isNaN(val)) val = 1;
  val = Math.min(Math.max(val, 0), 1);
  this.audio.volume = val;
  this.audio.muted = val === 0;
  updateVolIcon();
  this._els.vol.value = val;
});

// Volume icon click toggle (single safe handler)
this._els.volIcon.addEventListener('click', () => {
  if (this.audio.muted || this.audio.volume === 0) {
    this.audio.muted = false;
    if (this.audio.volume === 0) this.audio.volume = 1; // restore default volume
    this._els.vol.value = this.audio.volume;
  } else {
    this.audio.muted = true;
    this._els.vol.value = 0;
  }
  updateVolIcon();
});

// Initialize icon on start
updateVolIcon();


    // --- SSE Metadata Safe Setup ---
    const metaURL = `https://api.zeno.fm/mounts/metadata/subscribe/${this._mount}`;
    try {
      this.eventSource = new EventSource(metaURL);
      this.eventSource.addEventListener('open', () => { this._els.status.textContent = 'Live connected'; });
      this.eventSource.addEventListener('error', () => { this._els.status.textContent = 'Reconnecting...'; });
      this.eventSource.addEventListener('message', async (ev) => {
        try {
          const d = JSON.parse(ev.data);
          if (d.streamTitle) {
            this._setTitle(d.streamTitle);
            const art = await this._fetchArtwork(d.streamTitle, this._station.logo);
            this._setBackground(art);
            this._setForeground(art);
          }
        } catch (err) {
          console.warn('SSE parse error', err);
        }
      });
    } catch (e) {
      console.warn('SSE setup failed', e);
      this._els.status.textContent = 'Metadata unavailable';
    }
  }

  disconnectedCallback() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    try { this.audio.pause(); } catch(e){}
  }
}

customElements.define('zeno-player', ZenoPlayer);
