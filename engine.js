(function () {
  "use strict";

  const STORAGE_KEY = "ibss_live_system";
  const MEMORY_KEY = "ibss_engine_memory";

  const CONFIG = {
    tickIntervalMs: 3000,
    highThreshold: 75,
    mediumThreshold: 50,
    dominantBoostHigh: 0.88,
    dominantBoostMedium: 0.70,
    activeSignalBoostCap: 10,
    memoryDecay: 6
  };

  function isObject(v) {
    return v !== null && typeof v === "object" && !Array.isArray(v);
  }

  function toNumber(v, fallback = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  function clamp(v, min, max) {
    return Math.min(Math.max(v, min), max);
  }

  function getSignals() {
    return Array.isArray(globalThis.IBSS_SIGNALS) ? globalThis.IBSS_SIGNALS : [];
  }

  function normalizeSignal(signal, i = 0) {
    const s = isObject(signal) ? signal : {};
    const m = isObject(s.metrics) ? s.metrics : {};

    return {
      id: s.id || `signal_${i + 1}`,
      title: isObject(s.title)
        ? s.title
        : {
            en: typeof s.title === "string" ? s.title : `Signal ${i + 1}`,
            ar: typeof s.title === "string" ? s.title : `إشارة ${i + 1}`
          },
      description: isObject(s.description)
        ? s.description
        : {
            en: typeof s.description === "string" ? s.description : "",
            ar: typeof s.description === "string" ? s.description : ""
          },
      signalType: isObject(s.signalType)
        ? s.signalType
        : {
            en: typeof s.signalType === "string" ? s.signalType : "GENERAL",
            ar: typeof s.signalType === "string" ? s.signalType : "عام"
          },
      decisionMode: isObject(s.decisionMode)
        ? s.decisionMode
        : {
            en: typeof s.decisionMode === "string" ? s.decisionMode : "WATCH",
            ar: typeof s.decisionMode === "string" ? s.decisionMode : "مراقبة"
          },
      region: s.region || null,
      category: s.category || null,
      live: s.live === true || s.active === true,
      active: s.active === true || s.live === true,
      metrics: {
        weight: clamp(toNumber(m.weight, 0), 0, 1),
        volatility: clamp(toNumber(m.volatility, 0), 0, 1),
        impact: clamp(toNumber(m.impact, 0), 0, 1)
      },
      raw: s
    };
  }

  function getNormalizedSignals() {
    return getSignals().map(normalizeSignal);
  }

  function getSignalScore(signal) {
    if (!signal?.metrics) return 0;

    const { weight, volatility, impact } = signal.metrics;
    return clamp(
      (weight * 0.5) +
      (volatility * 0.25) +
      (impact * 0.25),
      0,
      1
    );
  }

  function rankSignals(signals) {
    return [...signals].sort((a, b) => getSignalScore(b) - getSignalScore(a));
  }

  function getDominantSignalData(signals = getNormalizedSignals()) {
    const ranked = rankSignals(signals);
    return ranked.length ? ranked[0] : null;
  }

  function getActiveSignalsCount(signals = getNormalizedSignals()) {
    const active = signals.filter(s => s.active || s.live).length;
    return active || signals.length || 0;
  }

  function computeBaseSSI(signals) {
    if (!signals.length) return 0;
    const total = signals.reduce((sum, s) => sum + getSignalScore(s), 0);
    return clamp(Math.round((total / signals.length) * 100), 0, 100);
  }

  function readMemory() {
    try {
      const raw = localStorage.getItem(MEMORY_KEY);
      if (!raw) return { escalationMemory: 0, lastLevel: "LOW" };
      const parsed = JSON.parse(raw);
      return {
        escalationMemory: clamp(toNumber(parsed.escalationMemory, 0), 0, 20),
        lastLevel: ["LOW", "MEDIUM", "HIGH"].includes(parsed.lastLevel) ? parsed.lastLevel : "LOW"
      };
    } catch {
      return { escalationMemory: 0, lastLevel: "LOW" };
    }
  }

  function saveMemory(memory) {
    try {
      localStorage.setItem(MEMORY_KEY, JSON.stringify(memory));
    } catch {}
  }

  function getLevelFromSSI(ssi) {
    if (ssi >= CONFIG.highThreshold) return "HIGH";
    if (ssi >= CONFIG.mediumThreshold) return "MEDIUM";
    return "LOW";
  }

  function getDecisionFromLevel(level) {
    if (level === "HIGH") return "ACT";
    if (level === "MEDIUM") return "PRD";
    return "WATCH";
  }

  function computeIntelligentSSI(signals) {
    const baseSSI = computeBaseSSI(signals);
    const dominant = getDominantSignalData(signals);
    const activeSignals = getActiveSignalsCount(signals);
    const memory = readMemory();

    let adjustedSSI = baseSSI;

    const dominantScore = dominant ? getSignalScore(dominant) : 0;

    if (dominantScore >= CONFIG.dominantBoostHigh) {
      adjustedSSI += 8;
    } else if (dominantScore >= CONFIG.dominantBoostMedium) {
      adjustedSSI += 4;
    }

    adjustedSSI += Math.min(activeSignals * 2, CONFIG.activeSignalBoostCap);

    if (memory.lastLevel === "HIGH") {
      adjustedSSI += Math.max(memory.escalationMemory - 2, 0);
    } else if (memory.lastLevel === "MEDIUM") {
      adjustedSSI += Math.max(Math.floor(memory.escalationMemory / 2) - 1, 0);
    }

    adjustedSSI = clamp(Math.round(adjustedSSI), 0, 100);

    const level = getLevelFromSSI(adjustedSSI);
    const decision = getDecisionFromLevel(level);

    let nextMemory = memory.escalationMemory;
    if (level === "HIGH") {
      nextMemory = 12;
    } else if (level === "MEDIUM") {
      nextMemory = Math.max(nextMemory, 6);
    } else {
      nextMemory = Math.max(nextMemory - CONFIG.memoryDecay, 0);
    }

    saveMemory({
      escalationMemory: nextMemory,
      lastLevel: level
    });

    return {
      ssi: adjustedSSI,
      baseSSI,
      level,
      decision,
      dominantSignal: dominant,
      activeSignals
    };
  }

  function sanitizeSystemState(candidate) {
    if (!isObject(candidate)) return null;

    const ssi = clamp(Math.round(toNumber(candidate.ssi, 0)), 0, 100);
    const level = ["LOW", "MEDIUM", "HIGH"].includes(candidate.level) ? candidate.level : getLevelFromSSI(ssi);
    const decision = ["WATCH", "PRD", "ACT"].includes(candidate.decision) ? candidate.decision : getDecisionFromLevel(level);

    return {
      ssi,
      baseSSI: clamp(Math.round(toNumber(candidate.baseSSI, ssi)), 0, 100),
      level,
      decision,
      dominantSignalId: candidate.dominantSignalId || candidate.dominantSignal?.id || null,
      dominantSignal: candidate.dominantSignal || null,
      activeSignals: clamp(Math.round(toNumber(candidate.activeSignals, 0)), 0, 999),
      rankedSignals: Array.isArray(candidate.rankedSignals) ? candidate.rankedSignals : [],
      updatedAt: candidate.updatedAt || new Date().toISOString(),
      source: candidate.source || "engine"
    };
  }

  function saveSystemState(state) {
    try {
      const sanitized = sanitizeSystemState(state);
      if (!sanitized) return false;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
      return true;
    } catch {
      return false;
    }
  }

  function readSavedSystem() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return sanitizeSystemState(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  function clearSavedSystem() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(MEMORY_KEY);
      return true;
    } catch {
      return false;
    }
  }

  function buildSystem() {
    const signals = getNormalizedSignals();
    const rankedSignals = rankSignals(signals);
    const intelligence = computeIntelligentSSI(signals);

    return {
      ssi: intelligence.ssi,
      baseSSI: intelligence.baseSSI,
      level: intelligence.level,
      decision: intelligence.decision,
      dominantSignalId: intelligence.dominantSignal?.id || null,
      dominantSignal: intelligence.dominantSignal || null,
      activeSignals: intelligence.activeSignals,
      rankedSignals,
      updatedAt: new Date().toISOString(),
      source: "engine"
    };
  }

  function refreshSystemState() {
    const fresh = buildSystem();
    saveSystemState(fresh);
    return fresh;
  }

  function getSystemState() {
    const live = refreshSystemState();
    return live || readSavedSystem() || {
      ssi: 0,
      baseSSI: 0,
      level: "LOW",
      decision: "WATCH",
      dominantSignalId: null,
      dominantSignal: null,
      activeSignals: 0,
      rankedSignals: [],
      updatedAt: new Date().toISOString(),
      source: "fallback"
    };
  }

  function getDominantSignal(lang = "en") {
    const system = getSystemState();
    const signal = system.dominantSignal;
    if (!signal) return null;

    return {
      ...signal,
      label:
        signal.title?.[lang] ||
        signal.title?.en ||
        signal.title?.ar ||
        signal.id
    };
  }

  function getSnapshot(lang = "en") {
    const system = getSystemState();
    return {
      system,
      dominant: getDominantSignal(lang),
      activeSignals: system.activeSignals
    };
  }

  function tick() {
    return refreshSystemState();
  }

  globalThis.IBSS_ENGINE = {
    version: "4.0.0",
    CONFIG,
    tick,
    getSignals,
    getNormalizedSignals,
    getSignalScore,
    getDominantSignal,
    getDominantSignalData,
    getActiveSignalsCount,
    readSavedSystem,
    saveSystemState,
    clearSavedSystem,
    getSystemState,
    refreshSystemState,
    getSnapshot
  };
})();
