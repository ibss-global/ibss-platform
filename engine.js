const IBSS_ENGINE = (() => {
  const CONFIG = {
    thresholds: {
      HIGH: 75,
      MEDIUM: 50
    },

    storageKey: "ibss_system_state_v2",

    weights: {
      metricsWeight: 0.5,
      metricsVolatility: 0.3,
      metricsImpact: 0.2
    },

    map: {
      HIGH: 85,
      MEDIUM: 60,
      LOW: 35
    }
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function safeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function getSignals() {
    if (Array.isArray(globalThis.IBSS_SIGNALS)) {
      return globalThis.IBSS_SIGNALS;
    }
    return [];
  }

  function normalizeWeight(weight) {
    const key = String(weight || "").toUpperCase();
    return CONFIG.map[key] ?? 0;
  }

  function scoreFromMetrics(signal) {
    const metrics = signal?.metrics || {};

    const weight = Number(metrics.weight || 0);
    const volatility = Number(metrics.volatility || 0);
    const impact = Number(metrics.impact || 0);

    const score =
      weight * CONFIG.weights.metricsWeight +
      volatility * CONFIG.weights.metricsVolatility +
      impact * CONFIG.weights.metricsImpact;

    return Math.round(score * 100);
  }

  function scoreSignal(signal) {
    if (!signal) return 0;

    if (signal.metrics) {
      return clamp(scoreFromMetrics(signal), 0, 100);
    }

    if (typeof signal.influence === "number") {
      return clamp(Math.round(signal.influence), 0, 100);
    }

    if (signal.weight) {
      return normalizeWeight(signal.weight);
    }

    return 0;
  }

  function rankSignals(signals) {
    return [...safeArray(signals)].sort((a, b) => scoreSignal(b) - scoreSignal(a));
  }

  function getPublishedSignals(signals) {
    return safeArray(signals).filter(signal => signal.status === "Published" || signal.published === true);
  }

  function getLiveSignals(signals) {
    return safeArray(signals).filter(signal => signal.live === true || signal.status === "Published");
  }

  function getTopSignal(signals) {
    const ranked = rankSignals(signals);
    return ranked[0] || null;
  }

  function getLevelFromSSI(ssi) {
    if (ssi >= CONFIG.thresholds.HIGH) return "HIGH";
    if (ssi >= CONFIG.thresholds.MEDIUM) return "MEDIUM";
    return "LOW";
  }

  function getDecisionFromLevel(level) {
    switch (level) {
      case "HIGH":
        return {
          decision: "ACT",
          mode: "ACTIVE RESPONSE",
          band: "CORE"
        };
      case "MEDIUM":
        return {
          decision: "PRD",
          mode: "PREPARATION",
          band: "SUPPORT"
        };
      default:
        return {
          decision: "WATCH",
          mode: "MONITORING",
          band: "WATCH"
        };
    }
  }

  function buildScenarios(level) {
    switch (level) {
      case "HIGH":
        return [
          { label: "A", title: "Escalation Continuity", probability: 58 },
          { label: "B", title: "Controlled Pressure", probability: 27 },
          { label: "C", title: "Temporary Containment", probability: 15 }
        ];
      case "MEDIUM":
        return [
          { label: "A", title: "Managed Pressure", probability: 38 },
          { label: "B", title: "Negotiated Pause", probability: 37 },
          { label: "C", title: "Escalation Return", probability: 25 }
        ];
      default:
        return [
          { label: "A", title: "Low-Level Monitoring", probability: 22 },
          { label: "B", title: "Gradual Friction", probability: 33 },
          { label: "C", title: "Stability Hold", probability: 45 }
        ];
    }
  }

  function getDecisionReason(level, topSignal) {
    if (!topSignal) return "No active signal detected.";

    if (level === "HIGH") {
      return `Top pressure comes from ${topSignal.title}, which is pushing the system into active response conditions.`;
    }

    if (level === "MEDIUM") {
      return `${topSignal.title} remains influential, but the system still operates below full action threshold.`;
    }

    return `${topSignal.title} is being monitored, but current pressure remains below escalation threshold.`;
  }

  function computeSSI(signals) {
    const ranked = rankSignals(signals);
    if (!ranked.length) return 0;

    const top = scoreSignal(ranked[0]);
    const second = ranked[1] ? scoreSignal(ranked[1]) : 0;
    const avg =
      Math.round(ranked.reduce((sum, signal) => sum + scoreSignal(signal), 0) / ranked.length);

    // Balanced formula:
    // top signal has strongest influence, second matters, system average stabilizes
    const ssi = Math.round(top * 0.5 + second * 0.2 + avg * 0.3);

    return clamp(ssi, 0, 100);
  }

  function computeSystemState() {
    const signals = getSignals();
    const rankedSignals = rankSignals(signals);
    const liveSignals = getLiveSignals(signals);
    const publishedSignals = getPublishedSignals(signals);

    const ssi = computeSSI(signals);
    const level = getLevelFromSSI(ssi);
    const topSignal = getTopSignal(signals);
    const decisionState = getDecisionFromLevel(level);
    const scenarios = buildScenarios(level);

    const state = {
      ssi,
      level,
      decision: decisionState.decision,
      mode: decisionState.mode,
      band: decisionState.band,
      topSignal,
      rankedSignals,
      liveSignals,
      publishedSignals,
      scenarios,
      reason: getDecisionReason(level, topSignal),
      timestamp: Date.now()
    };

    saveState(state);
    return state;
  }

  function saveState(state) {
    try {
      localStorage.setItem(CONFIG.storageKey, JSON.stringify(state));
    } catch (err) {
      console.warn("IBSS saveState failed", err);
    }
  }

  function readState() {
    try {
      const raw = localStorage.getItem(CONFIG.storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  function resetState() {
    try {
      localStorage.removeItem(CONFIG.storageKey);
    } catch (err) {}
  }

  function getCurrentState() {
    return computeSystemState();
  }

  return {
    CONFIG,
    getSignals,
    scoreSignal,
    rankSignals,
    getPublishedSignals,
    getLiveSignals,
    getTopSignal,
    computeSSI,
    computeSystemState,
    getCurrentState,
    readState,
    saveState,
    resetState
  };
})();
