window.IBSS_METRICS = (function () {
  "use strict";

  const CONFIG = {
    signalWeights: {
      severity: 0.34,
      confidence: 0.22,
      recency: 0.12,
      sourceReliability: 0.16,
      escalation: 0.10,
      structurality: 0.06
    },

    countryWeights: {
      baseline: 0.30,
      signalLoad: 0.28,
      clusterRisk: 0.20,
      theaterRisk: 0.12,
      newsPressure: 0.10
    },

    clusterWeights: {
      avgSignal: 0.50,
      maxSignal: 0.25,
      density: 0.15,
      escalation: 0.10
    },

    theaterWeights: {
      avgCluster: 0.44,
      maxCluster: 0.24,
      density: 0.16,
      priority: 0.16
    },

    systemWeights: {
      signalPressure: 0.34,
      clusterPressure: 0.24,
      theaterPressure: 0.22,
      newsPressure: 0.20
    },

    densityReference: {
      cluster: 8,
      theater: 5
    },

    bands: {
      lowMax: 34,
      watchMax: 54,
      pressureMax: 69,
      highMax: 84,
      criticalMax: 100
    }
  };

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function safeNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function safeText(value, fallback = "") {
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
  }

  function clamp(value, min = 0, max = 100) {
    return Math.max(min, Math.min(max, value));
  }

  function normalizeText(value) {
    return safeText(String(value || ""))
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizePriority(value) {
    const p = String(value || "LOW").toUpperCase();
    if (p === "HIGH") return "HIGH";
    if (p === "MEDIUM") return "MEDIUM";
    return "LOW";
  }

  function normalizeEscalation(value) {
    const v = String(value || "").toUpperCase();
    if (v === "SEVERE") return "SEVERE";
    if (v === "HIGH") return "HIGH";
    if (v === "ELEVATED") return "ELEVATED";
    if (v === "MEDIUM") return "MEDIUM";
    return "LOW";
  }

  function normalizePriorityWeight(value) {
    const p = normalizePriority(value);
    if (p === "HIGH") return 100;
    if (p === "MEDIUM") return 65;
    return 30;
  }

  function normalizeEscalationWeight(value) {
    const e = normalizeEscalation(value);
    if (e === "SEVERE") return 100;
    if (e === "HIGH") return 82;
    if (e === "ELEVATED") return 64;
    if (e === "MEDIUM") return 50;
    return 28;
  }

  function normalizeTheaterPriority(value) {
    const p = String(value || "").toUpperCase();
    if (p === "CORE") return 100;
    if (p === "SUPPORT") return 68;
    if (p === "WATCH") return 42;
    return 30;
  }

  function hoursSince(dateValue) {
    const date = new Date(dateValue || Date.now());
    if (Number.isNaN(date.getTime())) return 9999;
    return Math.max(0, (Date.now() - date.getTime()) / (1000 * 60 * 60));
  }

  function recencyScore(dateValue) {
    const hours = hoursSince(dateValue);

    if (hours <= 3) return 100;
    if (hours <= 6) return 92;
    if (hours <= 12) return 84;
    if (hours <= 24) return 74;
    if (hours <= 48) return 62;
    if (hours <= 72) return 52;
    return 38;
  }

  function average(list) {
    const arr = asArray(list).map(v => safeNumber(v)).filter(v => Number.isFinite(v));
    if (!arr.length) return 0;
    return arr.reduce((sum, v) => sum + v, 0) / arr.length;
  }

  function maxValue(list) {
    const arr = asArray(list).map(v => safeNumber(v)).filter(v => Number.isFinite(v));
    if (!arr.length) return 0;
    return Math.max(...arr);
  }

  function densityScore(count, reference) {
    const ref = Math.max(1, safeNumber(reference, 1));
    return clamp(Math.round((safeNumber(count, 0) / ref) * 100), 0, 100);
  }

  function classifyBand(score) {
    const s = clamp(Math.round(safeNumber(score, 0)));

    if (s <= CONFIG.bands.lowMax) {
      return {
        code: "LOW",
        en: "Low",
        ar: "منخفض"
      };
    }

    if (s <= CONFIG.bands.watchMax) {
      return {
        code: "WATCH",
        en: "Watch",
        ar: "مراقبة"
      };
    }

    if (s <= CONFIG.bands.pressureMax) {
      return {
        code: "PRESSURE",
        en: "Pressure",
        ar: "ضغط"
      };
    }

    if (s <= CONFIG.bands.highMax) {
      return {
        code: "HIGH",
        en: "High",
        ar: "مرتفع"
      };
    }

    return {
      code: "CRITICAL",
      en: "Critical",
      ar: "حرج"
    };
  }

  function computeSignalScore(signal) {
    const severity =
      safeNumber(signal?.severity, safeNumber(signal?.balancedScore100, safeNumber(signal?.score100, 0)));

    const confidence =
      safeNumber(
        signal?.confidence,
        signal?.raw?.confidence,
        60
      );

    const sourceReliability =
      safeNumber(
        signal?.sourceProfile?.reliabilityScore,
        signal?.raw?.sourceProfile?.reliabilityScore,
        55
      );

    const escalation =
      normalizeEscalationWeight(
        signal?.escalationLevel ||
        signal?.priority ||
        signal?.raw?.severity ||
        signal?.raw?.priority
      );

    const structurality =
      signal?.structural === true
        ? 90
        : normalizeText(signal?.layer?.en || signal?.layer).includes("structural")
          ? 78
          : 42;

    const recency =
      recencyScore(
        signal?.timestamp ||
        signal?.publishedAt ||
        signal?.newsMeta?.publishedAt ||
        signal?.raw?.publishedAt
      );

    const weights = CONFIG.signalWeights;

    const score = Math.round(
      (severity * weights.severity) +
      (confidence * weights.confidence) +
      (recency * weights.recency) +
      (sourceReliability * weights.sourceReliability) +
      (escalation * weights.escalation) +
      (structurality * weights.structurality)
    );

    return {
      score: clamp(score),
      band: classifyBand(score),
      components: {
        severity: clamp(severity),
        confidence: clamp(confidence),
        recency: clamp(recency),
        sourceReliability: clamp(sourceReliability),
        escalation: clamp(escalation),
        structurality: clamp(structurality)
      }
    };
  }

  function computeClusterRisk(cluster) {
    const signals = asArray(cluster?.signals);
    const signalScores = signals.map(signal => {
      if (safeNumber(signal?.balancedScore100, 0) > 0) return safeNumber(signal.balancedScore100);
      return computeSignalScore(signal).score;
    });

    const avgSignal = average(signalScores);
    const maxSignal = maxValue(signalScores);
    const density = densityScore(signals.length || cluster?.signalCount || 0, CONFIG.densityReference.cluster);
    const escalation = normalizeEscalationWeight(cluster?.escalationLevel);

    const weights = CONFIG.clusterWeights;

    const score = Math.round(
      (avgSignal * weights.avgSignal) +
      (maxSignal * weights.maxSignal) +
      (density * weights.density) +
      (escalation * weights.escalation)
    );

    return {
      score: clamp(score),
      band: classifyBand(score),
      components: {
        avgSignal: Math.round(avgSignal),
        maxSignal: Math.round(maxSignal),
        density: Math.round(density),
        escalation: Math.round(escalation)
      }
    };
  }

  function computeTheaterRisk(theater) {
    const clusters = asArray(theater?.clusters);
    const clusterScores = clusters.map(cluster => {
      if (safeNumber(cluster?.avgRisk, 0) > 0) return safeNumber(cluster.avgRisk);
      return computeClusterRisk(cluster).score;
    });

    const avgCluster = average(clusterScores);
    const maxCluster = maxValue(clusterScores);
    const density = densityScore(clusters.length || theater?.clusterCount || 0, CONFIG.densityReference.theater);
    const priority = normalizeTheaterPriority(theater?.priority);

    const weights = CONFIG.theaterWeights;

    const score = Math.round(
      (avgCluster * weights.avgCluster) +
      (maxCluster * weights.maxCluster) +
      (density * weights.density) +
      (priority * weights.priority)
    );

    return {
      score: clamp(score),
      band: classifyBand(score),
      components: {
        avgCluster: Math.round(avgCluster),
        maxCluster: Math.round(maxCluster),
        density: Math.round(density),
        priority: Math.round(priority)
      }
    };
  }

  function computeCountryRisk(country, context = {}) {
    const baseline = safeNumber(country?.riskScore, 50);
    const relatedSignals = asArray(context.relatedSignals);
    const relatedClusters = asArray(context.relatedClusters);
    const relatedTheater = context.relatedTheater || null;
    const newsPressure = safeNumber(context.newsPressure, 0);

    const signalLoad = relatedSignals.length
      ? Math.round(average(
          relatedSignals.map(signal =>
            safeNumber(signal?.balancedScore100, computeSignalScore(signal).score)
          )
        ))
      : 0;

    const clusterRisk = relatedClusters.length
      ? Math.round(average(
          relatedClusters.map(cluster =>
            safeNumber(cluster?.avgRisk, computeClusterRisk(cluster).score)
          )
        ))
      : 0;

    const theaterRisk = relatedTheater
      ? safeNumber(relatedTheater?.avgRisk, computeTheaterRisk(relatedTheater).score)
      : 0;

    const weights = CONFIG.countryWeights;

    const score = Math.round(
      (baseline * weights.baseline) +
      (signalLoad * weights.signalLoad) +
      (clusterRisk * weights.clusterRisk) +
      (theaterRisk * weights.theaterRisk) +
      (newsPressure * weights.newsPressure)
    );

    return {
      score: clamp(score),
      band: classifyBand(score),
      components: {
        baseline: clamp(baseline),
        signalLoad: clamp(signalLoad),
        clusterRisk: clamp(clusterRisk),
        theaterRisk: clamp(theaterRisk),
        newsPressure: clamp(newsPressure)
      }
    };
  }

  function computeSystemStress(input = {}) {
    const signalPressure = safeNumber(input.signalPressure, 0);
    const clusterPressure = safeNumber(input.clusterPressure, 0);
    const theaterPressure = safeNumber(input.theaterPressure, 0);
    const newsPressure = safeNumber(input.newsPressure, 0);

    const weights = CONFIG.systemWeights;

    const score = Math.round(
      (signalPressure * weights.signalPressure) +
      (clusterPressure * weights.clusterPressure) +
      (theaterPressure * weights.theaterPressure) +
      (newsPressure * weights.newsPressure)
    );

    return {
      score: clamp(score),
      band: classifyBand(score),
      components: {
        signalPressure: clamp(signalPressure),
        clusterPressure: clamp(clusterPressure),
        theaterPressure: clamp(theaterPressure),
        newsPressure: clamp(newsPressure)
      }
    };
  }

  function explainMetric(type, score) {
    const band = classifyBand(score);

    const dictionary = {
      signal: {
        en: `Signal score reflects event severity, confidence, recency, source reliability, escalation weight, and structural relevance.`,
        ar: `درجة الإشارة تعكس شدة الحدث، الثقة، الحداثة، موثوقية المصدر، وزن التصعيد، والملاءمة البنيوية.`
      },
      cluster: {
        en: `Cluster risk reflects average signal load, peak signal intensity, density of active signals, and escalation level.`,
        ar: `خطر الملف يعكس متوسط حمل الإشارات، شدة الذروة، كثافة الإشارات النشطة، ومستوى التصعيد.`
      },
      theater: {
        en: `Theater risk reflects average cluster burden, top cluster intensity, theater density, and strategic priority.`,
        ar: `خطر المسرح يعكس متوسط عبء الملفات، شدة الملف الأعلى، كثافة المسرح، والأولوية الاستراتيجية.`
      },
      country: {
        en: `Country risk reflects baseline country exposure, related signal load, cluster burden, theater context, and live news pressure.`,
        ar: `خطر الدولة يعكس قابلية التعرض الأساسية، حمل الإشارات المرتبطة، عبء الملفات، سياق المسرح، والضغط الخبري الحي.`
      },
      system: {
        en: `System stress reflects the weighted balance between signals, strategic files, theaters, and live news pressure.`,
        ar: `ضغط النظام يعكس التوازن المرجّح بين الإشارات، الملفات الاستراتيجية، المسارح، والضغط الخبري الحي.`
      }
    };

    return {
      type,
      score: clamp(score),
      band,
      description: dictionary[type] || {
        en: "Unified sovereign metric.",
        ar: "مؤشر سيادي موحد."
      }
    };
  }

  function buildMetricPack(input = {}) {
    const signal = computeSignalScore(input.signal || {});
    const cluster = computeClusterRisk(input.cluster || {});
    const theater = computeTheaterRisk(input.theater || {});
    const country = computeCountryRisk(input.country || {}, input.countryContext || {});
    const system = computeSystemStress(input.system || {});

    return {
      signal,
      cluster,
      theater,
      country,
      system
    };
  }

  return {
    CONFIG,
    classifyBand,
    computeSignalScore,
    computeClusterRisk,
    computeTheaterRisk,
    computeCountryRisk,
    computeSystemStress,
    explainMetric,
    buildMetricPack
  };
})();
