window.IBSS_AUDIO = (function () {
  "use strict";

  const CONFIG = {
    enabledByDefault: false,
    volume: 0.4,
    sweepIntervalMs: 2600,
    storageKey: "ibss_audio_state_v2"
  };

  const STATE = {
    enabled: CONFIG.enabledByDefault,
    context: null,
    masterGain: null,
    sweepTimer: null,
    primed: false,
    lastLevel: null,
    lastTopSignalId: null
  };

  function load() {
    try {
      const raw = localStorage.getItem(CONFIG.storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (typeof parsed.enabled === "boolean") {
        STATE.enabled = parsed.enabled;
      }
    } catch (error) {}
  }

  function save() {
    try {
      localStorage.setItem(CONFIG.storageKey, JSON.stringify({
        enabled: STATE.enabled
      }));
    } catch (error) {}
  }

  function initContext() {
    if (STATE.context) return;

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    STATE.context = new AudioCtx();
    STATE.masterGain = STATE.context.createGain();
    STATE.masterGain.gain.value = CONFIG.volume;
    STATE.masterGain.connect(STATE.context.destination);
  }

  async function ensureRunning() {
    if (!STATE.context) return false;

    if (STATE.context.state === "suspended") {
      try {
        await STATE.context.resume();
      } catch (error) {
        console.error("IBSS_AUDIO resume error:", error);
      }
    }

    return STATE.context.state === "running";
  }

  function playTone(freq = 440, duration = 0.12, type = "sine", gainValue = 0.2) {
    if (!STATE.enabled || !STATE.context || !STATE.masterGain) return;

    const ctx = STATE.context;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(gainValue, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(STATE.masterGain);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  function playSweep() {
    playTone(200, 0.07, "sine", 0.12);
  }

  function playPing() {
    playTone(880, 0.12, "triangle", 0.24);
  }

  function playEscalationAlert() {
    playTone(520, 0.14, "square", 0.22);
    setTimeout(() => playTone(680, 0.16, "square", 0.24), 140);
  }

  function stopSweepLoop() {
    if (STATE.sweepTimer) {
      clearInterval(STATE.sweepTimer);
      STATE.sweepTimer = null;
    }
  }

  function startSweepLoop() {
    stopSweepLoop();

    if (!STATE.enabled) return;

    STATE.sweepTimer = setInterval(async () => {
      const running = await ensureRunning();
      if (!running) return;
      playSweep();
    }, CONFIG.sweepIntervalMs);
  }

  async function enable() {
    initContext();
    const running = await ensureRunning();

    STATE.enabled = true;
    save();

    if (running) {
      STATE.primed = true;
      playPing();
    }

    startSweepLoop();
  }

  function disable() {
    STATE.enabled = false;
    stopSweepLoop();
    save();
  }

  async function toggle() {
    if (STATE.enabled) {
      disable();
      return;
    }
    await enable();
  }

  function setVolume(value) {
    const volume = Math.max(0, Math.min(Number(value) || 0, 1));
    if (STATE.masterGain) {
      STATE.masterGain.gain.value = volume;
    }
  }

  async function updateFromSystem(system) {
    if (!STATE.enabled) return;

    initContext();
    const running = await ensureRunning();
    if (!running) return;

    if (!STATE.primed) {
      STATE.primed = true;
      playPing();
    }

    if (STATE.lastLevel && system?.level !== STATE.lastLevel) {
      if (system?.level === "HIGH") {
        playEscalationAlert();
      } else if (system?.level === "MEDIUM") {
        playPing();
      }
    }

    const topSignalId = system?.topSignal?.id || null;
    const topSignalPriority = String(system?.topSignal?.priority || "LOW").toUpperCase();

    if (
      STATE.lastTopSignalId &&
      topSignalId &&
      topSignalId !== STATE.lastTopSignalId &&
      topSignalPriority === "HIGH"
    ) {
      playPing();
    }

    STATE.lastLevel = system?.level || null;
    STATE.lastTopSignalId = topSignalId;
  }

  function isEnabled() {
    return STATE.enabled;
  }

  load();

  if (STATE.enabled) {
    initContext();
    startSweepLoop();
  }

  return {
    enable,
    disable,
    toggle,
    setVolume,
    updateFromSystem,
    isEnabled
  };
})();
