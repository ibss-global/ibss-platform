// IBSS ENGINE — Unified Core Engine
// Version: v1.0 Foundation Engine

(function () {
  "use strict";

  const CONFIG = {
    storageKey: "ibss_live_system",
    refreshMs: 3000,
    thresholds: {
      high: 75,
      medium: 50
    },
    weights: {
      signalWeight: 0.5,
      signalVolatility: 0.3,
      signalImpact: 0.2
    },
    pressure: {
      topSignalFactor: 0.45,
      averageSignalFactor: 0.35,
      countryRiskFactor: 0.20
    }
  };

  function safe(value, fallback = "-") {
    return value !== undefined && value !== null && value !== "" ? value : fallback;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function getLang() {
    return localStorage.getItem("ibss_lang") || "en";
  }

  function getLocalizedText(obj, lang) {
    if (!obj) return "-";
    if (typeof obj === "string") return obj;
    return obj[lang] || obj.en || obj.ar || "-";
  }

  function getSignals() {
    return Array.isArray(globalThis.IBSS_SIGNALS) ? globalThis.IBSS_SIGNALS : [];
  }

  function getCountries() {
    return Array.isArray(globalThis.IBSS_COUNTRIES) ? globalThis.IBSS_COUNTRIES : [];
  }

  function getContent() {
    return Array.isArray(globalThis.IBSS_CONTENT) ? globalThis.IBSS_CONTENT : [];
  }

  function scoreSignal(signal) {
    const metrics = signal?.metrics || {};

    const weight = Number(metrics.weight) || 0;
    const volatility = Number(metrics.volatility) || 0;
    const impact = Number(metrics.impact) || 0;

    return (
      weight * CONFIG.weights.signalWeight +
      volatility * CONFIG.weights.signalVolatility +
      impact * CONFIG.weights.signalImpact
    );
  }

  function scoreSignal100(signal) {
    return Math.round(scoreSignal(signal) * 100);
  }

  function getPriorityClass(priority) {
    if (priority === "HIGH") return "high";
    if (priority === "MEDIUM") return "medium";
    return "low";
  }

  function getRiskClass(level) {
    if (level === "HIGH") return "high";
    if (level === "MEDIUM") return "medium";
    return "low";
  }

  function getRankedSignals() {
    return getSignals()
      .map(signal => {
        const score = scoreSignal(signal);
        const score100 = Math.round(score * 100);
        const priority = signal?.reportMeta?.priority || signal?.weight || "LOW";

        return {
          ...signal,
          score,
          score100,
          balancedScore100: score100,
          priority,
          priorityClass: getPriorityClass(priority),
          localizedTitle: getLocalizedText(signal.title, getLang()),
          localizedDescription: getLocalizedText(signal.description, getLang()),
          localizedSignalType: getLocalizedText(signal.signalType, getLang()),
          localizedDecisionMode: getLocalizedText(signal.decisionMode, getLang()),
          localizedInfluenceBand: getLocalizedText(signal.influenceBand, getLang())
        };
      })
      .sort((a, b) => b.score100 - a.score100);
  }

  function getLiveSignals() {
    return getRankedSignals().filter(signal => signal.live === true);
  }

  function getTopSignal() {
    const live = getLiveSignals();
    if (live.length) return live[0];

    const ranked = getRankedSignals();
    return ranked[0] || null;
  }

  function getTopCountry() {
    const countries = getCountries();
    if (!countries.length) return null;

    return [...countries].sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0))[0] || null;
  }

  function calculateAverageSignalScore100() {
    const ranked = getRankedSignals();
    if (!ranked.length) return 0;

    const total = ranked.reduce((sum, signal) => sum + (signal.score100 || 0), 0);
    return Math.round(total / ranked.length);
  }

  function calculateAverageCountryRisk() {
    const countries = getCountries();
    if (!countries.length) return 0;

    const total = countries.reduce((sum, country) => sum + (Number(country.riskScore) || 0), 0);
    return Math.round(total / countries.length);
  }

  function calculateSystemPressure() {
    const topSignal = getTopSignal();
    const avgSignal = calculateAverageSignalScore100();
    const avgCountryRisk = calculateAverageCountryRisk();

    const topSignalScore = topSignal ? topSignal.score100 : 0;

    const pressure = Math.round(
      (topSignalScore * CONFIG.pressure.topSignalFactor) +
      (avgSignal * CONFIG.pressure.averageSignalFactor) +
      (avgCountryRisk * CONFIG.pressure.countryRiskFactor)
    );

    return clamp(pressure, 0, 100);
  }

  function getLevelFromPressure(pressure) {
    if (pressure >= CONFIG.thresholds.high) return "HIGH";
    if (pressure >= CONFIG.thresholds.medium) return "MEDIUM";
    return "LOW";
  }

  function getDecisionFromLevel(level) {
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

  function buildScenarios(level) {
    if (level === "HIGH") {
      return [
        { key: "Scenario A", value: 58 },
        { key: "Scenario B", value: 27 },
        { key: "Scenario C", value: 15 }
      ];
    }

    if (level === "MEDIUM") {
      return [
        { key: "Scenario A", value: 38 },
        { key: "Scenario B", value: 37 },
        { key: "Scenario C", value: 25 }
      ];
    }

    return [
      { key: "Scenario A", value: 22 },
      { key: "Scenario B", value: 33 },
      { key: "Scenario C", value: 45 }
    ];
  }

  function buildFeed(system) {
    const lang = getLang();
    const lines = [];

    if (lang === "ar") {
      lines.push(`• تم تحديث مؤشر الضغط إلى ${system.systemPressure}`);
      lines.push("• تم تفعيل الموازنة التلقائية للإشارات");
      lines.push("• تمت مزامنة مصفوفة الإشارات");
    } else {
      lines.push(`• Pressure index updated to ${system.systemPressure}`);
      lines.push("• Auto-balance normalization active");
      lines.push("• Ranked signal matrix synchronized");
    }

    system.rankedSignals.forEach(signal => {
      const title = getLocalizedText(signal.title, lang);
      const mode = getLocalizedText(signal.decisionMode, lang);

      lines.push(`• ${title} — ${mode}`);
    });

    return lines;
  }

  function buildCountryRiskFeed() {
    const lang = getLang();

    return getCountries()
      .map(country => ({
        id: country.id,
        name: getLocalizedText(country.name, lang),
        riskScore: Number(country.riskScore) || 0,
        riskLevel: safe(country.riskLevel, "LOW"),
        trend: safe(country.trend, "STABLE"),
        primaryDrivers: Array.isArray(country.primaryDrivers?.[lang])
          ? country.primaryDrivers[lang]
          : (Array.isArray(country.primaryDrivers?.en) ? country.primaryDrivers.en : [])
      }))
      .sort((a, b) => b.riskScore - a.riskScore);
  }

  function buildContentStats() {
    const content = getContent();

    return {
      total: content.length,
      published: content.filter(item => item.status === "published").length,
      pending: content.filter(item => item.status === "pending").length,
      reports: content.filter(item => item.type === "report").length,
      studies: content.filter(item => item.type === "study").length,
      briefs: content.filter(item => item.type === "brief").length,
      news: content.filter(item => item.type === "news").length,
      policyPapers: content.filter(item => item.type === "policy_paper").length
    };
  }

  function buildSystemState() {
    const lang = getLang();
    const rankedSignals = getRankedSignals();
    const liveSignals = rankedSignals.filter(signal => signal.live === true);
    const topSignal = getTopSignal();
    const topCountry = getTopCountry();
    const systemPressure = calculateSystemPressure();
    const level = getLevelFromPressure(systemPressure);
    const { decision, mode } = getDecisionFromLevel(level);
    const scenarios = buildScenarios(level);
    const updatedAt = new Date().toISOString();

    return {
      source: "engine",
      timestamp: Date.now(),
      updatedAt,
      lang,

      systemPressure,
      ssi: systemPressure,
      level,
      levelClass: getRiskClass(level),
      decision,
      mode,

      topSignal,
      dominantSignal: topSignal,
      dominantSignalId: topSignal?.id || null,

      topCountry,
      rankedSignals,
      liveSignals,
      liveSignalsCount: liveSignals.length,

      countryRiskFeed: buildCountryRiskFeed(),
      scenarios,
      feed: buildFeed({
        systemPressure,
        rankedSignals
      }),
      contentStats: buildContentStats()
    };
  }

  function saveSystemState(system) {
    try {
      localStorage.setItem(
        CONFIG.storageKey,
        JSON.stringify({
          source: system.source,
          timestamp: system.timestamp,
          updatedAt: system.updatedAt,
          systemPressure: system.systemPressure,
          ssi: system.ssi,
          level: system.level,
          decision: system.decision,
          mode: system.mode,
          dominantSignalId: system.dominantSignalId
        })
      );
    } catch (error) {
      console.error("IBSS saveSystemState error:", error);
    }
  }

  function readSavedSystem() {
    try {
      const raw = localStorage.getItem(CONFIG.storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.error("IBSS readSavedSystem error:", error);
      return null;
    }
  }

  function getStaticSystemFallback() {
    const rankedSignals = getRankedSignals();
    const topSignal = rankedSignals[0] || null;
    const avgSignal = calculateAverageSignalScore100();
    const pressure = clamp(avgSignal, 0, 100);
    const level = getLevelFromPressure(pressure);
    const decisionBundle = getDecisionFromLevel(level);

    return {
      source: "fallback",
      timestamp: Date.now(),
      updatedAt: new Date().toISOString(),
      systemPressure: pressure,
      ssi: pressure,
      level,
      decision: decisionBundle.decision,
      mode: decisionBundle.mode,
      dominantSignalId: topSignal?.id || null,
      dominantSignal: topSignal,
      topSignal,
      rankedSignals,
      liveSignals: rankedSignals.filter(signal => signal.live),
      feed: buildFeed({
        systemPressure: pressure,
        rankedSignals
      }),
      scenarios: buildScenarios(level),
      countryRiskFeed: buildCountryRiskFeed(),
      contentStats: buildContentStats()
    };
  }

  function tick() {
    const system = buildSystemState();
    saveSystemState(system);
    return system;
  }

  function getSystemState() {
    return tick();
  }

  globalThis.IBSS_ENGINE = {
    CONFIG,
    safe,
    clamp,
    getLang,
    getLocalizedText,
    getSignals,
    getCountries,
    getContent,
    scoreSignal,
    scoreSignal100,
    getRankedSignals,
    getLiveSignals,
    getTopSignal,
    getTopCountry,
    calculateAverageSignalScore100,
    calculateAverageCountryRisk,
    calculateSystemPressure,
    getLevelFromPressure,
    getDecisionFromLevel,
    buildScenarios,
    buildFeed,
    buildCountryRiskFeed,
    buildContentStats,
    buildSystemState,
    saveSystemState,
    readSavedSystem,
    getStaticSystemFallback,
    getSystemState,
    tick
  };
})();
