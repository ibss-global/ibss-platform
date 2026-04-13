(function () {
  "use strict";

  const STORAGE_KEY = "ibss_live_system";

  function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function toNumber(value, fallback = 0) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function getSignals() {
    return Array.isArray(globalThis.IBSS_SIGNALS) ? globalThis.IBSS_SIGNALS : [];
  }

  function normalizeSignal(signal, index = 0) {
    const safeSignal = isObject(signal) ? signal : {};
    const metrics = isObject(safeSignal.metrics) ? safeSignal.metrics : {};

    const normalized = {
      id: safeSignal.id || `signal_${index + 1}`,
      title: isObject(safeSignal.title)
        ? safeSignal.title
        : {
            en: typeof safeSignal.title === "string" ? safeSignal.title : `Signal ${index + 1}`,
            ar: typeof safeSignal.title === "string" ? safeSignal.title : `إشارة ${index + 1}`
          },
      metrics: {
        weight: clamp(toNumber(metrics.weight, 0), 0, 1),
        volatility: clamp(toNumber(metrics.volatility, 0), 0, 1),
        impact: clamp(toNumber(metrics.impact, 0), 0, 1)
      },
      live: safeSignal.live === true || safeSignal.active === true,
      active: safeSignal.active === true || safeSignal.live === true,
      region: safeSignal.region || null,
      category: safeSignal.category || null,
      updatedAt: safeSignal.updatedAt || safeSignal.timestamp || null,
      raw: safeSignal
    };

    return normalized;
  }

  function getNormalizedSignals() {
    return getSignals().map(normalizeSignal);
  }

  function getSignalScore(signal) {
    if (!signal || !signal.metrics) return 0;

    const weight = toNumber(signal.metrics.weight, 0);
    const volatility = toNumber(signal.metrics.volatility, 0);
    const impact = toNumber(signal.metrics.impact, 0);

    return clamp((weight * 0.5) + (volatility * 0.3) + (impact * 0.2), 0, 1);
  }

  function getDominantSignalData() {
    const signals = getNormalizedSignals();
    if (!signals.length) return null;

    let best = null;
    let bestScore = -1;

    for (const signal of signals) {
      const score = getSignalScore(signal);
      if (score > bestScore) {
        best = signal;
        bestScore = score;
      }
    }

    return best;
  }

  function getActiveSignalsCount() {
    const signals = getNormalizedSignals();
    const activeCount = signals.filter(signal => signal.active || signal.live).length;
    return activeCount || signals.length || 0;
  }

  function computeSSI(signals) {
    if (!signals.length) return 0;

    const totalScore = signals.reduce((sum, signal) => sum + getSignalScore(signal), 0);
    const avgScore = totalScore / signals.length;

    return Math.round(clamp(avgScore * 100, 0, 100));
  }

  function getLevelFromSSI(ssi) {
    if (ssi >= 75) return "HIGH";
    if (ssi >= 50) return "MEDIUM";
    return "LOW";
  }

  function getDecisionFromLevel(level) {
    if (level === "HIGH") return "ACT";
    if (level === "MEDIUM") return "PRD";
    return "WATCH";
  }

  function buildStaticSystem() {
    const signals = getNormalizedSignals();
    const dominant = getDominantSignalData();
    const ssi = computeSSI(signals);
    const level = getLevelFromSSI(ssi);
    const decision = getDecisionFromLevel(level);

    return {
      ssi,
      level,
      decision,
      dominantSignalId: dominant ? dominant.id : null,
      activeSignals: getActiveSignalsCount(),
      updatedAt: new Date().toISOString(),
      source: "fallback"
    };
  }

  function sanitizeSystemState(candidate) {
    if (!isObject(candidate)) return null;

    const ssi = clamp(Math.round(toNumber(candidate.ssi, 0)), 0, 100);
    const levelRaw = typeof candidate.level === "string" ? candidate.level.toUpperCase() : "";
    const decisionRaw = typeof candidate.decision === "string" ? candidate.decision.toUpperCase() : "";

    const level = ["LOW", "MEDIUM", "HIGH"].includes(levelRaw)
      ? levelRaw
      : getLevelFromSSI(ssi);

    const decision = ["WATCH", "PRD", "ACT"].includes(decisionRaw)
      ? decisionRaw
      : getDecisionFromLevel(level);

    return {
      ssi,
      level,
      decision,
      dominantSignalId: candidate.dominantSignalId || null,
      activeSignals: clamp(Math.round(toNumber(candidate.activeSignals, getActiveSignalsCount())), 0, 999),
      updatedAt: candidate.updatedAt || candidate.timestamp || new Date().toISOString(),
      source: candidate.source || "storage"
    };
  }

  function readSavedSystem() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      return sanitizeSystemState(parsed);
    } catch (error) {
      console.error("IBSS_ENGINE: failed to read saved system.", error);
      return null;
    }
  }

  function saveSystemState(state) {
    try {
      const sanitized = sanitizeSystemState(state);
      if (!sanitized) return false;

      localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
      return true;
    } catch (error) {
      console.error("IBSS_ENGINE: failed to save system state.", error);
      return false;
    }
  }

  function getStaticSystemFallback() {
    return buildStaticSystem();
  }

  function getSystemState() {
    const saved = readSavedSystem();
    if (saved) {
      return {
        ...saved,
        source: "engine"
      };
    }

    return {
      ...getStaticSystemFallback(),
      source: "engine"
    };
  }

  function refreshSystemState() {
    const fresh = {
      ...buildStaticSystem(),
      source: "engine"
    };

    saveSystemState(fresh);
    return fresh;
  }

  function getDominantSignal(lang = "en") {
    const dominant = getDominantSignalData();
    if (!dominant) return null;

    return {
      id: dominant.id,
      title: dominant.title,
      label:
        dominant.title?.[lang] ||
        dominant.title?.en ||
        dominant.title?.ar ||
        dominant.id,
      metrics: dominant.metrics,
      region: dominant.region,
      category: dominant.category,
      live: dominant.live,
      active: dominant.active,
      updatedAt: dominant.updatedAt
    };
  }

  function getSnapshot(lang = "en") {
    const system = getSystemState();
    const dominant = getDominantSignal(lang);

    return {
      system,
      dominant,
      activeSignals: getActiveSignalsCount()
    };
  }

  function clearSavedSystem() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (error) {
      console.error("IBSS_ENGINE: failed to clear saved system.", error);
      return false;
    }
  }

  globalThis.IBSS_ENGINE = {
    version: "2.0.0",
    storageKey: STORAGE_KEY,

    getSignals,
    getNormalizedSignals,
    getSignalScore,
    getDominantSignal,
    getDominantSignalData,
    getActiveSignalsCount,

    getStaticSystemFallback,
    readSavedSystem,
    saveSystemState,
    clearSavedSystem,

    getSystemState,
    refreshSystemState,
    getSnapshot
  };
})();
