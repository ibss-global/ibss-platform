// IBSS L3 ENGINE — Real Signal Classification Layer
// Version: v1.0 L3 Operational Signal Engine

window.IBSS_L3_ENGINE = (function () {
  "use strict";

  const CONFIG = {
    version: "v1.0-l3-operational-signal-engine",
    layer: "L3",
    minActivationScore: 35,
    escalationThreshold: 70,
    criticalThreshold: 85
  };

  function safeText(value, fallback = "") {
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
  }

  function safeNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function clamp(value, min = 0, max = 100) {
    return Math.max(min, Math.min(max, value));
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function getText(value, lang = "en") {
    if (!value) return "";
    if (typeof value === "string" || typeof value === "number") return String(value);

    return (
      value[lang] ||
      value.en ||
      value.ar ||
      value.name ||
      value.title ||
      value.label ||
      value.text ||
      ""
    );
  }

  function normalizeText(value) {
    return safeText(String(value || ""))
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizePriority(value) {
    const p = String(value || "LOW").toUpperCase().trim();
    if (p === "HIGH") return "HIGH";
    if (p === "MEDIUM") return "MEDIUM";
    return "LOW";
  }

  function keywordHit(text, words) {
    const value = normalizeText(text);
    return words.some(word => value.includes(normalizeText(word)));
  }

  function detectDomain(signal) {
    const text = [
      getText(signal.title),
      getText(signal.summary),
      getText(signal.description),
      signal.domain,
      signal.region,
      signal.country
    ].join(" ");

    if (keywordHit(text, [
      "strike", "missile", "attack", "war", "military", "ceasefire", "hostage",
      "قصف", "هجوم", "صاروخ", "حرب", "هدنة", "أسرى"
    ])) {
      return "geo-security";
    }

    if (keywordHit(text, [
      "governance", "administration", "authority", "fragmentation", "institution",
      "حوكمة", "إدارة", "سلطة", "تفكك", "مؤسسي"
    ])) {
      return "geo-governance";
    }

    if (keywordHit(text, [
      "shipping", "trade", "supply", "economy", "energy", "oil", "red sea",
      "شحن", "تجارة", "اقتصاد", "طاقة", "نفط", "البحر الأحمر"
    ])) {
      return "geo-economics";
    }

    if (keywordHit(text, [
      "humanitarian", "civilian", "aid", "displacement", "hospital",
      "إنساني", "مدني", "مساعدات", "نزوح", "مستشفى"
    ])) {
      return "human-security";
    }

    return safeText(signal.domain, "geopolitical");
  }

  function detectRegion(signal) {
    const text = [
      getText(signal.title),
      getText(signal.summary),
      getText(signal.description),
      signal.region,
      signal.country
    ].join(" ");

    if (keywordHit(text, ["gaza", "غزة"])) return "gaza";
    if (keywordHit(text, ["west bank", "الضفة"])) return "westbank";
    if (keywordHit(text, ["lebanon", "لبنان"])) return "lebanon";
    if (keywordHit(text, ["iran", "إيران", "ايران"])) return "iran";
    if (keywordHit(text, ["red sea", "البحر الأحمر"])) return "redsea";
    if (keywordHit(text, ["yemen", "اليمن"])) return "yemen";
    if (keywordHit(text, ["syria", "سوريا"])) return "syria";

    return safeText(signal.region || signal.country, "global");
  }

  function computeSeverity(signal) {
    const text = [
      getText(signal.title),
      getText(signal.summary),
      getText(signal.description)
    ].join(" ");

    let score = 0;

    score += safeNumber(signal.score100 ?? signal.balancedScore100, 45) * 0.45;

    const priority = normalizePriority(signal.priority);
    if (priority === "HIGH") score += 22;
    else if (priority === "MEDIUM") score += 12;
    else score += 5;

    if (keywordHit(text, ["collapse", "breakdown", "war", "strike", "attack", "انهيار", "حرب", "قصف", "هجوم"])) {
      score += 18;
    }

    if (keywordHit(text, ["negotiation", "ceasefire", "governance", "humanitarian", "تفاوض", "هدنة", "حوكمة", "إنساني"])) {
      score += 9;
    }

    score += safeNumber(signal.reliabilityScore, 65) * 0.08;
    score += safeNumber(signal.freshnessScore, 0.6) * 8;

    return clamp(Math.round(score), 0, 100);
  }

  function classifyBand(score) {
    const value = safeNumber(score, 0);

    if (value >= CONFIG.criticalThreshold) {
      return {
        code: "CRITICAL",
        en: "Critical",
        ar: "حرج"
      };
    }

    if (value >= CONFIG.escalationThreshold) {
      return {
        code: "ESCALATION",
        en: "Escalation",
        ar: "تصعيد"
      };
    }

    if (value >= 55) {
      return {
        code: "PRESSURE",
        en: "Pressure",
        ar: "ضغط"
      };
    }

    if (value >= 35) {
      return {
        code: "WATCH",
        en: "Watch",
        ar: "مراقبة"
      };
    }

    return {
      code: "LOW",
      en: "Low",
      ar: "منخفض"
    };
  }

  function classifyPathway(signal, domain, severity) {
    const text = [
      getText(signal.title),
      getText(signal.summary),
      getText(signal.description)
    ].join(" ");

    if (domain === "geo-security") {
      if (severity >= 80) return "Escalation Pathway";
      if (keywordHit(text, ["negotiation", "ceasefire", "هدنة", "تفاوض"])) return "Negotiation Pressure Pathway";
      return "Security Pressure Pathway";
    }

    if (domain === "geo-governance") {
      if (keywordHit(text, ["fragmentation", "administration", "node", "تفكك", "إدارة", "عقدة"])) {
        return "Fragmented Governance Pathway";
      }

      return "Governance Stress Pathway";
    }

    if (domain === "geo-economics") {
      if (keywordHit(text, ["shipping", "trade", "supply", "شحن", "تجارة", "إمداد"])) {
        return "Trade Disruption Pathway";
      }

      return "Economic Pressure Pathway";
    }

    if (domain === "human-security") {
      return "Humanitarian Compression Pathway";
    }

    return "General Strategic Watch Pathway";
  }

  function computeEscalationProbability(severity, signal) {
    let value = severity * 0.72;

    const priority = normalizePriority(signal.priority);
    if (priority === "HIGH") value += 12;
    if (priority === "MEDIUM") value += 6;

    const text = [
      getText(signal.title),
      getText(signal.description)
    ].join(" ");

    if (keywordHit(text, ["collapse", "breakdown", "war", "strike", "انهيار", "حرب", "قصف"])) {
      value += 10;
    }

    return clamp(Math.round(value), 0, 100);
  }

  function normalizeSignal(signal, index = 0) {
    const domain = detectDomain(signal);
    const region = detectRegion(signal);
    const severity = computeSeverity(signal);
    const band = classifyBand(severity);
    const pathway = classifyPathway(signal, domain, severity);
    const escalationProbability = computeEscalationProbability(severity, signal);

    return {
      id: safeText(signal.id, `L3-SIG-${index + 1}`),

      title: signal.title || {
        en: "Untitled Signal",
        ar: "إشارة غير معنونة"
      },

      summary: signal.summary || signal.description || {
        en: "No summary available.",
        ar: "لا يوجد ملخص."
      },

      description: signal.description || signal.summary || {
        en: "No description available.",
        ar: "لا يوجد وصف."
      },

      region,
      country: safeText(signal.country || region, region),
      domain,

      originalPriority: normalizePriority(signal.priority),
      priority: severity >= 70 ? "HIGH" : severity >= 45 ? "MEDIUM" : "LOW",

      score100: severity,
      balancedScore100: severity,
      severityScore: severity,
      escalationProbability,

      l3: {
        active: severity >= CONFIG.minActivationScore,
        layer: "L3",
        band,
        pathway,
        domain,
        region,
        severityScore: severity,
        escalationProbability,
        interpretation: buildInterpretation(signal, severity, band, pathway)
      },

      reliabilityScore: clamp(safeNumber(signal.reliabilityScore, 65), 0, 100),
      freshnessScore: clamp(safeNumber(signal.freshnessScore, 0.65), 0, 1),

      timestamp: signal.timestamp || signal.publishedAt || new Date().toISOString(),
      source: safeText(signal.source, "IBSS_L3"),
      sourceUnit: safeText(signal.sourceUnit, "L3"),

      signalType: signal.signalType || {
        en: domain,
        ar: domain
      },

      decisionMode: signal.decisionMode || {
        en: severity >= 70 ? "Heightened Monitoring" : "Monitoring",
        ar: severity >= 70 ? "مراقبة مرتفعة" : "مراقبة"
      },

      layer: "L3",
      raw: signal
    };
  }

  function buildInterpretation(signal, severity, band, pathway) {
    const titleEn = getText(signal.title, "en") || "Current signal";
    const titleAr = getText(signal.title, "ar") || titleEn;

    return {
      en:
        `${titleEn} is classified at L3 as ${band.en}. ` +
        `The active pathway is ${pathway}, with escalation probability ${computeEscalationProbability(severity, signal)}%.`,

      ar:
        `تم تصنيف ${titleAr} في L3 ضمن حزمة ${band.ar}. ` +
        `المسار النشط هو ${pathway} مع احتمالية تصعيد ${computeEscalationProbability(severity, signal)}%.`
    };
  }

  function classifySignals(signals = []) {
    return asArray(signals)
      .map(normalizeSignal)
      .filter(signal => signal.l3.active)
      .sort((a, b) => safeNumber(b.balancedScore100, 0) - safeNumber(a.balancedScore100, 0));
  }

  function buildL3State(signals = []) {
    const ranked = classifySignals(signals);
    const topSignal = ranked[0] || null;

    const avgSeverity = ranked.length
      ? Math.round(ranked.reduce((sum, item) => sum + item.severityScore, 0) / ranked.length)
      : 0;

    const maxEscalation = ranked.length
      ? Math.max(...ranked.map(item => item.escalationProbability))
      : 0;

    const highCount = ranked.filter(item => item.priority === "HIGH").length;
    const mediumCount = ranked.filter(item => item.priority === "MEDIUM").length;

    const l3Pressure = clamp(
      Math.round((avgSeverity * 0.55) + (maxEscalation * 0.30) + (highCount * 6) + (mediumCount * 3)),
      0,
      100
    );

    return {
      layer: "L3",
      version: CONFIG.version,
      updatedAt: new Date().toISOString(),
      activeSignals: ranked.length,
      highCount,
      mediumCount,
      l3Pressure,
      topSignal,
      rankedSignals: ranked,
      band: classifyBand(l3Pressure)
    };
  }

  function enrichSystem(system) {
    const sourceSignals = asArray(
      system?.rankedSignals ||
      window.IBSS_INGESTION?.getAllNormalized?.() ||
      window.IBSS_SIGNALS ||
      []
    );

    const l3State = buildL3State(sourceSignals);

    if (!l3State.rankedSignals.length) {
      return {
        ...system,
        l3: l3State
      };
    }

    return {
      ...system,
      l3: l3State,
      rankedSignals: l3State.rankedSignals,
      topSignal: l3State.topSignal || system?.topSignal || null,
      dominantSignal: l3State.topSignal || system?.dominantSignal || null,
      signalPressure: Math.max(safeNumber(system?.signalPressure, 0), l3State.l3Pressure),
      systemPressure: Math.max(safeNumber(system?.systemPressure, 0), l3State.l3Pressure),
      ssi: Math.max(safeNumber(system?.ssi, 0), l3State.l3Pressure),
      level: l3State.l3Pressure >= 70 ? "HIGH" : l3State.l3Pressure >= 45 ? "MEDIUM" : "LOW",
      metricsReference: "IBSS_L3_ENGINE"
    };
  }

  return {
    CONFIG,
    normalizeSignal,
    classifySignals,
    buildL3State,
    enrichSystem,
    classifyBand
  };
})();
