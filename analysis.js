window.IBSS_ANALYSIS = (function () {
  "use strict";

  const CONFIG = {
    signalThreshold: 45,
    structuralThreshold: 70,
    patternThreshold: 3,
    maxSignals: 200
  };

  const STATE = {
    analyzed: [],
    grouped: [],
    lastUpdate: null
  };

  function now() {
    return new Date().toISOString();
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function safeText(value, fallback = "") {
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
  }

  function normalizeText(value) {
    return safeText(String(value || ""))
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function generateId(prefix = "SIG") {
    return prefix + "-" + Math.random().toString(36).slice(2, 10);
  }

  function titleCase(text) {
    return safeText(text)
      .split(" ")
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  function localizeText(enText, arText) {
    return {
      en: enText,
      ar: arText || enText
    };
  }

  function getLocalizedNewsField(item, field) {
    if (!item || !item[field]) return "";
    const value = item[field];
    if (typeof value === "string") return value;
    return value.en || value.ar || "";
  }

  function getSourceWeight(item) {
    const sourceProfile = item?.sourceProfile || null;
    if (!sourceProfile) return 0.4;

    const reliabilityScore = Number(sourceProfile.reliabilityScore || 40);
    return clamp(reliabilityScore / 100, 0.2, 1);
  }

  function detectDomain(item) {
    const domains = asArray(item?.domains);
    if (domains.length) return domains[0];

    const text = (
      getLocalizedNewsField(item, "title") +
      " " +
      getLocalizedNewsField(item, "summary")
    ).toLowerCase();

    if (text.includes("military") || text.includes("strike") || text.includes("army")) return "military";
    if (text.includes("diplomatic") || text.includes("talk") || text.includes("negotiation")) return "diplomatic";
    if (text.includes("economic") || text.includes("market") || text.includes("oil")) return "economic";
    if (text.includes("maritime") || text.includes("shipping") || text.includes("sea")) return "maritime";
    return "geopolitical";
  }

  function detectSignalType(item) {
    const domain = detectDomain(item);
    const severity = Number(item?.severity || 0);

    if (domain === "military") return localizeText("Military", "عسكري");
    if (domain === "diplomatic") return localizeText("Diplomatic", "دبلوماسي");
    if (domain === "economic") return localizeText("Economic", "اقتصادي");
    if (domain === "maritime") return localizeText("Maritime", "بحري");
    if (severity >= CONFIG.structuralThreshold) return localizeText("Structural", "بنيوي");

    return localizeText("Geopolitical", "جيوسياسي");
  }

  function detectInfluenceBand(item) {
    const severity = Number(item?.severity || 0);
    const confidence = Number(item?.confidence || 0);

    if (severity >= 80 && confidence >= 75) {
      return localizeText("Strategic Core", "النطاق الاستراتيجي");
    }

    if (severity >= 60 && confidence >= 60) {
      return localizeText("Active Pressure", "نطاق الضغط النشط");
    }

    if (severity >= 45) {
      return localizeText("Observation Band", "نطاق المراقبة");
    }

    return localizeText("Peripheral", "نطاق هامشي");
  }

  function detectDecisionMode(item) {
    const severity = Number(item?.severity || 0);
    const confidence = Number(item?.confidence || 0);

    if (severity >= 85 && confidence >= 70) {
      return localizeText("ACTIVE RESPONSE", "استجابة نشطة");
    }

    if (severity >= 60) {
      return localizeText("PREPARATION", "تحضير");
    }

    return localizeText("MONITORING", "مراقبة");
  }

  function detectLayer(item) {
    const severity = Number(item?.severity || 0);
    const domain = detectDomain(item);

    if (severity >= 80) return localizeText("Structural Layer", "الطبقة البنيوية");
    if (domain === "military") return localizeText("Military Layer", "الطبقة العسكرية");
    if (domain === "diplomatic") return localizeText("Diplomatic Layer", "الطبقة الدبلوماسية");
    if (domain === "economic") return localizeText("Economic Layer", "الطبقة الاقتصادية");

    return localizeText("Signal Layer", "طبقة الإشارة");
  }

  function detectPriority(score) {
    if (score >= 75) return "HIGH";
    if (score >= 55) return "MEDIUM";
    return "LOW";
  }

  function detectRegion(item) {
    return safeText(item?.region, "global");
  }

  function detectCountry(item) {
    if (safeText(item?.country)) return safeText(item.country);

    const tags = asArray(item?.tags).map(normalizeText);
    if (tags.includes("gaza")) return "gaza";
    if (tags.includes("lebanon")) return "lebanon";
    if (tags.includes("iran")) return "iran";
    if (tags.includes("red sea")) return "redsea";
    if (tags.includes("west bank")) return "westbank";

    return safeText(item?.region, "global");
  }

  function buildTitle(item, score) {
    const title = getLocalizedNewsField(item, "title");
    if (title) {
      return {
        en: title,
        ar: item?.title?.ar || title
      };
    }

    const country = detectCountry(item);
    const domain = detectDomain(item);
    const label = titleCase(country + " " + domain + " signal");

    return {
      en: label,
      ar: label
    };
  }

  function buildDescription(item, score) {
    const summary = getLocalizedNewsField(item, "summary");
    if (summary) {
      return {
        en: item?.summary?.en || summary,
        ar: item?.summary?.ar || summary
      };
    }

    const mode = detectDecisionMode(item);
    return {
      en: `Analytical signal generated with score ${score} under ${mode.en}.`,
      ar: `تم توليد إشارة تحليلية بدرجة ${score} ضمن وضع ${mode.ar}.`
    };
  }

  function scoreAnalyzedItem(item) {
    const severity = Number(item?.severity || 0) / 100;
    const confidence = Number(item?.confidence || 0) / 100;
    const sourceWeight = getSourceWeight(item);

    const score =
      (severity * 0.50) +
      (confidence * 0.25) +
      (sourceWeight * 0.25);

    return Math.round(clamp(score * 100, 0, 100));
  }

  function analyzeNewsItem(item) {
    const score = scoreAnalyzedItem(item);
    const priority = detectPriority(score);
    const signalType = detectSignalType(item);
    const influenceBand = detectInfluenceBand(item);
    const decisionMode = detectDecisionMode(item);
    const layer = detectLayer(item);
    const region = detectRegion(item);
    const country = detectCountry(item);
    const title = buildTitle(item, score);
    const description = buildDescription(item, score);

    return {
      id: generateId(),
      sourceNewsId: item.id || null,
      source: item.source || "UNKNOWN",
      sourceProfile: item.sourceProfile || null,
      title,
      description,
      signalType,
      influenceBand,
      decisionMode,
      layer,
      priority,
      score100: score,
      balancedScore100: score,
      severity: Number(item?.severity || 0),
      confidence: Number(item?.confidence || 0),
      region,
      country,
      domains: asArray(item?.domains),
      actors: asArray(item?.actors),
      tags: asArray(item?.tags),
      live: score >= CONFIG.signalThreshold,
      structural: score >= CONFIG.structuralThreshold,
      timestamp: item.timestamp || now(),
      raw: item
    };
  }

  function buildGroupKey(signal) {
    return [
      normalizeText(signal.country),
      normalizeText(signal.region),
      normalizeText(signal.signalType?.en || signal.signalType)
    ].join("|");
  }

  function groupSignals(signals) {
    const map = new Map();

    signals.forEach(signal => {
      const key = buildGroupKey(signal);
      if (!map.has(key)) {
        map.set(key, {
          key,
          country: signal.country,
          region: signal.region,
          signalType: signal.signalType,
          items: [],
          count: 0,
          maxScore: 0,
          avgScore: 0,
          priority: "LOW"
        });
      }

      const group = map.get(key);
      group.items.push(signal);
      group.count += 1;
      group.maxScore = Math.max(group.maxScore, Number(signal.balancedScore100 || 0));
    });

    const grouped = [...map.values()].map(group => {
      const total = group.items.reduce((sum, item) => sum + Number(item.balancedScore100 || 0), 0);
      const avg = group.items.length ? Math.round(total / group.items.length) : 0;

      return {
        ...group,
        avgScore: avg,
        priority: detectPriority(group.maxScore),
        patternDetected: group.count >= CONFIG.patternThreshold
      };
    });

    return grouped.sort((a, b) => b.maxScore - a.maxScore);
  }

  function ingestFromNormalization() {
    if (!window.IBSS_INGESTION || typeof window.IBSS_INGESTION.getAllNormalized !== "function") {
      return [];
    }

    const items = window.IBSS_INGESTION.getAllNormalized();
    const analyzed = items
      .map(analyzeNewsItem)
      .filter(item => Number(item.balancedScore100 || 0) >= CONFIG.signalThreshold)
      .slice(0, CONFIG.maxSignals);

    STATE.analyzed = analyzed;
    STATE.grouped = groupSignals(analyzed);
    STATE.lastUpdate = now();

    return analyzed;
  }

  function analyzeBatch(newsItems) {
    if (!window.IBSS_INGESTION || typeof window.IBSS_INGESTION.ingestBatch !== "function") {
      return [];
    }

    window.IBSS_INGESTION.ingestBatch(newsItems);
    return ingestFromNormalization();
  }

  function getSignals() {
    return [...STATE.analyzed].sort((a, b) => b.balancedScore100 - a.balancedScore100);
  }

  function getGroupedSignals() {
    return [...STATE.grouped];
  }

  function getTopSignals(limit = 10) {
    return getSignals().slice(0, Math.max(1, Number(limit) || 10));
  }

  function getTopGrouped(limit = 5) {
    return getGroupedSignals().slice(0, Math.max(1, Number(limit) || 5));
  }

  function getSignalsByCountry(country) {
    const target = normalizeText(country);
    return getSignals().filter(item => normalizeText(item.country) === target);
  }

  function getSignalsByPriority(priority) {
    const target = normalizeText(priority).toUpperCase();
    return getSignals().filter(item => normalizeText(item.priority).toUpperCase() === target);
  }

  function getAnalysisState() {
    return {
      count: STATE.analyzed.length,
      groupedCount: STATE.grouped.length,
      lastUpdate: STATE.lastUpdate
    };
  }

  function clear() {
    STATE.analyzed = [];
    STATE.grouped = [];
    STATE.lastUpdate = null;
  }

  return {
    CONFIG,
    analyzeNewsItem,
    analyzeBatch,
    ingestFromNormalization,
    getSignals,
    getGroupedSignals,
    getTopSignals,
    getTopGrouped,
    getSignalsByCountry,
    getSignalsByPriority,
    getAnalysisState,
    clear
  };
})();
