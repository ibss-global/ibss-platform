window.IBSS_AUDIO = (function () {
  "use strict";

  const CONFIG = {
    storageKey: "ibss_audio_state_v4_clean",

    masterVolume: 0.05,
    fadeInSec: 0.012,
    fadeOutFloor: 0.0001,

    criticalCooldownMs: 9000,
    highCooldownMs: 12000,
    mediumCooldownMs: 18000,
    lowCooldownMs: 26000,

    minReplayGapMs: 1800,
    strongPressureJump: 8,
    unlockEvents: ["click", "touchstart", "keydown"],

    defaultBeepFreq: 440,
    defaultBeepDuration: 0.16,
    defaultBeepVolume: 0.05,
    defaultBeepType: "sine"
  };

  const STATE = {
    initialized: false,
    enabled: false,

    audioContext: null,
    masterGain: null,

    userUnlocked: false,
    unlockBound: false,

    isPlaying: false,
    lastPlayAt: 0,
    lastPatternEndedAt: 0,

    lastLevel: null,
    lastPressure: 0,
    lastSystemHash: "",
    lastDecision: "",

    lastResumeAttemptAt: 0
  };

  /* =========================================
     Utilities
  ========================================= */

  function safeNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function safeText(value, fallback = "") {
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function nowMs() {
    return Date.now();
  }

  /* =========================================
     Persistence
  ========================================= */

  function loadState() {
    try {
      const raw = localStorage.getItem(CONFIG.storageKey);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;

      STATE.enabled = parsed.enabled === true;
    } catch (error) {
      console.error("IBSS_AUDIO loadState error:", error);
    }
  }

  function saveState() {
    try {
      localStorage.setItem(CONFIG.storageKey, JSON.stringify({
        enabled: STATE.enabled
      }));
    } catch (error) {
      console.error("IBSS_AUDIO saveState error:", error);
    }
  }

  /* =========================================
     Initialization
  ========================================= */

  function ensureInitialized() {
    if (STATE.initialized) return;
    loadState();
    bindUserUnlock();
    STATE.initialized = true;
  }

  /* =========================================
     Audio Context
  ========================================= */

  function ensureContext() {
    ensureInitialized();

    if (STATE.audioContext) return STATE.audioContext;

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;

    try {
      const ctx = new AudioCtx();
      const gain = ctx.createGain();

      gain.gain.value = CONFIG.masterVolume;
      gain.connect(ctx.destination);

      STATE.audioContext = ctx;
      STATE.masterGain = gain;

      return STATE.audioContext;
    } catch (error) {
      console.error("IBSS_AUDIO ensureContext error:", error);
      STATE.audioContext = null;
      STATE.masterGain = null;
      return null;
    }
  }

  function getMasterGain() {
    ensureContext();
    return STATE.masterGain;
  }

  async function resumeContext(force = false) {
    const ctx = ensureContext();
    if (!ctx) return false;

    const now = nowMs();

    if (!force && now - STATE.lastResumeAttemptAt < 300) {
      return ctx.state === "running";
    }

    STATE.lastResumeAttemptAt = now;

    try {
      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      STATE.userUnlocked = ctx.state === "running";
      return ctx.state === "running";
    } catch (error) {
      console.error("IBSS_AUDIO resumeContext error:", error);
      return false;
    }
  }

  /* =========================================
     Unlock Binding
  ========================================= */

  function bindUserUnlock() {
    if (STATE.unlockBound) return;
    STATE.unlockBound = true;

    const unlockHandler = async function () {
      if (!STATE.enabled) return;
      await resumeContext(true);
    };

    CONFIG.unlockEvents.forEach(eventName => {
      window.addEventListener(eventName, unlockHandler, { passive: true });
    });
  }

  /* =========================================
     Tone Engine
  ========================================= */

  function canPlay() {
    return !!(
      STATE.enabled &&
      STATE.audioContext &&
      STATE.masterGain &&
      STATE.audioContext.state === "running"
    );
  }

  function createTone(freq, startTime, duration, volume, type = "sine") {
    const ctx = ensureContext();
    const master = getMasterGain();

    if (!ctx || !master) return false;
    if (ctx.state !== "running") return false;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    const safeFreq = clamp(safeNumber(freq, CONFIG.defaultBeepFreq), 80, 2400);
    const safeDuration = clamp(safeNumber(duration, CONFIG.defaultBeepDuration), 0.03, 2.5);
    const safeVolume = clamp(safeNumber(volume, CONFIG.defaultBeepVolume), 0.0001, 0.25);
    const fadeIn = Math.min(CONFIG.fadeInSec, safeDuration * 0.4);

    oscillator.type = safeText(type, CONFIG.defaultBeepType);
    oscillator.frequency.setValueAtTime(safeFreq, startTime);

    gainNode.gain.setValueAtTime(CONFIG.fadeOutFloor, startTime);
    gainNode.gain.exponentialRampToValueAtTime(safeVolume, startTime + fadeIn);
    gainNode.gain.exponentialRampToValueAtTime(CONFIG.fadeOutFloor, startTime + safeDuration);

    oscillator.connect(gainNode);
    gainNode.connect(master);

    oscillator.start(startTime);
    oscillator.stop(startTime + safeDuration + 0.03);

    return true;
  }

  function playPattern(pattern) {
    const ctx = ensureContext();
    if (!ctx || ctx.state !== "running" || !STATE.enabled) return false;

    const now = nowMs();
    if (STATE.isPlaying && now < STATE.lastPatternEndedAt) return false;
    if (now - STATE.lastPlayAt < CONFIG.minReplayGapMs) return false;

    const steps = Array.isArray(pattern) ? pattern : [];
    if (!steps.length) return false;

    const start = ctx.currentTime + 0.02;
    let maxEnd = 0;

    STATE.isPlaying = true;

    steps.forEach(step => {
      const at = Math.max(0, safeNumber(step.at, 0));
      const duration = clamp(safeNumber(step.duration, 0.12), 0.03, 2.5);
      const endAt = at + duration;

      createTone(
        safeNumber(step.freq, CONFIG.defaultBeepFreq),
        start + at,
        duration,
        clamp(safeNumber(step.volume, CONFIG.defaultBeepVolume), 0.0001, 0.25),
        safeText(step.type, "sine")
      );

      if (endAt > maxEnd) {
        maxEnd = endAt;
      }
    });

    STATE.lastPlayAt = now;
    STATE.lastPatternEndedAt = now + Math.round(maxEnd * 1000) + 80;

    setTimeout(() => {
      STATE.isPlaying = false;
    }, Math.max(120, Math.round(maxEnd * 1000) + 100));

    return true;
  }

  /* =========================================
     Patterns
  ========================================= */

  function playCriticalAlert() {
    return playPattern([
      { freq: 880, at: 0.00, duration: 0.10, volume: 0.075, type: "triangle" },
      { freq: 660, at: 0.13, duration: 0.10, volume: 0.065, type: "triangle" },
      { freq: 990, at: 0.28, duration: 0.12, volume: 0.078, type: "triangle" }
    ]);
  }

  function playHighAlert() {
    return playPattern([
      { freq: 740, at: 0.00, duration: 0.10, volume: 0.060, type: "triangle" },
      { freq: 620, at: 0.16, duration: 0.10, volume: 0.052, type: "triangle" }
    ]);
  }

  function playMediumAlert() {
    return playPattern([
      { freq: 560, at: 0.00, duration: 0.10, volume: 0.045, type: "sine" },
      { freq: 480, at: 0.18, duration: 0.10, volume: 0.038, type: "sine" }
    ]);
  }

  function playLowAlert() {
    return playPattern([
      { freq: 440, at: 0.00, duration: 0.08, volume: 0.026, type: "sine" }
    ]);
  }

  /* =========================================
     Beep API
  ========================================= */

  async function beep(
    freq = CONFIG.defaultBeepFreq,
    duration = CONFIG.defaultBeepDuration,
    volume = CONFIG.defaultBeepVolume,
    type = CONFIG.defaultBeepType
  ) {
    ensureInitialized();
    if (!STATE.enabled) return false;

    await resumeContext();

    if (!canPlay()) return false;

    return playPattern([
      {
        freq,
        at: 0,
        duration,
        volume,
        type
      }
    ]);
  }

  /* =========================================
     System Logic
  ========================================= */

  function systemHash(system) {
    const level = safeText(system?.level, "LOW").toUpperCase();
    const decision = safeText(system?.decision, "WATCH").toUpperCase();
    const mode = safeText(system?.mode, "MONITORING").toUpperCase();
    const topSignalId = safeText(system?.topSignal?.id || system?.dominantSignal?.id, "none");
    const pressure = Math.round(safeNumber(system?.systemPressure || system?.ssi, 0) / 5) * 5;

    return `${level}|${decision}|${mode}|${topSignalId}|${pressure}`;
  }

  function cooldownForLevel(level, pressure) {
    const normalizedLevel = safeText(level, "LOW").toUpperCase();
    const score = safeNumber(pressure, 0);

    if (normalizedLevel === "HIGH" && score >= 85) return CONFIG.criticalCooldownMs;
    if (normalizedLevel === "HIGH") return CONFIG.highCooldownMs;
    if (normalizedLevel === "MEDIUM") return CONFIG.mediumCooldownMs;
    return CONFIG.lowCooldownMs;
  }

  function choosePattern(system) {
    const level = safeText(system?.level, "LOW").toUpperCase();
    const pressure = safeNumber(system?.systemPressure || system?.ssi, 0);

    if (level === "HIGH" && pressure >= 85) return playCriticalAlert;
    if (level === "HIGH") return playHighAlert;
    if (level === "MEDIUM") return playMediumAlert;
    return playLowAlert;
  }

  function shouldPlayForSystem(system) {
    if (!STATE.enabled) return false;
    if (!canPlay()) return false;

    const level = safeText(system?.level, "LOW").toUpperCase();
    const decision = safeText(system?.decision, "WATCH").toUpperCase();
    const pressure = safeNumber(system?.systemPressure || system?.ssi, 0);
    const hash = systemHash(system);

    const cooldown = cooldownForLevel(level, pressure);
    const elapsed = nowMs() - STATE.lastPlayAt;

    const levelChanged = STATE.lastLevel !== level;
    const decisionChanged = STATE.lastDecision !== decision;
    const pressureJump = Math.abs(pressure - STATE.lastPressure) >= CONFIG.strongPressureJump;
    const systemChanged = STATE.lastSystemHash !== hash;

    if (levelChanged) return true;
    if (decisionChanged && elapsed >= Math.floor(cooldown * 0.55)) return true;
    if (pressureJump && elapsed >= Math.floor(cooldown * 0.65)) return true;
    if (systemChanged && elapsed >= cooldown) return true;

    return false;
  }

  async function updateFromSystem(system) {
    ensureInitialized();
    if (!STATE.enabled || !system) return false;

    await resumeContext();

    const level = safeText(system?.level, "LOW").toUpperCase();
    const pressure = safeNumber(system?.systemPressure || system?.ssi, 0);
    const decision = safeText(system?.decision, "WATCH").toUpperCase();
    const hash = systemHash(system);

    if (!shouldPlayForSystem(system)) {
      STATE.lastLevel = level;
      STATE.lastPressure = pressure;
      STATE.lastDecision = decision;
      STATE.lastSystemHash = hash;
      return false;
    }

    const playFn = choosePattern(system);
    const played = playFn();

    STATE.lastLevel = level;
    STATE.lastPressure = pressure;
    STATE.lastDecision = decision;
    STATE.lastSystemHash = hash;

    return played;
  }

  /* =========================================
     Enable / Disable
  ========================================= */

  async function enable() {
    ensureInitialized();
    STATE.enabled = true;
    saveState();
    await resumeContext(true);
    return STATE.enabled;
  }

  function disable() {
    ensureInitialized();
    STATE.enabled = false;
    saveState();
    return STATE.enabled;
  }

  async function toggle() {
    ensureInitialized();

    if (STATE.enabled) {
      disable();
      return false;
    }

    await enable();
    return STATE.enabled;
  }

  function isEnabled() {
    ensureInitialized();
    return STATE.enabled;
  }

  function getState() {
    ensureInitialized();

    return {
      enabled: STATE.enabled,
      initialized: STATE.initialized,
      hasContext: !!STATE.audioContext,
      contextState: STATE.audioContext?.state || "none",
      userUnlocked: STATE.userUnlocked,
      isPlaying: STATE.isPlaying,
      lastLevel: STATE.lastLevel,
      lastPressure: STATE.lastPressure,
      lastDecision: STATE.lastDecision,
      lastSystemHash: STATE.lastSystemHash
    };
  }

  ensureInitialized();

  return {
    CONFIG,
    enable,
    disable,
    toggle,
    isEnabled,
    beep,
    updateFromSystem,
    getState,
    resumeContext
  };
})();
