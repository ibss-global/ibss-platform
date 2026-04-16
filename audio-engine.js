window.IBSS_AUDIO = (function () {
  "use strict";

  const CONFIG = {
    storageKey: "ibss_audio_state_v3",
    masterVolume: 0.045,
    criticalCooldownMs: 9000,
    highCooldownMs: 12000,
    mediumCooldownMs: 18000,
    lowCooldownMs: 26000
  };

  const STATE = {
    enabled: false,
    initialized: false,
    audioContext: null,
    masterGain: null,
    lastLevel: null,
    lastPressure: 0,
    lastPlayAt: 0,
    lastSystemHash: "",
    userUnlocked: false
  };

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
      localStorage.setItem(
        CONFIG.storageKey,
        JSON.stringify({
          enabled: STATE.enabled
        })
      );
    } catch (error) {
      console.error("IBSS_AUDIO saveState error:", error);
    }
  }

  function ensureInitialized() {
    if (STATE.initialized) return;
    loadState();
    bindUserUnlock();
    STATE.initialized = true;
  }

  function ensureContext() {
    ensureInitialized();

    if (STATE.audioContext) return STATE.audioContext;

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;

    try {
      STATE.audioContext = new AudioCtx();
      STATE.masterGain = STATE.audioContext.createGain();
      STATE.masterGain.gain.value = CONFIG.masterVolume;
      STATE.masterGain.connect(STATE.audioContext.destination);
      return STATE.audioContext;
    } catch (error) {
      console.error("IBSS_AUDIO ensureContext error:", error);
      STATE.audioContext = null;
      STATE.masterGain = null;
      return null;
    }
  }

  async function resumeContext() {
    const ctx = ensureContext();
    if (!ctx) return false;

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

  function bindUserUnlock() {
    if (document.documentElement.dataset.ibssAudioBound === "1") return;
    document.documentElement.dataset.ibssAudioBound = "1";

    const unlockHandler = async function () {
      if (!STATE.enabled) return;
      await resumeContext();
    };

    ["click", "touchstart", "keydown"].forEach(eventName => {
      window.addEventListener(eventName, unlockHandler, { passive: true });
    });
  }

  function getMasterGain() {
    ensureContext();
    return STATE.masterGain;
  }

  function createTone(freq, startTime, duration, volume, type = "sine") {
    const ctx = ensureContext();
    const master = getMasterGain();

    if (!ctx || !master) return false;
    if (ctx.state !== "running") return false;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, startTime);

    gainNode.gain.setValueAtTime(0.0001, startTime);
    gainNode.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), startTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(master);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.02);

    return true;
  }

  function playPattern(pattern) {
    const ctx = ensureContext();
    if (!ctx || ctx.state !== "running") return false;

    const start = ctx.currentTime + 0.02;

    pattern.forEach(step => {
      createTone(
        safeNumber(step.freq, 440),
        start + safeNumber(step.at, 0),
        safeNumber(step.duration, 0.12),
        clamp(safeNumber(step.volume, 0.04), 0.0001, 0.2),
        safeText(step.type, "sine")
      );
    });

    STATE.lastPlayAt = nowMs();
    return true;
  }

  function playCriticalAlert() {
    return playPattern([
      { freq: 880, at: 0.00, duration: 0.10, volume: 0.070, type: "triangle" },
      { freq: 660, at: 0.13, duration: 0.10, volume: 0.060, type: "triangle" },
      { freq: 990, at: 0.28, duration: 0.12, volume: 0.075, type: "triangle" }
    ]);
  }

  function playHighAlert() {
    return playPattern([
      { freq: 740, at: 0.00, duration: 0.10, volume: 0.060, type: "triangle" },
      { freq: 620, at: 0.16, duration: 0.10, volume: 0.050, type: "triangle" }
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

  function beep(freq = 440, duration = 0.16, volume = 0.05, type = "sine") {
    const ctx = ensureContext();
    if (!STATE.enabled || !ctx || ctx.state !== "running") return false;

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

  function systemHash(system) {
    const level = safeText(system?.level, "LOW");
    const decision = safeText(system?.decision, "WATCH");
    const topSignalId = safeText(system?.topSignal?.id || system?.dominantSignal?.id, "none");
    const pressure = Math.round(safeNumber(system?.systemPressure || system?.ssi, 0) / 5) * 5;
    return `${level}|${decision}|${topSignalId}|${pressure}`;
  }

  function cooldownForLevel(level, pressure) {
    const normalizedLevel = safeText(level, "LOW").toUpperCase();
    const score = safeNumber(pressure, 0);

    if (normalizedLevel === "HIGH" && score >= 85) return CONFIG.criticalCooldownMs;
    if (normalizedLevel === "HIGH") return CONFIG.highCooldownMs;
    if (normalizedLevel === "MEDIUM") return CONFIG.mediumCooldownMs;
    return CONFIG.lowCooldownMs;
  }

  function shouldPlayForSystem(system) {
    if (!STATE.enabled) return false;
    if (!STATE.audioContext || STATE.audioContext.state !== "running") return false;

    const level = safeText(system?.level, "LOW").toUpperCase();
    const pressure = safeNumber(system?.systemPressure || system?.ssi, 0);
    const hash = systemHash(system);
    const cooldown = cooldownForLevel(level, pressure);
    const elapsed = nowMs() - STATE.lastPlayAt;

    const levelChanged = STATE.lastLevel !== level;
    const strongPressureJump = Math.abs(pressure - STATE.lastPressure) >= 8;
    const systemChanged = STATE.lastSystemHash !== hash;

    if (levelChanged) return true;
    if (strongPressureJump && elapsed >= Math.floor(cooldown * 0.65)) return true;
    if (systemChanged && elapsed >= cooldown) return true;

    return false;
  }

  function choosePattern(system) {
    const level = safeText(system?.level, "LOW").toUpperCase();
    const pressure = safeNumber(system?.systemPressure || system?.ssi, 0);

    if (level === "HIGH" && pressure >= 85) return playCriticalAlert;
    if (level === "HIGH") return playHighAlert;
    if (level === "MEDIUM") return playMediumAlert;
    return playLowAlert;
  }

  async function updateFromSystem(system) {
    ensureInitialized();
    if (!STATE.enabled || !system) return false;

    await resumeContext();

    if (!shouldPlayForSystem(system)) {
      STATE.lastLevel = safeText(system?.level, "LOW").toUpperCase();
      STATE.lastPressure = safeNumber(system?.systemPressure || system?.ssi, 0);
      STATE.lastSystemHash = systemHash(system);
      return false;
    }

    const playFn = choosePattern(system);
    const played = playFn();

    STATE.lastLevel = safeText(system?.level, "LOW").toUpperCase();
    STATE.lastPressure = safeNumber(system?.systemPressure || system?.ssi, 0);
    STATE.lastSystemHash = systemHash(system);

    return played;
  }

  async function enable() {
    ensureInitialized();
    STATE.enabled = true;
    saveState();
    await resumeContext();
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
      lastLevel: STATE.lastLevel,
      lastPressure: STATE.lastPressure
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
