const IBSS_ENGINE = (() => {
  const CONFIG = {
    tickIntervalMs: 3000,

    scoreWeights: {
      weight: 0.5,
      volatility: 0.3,
      impact: 0.2
    },

    thresholds: {
      high: 75,
      medium: 50
    },

    reactiveBias: {
      dominantVolatilityBoost: 10,
      dominantImpactBoost: 8,
      secondaryImpactBoost: 4,
      noiseMin: -2,
      noiseMax: 2
    },

    memory: {
      highHoldTicks: 3,
      mediumHoldTicks: 2
    },

    lock: {
      historySize: 6,
      requiredStableTicks: 3
    },

    ssiBounds: {
      min: 35,
      max: 95
    },

    storageKey: "ibss_live_system"
  };

  const state = {
    initialized: false,
    liveSSI: 0,
    history: [],
    highMemoryTicks: 0,
    mediumMemoryTicks: 0,
    lockedLevel: null,
    lastSystem: null
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function ensureSignals() {
    return Array.isArray(globalThis.IBSS_SIGNALS) ? globalThis.IBSS_SIGNALS : [];
  }

  function getSignalScore(signal) {
    if (!signal || !signal.metrics) return 0;

    return (
      signal.metrics.weight * CONFIG.scoreWeights.weight +
      signal.metrics.volatility * CONFIG.scoreWeights.volatility +
      signal.metrics.impact * CONFIG.scoreWeights.impact
    );
  }

  function getSignalScore100(signal) {
    return Math.round(getSignalScore(signal) * 100);
  }

  function getRankedSignals() {
    const signals = ensureSignals();
    return [...signals].sort((a, b) => getSignalScore(b) - getSignalScore(a));
  }

  function getLiveSignals() {
    return ensureSignals().filter(signal => signal.live);
  }

  function getDominantSignal() {
    return getRankedSignals()[0] || null;
  }

  function calculateBaseSSI() {
    const signals = ensureSignals();
    if (!signals.length) return 0;

    const total = signals.reduce((sum, signal) => sum + getSignalScore(signal), 0);
    return Math.round((total / signals.length) * 100);
  }

  function calculateReactiveBias() {
    const ranked = getRankedSignals();
    const dominant = ranked[0];
    const secondary = ranked[1];

    if (!dominant) return 0;

    const dominantVolatility = Math.round(
      dominant.metrics.volatility * CONFIG.reactiveBias.dominantVolatilityBoost
    );

    const dominantImpact = Math.round(
      dominant.metrics.impact * CONFIG.reactiveBias.dominantImpactBoost
    );

    const secondaryImpact = secondary
      ? Math.round(secondary.metrics.impact * CONFIG.reactiveBias.secondaryImpactBoost)
      : 0;

    const noise = randInt(
      CONFIG.reactiveBias.noiseMin,
      CONFIG.reactiveBias.noiseMax
    );

    return dominantVolatility + dominantImpact + secondaryImpact + noise - 10;
  }

  function initialize() {
    if (state.initialized) return;

    const base = calculateBaseSSI();
    const bias = calculateReactiveBias();

    state.liveSSI = clamp(
      base + bias,
      CONFIG.ssiBounds.min,
      CONFIG.ssiBounds.max
    );

    state.history = [state.liveSSI];
    state.initialized = true;
  }

  function evolveSSI() {
    const ranked = getRankedSignals();
    const dominant = ranked[0];
    const secondary = ranked[1];

    let delta = 0;

    if (dominant) {
      delta += Math.round((dominant.metrics.volatility - 0.5) * 12);
      delta += Math.round((dominant.metrics.impact - 0.5) * 8);
    }

    if (secondary) {
      delta += Math.round((secondary.metrics.impact - 0.5) * 4);
    }

    delta += randInt(
      CONFIG.reactiveBias.noiseMin,
      CONFIG.reactiveBias.noiseMax
    );

    state.liveSSI = clamp(
      state.liveSSI + delta,
      CONFIG.ssiBounds.min,
      CONFIG.ssiBounds.max
    );

    state.history.push(state.liveSSI);

    if (state.history.length > CONFIG.lock.historySize) {
      state.history.shift();
    }
  }

  function getRawLevel(ssi) {
    if (ssi >= CONFIG.thresholds.high) return "HIGH";
    if (ssi >= CONFIG.thresholds.medium) return "MEDIUM";
    return "LOW";
  }

  function applyEscalationMemory(rawLevel) {
    if (rawLevel === "HIGH") {
      state.highMemoryTicks = CONFIG.memory.highHoldTicks;
      state.mediumMemoryTicks = CONFIG.memory.mediumHoldTicks;
      return "HIGH";
    }

    if (rawLevel === "MEDIUM") {
      if (state.highMemoryTicks > 0) {
        state.highMemoryTicks -= 1;
        return "HIGH";
      }

      state.mediumMemoryTicks = CONFIG.memory.mediumHoldTicks;
      return "MEDIUM";
    }

    if (state.highMemoryTicks > 0) {
      state.highMemoryTicks -= 1;
      return "HIGH";
    }

    if (state.mediumMemoryTicks > 0) {
      state.mediumMemoryTicks -= 1;
      return "MEDIUM";
    }

    return "LOW";
  }

  function lockLevel(candidateLevel) {
    const recentRawLevels = state.history.map(getRawLevel);
    const recent = recentRawLevels.slice(-CONFIG.lock.requiredStableTicks);

    if (recent.length < CONFIG.lock.requiredStableTicks) {
      state.lockedLevel = candidateLevel;
      return candidateLevel;
    }

    const stable = recent.every(level => level === recent[0]);

    if (stable) {
      state.lockedLevel = recent[0];
    }

    return state.lockedLevel || candidateLevel;
  }

  function getDecisionAndMode(level) {
    if (level === "HIGH") {
      return {
        decision: "ACT",
        mode: "ACTIVE RESPONSE"
      };
    }

    if (level === "MEDIUM") {
      return {
        decision: "PRD",
        mode: "PREPARATION"
      };
    }

    return {
      decision: "WATCH",
      mode: "MONITORING"
    };
  }

  function getDominantSignalForLevel(level) {
    const ranked = getRankedSignals();

    if (level === "HIGH") {
      return ranked.find(s => s.weight === "HIGH") || ranked[0] || null;
    }

    if (level === "MEDIUM") {
      return ranked.find(s => s.weight === "MEDIUM") || ranked[1] || ranked[0] || null;
    }

    return ranked.find(s => s.weight === "LOW") || ranked[ranked.length - 1] || ranked[0] || null;
  }

  function buildScenarios(level) {
    if (level === "HIGH") return [58, 27, 15];
    if (level === "MEDIUM") return [38, 37, 25];
    return [22, 33, 45];
  }

  function computeSystemState() {
    initialize();
    evolveSSI();

    const avgSSI = Math.round(
      state.history.reduce((sum, value) => sum + value, 0) / state.history.length
    );

    const rawLevel = getRawLevel(avgSSI);
    const memoryLevel = applyEscalationMemory(rawLevel);
    const lockedLevel = lockLevel(memoryLevel);
    const { decision, mode } = getDecisionAndMode(lockedLevel);
    const dominantSignal = getDominantSignalForLevel(lockedLevel);
    const scenarios = buildScenarios(lockedLevel);

    const system = {
      ssi: avgSSI,
      rawLevel,
      level: lockedLevel,
      decision,
      mode,
      dominantSignal,
      scenarios,
      rankedSignals: getRankedSignals(),
      liveSignals: getLiveSignals(),
      timestamp: Date.now()
    };

    state.lastSystem = system;
    return system;
  }

  function saveSystem(system) {
    try {
      localStorage.setItem(
        CONFIG.storageKey,
        JSON.stringify({
          ssi: system.ssi,
          rawLevel: system.rawLevel,
          level: system.level,
          decision: system.decision,
          mode: system.mode,
          dominantSignalId: system.dominantSignal ? system.dominantSignal.id : null,
          scenarios: system.scenarios,
          timestamp: system.timestamp
        })
      );
    } catch (e) {}
  }

  function readSavedSystem() {
    try {
      const raw = localStorage.getItem(CONFIG.storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function tick() {
    const system = computeSystemState();
    saveSystem(system);
    return system;
  }

  function getStaticSystemFallback() {
    const signals = ensureSignals();
    const rankedSignals = getRankedSignals();
    const dominantSignal = rankedSignals[0] || null;
    const ssi = calculateBaseSSI();
    const rawLevel = getRawLevel(ssi);
    const { decision, mode } = getDecisionAndMode(rawLevel);

    return {
      ssi,
      rawLevel,
      level: rawLevel,
      decision,
      mode,
      dominantSignal,
      scenarios: buildScenarios(rawLevel),
      rankedSignals,
      liveSignals: getLiveSignals(),
      timestamp: Date.now()
    };
  }

  function reset() {
    state.initialized = false;
    state.liveSSI = 0;
    state.history = [];
    state.highMemoryTicks = 0;
    state.mediumMemoryTicks = 0;
    state.lockedLevel = null;
    state.lastSystem = null;
  }

  return {
    CONFIG,
    state,
    getSignalScore,
    getSignalScore100,
    getRankedSignals,
    getLiveSignals,
    getDominantSignal,
    calculateBaseSSI,
    calculateReactiveBias,
    getRawLevel,
    getDecisionAndMode,
    getDominantSignalForLevel,
    buildScenarios,
    computeSystemState,
    tick,
    saveSystem,
    readSavedSystem,
    getStaticSystemFallback,
    reset
  };
})();
