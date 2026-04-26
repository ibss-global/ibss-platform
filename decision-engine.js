// IBSS DECISION ENGINE — Σ-9X Sovereign Decision Layer
// Version: v2.0 Signal-Driven Governance / Control Shift Engine

window.IBSS_DECISION_ENGINE = (function () {
  "use strict";

  const CONFIG = {
    version: "v2.0-sigma9x-signal-driven-decision-engine",

    thresholds: {
      critical: 85,
      high: 75,
      medium: 50,
      watch: 35
    },

    weights: {
      pressure: 0.30,
      signal: 0.24,
      governance: 0.20,
      fragmentation: 0.16,
      external: 0.10
    },

    keywordWeights: {
      governance: {
        police: 18,
        "civil order": 18,
        governance: 18,
        administrative: 16,
        administration: 16,
        control: 12,
        security: 10,
        "public order": 14,
        municipality: 10,
        authority: 12,
        "internal security": 16,
        "law enforcement": 16,

        شرطة: 18,
        دورية: 16,
        حكم: 18,
        إدارة: 16,
        ادارة: 16,
        سيطرة: 14,
        ضبط: 14,
        أمن: 12,
        امن: 12,
        سلطة: 14
      },

      fragmentation: {
        fragmentation: 18,
        fragmented: 18,
        vacuum: 18,
        collapse: 16,
        disorder: 14,
        chaos: 14,
        clan: 12,
        militia: 14,
        "local actors": 14,
        "micro governance": 16,
        "control zones": 18,

        فراغ: 18,
        تفكك: 18,
        انهيار: 16,
        فوضى: 14,
        عشائر: 12,
        ميليشيا: 14,
        جيوب: 14,
        مناطق: 8
      },

      external: {
        external: 16,
        international: 16,
        regional: 14,
        reconstruction: 18,
        aid: 12,
        funding: 16,
        "third party": 18,
        "arab role": 14,
        "pa": 12,
        "palestinian authority": 16,

        خارجي: 16,
        دولي: 16,
        إقليمي: 14,
        اقليمي: 14,
        إعمار: 18,
        اعمار: 18,
        مساعدات: 12,
        تمويل: 16,
        السلطة: 12
      }
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
    return Math.max(min, Math.min(max, safeNumber(value, 0)));
  }

  function getLocalizedText(value, lang = "en") {
    if (!value) return "";
    if (typeof value === "string" || typeof value === "number") return String(value);

    return (
      value?.[lang] ||
      value?.en ||
      value?.ar ||
      value?.title ||
      value?.name ||
      value?.label ||
      value?.text ||
      value?.summary ||
      ""
    );
  }

  function normalizeText(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function classifyBand(score) {
    const n = safeNumber(score, 0);

    if (n >= CONFIG.thresholds.critical) return "CRITICAL";
    if (n >= CONFIG.thresholds.high) return "HIGH";
    if (n >= CONFIG.thresholds.medium) return "MEDIUM";
    if (n >= CONFIG.thresholds.watch) return "WATCH";
    return "LOW";
  }

  function priorityWeight(priority) {
    const p = String(priority || "").toUpperCase();

    if (p === "CRITICAL") return 100;
    if (p === "HIGH") return 80;
    if (p === "MEDIUM") return 55;
    if (p === "LOW") return 25;

    return 0;
  }

  function collectText(system) {
    const signals = asArray(system?.rankedSignals || system?.liveSignals);
    const feed = asArray(system?.publisherFeed || system?.unifiedFeed || system?.feed);
    const drivers = asArray(system?.drivers);
    const news = asArray(system?.liveNews);
    const publications = asArray(system?.publicationContext?.latestPublications);

    const chunks = [];

    signals.forEach(signal => {
      chunks.push(
        getLocalizedText(signal?.title, "en"),
        getLocalizedText(signal?.title, "ar"),
        getLocalizedText(signal?.description, "en"),
        getLocalizedText(signal?.description, "ar"),
        getLocalizedText(signal?.summary, "en"),
        getLocalizedText(signal?.summary, "ar"),
        getLocalizedText(signal?.signalType, "en"),
        getLocalizedText(signal?.signalType, "ar"),
        signal?.domain,
        signal?.region,
        signal?.country
      );
    });

    feed.forEach(item => {
      chunks.push(
        getLocalizedText(item?.text, "en"),
        getLocalizedText(item?.text, "ar"),
        getLocalizedText(item?.title, "en"),
        getLocalizedText(item?.title, "ar"),
        getLocalizedText(item?.summary, "en"),
        getLocalizedText(item?.summary, "ar")
      );
    });

    drivers.forEach(driver => {
      chunks.push(
        getLocalizedText(driver?.label, "en"),
        getLocalizedText(driver?.label, "ar"),
        getLocalizedText(driver?.explanation, "en"),
        getLocalizedText(driver?.explanation, "ar"),
        driver?.type,
        driver?.priority
      );
    });

    news.forEach(item => {
      chunks.push(
        getLocalizedText(item?.title, "en"),
        getLocalizedText(item?.title, "ar"),
        getLocalizedText(item?.summary, "en"),
        getLocalizedText(item?.summary, "ar"),
        item?.source,
        item?.severity,
        item?.priority
      );
    });

    publications.forEach(item => {
      chunks.push(
        getLocalizedText(item?.title, "en"),
        getLocalizedText(item?.summary, "en"),
        getLocalizedText(item?.body, "en"),
        item?.domain,
        item?.country,
        item?.region
      );
    });

    return normalizeText(chunks.filter(Boolean).join(" "));
  }

  function scoreKeywords(blob, dictionary) {
    let score = 0;
    const hits = [];

    Object.entries(dictionary || {}).forEach(([keyword, weight]) => {
      if (blob.includes(keyword.toLowerCase())) {
        score += weight;
        hits.push(keyword);
      }
    });

    return {
      score: clamp(score),
      hits
    };
  }

  function detectSignalIndex(system) {
    const signals = asArray(system?.rankedSignals || system?.liveSignals);
    if (!signals.length) return 0;

    const topSignals = signals.slice(0, 5);

    const weighted = topSignals.map((signal, index) => {
      const base = safeNumber(
        signal?.balancedScore100 ??
        signal?.score100 ??
        signal?.riskScore ??
        signal?.score,
        0
      );

      const pWeight = priorityWeight(signal?.priority || signal?.weight);
      const positionWeight = index === 0 ? 1 : index === 1 ? 0.82 : index === 2 ? 0.68 : 0.5;

      return ((base * 0.72) + (pWeight * 0.28)) * positionWeight;
    });

    const total = weighted.reduce((sum, value) => sum + value, 0);
    const divisor = topSignals.length >= 3 ? 2.4 : topSignals.length;

    return clamp(Math.round(total / Math.max(1, divisor)));
  }

  function detectGovernanceStress(system, blob) {
    const keywordResult = scoreKeywords(blob, CONFIG.keywordWeights.governance);
    const signals = asArray(system?.rankedSignals || system?.liveSignals);

    let structuralBoost = 0;

    signals.slice(0, 5).forEach(signal => {
      const domain = normalizeText(signal?.domain || "");
      const type = normalizeText(getLocalizedText(signal?.signalType, "en"));

      if (domain.includes("governance") || type.includes("governance")) structuralBoost += 12;
      if (domain.includes("security") || type.includes("security")) structuralBoost += 8;
      if (normalizeText(signal?.priority).includes("high")) structuralBoost += 5;
    });

    return {
      score: clamp(keywordResult.score + structuralBoost),
      hits: keywordResult.hits
    };
  }

  function detectControlFragmentation(system, blob) {
    const keywordResult = scoreKeywords(blob, CONFIG.keywordWeights.fragmentation);

    const topCluster = system?.topCluster || {};
    const drivers = asArray(system?.drivers);
    const countries = asArray(system?.countryRiskFeed);

    let structuralBoost = 0;

    if (safeText(topCluster?.trend, "").toUpperCase().includes("RISING")) structuralBoost += 12;
    if (safeText(topCluster?.escalationLevel, "").toUpperCase() === "HIGH") structuralBoost += 18;

    drivers.forEach(driver => {
      const label = normalizeText(getLocalizedText(driver?.label, "en"));
      const priority = safeText(driver?.priority, "").toUpperCase();

      if (label.includes("fragment")) structuralBoost += 16;
      if (label.includes("control")) structuralBoost += 12;
      if (label.includes("governance")) structuralBoost += 12;
      if (priority === "HIGH") structuralBoost += 5;
    });

    countries.slice(0, 5).forEach(country => {
      if (safeNumber(country?.riskScore, 0) >= 70) structuralBoost += 4;
    });

    return {
      score: clamp(keywordResult.score + structuralBoost),
      hits: keywordResult.hits
    };
  }

  function detectExternalTrack(system, blob) {
    const keywordResult = scoreKeywords(blob, CONFIG.keywordWeights.external);

    const publications = asArray(system?.publicationContext?.latestPublications);
    let structuralBoost = 0;

    publications.slice(0, 5).forEach(item => {
      const domain = normalizeText(item?.domain || "");
      const region = normalizeText(item?.region || "");
      const summary = normalizeText(getLocalizedText(item?.summary, "en"));

      if (domain.includes("policy")) structuralBoost += 8;
      if (region.includes("regional")) structuralBoost += 8;
      if (summary.includes("reconstruction")) structuralBoost += 10;
      if (summary.includes("third party")) structuralBoost += 12;
    });

    return {
      score: clamp(keywordResult.score + structuralBoost),
      hits: keywordResult.hits
    };
  }

  function calculateDecisionIndexes(system) {
    const pressure = clamp(system?.systemPressure ?? system?.ssi ?? 0);
    const confidence = clamp(system?.confidenceScore ?? 0);
    const blob = collectText(system);

    const signalIndex = detectSignalIndex(system);
    const governance = detectGovernanceStress(system, blob);
    const fragmentation = detectControlFragmentation(system, blob);
    const external = detectExternalTrack(system, blob);

    const denialIndex = Math.round(
      pressure * CONFIG.weights.pressure +
      signalIndex * CONFIG.weights.signal +
      governance.score * CONFIG.weights.governance +
      fragmentation.score * CONFIG.weights.fragmentation +
      external.score * CONFIG.weights.external
    );

    const controlShiftIndex = Math.round(
      governance.score * 0.34 +
      fragmentation.score * 0.30 +
      pressure * 0.22 +
      signalIndex * 0.14
    );

    const externalizationIndex = Math.round(
      external.score * 0.50 +
      fragmentation.score * 0.20 +
      pressure * 0.15 +
      governance.score * 0.15
    );

    return {
      pressure,
      confidence,
      signalIndex,
      governanceStress: governance.score,
      controlFragmentation: fragmentation.score,
      externalTrack: external.score,
      denialIndex: clamp(denialIndex),
      controlShiftIndex: clamp(controlShiftIndex),
      externalizationIndex: clamp(externalizationIndex),
      evidence: {
        governanceHits: governance.hits,
        fragmentationHits: fragmentation.hits,
        externalHits: external.hits
      }
    };
  }

  function selectScenario(indexes) {
    const d = indexes.denialIndex;
    const g = indexes.governanceStress;
    const f = indexes.controlFragmentation;
    const e = indexes.externalTrack;

    if (d >= 82 && f >= 55) {
      return {
        id: "S1",
        label: "Governance Denial / Escalation Drift",
        probability: "HIGH",
        posture: "ACTIVE DECISION"
      };
    }

    if (d >= 68) {
      return {
        id: "S2",
        label: "Managed Fragmentation",
        probability: "HIGH",
        posture: "HEIGHTENED DECISION"
      };
    }

    if (e >= 55 && g >= 45) {
      return {
        id: "S3",
        label: "External Administrative Track",
        probability: "CONDITIONAL",
        posture: "PREPARATION"
      };
    }

    if (d >= 48) {
      return {
        id: "S4",
        label: "Structured Pressure Continuity",
        probability: "MEDIUM",
        posture: "PREPARATION"
      };
    }

    return {
      id: "S0",
      label: "Baseline Monitoring",
      probability: "LOW",
      posture: "MONITORING"
    };
  }

  function buildRisks(indexes) {
    const risks = [];

    if (indexes.governanceStress >= 55) {
      risks.push({
        id: "R1",
        level: "HIGH",
        title: "Administrative continuity degradation"
      });
    }

    if (indexes.controlFragmentation >= 55) {
      risks.push({
        id: "R2",
        level: "HIGH",
        title: "Fragmented control zones expansion"
      });
    }

    if (indexes.pressure >= 75) {
      risks.push({
        id: "R3",
        level: "HIGH",
        title: "Escalation drift within short horizon"
      });
    }

    if (indexes.externalTrack >= 45) {
      risks.push({
        id: "R4",
        level: "MEDIUM",
        title: "External governance injection pressure"
      });
    }

    if (indexes.confidence < 40) {
      risks.push({
        id: "R5",
        level: "MEDIUM",
        title: "Low confidence / incomplete visibility"
      });
    }

    if (!risks.length) {
      risks.push({
        id: "R0",
        level: "LOW",
        title: "Low immediate decision pressure"
      });
    }

    return risks;
  }

  function buildOptions(indexes, scenario) {
    return [
      {
        id: "O1",
        title: "Sustain Governance Denial Monitoring",
        priority: indexes.denialIndex >= 65 ? "HIGH" : "MEDIUM",
        trigger: "Denial Index ≥ 65"
      },
      {
        id: "O2",
        title: "Map Local Micro-Governance Nodes",
        priority: indexes.controlFragmentation >= 50 ? "HIGH" : "MEDIUM",
        trigger: "Control Fragmentation ≥ 50"
      },
      {
        id: "O3",
        title: "Prepare External Administrative Track",
        priority: indexes.externalTrack >= 50 ? "HIGH" : "CONDITIONAL",
        trigger: "External Track ≥ 50"
      },
      {
        id: "O4",
        title: "Preserve Signal Collection / Avoid Over-Commitment",
        priority: scenario.id === "S0" ? "HIGH" : "MEDIUM",
        trigger: "Low or uncertain visibility"
      }
    ];
  }

  function buildRecommendedLine(indexes, scenario) {
    if (scenario.id === "S1") {
      return "Treat the environment as active governance-denial drift. Track police, civil-order, and local-administration disruption as primary decision drivers.";
    }

    if (scenario.id === "S2") {
      return "Assume controlled instability. Map emerging micro-control pockets and identify which actor retains administrative continuity first.";
    }

    if (scenario.id === "S3") {
      return "Prepare external administrative pathway assessment. Monitor funding, reconstruction, border-management, and political-cover indicators.";
    }

    if (scenario.id === "S4") {
      return "Maintain structured pressure monitoring. Watch for transition from military pressure into direct governance-denial pattern.";
    }

    return "Preserve monitoring posture and continue signal collection until governance or fragmentation indicators strengthen.";
  }

  function buildBottomLine(indexes, scenario) {
    if (indexes.denialIndex >= 68) {
      return "The conflict is shifting from contest over control to denial of stable governance.";
    }

    if (indexes.controlShiftIndex >= 55) {
      return "Control is becoming fragmented; the decisive variable is administrative continuity, not firepower alone.";
    }

    return "The system remains in structured pressure with governance-denial indicators under observation.";
  }

  function buildNarrative(system, indexes, scenario, lang = "en") {
    const topSignal = system?.topSignal || system?.dominantSignal || asArray(system?.rankedSignals)[0];

    if (lang === "ar") {
      return {
        headline: `Σ-9X Decision: ${scenario.label}`,
        summary: `مؤشر إنكار الحكم: ${indexes.denialIndex}/100. الحالة الحالية تشير إلى ${scenario.label}.`,
        signal: topSignal
          ? `الإشارة المهيمنة: ${getLocalizedText(topSignal.title, "ar") || getLocalizedText(topSignal.title, "en")}`
          : "لا توجد إشارة مهيمنة واضحة.",
        bottomLine: buildBottomLine(indexes, scenario)
      };
    }

    return {
      headline: `Σ-9X Decision: ${scenario.label}`,
      summary: `Governance Denial Index: ${indexes.denialIndex}/100. Current state indicates ${scenario.label}.`,
      signal: topSignal
        ? `Dominant Signal: ${getLocalizedText(topSignal.title, "en")}`
        : "No dominant signal available.",
      bottomLine: buildBottomLine(indexes, scenario)
    };
  }

  function buildDecision(system) {
    if (!system || typeof system !== "object") return null;

    const indexes = calculateDecisionIndexes(system);
    const level = classifyBand(indexes.pressure);
    const scenario = selectScenario(indexes);
    const risks = buildRisks(indexes);
    const options = buildOptions(indexes, scenario);

    let decision = "WATCH";
    let mode = scenario.posture;

    if (scenario.id === "S1") decision = "ESCALATION DRIFT";
    else if (scenario.id === "S2") decision = "MANAGED FRAGMENTATION";
    else if (scenario.id === "S3") decision = "EXTERNAL TRACK PREPARATION";
    else if (scenario.id === "S4") decision = "STRUCTURED PRESSURE";

    const recommendedLine = buildRecommendedLine(indexes, scenario);
    const bottomLine = buildBottomLine(indexes, scenario);

    return {
      generatedAt: new Date().toISOString(),
      engine: CONFIG.version,

      pressure: indexes.pressure,
      confidence: indexes.confidence,
      level,

      mode,
      decision,
      scenario: scenario.label,
      scenarioId: scenario.id,
      probability: scenario.probability,

      indexes: {
        signalIndex: indexes.signalIndex,
        governanceStress: indexes.governanceStress,
        fragmentation: indexes.controlFragmentation,
        externalTrack: indexes.externalTrack,
        denialIndex: indexes.denialIndex,
        controlShiftIndex: indexes.controlShiftIndex,
        externalizationIndex: indexes.externalizationIndex
      },

      risks,
      options,
      recommendedLine,
      bottomLine,

      evidence: indexes.evidence,

      narrative: {
        en: buildNarrative(system, indexes, scenario, "en"),
        ar: buildNarrative(system, indexes, scenario, "ar")
      }
    };
  }

  function getDecision(system) {
    return buildDecision(system);
  }

  function getDecisionFromEngine() {
    try {
      if (window.IBSS_ENGINE?.getSystemState) {
        return buildDecision(window.IBSS_ENGINE.getSystemState());
      }

      if (window.IBSS_ENGINE?.getStaticSystemFallback) {
        return buildDecision(window.IBSS_ENGINE.getStaticSystemFallback());
      }
    } catch (error) {
      console.error("IBSS_DECISION_ENGINE getDecisionFromEngine error:", error);
    }

    return null;
  }

  function attachDecision(system) {
    const decision = buildDecision(system);
    if (!decision) return system;

    return {
      ...system,
      decisionLayer: decision,
      sigma9xDecision: decision,
      decisionMode: decision.mode,
      decisionOutput: decision.decision
    };
  }

  return {
    CONFIG,
    getDecision,
    getDecisionFromEngine,
    buildDecision,
    attachDecision,
    classifyBand,
    calculateDecisionIndexes
  };
})();
