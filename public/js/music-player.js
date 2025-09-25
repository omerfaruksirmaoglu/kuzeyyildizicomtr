(() => {
  const ROOT_ID = 'music-player-root';
  const STORAGE_KEY = 'mp_state_v1';
  const CONFIG_URL = '/music/music-config.json';

  const state = {
    tracks: [],
    index: 0,
    isPlaying: false,
    volume: 0.8,
    repeat: 'all', // 'off' | 'one' | 'all'
    shuffle: false,
    minimized: false,
    seekLock: false,
    userInteracted: false,
  };

  const qs = (sel, parent=document) => parent.querySelector(sel);
  const fmtTime = (s) => {
    if (!isFinite(s)) return '0:00';
    s = Math.max(0, Math.floor(s));
    const m = Math.floor(s / 60);
    const ss = (s % 60).toString().padStart(2, '0');
    return `${m}:${ss}`;
  };
  const save = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        index: state.index,
        isPlaying: state.isPlaying,
        volume: state.volume,
        repeat: state.repeat,
        shuffle: state.shuffle,
        minimized: state.minimized,
        currentTime: audio?.currentTime || 0
      }));
    } catch {}
  };
   const load = () => {
    state._hasSavedState = false;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      state._hasSavedState = true;
      Object.assign(state, {
        index: s.index ?? 0,
        isPlaying: s.isPlaying ?? false,
        volume: s.volume ?? 0.8,
        repeat: s.repeat ?? 'all',
        shuffle: s.shuffle ?? false,
        minimized: s.minimized ?? false,
      });
      state._resumeTime = s.currentTime ?? 0;
    } catch {}
  };

  // Inject root
  let root = document.getElementById(ROOT_ID);
  if (!root) {
    root = document.createElement('div');
    root.id = ROOT_ID;
    document.body.appendChild(root);
  }
  root.innerHTML = `
    <div class="mp-wrap">
      <div class="mp" id="mp-expanded">
        <div class="mp-header">
          <img class="mp-cover" id="mp-cover" alt="cover"/>
          <div class="mp-titles">
            <div class="mp-title" id="mp-title">Yükleniyor…</div>
            <div class="mp-artist" id="mp-artist"></div>
          </div>
          <div class="mp-actions">
            <button class="mp-btn" id="mp-minimize" title="Minimize">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M19 13H5v-2h14v2Z" fill="currentColor"/></svg>
            </button>
            <button class="mp-btn" id="mp-close" title="Gizle">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.29 19.7 2.88 18.3 9.17 12 2.88 5.71 4.29 4.29 10.59 10.6 16.89 4.3l1.41 1.41Z" fill="currentColor"/></svg>
            </button>
          </div>
        </div>
        <div class="mp-body">
          <div class="mp-seek">
            <div class="mp-time" id="mp-current">0:00</div>
            <input type="range" id="mp-progress" class="mp-range" min="0" max="100" value="0" step="0.1" />
            <div class="mp-time" id="mp-duration">0:00</div>
          </div>
          <div class="mp-controls">
            <div class="mp-nav">
              <button class="mp-secondary" id="mp-prev" title="Önceki">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 6h2v12H6V6Zm2 6 10 6V6L8 12Z" fill="currentColor"/></svg>
              </button>
              <button class="mp-primary" id="mp-toggle" title="Oynat/Duraklat">
                <svg id="mp-toggle-icon" width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M8 5v14l11-7L8 5Z" fill="currentColor"/></svg>
              </button>
              <button class="mp-secondary" id="mp-next" title="Sonraki">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 18V6l10 6-10 6Zm10-12h2v12h-2V6Z" fill="currentColor"/></svg>
              </button>
            </div>
            <div class="mp-right">
              <button class="mp-btn" id="mp-shuffle" title="Karıştır">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M17 3h4v4h-2V5h-2V3ZM3 7h6l8 10h4v4h-4v-2h2l-8-10H3V7Zm14 4h4v4h-2v-2h-2v-2Z" fill="currentColor"/></svg>
              </button>
              <button class="mp-btn" id="mp-repeat" title="Tekrar">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M7 7h7V3l5 5-5 5V9H7v6h6v2H7a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" fill="currentColor"/></svg>
              </button>
              <!-- Ses ikonu (hoparlör + dalga) -->
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 9v6h4l5 5V4L8 9H4Z" fill="currentColor"/>
                <path d="M17 7a5 5 0 0 1 0 10" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
              </svg>
              <input type="range" id="mp-volume" class="mp-range mp-vol" min="0" max="1" step="0.01" />
            </div>
          </div>
        </div>
        <audio id="mp-audio" preload="metadata"></audio>
      </div>

      <div class="mp-mini" id="mp-mini" style="display:none">
        <button class="mp-btn" id="mp-mini-expand" title="Büyüt">
          <!-- Chevron up icon -->
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M7.41 14.59 12 10l4.59 4.59L18 13.17 12 7.17l-6 6 1.41 1.42Z" fill="currentColor"/></svg>
        </button>
        <button class="mp-btn" id="mp-mini-toggle" title="Oynat/Duraklat">
          <svg id="mp-mini-toggle-icon" width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M8 5v14l11-7L8 5Z" fill="currentColor"/></svg>
        </button>
        <div class="title" id="mp-mini-title">Müzik</div>
        <button class="mp-btn" id="mp-mini-next" title="Sonraki">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 18V6l10 6-10 6Zm10-12h2v12h-2V6Z" fill="currentColor"/></svg>
        </button>
      </div>
    </div>
    <div class="mp-toast" id="mp-toast">Tarayıcı otomatik oynatmayı engelledi. <button id="mp-toast-btn" class="mp-btn" style="margin-left:8px; padding:0 8px; height:28px; border:var(--mp-border)">Çal</button></div>
  `;

  const audio = qs('#mp-audio', root);
  const expanded = qs('#mp-expanded', root);
  const mini = qs('#mp-mini', root);
  const cover = qs('#mp-cover', root);
  const titleEl = qs('#mp-title', root);
  const artistEl = qs('#mp-artist', root);
  const currentEl = qs('#mp-current', root);
  const durationEl = qs('#mp-duration', root);
  const progressEl = qs('#mp-progress', root);
  const volumeEl = qs('#mp-volume', root);
  const toggleBtn = qs('#mp-toggle', root);
  const toggleIcon = qs('#mp-toggle-icon', root);
  const prevBtn = qs('#mp-prev', root);
  const nextBtn = qs('#mp-next', root);
  const shuffleBtn = qs('#mp-shuffle', root);
  const repeatBtn = qs('#mp-repeat', root);
  const minimizeBtn = qs('#mp-minimize', root);
  const closeBtn = qs('#mp-close', root);
  const miniToggle = qs('#mp-mini-toggle', root);
  const miniToggleIcon = qs('#mp-mini-toggle-icon', root);
  const miniNext = qs('#mp-mini-next', root);
  const miniExpand = qs('#mp-mini-expand', root);
  const miniTitle = qs('#mp-mini-title', root);
  const toast = qs('#mp-toast', root);
  const toastBtn = qs('#mp-toast-btn', root);
  setShuffle(state.shuffle);

  // Restore state
  load();

  function setRepeat(mode) {
    state.repeat = mode;
    repeatBtn.style.opacity = (mode === 'off') ? '0.6' : '1';
    repeatBtn.title = mode === 'one' ? 'Tekrar: Tek Şarkı' : mode === 'all' ? 'Tekrar: Tüm Liste' : 'Tekrar: Kapalı';
    save();
  }
  // Prepare a no-repeat shuffle queue (Fisher–Yates) excluding the current index
  function buildShuffleQueue(current) {
    const n = state.tracks.length || 0;
    const arr = [];
    for (let i = 0; i < n; i++) if (i !== current) arr.push(i);
    // Fisher–Yates
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    state._queue = arr;
  }
  function toggleRepeat() {
    const order = ['off','all','one'];
    const idx = order.indexOf(state.repeat);
    const next = order[(idx+1)%order.length];
    setRepeat(next);
  }
  function setShuffle(enabled) {
    state.shuffle = !!enabled;
    shuffleBtn.style.opacity = enabled ? '1' : '0.6';
   // When enabling shuffle, prepare a queue that excludes the current index
    if (state.shuffle) {
      buildShuffleQueue(state.index);
    } else {
     state._queue = [];
    }
    save();
  }

  function resolveSrc(track) {
    // Allow absolute URLs, else assume /music/
    if (/^https?:\/\//i.test(track.file) || track.file?.startsWith('/')) return track.file;
    return `/music/${track.file}`;
  }

  function applyTrack() {
    const t = state.tracks[state.index];
    if (!t) return;
    audio.src = resolveSrc(t);
    cover.src = t.cover ? resolveSrc({file:t.cover}) : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width=64 height=64><rect width="100%" height="100%" rx="12" ry="12" fill="%23B3E5FC"/></svg>';
    titleEl.textContent = t.title || 'Bilinmeyen Parça';
    artistEl.textContent = t.artist || '';
    miniTitle.textContent = t.title || 'Müzik';
    document.title = (t.title ? `${t.title} • ` : '') + document.title.replace(/^.*?•\s*/,''); // keep original after •
    save();
    updatePagePadding();
  }

  function play() {
    audio.play().then(() => {
      state.isPlaying = true;
      toggleIcon.innerHTML = '<path d="M7 6h3v12H7V6Zm7 0h3v12h-3V6Z" fill="currentColor"/>';
      miniToggleIcon.innerHTML = '<path d="M7 6h3v12H7V6Zm7 0h3v12h-3V6Z" fill="currentColor"/>';
      save();
    }).catch(() => {
      // Autoplay blocked
      toast.classList.add('show');
    });
  }
  function pause() {
    audio.pause();
    state.isPlaying = false;
    toggleIcon.innerHTML = '<path d="M8 5v14l11-7L8 5Z" fill="currentColor"/>';
    miniToggleIcon.innerHTML = '<path d="M8 5v14l11-7L8 5Z" fill="currentColor"/>';
    save();
  }
  function toggle() {
    audio.paused ? play() : pause();
  }
  function next() {
   if (state.shuffle) {
     if (!Array.isArray(state._queue) || state._queue.length === 0) {
       buildShuffleQueue(state.index);
     }
     const i = state._queue.shift();
     if (typeof i === 'number') {
       state.index = i;
     } else {
       state.index = (state.index + 1) % state.tracks.length;
     }
    } else {
      if (state.index < state.tracks.length - 1) state.index++;
      else if (state.repeat === 'all') state.index = 0;
      else return pause();
    }
    applyTrack();
    play();
  }
  function prev() {
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    if (state.index > 0) state.index--;
    else state.index = state.tracks.length - 1;
    applyTrack();
    play();
  }

  // Wire UI
  toggleBtn.addEventListener('click', toggle);
  prevBtn.addEventListener('click', prev);
  nextBtn.addEventListener('click', next);
  miniToggle.addEventListener('click', toggle);
  miniNext.addEventListener('click', next);
  miniExpand.addEventListener('click', () => {
    state.minimized = false; save(); renderMinimized();
  });
  shuffleBtn.addEventListener('click', () => setShuffle(!state.shuffle));
  repeatBtn.addEventListener('click', toggleRepeat);
  minimizeBtn.addEventListener('click', () => {
    state.minimized = true; save(); renderMinimized();
  });
  closeBtn.addEventListener('click', () => {
    state.minimized = true; state.isPlaying = false; pause(); save(); renderMinimized();
  });
  toastBtn.addEventListener('click', () => {
    toast.classList.remove('show');
    state.userInteracted = true;
    play();
  });

  progressEl.addEventListener('input', () => {
    state.seekLock = true;
  });
  progressEl.addEventListener('change', () => {
    const val = parseFloat(progressEl.value);
    if (isFinite(audio.duration)) {
      audio.currentTime = (val / 100) * audio.duration;
    }
    state.seekLock = false;
  });

  volumeEl.addEventListener('input', () => {
    audio.volume = parseFloat(volumeEl.value);
    state.volume = audio.volume;
    save();
  });

  audio.addEventListener('timeupdate', () => {
    currentEl.textContent = fmtTime(audio.currentTime);
    if (!state.seekLock && isFinite(audio.duration) && audio.duration > 0) {
      const pct = (audio.currentTime / audio.duration) * 100;
      progressEl.value = pct.toString();
    }
  });
  audio.addEventListener('loadedmetadata', () => {
    durationEl.textContent = fmtTime(audio.duration);
    // Resume time if exists
    if (state._resumeTime && state._resumeTime < audio.duration - 1) {
      audio.currentTime = state._resumeTime;
      state._resumeTime = 0;
    }
    updatePagePadding();
  });
  audio.addEventListener('ended', () => {
    if (state.repeat === 'one') {
      audio.currentTime = 0; play();
    } else {
      next();
    }
  });

  function renderMinimized() {
    if (state.minimized) {
      expanded.style.display = 'none';
      mini.style.display = 'flex';
    } else {
      expanded.style.display = '';
      mini.style.display = 'none';
    }
    updatePagePadding();
  }

  function updatePagePadding() {
    try {
      const isMobile = window.matchMedia('(max-width: 640px)').matches;
      let h = 0;
      if (getComputedStyle(expanded).display !== 'none') {
        h = expanded.getBoundingClientRect().height;
      } else if (getComputedStyle(mini).display !== 'none') {
        h = mini.getBoundingClientRect().height;
      }
      const gap = 16;
      const pad = Math.ceil(h + gap);
      document.documentElement.style.setProperty('--mp-page-pad', isMobile ? pad + 'px' : '0px');
    } catch (e) {}
  }

  function restoreVolume() {
    audio.volume = state.volume;
    volumeEl.value = state.volume.toString();
  }

  // Load config & boot
  fetch(CONFIG_URL)
    .then(r => r.json())
    .then(cfg => {
      state.tracks = Array.isArray(cfg.tracks) ? cfg.tracks : [];
      if (!state._hasSavedState && typeof cfg.shuffle === 'boolean') state.shuffle = !!cfg.shuffle;
      state.repeat = cfg.repeat || state.repeat;
      if (typeof cfg.volume === 'number') state.volume = cfg.volume;
      if (typeof cfg.autoplay === 'boolean') state.isPlaying = cfg.autoplay || state.isPlaying;

      if (state.index < 0 || state.index >= state.tracks.length) state.index = 0;
      applyTrack();
      restoreVolume();
      renderMinimized();

      // Try autoplay on first load
      if (state.isPlaying) {
        play();
      }
      updatePagePadding();
    })
    .catch(err => {
      titleEl.textContent = 'Müzik Yapılandırması Okunamadı';
      artistEl.textContent = 'music-config.json';
      console.error('Music player config error:', err);
    });

  // Mark any gesture to allow autoplay retry
  ['click','keydown','touchstart'].forEach(ev =>
    document.addEventListener(ev, () => { state.userInteracted = true; }, { once: true })
  );

  // Keep page padding in sync on viewport changes
  window.addEventListener('resize', updatePagePadding);
  window.addEventListener('orientationchange', updatePagePadding);

  // Expose minimal API for debugging
  window.__mp = { state, next, prev, play, pause };
})();
