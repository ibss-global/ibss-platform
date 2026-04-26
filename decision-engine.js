// IBSS DECISION ENGINE — Σ-9X Live Decision System
// Version: v3.0 Unified Live Sovereign Decision Core

window.IBSS_DECISION_ENGINE = (function () {
  "use strict";

  const CONFIG = {
    version: "v3.0-sigma9x-live-decision-system",

    thresholds: {
      critical: 85,
      high: 75,
      medium: 50,
      watch: 35
    },

    weights: {
      pressure: 0.28,
      signal: 0.24,
      governance: 0.20,
      fragmentation: 0.16,
      external: 0.08,
      publication: 0.04
    },

    keywordWeights: {
      governance: {
        police: 18,
        "civil order": 18,
        governance: 18,
        administrative: 16,
        administration: 16,
        control: 14,
        security: 12,
        authority: 12,
        "law enforcement": 16,
        "internal security": 16,
        municipality: 10,

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
        signal?.country,
        signal?.priority,
        signal?.weight
      );
    });

    feed.forEach(item => {
      chunks.push(
        getLocalizedText(item?.text, "en"),
        getLocalizedText(item?.text, "ar"),
        getLocalizedText(item?.title, "en"),
        getLocalizedText(item?.title, "ar"),
        getLocalizedText(item?.summary, "en"),
        getLocalizedText(item?.summary, "ar"),
        item?.priority,
        item?.source
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
        getLocalizedText(item?.title, "ar"),
        getLocalizedText(item?.summary, "en"),
        getLocalizedText(item?.summary, "ar"),
        getLocalizedText(item?.body, "en"),
        getLocalizedText(item?.body, "ar"),
        item?.domain,
        item?.country,
        item?.region,
        item?.priority,
        item?.classification,
        item?.layer
      );
    });

    return normalizeText(chunks.filter(Boolean).join(" "));
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
      const positionWeight =
        index === 0 ? 1 :
        index === 1 ? 0.82 :
        index === 2 ? 0.68 :
        0.5;

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
      const priority = normalizeText(signal?.priority || signal?.weight);

      if (domain.includes("governance") || type.includes("governance")) structuralBoost += 12;
      if (domain.includes("security") || type.includes("security")) structuralBoost += 8;
      if (priority.includes("high")) structuralBoost += 5;
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

  function detectPublicationWeight(system) {
    const publication =
      system?.featuredPublication ||
      system?.publicationContext?.featuredPublication ||
      null;

    if (!publication) return 0;

    const metrics = publication.metrics || {};

    const strategicWeight = safeNumber(metrics.strategicWeight, 0);
    const policyRisk = safeNumber(metrics.policyRisk, 0);
    const regionalSensitivity = safeNumber(metrics.regionalSensitivity, 0);

    const featuredBoost = publication?.meta?.featured ? 8 : 0;
    const pinnedBoost = publication?.meta?.pinned ? 6 : 0;
    const canonicalBoost = publication?.meta?.canonical ? 6 : 0;
    const l9Boost = String(publication?.layer || "").toUpperCase() === "L9" ? 10 : 0;

    return clamp(
      strategicWeight * 0.38 +
      policyRisk * 0.28 +
      regionalSensitivity * 0.22 +
      featuredBoost +
      pinnedBoost +
      canonicalBoost +
      l9Boost
    );
  }

  function calculateDecisionIndexes(system) {
    const pressure = clamp(system?.systemPressure ?? system?.ssi ?? 0);
    const confidence = clamp(system?.confidenceScore ?? 0);
    const blob = collectText(system);

    const signalIndex = detectSignalIndex(system);
    const governance = detectGovernanceStress(system, blob);
    const fragmentation = detectControlFragmentation(system, blob);
    const external = detectExternalTrack(system, blob);
    const publicationWeight = detectPublicationWeight(system);

    const denialIndex = Math.round(
      pressure * CONFIG.weights.pressure +
      signalIndex * CONFIG.weights.signal +
      governance.score * CONFIG.weights.governance +
      fragmentation.score * CONFIG.weights.fragmentation +
      external.score * CONFIG.weights.external +
      publicationWeight * CONFIG.weights.publication
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

    const publicationImpactIndex = Math.round(
      publicationWeight * 0.60 +
      signalIndex * 0.20 +
      governance.score * 0.20
    );

    return {
      pressure,
      confidence,
      signalIndex,
      governanceStress: governance.score,
      controlFragmentation: fragmentation.score,
      externalTrack: external.score,
      publicationWeight,
      denialIndex: clamp(denialIndex),
      controlShiftIndex: clamp(controlShiftIndex),
      externalizationIndex: clamp(externalizationIndex),
      publicationImpactIndex: clamp(publicationImpactIndex),
      evidence: {
        governanceHits: governance.hits,
        fragmentationHits: fragmentation.hits,
        externalHits: external.hits
      }
    };
  }

  function selectScenario(indexes) {
    const d = indexes.denialIndex;
    const f = indexes.controlFragmentation;
    const e = indexes.externalTrack;
    const p = indexes.publicationImpactIndex;

    if (d >= 85 && f >= 60) {
      return {
        id: "S1",
        label: "Governance Denial / Escalation Drift",
        probability: "HIGH",
        posture: "ACTIVE DECISION"
      };
    }

    if (d >= 70) {
      return {
        id: "S2",
        label: "Managed Fragmentation",
        probability: "HIGH",
        posture: "HEIGHTENED DECISION"
      };
    }

    if (e >= 55) {
      return {
        id: "S3",
        label: "External Administrative Track",
        probability: "CONDITIONAL",
        posture: "PREPARATION"
      };
    }

    if (p >= 60 && d >= 50) {
      return {
        id: "S5",
        label: "Narrative-Decision Coupling",
        probability: "MEDIUM",
        posture: "DECISION WATCH"
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

    if (indexes.publicationImpactIndex >= 60) {
      risks.push({
        id: "R5",
        level: "MEDIUM",
        title: "Narrative layer influencing decision environment"
      });
    }

    if (indexes.confidence < 40) {
      risks.push({
        id: "R6",
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
        title: "Track Narrative-Decision Coupling",
        priority: indexes.publicationImpactIndex >= 60 ? "HIGH" : "MEDIUM",
        trigger: "Publication Impact ≥ 60"
      },
      {
        id: "O5",
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

    if (scenario.id === "S5") {
      return "Treat publications and narrative output as active decision-layer signals. Monitor how strategic framing shapes pressure interpretation.";
    }

    if (scenario.id === "S4") {
      return "Maintain structured pressure monitoring. Watch for transition from military pressure into direct governance-denial pattern.";
    }

    return "Preserve monitoring posture and continue signal collection until governance or fragmentation indicators strengthen.";
  }

  function buildBottomLine(indexes, scenario) {
    if (indexes.denialIndex >= 70) {
      return "The conflict is shifting from contest over control to denial of stable governance.";
    }

    if (indexes.controlShiftIndex >= 55) {
      return "Control is becoming fragmented; the decisive variable is administrative continuity, not firepower alone.";
    }

    if (scenario.id === "S5") {
      return "Narrative output is no longer only descriptive; it is part of the decision environment.";
    }

    return "The system remains in structured pressure with governance-denial indicators under observation.";
  }

  function buildNarrative(system, indexes, scenario, lang = "en") {
    const topSignal =
      system?.topSignal ||
      system?.dominantSignal ||
      asArray(system?.rankedSignals)[0];

    if (lang === "ar") {
      return {
        headline: `قرار Σ-9X: ${scenario.label}`,
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
    else if (scenario.id === "S5") decision = "NARRATIVE DECISION COUPLING";

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
        publicationWeight: indexes.publicationWeight,
        denialIndex: indexes.denialIndex,
        controlShiftIndex: indexes.controlShiftIndex,
        externalizationIndex: indexes.externalizationIndex,
        publicationImpactIndex: indexes.publicationImpactIndex
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
      decisionOutput: decision.decision,
      liveDecisionSystem: {
        active: true,
        generatedAt: decision.generatedAt,
        denialIndex: decision.indexes.denialIndex,
        scenario: decision.scenario,
        recommendation: decision.recommendedLine
      }
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
