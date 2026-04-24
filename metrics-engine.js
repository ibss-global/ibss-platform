// IBSS METRICS ENGINE — Stable Unified Metrics Layer
// Version: v3.0

window.IBSS_METRICS = (function () {
  "use strict";

  const CONFIG = {
    version: "v3.0-stable-unified-metrics",
    min: 0,
    max: 100
  };

  function safeNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function clamp(value, min = 0, max = 100) {
    return Math.max(min, Math.min(max, value));
  }

  function normalizeScore(value) {
    return clamp(Math.round(safeNumber(value, 0)), CONFIG.min, CONFIG.max);
  }

  function classifyBand(score) {
    const value = normalizeScore(score);

    if (value >= 85) {
      return {
        code: "CRITICAL",
        en: "Critical",
        ar: "حرج",
        className: "high",
        color: "red"
      };
    }

    if (value >= 70) {
      return {
        code: "HIGH",
        en: "High",
        ar: "مرتفع",
        className: "high",
        color: "red"
      };
    }

    if (value >= 55) {
      return {
        code: "PRESSURE",
        en: "Pressure",
        ar: "ضغط",
        className: "medium",
        color: "orange"
      };
    }

    if (value >= 35) {
      return {
        code: "WATCH",
        en: "Watch",
        ar: "مراقبة",
        className: "medium",
        color: "orange"
      };
    }

    return {
      code: "LOW",
      en: "Low",
      ar: "منخفض",
      className: "low",
      color: "green"
    };
  }

  function weightedAverage(items) {
    const list = Array.isArray(items) ? items : [];
    if (!list.length) return 0;

    let totalWeight = 0;
    let total = 0;

    list.forEach(item => {
      const value = safeNumber(item.value, 0);
      const weight = safeNumber(item.weight, 1);

      total += value * weight;
      totalWeight += weight;
    });

    if (!totalWeight) return 0;
    return normalizeScore(total / totalWeight);
  }

  function computeSSI(input = {}) {
    return weightedAverage([
      { value: input.signalPressure, weight: 0.36 },
      { value: input.clusterPressure, weight: 0.24 },
      { value: input.theaterPressure, weight: 0.22 },
      { value: input.newsPressure, weight: 0.18 }
    ]);
  }

  function computeCRI(input = {}) {
    return weightedAverage([
      { value: input.countryRisk, weight: 0.42 },
      { value: input.governanceStress, weight: 0.22 },
      { value: input.infrastructureStress, weight: 0.18 },
      { value: input.operationalDensity, weight: 0.18 }
    ]);
  }

  function computeSignalScore(metrics = {}) {
    return normalizeScore(
      safeNumber(metrics.weight, 0.5) * 35 +
      safeNumber(metrics.volatility, 0.5) * 25 +
      safeNumber(metrics.impact, 0.5) * 40
    );
  }

  function computeConfidence(input = {}) {
    return weightedAverage([
      { value: input.reliability, weight: 0.46 },
      { value: input.freshness, weight: 0.22 },
      { value: input.density, weight: 0.18 },
      { value: input.contentSupport, weight: 0.14 }
    ]);
  }

  function classifyDecision(score, confidence = 0) {
    const pressure = normalizeScore(score);
    const conf = normalizeScore(confidence);

    if (pressure >= 90 && conf >= 78) {
      return {
        decision: "ACT",
        mode: "ACTIVE RESPONSE",
        en: "Active Response",
        ar: "استجابة نشطة"
      };
    }

    if (pressure >= 78) {
      return {
        decision: "PRD",
        mode: "PREPARATION",
        en: "Preparation",
        ar: "تحضير"
      };
    }

    if (pressure >= 55) {
      return {
        decision: "WATCH+",
        mode: "HEIGHTENED MONITORING",
        en: "Heightened Monitoring",
        ar: "مراقبة مرتفعة"
      };
    }

    return {
      decision: "WATCH",
      mode: "MONITORING",
      en: "Monitoring",
      ar: "مراقبة"
    };
  }

  function getMetricSummary(score, lang = "en") {
    const value = normalizeScore(score);
    const band = classifyBand(value);

    return {
      score: value,
      band,
      label: lang === "ar" ? band.ar : band.en,
      code: band.code,
      className: band.className
    };
  }

  return {
    CONFIG,
    normalizeScore,
    classifyBand,
    weightedAverage,
    computeSSI,
    computeCRI,
    computeSignalScore,
    computeConfidence,
    classifyDecision,
    getMetricSummary
  };
})();
