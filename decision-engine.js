// IBSS DECISION ENGINE — Σ-9X Real Decision Layer
// Version: v1.0 Governance Denial / Control Shift Engine

window.IBSS_DECISION_ENGINE = (function () {
  "use strict";

  const CONFIG = {
    version: "v1.0-sigma9x-decision-engine",
    pressureHigh: 75,
    pressureMedium: 50,
    confidenceFloor: 45
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

  function getLocalizedText(value, lang = "en") {
    if (!value) return "";
    if (typeof value === "string" || typeof value === "number") return String(value);
    return value[lang] || value.en || value.ar || value.title || value.name || value.label || value.text || "";
  }

  function classifyPressure(score) {
    const n = safeNumber(score, 0);
    if (n >= 85) return "CRITICAL";
    if (n >= 75) return "HIGH";
    if (n >= 50) return "MEDIUM";
    return "LOW";
  }

  function detectGovernanceStress(system) {
    const signals = asArray(system?.rankedSignals || system?.liveSignals);
    const feed = asArray(system?.publisherFeed || system?.unifiedFeed || system?.feed);

    const textBlob = [
      ...signals.map(s => [
        getLocalizedText(s.title, "en"),
        getLocalizedText(s.description, "en"),
        getLocalizedText(s.summary, "en"),
        s.domain,
        s.signalType?.en,
        s.signalType?.ar
      ].join(" ")),
      ...feed.map(f => getLocalizedText(f.text || f.title || f.summary, "en"))
    ].join(" ").toLowerCase();

    let score = 0;

    if (textBlob.includes("police")) score += 20;
    if (textBlob.includes("governance")) score += 18;
    if (textBlob.includes("administrative")) score += 16;
    if (textBlob.includes("control")) score += 14;
    if (textBlob.includes("fragmentation")) score += 14;
    if (textBlob.includes("civil")) score += 10;
    if (textBlob.includes("security")) score += 10;

    return Math.min(100, score);
  }

  function detectControlFragmentation(system) {
    const topCluster = system?.topCluster || {};
    const countries = asArray(system?.countryRiskFeed);
    const drivers = asArray(system?.drivers);

    let score = 0;

    if (safeText(topCluster?.trend, "").toUpperCase().includes("RISING")) score += 15;
    if (safeText(topCluster?.escalationLevel, "").toUpperCase() === "HIGH") score += 20;

    drivers.forEach(driver => {
      const label = getLocalizedText(driver.label, "en").toLowerCase();
      if (label.includes("fragment")) score += 18;
      if (label.includes("control")) score += 14;
      if (label.includes("governance")) score += 14;
      if (safeText(driver.priority, "").toUpperCase() === "HIGH") score += 6;
    });

    countries.forEach(country => {
      if (safeNumber(country.riskScore, 0) >= 70) score += 5;
    });

    return Math.min(100, score);
  }

  function detectExternalTrack(system) {
    const content = asArray(system?.publicationContext?.latestPublications);
    const feed = asArray(system?.publisherFeed || system?.unifiedFeed || system?.feed);

    const blob = [
      ...content.map(i => `${i.title || ""} ${i.summary || ""}`),
      ...feed.map(i => getLocalizedText(i.text || i.title, "en"))
    ].join(" ").toLowerCase();

    let score = 0;

    if (blob.includes("external")) score += 18;
    if (blob.includes("international")) score += 18;
    if (blob.includes("regional")) score += 15;
    if (blob.includes("reconstruction")) score += 18;
    if (blob.includes("aid")) score += 12;
    if (blob.includes("funding")) score += 15;
    if (blob.includes("third party")) score += 20;

    return Math.min(100, score);
  }

  function buildDecision(system) {
    const pressure = safeNumber(system?.systemPressure ?? system?.ssi, 0);
    const confidence = safeNumber(system?.confidenceScore, 0);
    const level = classifyPressure(pressure);

    const governanceStress = detectGovernanceStress(system);
    const fragmentation = detectControlFragmentation(system);
    const externalTrack = detectExternalTrack(system);

    const denialIndex = Math.round(
      pressure * 0.42 +
      governanceStress * 0.28 +
      fragmentation * 0.22 +
      externalTrack * 0.08
    );

    let mode = "MONITORING";
    let decision = "WATCH";
    let recommendedLine = "Preserve monitoring posture and continue signal collection.";
    let scenario = "Baseline Monitoring";

    if (denialIndex >= 80) {
      mode = "ACTIVE DECISION";
      decision = "ESCALATION DRIFT";
      scenario = "Governance Denial / Fragmented Control";
      recommendedLine = "Maintain direct observation of administrative collapse indicators and prepare controlled-governance alternatives.";
    } else if (denialIndex >= 65) {
      mode = "HEIGHTENED DECISION";
      decision = "MANAGED FRAGMENTATION";
      scenario = "Controlled Instability";
      recommendedLine = "Track police, civil-order, and local-administration disruption as primary decision drivers.";
    } else if (denialIndex >= 45) {
      mode = "PREPARATION";
      decision = "STRUCTURED PRESSURE";
      scenario = "Pressure Continuity";
      recommendedLine = "Monitor transition from military pressure to governance-denial pattern.";
    }

    const risks = [];

    if (governanceStress >= 40) risks.push("Administrative continuity degradation");
    if (fragmentation >= 40) risks.push("Fragmented control zones expansion");
    if (pressure >= 75) risks.push("Escalation drift within short horizon");
    if (externalTrack >= 35) risks.push("External governance injection pressure");
    if (!risks.length) risks.push("Low visibility / insufficient decision pressure");

    const options = [
      {
        id: "O1",
        title: "Sustain Governance Denial Monitoring",
        risk: pressure >= 75 ? "HIGH" : "MEDIUM"
      },
      {
        id: "O2",
        title: "Map Local Micro-Governance Nodes",
        risk: fragmentation >= 50 ? "HIGH" : "MEDIUM"
      },
      {
        id: "O3",
        title: "Prepare External Administrative Track",
        risk: externalTrack >= 45 ? "MEDIUM" : "CONDITIONAL"
      }
    ];

    return {
      generatedAt: new Date().toISOString(),
      engine: CONFIG.version,

      pressure,
      confidence,
      level,

      indexes: {
        governanceStress,
        fragmentation,
        externalTrack,
        denialIndex
      },

      mode,
      decision,
      scenario,
      recommendedLine,
      risks,
      options,

      bottomLine:
        denialIndex >= 65
          ? "The conflict is shifting from control contestation to denial of stable governance."
          : "The system remains in structured pressure with governance-denial indicators under observation."
    };
  }

  function getDecision(system) {
    if (!system || typeof system !== "object") return null;
    return buildDecision(system);
  }

  return {
    CONFIG,
    getDecision,
    buildDecision
  };
})();
