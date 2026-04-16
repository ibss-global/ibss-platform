window.IBSS_AUDIO = (function () {
  "use strict";

  const CONFIG = {
    enabledByDefault: false,
    volume: 0.35,
    sweepIntervalMs: 3000,
    storageKey: "ibss_audio_state_v1"
  };

  const STATE = {
    enabled: CONFIG.enabledByDefault,
    context: null,
    masterGain: null,
    lastLevel: null,
    lastTopSignalId: null,
    sweepTimer: null
  };

  // ---------- INIT ----------
  function initAudioContext() {
    if (STATE.context) return;

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    STATE.context = new AudioCtx();
    STATE.masterGain = STATE.context.createGain();
    STATE.masterGain.gain.value = CONFIG.volume;
    STATE.masterGain.connect(STATE.context.destination);
  }

  function ensureRunning() {
    if (!STATE.context) return;
    if (STATE.context.state === "suspended") {
      STATE.context.resume();
    }
  }

  // ---------- SOUND BUILDERS ----------
  function playTone(freq = 440, duration = 0.1, type = "sine", gain = 0.2) {
    if (!STATE.enabled || !STATE.context) return;

    const ctx = STATE.context;

    const osc = ctx.createOscillator();
    const g = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(g);
    g.connect(STATE.masterGain);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  // ---------- SOVEREIGN SOUNDS ----------
  function playSweep() {
    // radar pulse (subtle)
    playTone(220, 0.08, "sine", 0.12);
  }

  function playHighSignalPing() {
    // short sharp ping
    playTone(880, 0.12, "triangle", 0.25);
  }

  function playEscalationAlert() {
    // double tone alert
    playTone(520, 0.15, "square", 0.25);
    setTimeout(() => playTone(660, 0.15, "square", 0.25), 120);
  }

  // ---------- LOOP ----------
  function startSweepLoop() {
    stopSweepLoop();

    STATE.sweepTimer = setInterval(() => {
      playSweep();
    }, CONFIG.sweepIntervalMs);
  }

  function stopSweepLoop() {
    if (STATE.sweepTimer) {
      clearInterval(STATE.sweepTimer);
      STATE.sweepTimer = null;
    }
  }

  // ---------- STATE LOGIC ----------
  function updateFromSystem(system) {
    if (!STATE.enabled || !system) return;

    ensureRunning();

    // escalation detection
    if (STATE.lastLevel && system.level !== STATE.lastLevel) {
      if (system.level === "HIGH") {
        playEscalationAlert();
      }
    }

    // top signal change
    if (
      STATE.lastTopSignalId &&
      system.topSignal &&
      system.topSignal.id !== STATE.lastTopSignalId &&
      system.topSignal.priority === "HIGH"
    ) {
      playHighSignalPing();
    }

    STATE.lastLevel = system.level;
    STATE.lastTopSignalId = system.topSignal?.id || null;
  }

  // ---------- CONTROL ----------
  function enable() {
    initAudioContext();
    STATE.enabled = true;
    save();
    startSweepLoop();
  }

  function disable() {
    STATE.enabled = false;
    stopSweepLoop();
    save();
  }

  function toggle() {
    if (STATE.enabled) disable();
    else enable();
  }

  function setVolume(v) {
    const value = Math.max(0, Math.min(v, 1));
    if (STATE.masterGain) {
      STATE.masterGain.gain.value = value;
    }
  }

  // ---------- STORAGE ----------
  function save() {
    try {
      localStorage.setItem(
        CONFIG.storageKey,
        JSON.stringify({ enabled: STATE.enabled })
      );
    } catch (e) {}
  }

  function load() {
    try {
      const raw = localStorage.getItem(CONFIG.storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (typeof parsed.enabled === "boolean") {
        STATE.enabled = parsed.enabled;
      }
    } catch (e) {}
  }

  // ---------- PUBLIC API ----------
  load();

  if (STATE.enabled) {
    initAudioContext();
    startSweepLoop();
  }

  return {
    enable,
    disable,
    toggle,
    setVolume,
    updateFromSystem,
    isEnabled: () => STATE.enabled
  };
})();
