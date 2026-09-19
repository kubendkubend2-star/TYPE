/**
 * TYPE CLASH — Esports Competitive Typing Engine & Real-Time Multiplayer Client
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. PROCEDURAL SOUND SYNTHESIZER (WEB AUDIO API)
  // =========================================================================
  class SoundManager {
    constructor() {
      this.enabled = localStorage.getItem('tc_sound_enabled') !== 'false';
      this.ctx = null;
      this.updateIcon();
    }

    initCtx() {
      if (!this.ctx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          this.ctx = new AudioContext();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    toggle() {
      this.enabled = !this.enabled;
      localStorage.setItem('tc_sound_enabled', this.enabled);
      this.updateIcon();
      if (this.enabled) {
        this.playKey();
      }
    }

    updateIcon() {
      const icon = document.getElementById('soundIcon');
      if (icon) {
        icon.textContent = this.enabled ? '🔊' : '🔇';
      }
    }

    playKey() {
      if (!this.enabled) return;
      try {
        this.initCtx();
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        // Snappy tactile mechanical switch click (Cherry MX style)
        osc.frequency.setValueAtTime(800 + Math.random() * 250, t);
        osc.frequency.exponentialRampToValueAtTime(160, t + 0.022);
        gain.gain.setValueAtTime(0.06, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.022);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.022);
      } catch (e) {}
    }

    playError() {
      if (!this.enabled) return;
      try {
        this.initCtx();
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.16);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.16);
      } catch (e) {}
    }

    playBeep(isGo = false) {
      if (!this.enabled) return;
      try {
        this.initCtx();
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(isGo ? 880 : 440, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + (isGo ? 0.35 : 0.15));
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + (isGo ? 0.35 : 0.15));
      } catch (e) {}
    }

    playVictory() {
      if (!this.enabled) return;
      try {
        this.initCtx();
        if (!this.ctx) return;
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.1);
          gain.gain.setValueAtTime(0.09, this.ctx.currentTime + idx * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + idx * 0.1 + 0.3);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(this.ctx.currentTime + idx * 0.1);
          osc.stop(this.ctx.currentTime + idx * 0.1 + 0.35);
        });
      } catch (e) {}
    }
  }

  const Sound = new SoundManager();

  // =========================================================================
  // 2. STATE & CONFIGURATION
  // =========================================================================
  const PASSAGES = [
    "In the arena of competitive typing, speed is a weapon, but absolute precision is the shield that guards against defeat. Every keystroke must be deliberate, measured, and swift.",
    "The cybernetic terminal flared with neon cyan telemetry as millions of data packets surged through optical fiber highways. The grid stood ready for the next challenger to enter the battle.",
    "True mastery is achieved when fingers move effortlessly across the mechanical switches, translating thought directly into machine code without hesitation, error, or doubt.",
    "Across the infinite expanse of the digital cosmos, digital gladiators test their reflexes against human rivals and synthetic intelligences. Only the focused mind perseveres under pressure.",
    "Algorithms execute with relentless cadence, measuring each microsecond delay and every corrected typo. Under the blinding stadium lights, two combatants race toward the finish line."
  ];

  const state = {
    user: null,
    token: localStorage.getItem('tc_token') || null,
    currentView: 'home',
    gameMode: 'solo', // 'solo' | 'pvp'
    aiDifficulty: 'medium',
    text: '',
    currentIndex: 0,
    correctChars: 0,
    wrongChars: 0,
    startTime: null,
    wpm: 0,
    accuracy: 100,
    score: 0,
    progressPct: 0,
    isCompleted: false,
    timerInterval: null,
    timeRemaining: 60,
    // PvP Room State
    socket: null,
    roomId: null,
    isHost: false,
    player1Data: null,
    player2Data: null,
    isReady: false
  };

  // =========================================================================
  // 3. TOAST NOTIFICATIONS
  // =========================================================================
  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    if (type === 'error') toast.style.borderLeftColor = 'var(--neon-rose)';
    if (type === 'success') toast.style.borderLeftColor = 'var(--neon-emerald)';
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 250);
    }, 3500);
  }

  // =========================================================================
  // 4. AUTHENTICATION MANAGER
  // =========================================================================
  async function initAuth() {
    // 1. Check for token in URL query (e.g. from Google OAuth callback)
    const urlParams = new URLSearchParams(window.location.search);
    const queryToken = urlParams.get('token');
    const authSuccess = urlParams.get('auth_success');
    const authError = urlParams.get('auth_error');

    if (authError) {
      showToast(authError, 'error');
    }

    if (queryToken) {
      state.token = queryToken;
      localStorage.setItem('tc_token', queryToken);
      showToast('Successfully authenticated with Google! 🚀', 'success');

      // Clean token query from URL without reloading
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }

    // 2. Validate token and fetch user profile
    if (state.token) {
      try {
        const res = await fetch('/api/auth/profile', {
          headers: { Authorization: `Bearer ${state.token}` }
        });
        const data = await res.json();
        if (data.success && data.user) {
          state.user = data.user;
          renderUserNav();
        } else {
          // Token expired or invalid
          logout();
        }
      } catch (err) {
        console.warn('Profile fetch error:', err);
      }
    }
  }

  function renderUserNav() {
    const openLoginBtn = document.getElementById('openLoginBtn');
    const userChip = document.getElementById('userProfileChip');
    const userNavAvatar = document.getElementById('userNavAvatar');
    const userNavName = document.getElementById('userNavName');

    if (state.user) {
      if (openLoginBtn) openLoginBtn.classList.add('hidden');
      if (userChip) userChip.classList.remove('hidden');
      if (userNavAvatar) {
        userNavAvatar.src = state.user.profilePicture || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(state.user.username)}`;
      }
      if (userNavName) userNavName.textContent = state.user.username;

      // Also pre-fill host name in create battle form
      const createNameInput = document.getElementById('createPlayerNameInput');
      if (createNameInput) createNameInput.value = state.user.username;

      const inviteJoinInput = document.getElementById('inviteJoinNameInput');
      if (inviteJoinInput) inviteJoinInput.value = state.user.username;

      const inviteAuthPrompt = document.getElementById('inviteAuthPrompt');
      if (inviteAuthPrompt) inviteAuthPrompt.classList.add('hidden');
    } else {
      if (openLoginBtn) openLoginBtn.classList.remove('hidden');
      if (userChip) userChip.classList.add('hidden');

      const inviteAuthPrompt = document.getElementById('inviteAuthPrompt');
      if (inviteAuthPrompt) inviteAuthPrompt.classList.remove('hidden');
    }
  }

  function logout() {
    state.user = null;
    state.token = null;
    localStorage.removeItem('tc_token');
    renderUserNav();
    showToast('Signed out successfully.');
    if (state.currentView === 'profile') {
      switchView('home');
    }
  }

  // =========================================================================
  // 5. VIEW NAVIGATION ROUTER
  // =========================================================================
  function switchView(viewName) {
    document.querySelectorAll('.view-panel').forEach((el) => {
      el.classList.remove('active');
      el.classList.add('hidden');
    });

    const target = document.getElementById(`view${capitalize(viewName)}`);
    if (target) {
      target.classList.remove('hidden');
      target.classList.add('active');
      state.currentView = viewName;
    }

    // Update nav tab highlights
    document.querySelectorAll('.nav-tab').forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.view === viewName);
    });

    // View specific hooks
    if (viewName === 'leaderboard') {
      loadLeaderboard('all-time');
    } else if (viewName === 'profile') {
      loadProfileView();
    }
  }

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function checkUrlRouting() {
    const path = window.location.pathname;
    const match = path.match(/\/battle\/([A-Za-z0-9]{4,8})/);
    if (match && match[1]) {
      const roomId = match[1].toUpperCase();
      openJoinInviteScreen(roomId);
    }
  }

  function openJoinInviteScreen(roomId) {
    state.roomId = roomId;
    switchView('joinInvite');
    const roomDisplay = document.getElementById('inviteRoomDisplay');
    if (roomDisplay) roomDisplay.textContent = roomId;

    // Configure Google OAuth link to preserve redirect to this battle room!
    const googleBtn = document.getElementById('inviteGoogleBtn');
    if (googleBtn) {
      googleBtn.onclick = () => {
        window.location.href = `/api/auth/google?redirect=${encodeURIComponent(`/battle/${roomId}`)}`;
      };
    }

    const authModalGoogleLink = document.getElementById('googleAuthLink');
    if (authModalGoogleLink) {
      authModalGoogleLink.href = `/api/auth/google?redirect=${encodeURIComponent(`/battle/${roomId}`)}`;
    }
  }

  // =========================================================================
  // 6. HARDWARE-ACCELERATED VISUAL FX & PARTICLE ENGINE
  // =========================================================================
  const ParticleFx = (function () {
    let canvas = null;
    let ctx = null;
    let particles = [];
    let animId = null;

    function init() {
      canvas = document.getElementById('keystrokeFxCanvas');
      if (!canvas) return;
      ctx = canvas.getContext('2d');
      resize();
    }

    function resize() {
      if (!canvas) return;
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    }

    function burst(x, y, type = 'correct', combo = 0) {
      if (!canvas || !ctx) init();
      if (!canvas || !ctx) return;

      const rect = canvas.getBoundingClientRect();
      const cx = x - rect.left;
      const cy = y - rect.top;

      const count = type === 'correct' ? (combo > 50 ? 10 : (combo > 20 ? 7 : 5)) : 7;

      let colors;
      if (type === 'wrong') {
        colors = ['#ff2d55', '#ff5f56', '#ffffff'];
      } else if (combo >= 100) {
        colors = ['#ff007f', '#a855f7', '#ffd700', '#00f5ff'];
      } else if (combo >= 50) {
        colors = ['#ffd700', '#ff9d00', '#00ff88', '#ffffff'];
      } else if (combo >= 20) {
        colors = ['#00ff88', '#38ef7d', '#00f5ff', '#ffffff'];
      } else {
        colors = ['#00f5ff', '#00d2ff', '#ffffff'];
      }

      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.8;
        const speed = 1.5 + Math.random() * 3.2;
        particles.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - (type === 'correct' ? 1.0 : 0.3),
          size: 2.2 + Math.random() * 2.2,
          color: colors[Math.floor(Math.random() * colors.length)],
          life: 1,
          decay: 0.045 + Math.random() * 0.03
        });
      }

      if (!animId) {
        animId = requestAnimationFrame(update);
      }
    }

    function celebration() {
      if (!canvas || !ctx) init();
      if (!canvas || !ctx) return;
      const w = canvas.width;
      const h = canvas.height;
      const colors = ['#00f5ff', '#00ff88', '#ffd700', '#ff007f', '#a855f7'];

      for (let i = 0; i < 70; i++) {
        const x = w * (0.15 + Math.random() * 0.7);
        const y = h * (0.2 + Math.random() * 0.5);
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 6;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2.5,
          size: 3 + Math.random() * 3.5,
          color: colors[Math.floor(Math.random() * colors.length)],
          life: 1,
          decay: 0.016 + Math.random() * 0.02
        });
      }

      if (!animId) {
        animId = requestAnimationFrame(update);
      }
    }

    function update() {
      if (!ctx || !canvas) {
        animId = null;
        return;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.07;
        p.life -= p.decay;

        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      if (particles.length > 0) {
        animId = requestAnimationFrame(update);
      } else {
        animId = null;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    function clear() {
      particles = [];
      if (animId) {
        cancelAnimationFrame(animId);
        animId = null;
      }
      if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    return { init, resize, burst, celebration, clear };
  })();

  function showFloatingPopup(text, type = 'streak', x = null, y = null) {
    const layer = document.getElementById('floatingPopupsLayer');
    if (!layer) return;
    const popup = document.createElement('div');
    popup.className = `floating-popup ${type}`;
    popup.textContent = text;

    if (x !== null && y !== null) {
      const rect = layer.getBoundingClientRect();
      popup.style.left = `${Math.max(30, Math.min(rect.width - 40, x - rect.left))}px`;
      popup.style.top = `${Math.max(20, Math.min(rect.height - 20, y - rect.top))}px`;
    } else {
      popup.style.left = '50%';
      popup.style.top = '35%';
    }

    layer.appendChild(popup);
    setTimeout(() => popup.remove(), 750);
  }

  function triggerGlitchShake() {
    const terminal = document.getElementById('passageTerminal');
    if (terminal) {
      terminal.classList.remove('glitch-shake');
      void terminal.offsetWidth; // Trigger reflow
      terminal.classList.add('glitch-shake');
      setTimeout(() => terminal.classList.remove('glitch-shake'), 160);
    }
  }

  function updateComboUI() {
    const badge = document.getElementById('terminalComboBadge');
    const countEl = document.getElementById('comboCount');
    if (!badge || !countEl) return;

    const combo = state.combo || 0;
    countEl.textContent = combo;

    if (combo >= 5) {
      badge.classList.add('active');
      badge.classList.remove('tier-2', 'tier-3', 'tier-4');
      if (combo >= 100) {
        badge.classList.add('tier-4');
      } else if (combo >= 50) {
        badge.classList.add('tier-3');
      } else if (combo >= 20) {
        badge.classList.add('tier-2');
      }
    } else {
      badge.classList.remove('active', 'tier-2', 'tier-3', 'tier-4');
    }
  }

  // =========================================================================
  // 7. ULTRA-RESPONSIVE TYPING ENGINE (0MS ZERO LATENCY)
  // =========================================================================
  let lastSocketEmitTime = 0;
  let metricRafId = null;

  function initTypingMatch(text, mode = 'solo', opponentName = 'AI Opponent') {
    state.text = text;
    state.currentIndex = 0;
    state.correctChars = 0;
    state.wrongChars = 0;
    state.combo = 0;
    state.maxCombo = 0;
    state.startTime = null;
    state.wpm = 0;
    state.accuracy = 100;
    state.score = 0;
    state.progressPct = 0;
    state.isCompleted = false;
    state.timeRemaining = 60;
    state.gameMode = mode;
    state.cachedSpans = [];

    clearInterval(state.timerInterval);
    ParticleFx.clear();

    // Reset terminal speed auras
    const terminal = document.getElementById('passageTerminal');
    if (terminal) {
      terminal.classList.remove('speed-tier-1', 'speed-tier-2', 'speed-tier-3', 'glitch-shake');
    }
    updateComboUI();

    // Setup HUD elements
    document.getElementById('hudP1Wpm').textContent = '0';
    document.getElementById('hudP1Acc').textContent = '100%';
    document.getElementById('hudP1Score').textContent = '0';
    document.getElementById('hudTimer').textContent = '01:00';
    document.getElementById('hudP2Name').textContent = opponentName;
    document.getElementById('hudP2Wpm').textContent = '0';
    document.getElementById('hudP2Acc').textContent = '100%';

    document.getElementById('trackP1Fill').style.width = '0%';
    document.getElementById('trackP1Pct').textContent = '0%';
    document.getElementById('trackP2Fill').style.width = '0%';
    document.getElementById('trackP2Pct').textContent = '0%';

    document.getElementById('trackP1Name').textContent = state.user ? state.user.username : 'You';
    document.getElementById('trackP2Name').textContent = opponentName;
    document.getElementById('terminalModeBadge').textContent = mode === 'solo' ? `SOLO vs AI (${state.aiDifficulty.toUpperCase()})` : '2P PVP DUEL';

    // Render characters with pre-cached references
    renderPassageCharacters(text);

    // Focus hidden input
    const input = document.getElementById('hiddenTypingInput');
    if (input) {
      input.value = '';
      input.focus();
    }

    switchView('arena');

    // Resize particle canvas after arena becomes visible
    setTimeout(() => ParticleFx.resize(), 50);
  }

  function renderPassageCharacters(text) {
    const container = document.getElementById('passageContent');
    if (!container) return;
    container.innerHTML = '';
    state.cachedSpans = [];

    const fragment = document.createDocumentFragment();
    for (let i = 0; i < text.length; i++) {
      const span = document.createElement('span');
      span.className = i === 0 ? 'char current' : 'char untyped';
      span.textContent = text[i];
      fragment.appendChild(span);
      state.cachedSpans.push(span);
    }
    container.appendChild(fragment);

    // Reset scroll position
    const wrapper = document.getElementById('passageBoxWrapper');
    if (wrapper) wrapper.scrollTop = 0;
  }

  function updateCaretPosition() {
    for (let i = 0; i < state.cachedSpans.length; i++) {
      const span = state.cachedSpans[i];
      if (i === state.currentIndex) {
        if (!span.classList.contains('current')) span.classList.add('current');
      } else {
        if (span.classList.contains('current')) span.classList.remove('current');
      }
    }
  }

  function scrollActiveSpanIntoView() {
    const currentSpan = state.cachedSpans[state.currentIndex];
    const wrapper = document.getElementById('passageBoxWrapper');
    if (currentSpan && wrapper) {
      const spanTop = currentSpan.offsetTop;
      if (spanTop > wrapper.scrollTop + 110) {
        wrapper.scrollTo({ top: spanTop - 40, behavior: 'smooth' });
      } else if (spanTop < wrapper.scrollTop + 20) {
        wrapper.scrollTo({ top: Math.max(0, spanTop - 20), behavior: 'smooth' });
      }
    }
  }

  function startMatchTimer() {
    state.startTime = Date.now();
    state.timerInterval = setInterval(() => {
      state.timeRemaining--;

      const mins = Math.floor(state.timeRemaining / 60);
      const secs = state.timeRemaining % 60;
      const timerStr = `0${mins}:${secs < 10 ? '0' : ''}${secs}`;
      document.getElementById('hudTimer').textContent = timerStr;

      // Recalculate metrics on each second tick
      updateTypingMetrics();

      if (state.timeRemaining <= 0) {
        clearInterval(state.timerInterval);
        endMatch('Time Expired');
      }
    }, 1000);
  }

  function requestMetricUpdate(forceFinal = false) {
    if (forceFinal) {
      updateTypingMetrics(true);
      return;
    }
    if (!metricRafId) {
      metricRafId = requestAnimationFrame(() => {
        metricRafId = null;
        updateTypingMetrics(false);
      });
    }
  }

  function updateTypingMetrics(forceEmit = false) {
    if (!state.startTime) return;
    const elapsedSeconds = Math.max(1, (Date.now() - state.startTime) / 1000);

    // Standard WPM: (correct characters / 5) / (elapsed minutes)
    const minutes = elapsedSeconds / 60;
    state.wpm = Math.max(0, Math.round((state.correctChars / 5) / minutes));

    // Accuracy
    const totalTyped = state.correctChars + state.wrongChars;
    state.accuracy = totalTyped === 0 ? 100 : Math.max(0, Math.min(100, Math.round((state.correctChars / totalTyped) * 1000) / 10));

    // Progress percentage
    state.progressPct = Math.min(100, Math.max(0, Math.round((state.correctChars / state.text.length) * 100)));

    // Balanced competitive score with combo multiplier
    const speedPoints = state.wpm * 6;
    const volumePoints = state.correctChars * 2;
    const accFactor = Math.pow(state.accuracy / 100, 1.8);
    const typoPenalty = state.wrongChars * 8;
    const comboBonus = Math.round((state.combo || 0) * 1.5);
    const completionBonus = state.isCompleted ? 250 : Math.round(state.progressPct * 1.5);
    state.score = Math.max(0, Math.round(((speedPoints + volumePoints) * accFactor) - typoPenalty + comboBonus + completionBonus));

    // Update UI HUD
    document.getElementById('hudP1Wpm').textContent = state.wpm;
    document.getElementById('hudP1Acc').textContent = `${state.accuracy}%`;
    document.getElementById('hudP1Score').textContent = state.score;
    document.getElementById('trackP1Fill').style.width = `${state.progressPct}%`;
    document.getElementById('trackP1Pct').textContent = `${state.progressPct}%`;

    // Dynamic Speed Aura on Terminal
    const terminal = document.getElementById('passageTerminal');
    if (terminal) {
      if (state.wpm >= 95) {
        terminal.classList.remove('speed-tier-1', 'speed-tier-2');
        terminal.classList.add('speed-tier-3');
      } else if (state.wpm >= 65) {
        terminal.classList.remove('speed-tier-1', 'speed-tier-3');
        terminal.classList.add('speed-tier-2');
      } else if (state.wpm >= 35) {
        terminal.classList.remove('speed-tier-2', 'speed-tier-3');
        terminal.classList.add('speed-tier-1');
      } else {
        terminal.classList.remove('speed-tier-1', 'speed-tier-2', 'speed-tier-3');
      }
    }

    // Throttled WebSocket progress emission (prevents socket lag during high WPM)
    const now = Date.now();
    if (forceEmit || (now - lastSocketEmitTime > 120)) {
      lastSocketEmitTime = now;
      if (state.gameMode === 'pvp' && state.socket && state.roomId) {
        state.socket.emit('typingProgress', {
          roomId: state.roomId,
          index: state.currentIndex,
          correctCharacters: state.correctChars,
          wrongCharacters: state.wrongChars,
          wpm: state.wpm,
          accuracy: state.accuracy,
          score: state.score,
          progressPct: state.progressPct
        });
      }
    }
  }

  function handleCharacterInput(typedChar) {
    if (state.isCompleted || state.currentView !== 'arena') return;

    // Start timer on very first keystroke
    if (!state.startTime) {
      startMatchTimer();
      if (state.gameMode === 'solo') {
        AIEngine.start(state.text, state.aiDifficulty);
      }
    }

    if (state.currentIndex >= state.text.length) return;

    const expectedChar = state.text[state.currentIndex];
    const span = state.cachedSpans[state.currentIndex];

    if (typedChar === expectedChar) {
      // 1. CORRECT KEYSTROKE
      Sound.playKey();
      state.correctChars++;
      state.combo = (state.combo || 0) + 1;
      if (state.combo > (state.maxCombo || 0)) state.maxCombo = state.combo;

      if (span) {
        span.className = 'char correct';
        const rect = span.getBoundingClientRect();
        ParticleFx.burst(rect.left + rect.width / 2, rect.top + rect.height / 2, 'correct', state.combo);

        // Milestone rewards
        if (state.combo === 15) {
          showFloatingPopup('🔥 15 STREAK!', 'streak', rect.left, rect.top);
        } else if (state.combo === 30) {
          showFloatingPopup('⚡ 30 STREAK (1.3x)!', 'bonus', rect.left, rect.top);
        } else if (state.combo === 60) {
          showFloatingPopup('💥 60 COMBO OVERDRIVE!', 'bonus', rect.left, rect.top);
        } else if (state.combo === 100) {
          showFloatingPopup('👑 100 GODLIKE STREAK!', 'perfect', rect.left, rect.top);
        }
      }

      state.currentIndex++;

      // Check if text is finished
      if (state.currentIndex >= state.text.length) {
        state.isCompleted = true;
        state.progressPct = 100;
        updateCaretPosition();
        requestMetricUpdate(true);
        Sound.playVictory();
        clearInterval(state.timerInterval);
        ParticleFx.celebration();
        showFloatingPopup('🏆 MATCH COMPLETED!', 'perfect');
        if (state.gameMode === 'solo') {
          AIEngine.stop();
          setTimeout(() => endMatch('Text Completed!'), 450);
        }
        return;
      }
    } else {
      // 2. TYPO KEYSTROKE (Never freezes typist, tracks error, allows Backspace)
      Sound.playError();
      state.wrongChars++;
      state.combo = 0; // Reset streak

      if (span) {
        span.className = 'char wrong';
        const rect = span.getBoundingClientRect();
        ParticleFx.burst(rect.left + rect.width / 2, rect.top + rect.height / 2, 'wrong');
      }

      triggerGlitchShake();
      state.currentIndex++;

      if (state.currentIndex >= state.text.length) {
        state.currentIndex = state.text.length - 1;
      }
    }

    // Advance Caret
    updateCaretPosition();
    updateComboUI();
    scrollActiveSpanIntoView();
    requestMetricUpdate(false);
  }

  function handleBackspace(ctrlPressed = false) {
    if (state.isCompleted || state.currentView !== 'arena' || state.currentIndex <= 0) return;

    Sound.playKey();

    if (ctrlPressed) {
      // Word backspace: Delete back to preceding space
      while (state.currentIndex > 0) {
        const prevIdx = state.currentIndex - 1;
        const span = state.cachedSpans[prevIdx];
        if (span) {
          if (span.classList.contains('correct')) state.correctChars = Math.max(0, state.correctChars - 1);
          if (span.classList.contains('wrong')) state.wrongChars = Math.max(0, state.wrongChars - 1);
          span.className = 'char untyped';
        }
        state.currentIndex--;
        if (prevIdx > 0 && state.text[prevIdx - 1] === ' ') break;
      }
    } else {
      // Single character backspace
      const prevIdx = state.currentIndex - 1;
      const span = state.cachedSpans[prevIdx];
      if (span) {
        if (span.classList.contains('correct')) state.correctChars = Math.max(0, state.correctChars - 1);
        if (span.classList.contains('wrong')) state.wrongChars = Math.max(0, state.wrongChars - 1);
        span.className = 'char untyped';
      }
      state.currentIndex--;
    }

    updateCaretPosition();
    updateComboUI();
    scrollActiveSpanIntoView();
    requestMetricUpdate(false);
  }

  function handleKeyDown(e) {
    if (state.isCompleted || state.currentView !== 'arena') return;

    // Prevent default scrolling on Space and browser back on Backspace
    if (e.key === 'Backspace') {
      e.preventDefault();
      handleBackspace(e.ctrlKey);
      return;
    }

    if (e.key === ' ') {
      e.preventDefault();
      handleCharacterInput(' ');
      return;
    }

    if (e.key === 'Tab' || e.key === 'Escape') {
      return;
    }

    // Standard printable character
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      handleCharacterInput(e.key);
    }
  }

  async function endMatch(reason = 'Match Concluded') {
    clearInterval(state.timerInterval);
    updateTypingMetrics();

    let p2Stats = {
      username: state.gameMode === 'solo' ? `AI (${state.aiDifficulty.toUpperCase()})` : 'Opponent',
      wpm: 0,
      accuracy: 100,
      correct: 0,
      wrong: 0,
      score: 0
    };

    let winnerName = 'You';

    if (state.gameMode === 'solo') {
      AIEngine.stop();
      p2Stats = AIEngine.getFinalStats();

      // Determine Winner
      if (state.isCompleted && !p2Stats.finished) {
        winnerName = state.user ? state.user.username : 'You';
      } else if (!state.isCompleted && p2Stats.finished) {
        winnerName = p2Stats.username;
      } else {
        winnerName = state.score >= p2Stats.score ? (state.user ? state.user.username : 'You') : p2Stats.username;
      }

      // Save Game to MongoDB
      const gamePayload = {
        gameId: `solo_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        gameMode: 'solo',
        winner: winnerName,
        text: state.text,
        player1: {
          username: state.user ? state.user.username : 'You',
          userId: state.user ? state.user.id : null,
          profilePicture: state.user ? state.user.profilePicture : ''
        },
        player2: {
          username: p2Stats.username,
          isAI: true,
          aiDifficulty: state.aiDifficulty
        },
        player1WPM: state.wpm,
        player2WPM: p2Stats.wpm,
        player1Accuracy: state.accuracy,
        player2Accuracy: p2Stats.accuracy,
        player1Score: state.score,
        player2Score: p2Stats.score,
        player1CorrectCharacters: state.correctChars,
        player1WrongCharacters: state.wrongChars,
        player2CorrectCharacters: p2Stats.correct,
        player2WrongCharacters: p2Stats.wrong,
        duration: 60 - state.timeRemaining
      };

      try {
        await fetch('/api/games', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(state.token ? { Authorization: `Bearer ${state.token}` } : {})
          },
          body: JSON.stringify(gamePayload)
        });
      } catch (err) {
        console.warn('Game save warn:', err);
      }
    }

    // Render result screen
    renderResultScreen({
      winner: winnerName,
      p1: {
        username: state.user ? state.user.username : 'You',
        wpm: state.wpm,
        accuracy: state.accuracy,
        correct: state.correctChars,
        wrong: state.wrongChars,
        score: state.score
      },
      p2: p2Stats
    });
  }

  function renderResultScreen(data) {
    const isP1Winner = data.winner === (state.user ? state.user.username : 'You') || data.winner === 'player1';
    const winnerTitle = document.getElementById('resultWinnerTitle');
    if (winnerTitle) {
      winnerTitle.textContent = isP1Winner ? '🏆 VICTORY! YOU WON' : `WINNER: ${data.winner}`;
      winnerTitle.style.color = isP1Winner ? 'var(--neon-cyan)' : 'var(--neon-purple)';
    }

    const motto = document.getElementById('resultMotivationalMessage');
    if (motto) {
      if (data.p1.accuracy >= 95 && data.p1.wpm >= 70) {
        motto.textContent = 'Phenomenal precision and speed! You dominate the battlefield.';
      } else if (data.p1.accuracy < 92) {
        motto.textContent = 'Great typing! Focus on steady rhythm to eliminate typos and raise your score.';
      } else {
        motto.textContent = 'Solid performance! Keep practicing to push your WPM to grandmaster levels.';
      }
    }

    // Player 1
    document.getElementById('resP1Name').textContent = data.p1.username;
    document.getElementById('resP1Wpm').textContent = data.p1.wpm;
    document.getElementById('resP1Acc').textContent = `${data.p1.accuracy}%`;
    document.getElementById('resP1Correct').textContent = data.p1.correct;
    document.getElementById('resP1Wrong').textContent = data.p1.wrong;
    document.getElementById('resP1Score').textContent = data.p1.score;

    // Player 2
    document.getElementById('resP2Name').textContent = data.p2.username;
    document.getElementById('resP2Wpm').textContent = data.p2.wpm;
    document.getElementById('resP2Acc').textContent = `${data.p2.accuracy}%`;
    document.getElementById('resP2Correct').textContent = data.p2.correct;
    document.getElementById('resP2Wrong').textContent = data.p2.wrong;
    document.getElementById('resP2Score').textContent = data.p2.score;

    switchView('result');
  }

  // =========================================================================
  // 7. REALISTIC AI OPPONENT ENGINE
  // =========================================================================
  const AIEngine = {
    interval: null,
    text: '',
    index: 0,
    correct: 0,
    wrong: 0,
    wpm: 0,
    accuracy: 100,
    score: 0,
    progress: 0,
    finished: false,
    startTime: null,
    difficultyConfig: {
      easy: { targetWpm: 40, errorRate: 0.08, baseDelay: 250 },
      medium: { targetWpm: 65, errorRate: 0.05, baseDelay: 160 },
      hard: { targetWpm: 90, errorRate: 0.03, baseDelay: 110 },
      expert: { targetWpm: 120, errorRate: 0.01, baseDelay: 75 }
    },

    start(text, diffKey = 'medium') {
      this.stop();
      this.text = text;
      this.index = 0;
      this.correct = 0;
      this.wrong = 0;
      this.wpm = 0;
      this.accuracy = 100;
      this.score = 0;
      this.progress = 0;
      this.finished = false;
      this.startTime = Date.now();

      const config = this.difficultyConfig[diffKey] || this.difficultyConfig.medium;

      const runStep = () => {
        if (this.finished || this.index >= this.text.length) {
          this.finished = true;
          return;
        }

        // Simulate human variability with jitter
        const isError = Math.random() < config.errorRate;

        if (isError) {
          this.wrong++;
        } else {
          this.correct++;
          this.index++;
        }

        const elapsedSeconds = Math.max(1, (Date.now() - this.startTime) / 1000);
        this.wpm = Math.round((this.correct / 5) / (elapsedSeconds / 60));
        const total = this.correct + this.wrong;
        this.accuracy = total === 0 ? 100 : Math.round((this.correct / total) * 100);
        this.progress = Math.min(100, Math.round((this.correct / this.text.length) * 100));

        const accFactor = Math.pow(this.accuracy / 100, 1.8);
        this.score = Math.max(0, Math.round(((this.wpm * 6 + this.correct * 2) * accFactor) - (this.wrong * 8) + (this.finished ? 200 : this.progress * 1.5)));

        // Update AI progress UI in HUD and bottom track
        const p2Fill = document.getElementById('trackP2Fill');
        const p2Pct = document.getElementById('trackP2Pct');
        const p2Wpm = document.getElementById('hudP2Wpm');
        const p2Acc = document.getElementById('hudP2Acc');

        if (p2Fill) p2Fill.style.width = `${this.progress}%`;
        if (p2Pct) p2Pct.textContent = `${this.progress}%`;
        if (p2Wpm) p2Wpm.textContent = this.wpm;
        if (p2Acc) p2Acc.textContent = `${this.accuracy}%`;

        if (this.index >= this.text.length) {
          this.finished = true;
          return;
        }

        // Variable delay based on character type (space has slight pause)
        const char = this.text[this.index];
        let delay = config.baseDelay + (Math.random() * 80 - 40);
        if (char === ' ') delay += 60;
        if (isError) delay += 180; // Delay to "notice" mistake and correct

        this.interval = setTimeout(runStep, Math.max(40, delay));
      };

      this.interval = setTimeout(runStep, 300);
    },

    stop() {
      if (this.interval) clearTimeout(this.interval);
      this.interval = null;
    },

    getFinalStats() {
      return {
        username: `AI (${state.aiDifficulty.toUpperCase()})`,
        wpm: this.wpm,
        accuracy: this.accuracy,
        correct: this.correct,
        wrong: this.wrong,
        score: this.score,
        finished: this.finished
      };
    }
  };

  // =========================================================================
  // 8. MULTIPLAYER SOCKET.IO INTEGRATION
  // =========================================================================
  function initSocketConnection() {
    if (state.socket) return;

    state.socket = io();

    state.socket.on('connect', () => {
      console.log('⚡ Connected to TYPE CLASH Battle Gateway');
    });

    state.socket.on('roomCreated', (data) => {
      state.roomId = data.roomId;
      state.isHost = true;
      state.player1Data = data.player1;
      state.player2Data = null;

      document.getElementById('lobbyRoomCode').textContent = data.roomId;
      const inviteUrl = `${window.location.origin}/battle/${data.roomId}`;
      document.getElementById('lobbyInviteUrlInput').value = inviteUrl;

      // Update Player 1 slot
      document.getElementById('slotP1Name').textContent = data.player1.username;
      document.getElementById('slotP1Status').textContent = 'Waiting for Ready';
      document.getElementById('slotP1ReadyDot').className = 'ready-dot';

      // Reset Player 2 slot
      document.getElementById('slotP2Name').textContent = 'Waiting for friend...';
      document.getElementById('slotP2Status').textContent = 'Empty Slot';
      document.getElementById('slotP2ReadyDot').className = 'ready-dot';

      switchView('lobby');
    });

    state.socket.on('playerJoined', (data) => {
      state.player1Data = data.player1;
      state.player2Data = data.player2;
      state.text = data.typingText;

      document.getElementById('slotP1Name').textContent = data.player1.username;
      document.getElementById('slotP2Name').textContent = data.player2.username;
      document.getElementById('slotP2Status').textContent = 'Connected';
      document.getElementById('slotPlayer2').classList.remove('waiting');
      document.getElementById('slotPlayer2').classList.add('active');

      showToast(`Challenger ${data.player2.username} entered the arena! ⚡`, 'success');
      switchView('lobby');
    });

    state.socket.on('playerReadyStatus', (data) => {
      const p1Dot = document.getElementById('slotP1ReadyDot');
      const p1Status = document.getElementById('slotP1Status');
      const p2Dot = document.getElementById('slotP2ReadyDot');
      const p2Status = document.getElementById('slotP2Status');

      if (p1Dot) p1Dot.className = data.player1Ready ? 'ready-dot ready' : 'ready-dot';
      if (p1Status) {
        p1Status.textContent = data.player1Ready ? 'Ready!' : 'Not Ready';
        p1Status.className = data.player1Ready ? 'slot-status ready-text' : 'slot-status waiting-text';
      }

      if (p2Dot) p2Dot.className = data.player2Ready ? 'ready-dot ready' : 'ready-dot';
      if (p2Status) {
        p2Status.textContent = data.player2Ready ? 'Ready!' : 'Not Ready';
        p2Status.className = data.player2Ready ? 'slot-status ready-text' : 'slot-status waiting-text';
      }
    });

    state.socket.on('bothPlayersReady', () => {
      showToast('Both players ready! Match starting...', 'info');
    });

    state.socket.on('countdown', (data) => {
      const overlay = document.getElementById('countdownOverlay');
      const num = document.getElementById('countdownNumber');
      if (overlay && num) {
        overlay.classList.remove('hidden');
        num.textContent = data.count > 0 ? data.count : 'GO!';
        Sound.playBeep(data.count === 0);
      }
    });

    state.socket.on('gameStart', (data) => {
      const overlay = document.getElementById('countdownOverlay');
      if (overlay) overlay.classList.add('hidden');

      const opponentName = state.isHost
        ? (state.player2Data ? state.player2Data.username : 'Challenger')
        : (state.player1Data ? state.player1Data.username : 'Host');

      initTypingMatch(data.text, 'pvp', opponentName);
      startMatchTimer();
    });

    state.socket.on('opponentProgress', (data) => {
      const p2Fill = document.getElementById('trackP2Fill');
      const p2Pct = document.getElementById('trackP2Pct');
      const p2Wpm = document.getElementById('hudP2Wpm');
      const p2Acc = document.getElementById('hudP2Acc');

      if (p2Fill) p2Fill.style.width = `${data.progress}%`;
      if (p2Pct) p2Pct.textContent = `${data.progress}%`;
      if (p2Wpm) p2Wpm.textContent = data.wpm;
      if (p2Acc) p2Acc.textContent = `${data.accuracy}%`;
    });

    state.socket.on('opponentFinished', (data) => {
      showToast('Opponent reached the finish line!', 'info');
    });

    state.socket.on('timerUpdate', (data) => {
      state.timeRemaining = data.timeRemaining;
      const mins = Math.floor(state.timeRemaining / 60);
      const secs = state.timeRemaining % 60;
      const timerStr = `0${mins}:${secs < 10 ? '0' : ''}${secs}`;
      const timerEl = document.getElementById('hudTimer');
      if (timerEl) timerEl.textContent = timerStr;
    });

    state.socket.on('gameFinished', (result) => {
      clearInterval(state.timerInterval);
      state.isCompleted = true;

      renderResultScreen({
        winner: result.winnerUsername,
        p1: {
          username: result.player1.username,
          wpm: result.player1.wpm,
          accuracy: result.player1.accuracy,
          correct: result.player1.correctCharacters,
          wrong: result.player1.wrongCharacters,
          score: result.player1.score
        },
        p2: {
          username: result.player2.username,
          wpm: result.player2.wpm,
          accuracy: result.player2.accuracy,
          correct: result.player2.correctCharacters,
          wrong: result.player2.wrongCharacters,
          score: result.player2.score
        }
      });
    });

    state.socket.on('roomFull', (data) => {
      const modal = document.getElementById('modalRoomFull');
      const msg = document.getElementById('roomFullMessage');
      if (msg) msg.textContent = data.message || 'This battle already has two players.';
      if (modal) modal.classList.remove('hidden');
    });

    state.socket.on('playerDisconnected', (data) => {
      const modal = document.getElementById('modalDisconnect');
      const msg = document.getElementById('disconnectMessage');
      if (msg) msg.textContent = data.message || 'Your opponent has disconnected from the battle.';
      if (modal) modal.classList.remove('hidden');
    });

    state.socket.on('roomError', (data) => {
      showToast(data.message || 'Battle room error occurred.', 'error');
    });
  }

  // =========================================================================
  // 9. LEADERBOARD & PROFILE DATA FETCHING
  // =========================================================================
  async function loadLeaderboard(timeframe = 'all-time') {
    const tbody = document.getElementById('leaderboardTbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">Loading leaderboard...</td></tr>';

    try {
      const res = await fetch(`/api/leaderboard?timeframe=${timeframe}`);
      const data = await res.json();

      if (!data.success || !data.leaders || data.leaders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No battle records yet. Be the first to claim glory!</td></tr>';
        return;
      }

      tbody.innerHTML = '';
      data.leaders.forEach((item, index) => {
        const tr = document.createElement('tr');
        const rankClass = index === 0 ? 'top-1' : (index === 1 ? 'top-2' : (index === 2 ? 'top-3' : ''));
        const medal = index === 0 ? '🥇' : (index === 1 ? '🥈' : (index === 2 ? '🥉' : `#${index + 1}`));
        const avatarUrl = item.profilePicture || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(item.username)}`;

        tr.innerHTML = `
          <td><span class="rank-badge ${rankClass}">${medal}</span></td>
          <td>
            <div class="player-cell">
              <img src="${avatarUrl}" alt="Avatar" class="avatar-sm">
              <span>${item.username}</span>
            </div>
          </td>
          <td><strong class="cyan">${item.wpm}</strong></td>
          <td><strong class="emerald">${item.accuracy}%</strong></td>
          <td><strong class="gold">${item.score}</strong></td>
        `;
        tbody.appendChild(tr);
      });
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center">Error loading leaderboard. Please try again.</td></tr>';
    }
  }

  async function loadProfileView() {
    if (!state.token) {
      openAuthModal('login');
      return;
    }

    try {
      const res = await fetch('/api/auth/profile', {
        headers: { Authorization: `Bearer ${state.token}` }
      });
      const data = await res.json();
      if (data.success && data.user) {
        state.user = data.user;
        const u = data.user;

        document.getElementById('profUsername').textContent = u.username;
        document.getElementById('profEmail').textContent = u.email;
        document.getElementById('profProvider').textContent = u.authenticationProvider === 'google' ? 'Google Account' : 'Standard Account';
        document.getElementById('profAvatar').src = u.profilePicture || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(u.username)}`;

        document.getElementById('profBestWpm').textContent = u.bestWPM;
        document.getElementById('profBestAcc').textContent = `${u.bestAccuracy}%`;
        document.getElementById('profTotalGames').textContent = u.totalGames;
        document.getElementById('profWins').textContent = u.wins;
        document.getElementById('profLosses').textContent = u.losses;
        document.getElementById('profTotalScore').textContent = u.totalScore.toLocaleString();

        // Fetch match history
        loadMatchHistory();
      }
    } catch (err) {
      console.warn('Profile load err:', err);
    }
  }

  async function loadMatchHistory() {
    const tbody = document.getElementById('profHistoryTbody');
    if (!tbody || !state.token) return;

    try {
      const res = await fetch('/api/games/history', {
        headers: { Authorization: `Bearer ${state.token}` }
      });
      const data = await res.json();
      if (data.success && data.games && data.games.length > 0) {
        tbody.innerHTML = '';
        data.games.forEach((g) => {
          const tr = document.createElement('tr');
          const isWinner = g.winner === (state.user ? state.user.username : 'player1');
          const opponentName = g.player2.isAI ? g.player2.username : (g.player1.username === state.user.username ? g.player2.username : g.player1.username);
          const dateStr = new Date(g.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

          tr.innerHTML = `
            <td><span class="badge-tag">${g.gameMode.toUpperCase()}</span></td>
            <td><strong>${opponentName}</strong></td>
            <td><strong class="${isWinner ? 'emerald' : 'rose'}">${isWinner ? 'VICTORY' : 'DEFEAT'}</strong></td>
            <td><strong class="cyan">${g.player1WPM}</strong></td>
            <td><strong class="emerald">${g.player1Accuracy}%</strong></td>
            <td>${dateStr}</td>
          `;
          tbody.appendChild(tr);
        });
      } else {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No match history found. Play your first battle!</td></tr>';
      }
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center">Error loading match history.</td></tr>';
    }
  }

  // =========================================================================
  // 10. AUTH MODAL MANAGEMENT
  // =========================================================================
  function openAuthModal(formType = 'login') {
    const modal = document.getElementById('modalAuth');
    const loginForm = document.getElementById('loginForm');
    const regForm = document.getElementById('registerForm');
    const subtitle = document.getElementById('authSubtitle');

    if (formType === 'login') {
      loginForm.classList.remove('hidden');
      regForm.classList.add('hidden');
      if (subtitle) subtitle.textContent = 'Enter the Battle Arena';
    } else {
      loginForm.classList.add('hidden');
      regForm.classList.remove('hidden');
      if (subtitle) subtitle.textContent = 'Create Your Gladiator Account';
    }

    modal.classList.remove('hidden');
  }

  function closeAuthModal() {
    const modal = document.getElementById('modalAuth');
    if (modal) modal.classList.add('hidden');
  }

  // =========================================================================
  // 11. EVENT LISTENERS SETUP
  // =========================================================================
  function setupEventListeners() {
    // Sound FX Toggle
    document.getElementById('soundToggleBtn').addEventListener('click', () => Sound.toggle());

    // Navigation Tabs
    document.getElementById('navHomeBtn').addEventListener('click', () => switchView('home'));
    document.getElementById('logoBtn').addEventListener('click', (e) => {
      e.preventDefault();
      switchView('home');
    });
    document.getElementById('navLeaderboardBtn').addEventListener('click', () => switchView('leaderboard'));
    document.getElementById('navProfileBtn').addEventListener('click', () => {
      if (state.token) {
        switchView('profile');
      } else {
        openAuthModal('login');
      }
    });

    // Auth Open & Close
    document.getElementById('openLoginBtn').addEventListener('click', () => openAuthModal('login'));
    document.getElementById('closeAuthModalBtn').addEventListener('click', closeAuthModal);
    document.getElementById('logoutBtn').addEventListener('click', logout);

    // Toggle between Login & Register forms
    document.getElementById('toggleToRegisterLink').addEventListener('click', (e) => {
      e.preventDefault();
      openAuthModal('register');
    });
    document.getElementById('toggleToLoginLink').addEventListener('click', (e) => {
      e.preventDefault();
      openAuthModal('login');
    });

    // Login Form Submit
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmailInput').value;
      const password = document.getElementById('loginPasswordInput').value;

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (data.success) {
          state.token = data.token;
          state.user = data.user;
          localStorage.setItem('tc_token', data.token);
          renderUserNav();
          closeAuthModal();
          showToast('Welcome back, gladiator! ⚡', 'success');
        } else {
          showToast(data.message || 'Login failed.', 'error');
        }
      } catch (err) {
        showToast('Server error during login.', 'error');
      }
    });

    // Register Form Submit
    document.getElementById('registerForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('regUsernameInput').value;
      const email = document.getElementById('regEmailInput').value;
      const password = document.getElementById('regPasswordInput').value;
      const confirmPassword = document.getElementById('regConfirmPasswordInput').value;

      if (password !== confirmPassword) {
        showToast('Passwords do not match.', 'error');
        return;
      }

      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, password, confirmPassword })
        });
        const data = await res.json();
        if (data.success) {
          state.token = data.token;
          state.user = data.user;
          localStorage.setItem('tc_token', data.token);
          renderUserNav();
          closeAuthModal();
          showToast('Account created successfully! ⚡', 'success');
        } else {
          showToast(data.message || 'Registration failed.', 'error');
        }
      } catch (err) {
        showToast('Server error during registration.', 'error');
      }
    });

    // Hero Play Solo
    document.getElementById('heroPlaySoloBtn').addEventListener('click', () => {
      document.getElementById('modalSolo').classList.remove('hidden');
    });

    document.getElementById('closeSoloModalBtn').addEventListener('click', () => {
      document.getElementById('modalSolo').classList.add('hidden');
    });

    // Difficulty selection cards
    document.querySelectorAll('.diff-card').forEach((card) => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.diff-card').forEach((c) => c.classList.remove('selected'));
        card.classList.add('selected');
        const radio = card.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
        state.aiDifficulty = card.dataset.diff;
      });
    });

    // Start Solo Game
    document.getElementById('startSoloGameBtn').addEventListener('click', () => {
      document.getElementById('modalSolo').classList.add('hidden');
      const randomPassage = PASSAGES[Math.floor(Math.random() * PASSAGES.length)];
      initTypingMatch(randomPassage, 'solo', `AI (${state.aiDifficulty.toUpperCase()})`);
    });

    // Hero Play 2P PVP
    document.getElementById('heroPlayPvpBtn').addEventListener('click', () => {
      switchView('createBattle');
    });

    document.getElementById('createBackBtn').addEventListener('click', () => {
      switchView('home');
    });

    // Confirm Create Battle (Player 1)
    document.getElementById('confirmCreateBattleBtn').addEventListener('click', () => {
      initSocketConnection();
      const hostName = document.getElementById('createPlayerNameInput').value.trim() || 'Player 1';
      state.socket.emit('createRoom', {
        username: hostName,
        userId: state.user ? state.user.id : null,
        profilePicture: state.user ? state.user.profilePicture : ''
      });
    });

    // Copy Invite Link
    document.getElementById('copyInviteLinkBtn').addEventListener('click', () => {
      const input = document.getElementById('lobbyInviteUrlInput');
      if (input) {
        input.select();
        navigator.clipboard.writeText(input.value).then(() => {
          showToast('Invite link copied to clipboard! 📋', 'success');
        });
      }
    });

    // Share Invite Link (Web Share API)
    document.getElementById('shareInviteBtn').addEventListener('click', async () => {
      const inviteUrl = document.getElementById('lobbyInviteUrlInput').value;
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'TYPE CLASH Battle',
            text: 'Join my TYPE CLASH typing battle! ⚡',
            url: inviteUrl
          });
        } catch (err) {}
      } else {
        // Fallback
        navigator.clipboard.writeText(inviteUrl);
        showToast('Invite link copied to clipboard! 📋', 'success');
      }
    });

    // Lobby Ready Toggle
    document.getElementById('toggleReadyBtn').addEventListener('click', () => {
      if (!state.socket || !state.roomId) return;
      state.isReady = !state.isReady;
      const btn = document.getElementById('toggleReadyBtn');
      btn.textContent = state.isReady ? 'CANCEL READY' : 'I AM READY';
      btn.className = state.isReady ? 'btn btn-lg btn-outline-rose' : 'btn btn-lg btn-outline-cyan';

      state.socket.emit('playerReady', {
        roomId: state.roomId,
        ready: state.isReady
      });
    });

    // Leave Lobby
    document.getElementById('leaveLobbyBtn').addEventListener('click', () => {
      if (state.socket) {
        state.socket.emit('leaveRoom');
      }
      state.roomId = null;
      switchView('home');
    });

    // Confirm Join Battle (Player 2)
    document.getElementById('confirmJoinBattleBtn').addEventListener('click', () => {
      initSocketConnection();
      const guestName = document.getElementById('inviteJoinNameInput').value.trim() || 'Player 2';
      state.socket.emit('joinRoom', {
        roomId: state.roomId,
        username: guestName,
        userId: state.user ? state.user.id : null,
        profilePicture: state.user ? state.user.profilePicture : ''
      });
    });

    // Quick Code Join Bar on Home Screen
    document.getElementById('quickJoinBtn').addEventListener('click', () => {
      const code = document.getElementById('quickRoomCodeInput').value.trim().toUpperCase();
      if (code.length >= 4) {
        openJoinInviteScreen(code);
      } else {
        showToast('Please enter a valid 6-character room code.', 'error');
      }
    });

    // High-Performance Zero-Latency Typing Listeners
    const hiddenInput = document.getElementById('hiddenTypingInput');
    if (hiddenInput) {
      hiddenInput.addEventListener('keydown', handleKeyDown);

      // Mobile / Virtual keyboard input fallback
      hiddenInput.addEventListener('input', (e) => {
        const val = hiddenInput.value;
        hiddenInput.value = '';
        if (!val) return;
        for (let i = 0; i < val.length; i++) {
          handleCharacterInput(val[i]);
        }
      });
    }

    // Global keydown capture when arena is active (even if focus drifts)
    window.addEventListener('keydown', (e) => {
      if (state.currentView === 'arena' && !state.isCompleted) {
        if (document.activeElement !== hiddenInput && 
            document.activeElement.tagName !== 'INPUT' && 
            document.activeElement.tagName !== 'TEXTAREA') {
          handleKeyDown(e);
          if (hiddenInput) hiddenInput.focus();
        }
      }
    });

    // Keep typing terminal focused on click
    const terminal = document.getElementById('passageTerminal');
    if (terminal && hiddenInput) {
      terminal.addEventListener('click', () => hiddenInput.focus());
    }
    const passageWrapper = document.getElementById('passageBoxWrapper');
    if (passageWrapper && hiddenInput) {
      passageWrapper.addEventListener('click', () => hiddenInput.focus());
    }

    // Result Buttons
    document.getElementById('playAgainBtn').addEventListener('click', () => {
      if (state.gameMode === 'solo') {
        const randomPassage = PASSAGES[Math.floor(Math.random() * PASSAGES.length)];
        initTypingMatch(randomPassage, 'solo', `AI (${state.aiDifficulty.toUpperCase()})`);
      } else {
        switchView('createBattle');
      }
    });

    document.getElementById('resultMainMenuBtn').addEventListener('click', () => {
      switchView('home');
    });

    // Leaderboard timeframe filters
    document.querySelectorAll('.filter-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.filter-tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        loadLeaderboard(tab.dataset.filter);
      });
    });

    // Full room & disconnect modals
    document.getElementById('returnHomeFromFullBtn').addEventListener('click', () => {
      document.getElementById('modalRoomFull').classList.add('hidden');
      switchView('home');
    });

    document.getElementById('returnHomeFromDisconnectBtn').addEventListener('click', () => {
      document.getElementById('modalDisconnect').classList.add('hidden');
      switchView('home');
    });
  }

  // =========================================================================
  // 12. INITIALIZATION ON DOM READY
  // =========================================================================
  document.addEventListener('DOMContentLoaded', async () => {
    setupEventListeners();
    await initAuth();
    checkUrlRouting();

    // Check backend health
    fetch('/api/health')
      .then((res) => res.json())
      .then((health) => {
        const badge = document.getElementById('serverStatusText');
        if (badge && health.status === 'OK') {
          badge.textContent = `System Status: Connected (${health.database}) • Ready for Battle`;
        }
      })
      .catch(() => {});
  });

})();
