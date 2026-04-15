window.IBSS_ANALYSIS = (function () {
  "use strict";

  const CONFIG = {
    signalThreshold: 40,
    structuralThreshold: 72,
    patternThreshold: 3,
    maxSignals: 240,
    maxGroups: 80
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

  function safeNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
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
    return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function localizeText(enText, arText) {
    return {
      en: safeText(enText, "-"),
      ar: safeText(arText, safeText(enText, "-"))
    };
  }

  function getLocalizedField(item, field, lang = "en") {
    if (!item || !item[field]) return "";
    const value = item[field];

    if (typeof value === "string" || typeof value === "number") {
      return String(value);
    }

    return value[lang] || value.en || value.ar || "";
  }

  function normalizePriority(value) {
    const p = String(value || "").toUpperCase().trim();
    if (p === "HIGH") return "HIGH";
    if (p === "MEDIUM") return "MEDIUM";
    return "LOW";
  }

  function detectPriority(score) {
    if (score >= 75) return "HIGH";
    if (score >= 55) return "MEDIUM";
    return "LOW";
  }

  function detectSourceWeight(item) {
    const sourceProfile = item?.sourceProfile || null;

    if (sourceProfile) {
      const reliabilityScore = safeNumber(sourceProfile.reliabilityScore, 50);
      return clamp(reliabilityScore / 100, 0.25, 1);
    }

    const source = normalizeText(item?.source);
    if (source.includes("reuters") || source.includes("ap") || source.includes("bloomberg")) return 0.82;
    if (source.includes("al jazeera")) return 0.74;
    if (source.includes("monitor") || source.includes("watch")) return 0.62;
    if (source.includes("local")) return 0.54;

    return 0.58;
  }

  function detectDomain(item) {
    const directDomain = normalizeText(item?.domain || item?.category || item?.topic);
    if (directDomain) return directDomain;

    const text = [
      getLocalizedField(item, "title", "en"),
      getLocalizedField(item, "summary", "en"),
      safeText(item?.region),
      safeText(item?.country)
    ].join(" ").toLowerCase();

    if (text.includes("military") || text.includes("strike") || text.includes("front") || text.includes("army")) return "military";
    if (text.includes("security") || text.includes("raid") || text.includes("attack")) return "security";
    if (text.includes("diplomatic") || text.includes("talk") || text.includes("negotiation")) return "diplomatic";
    if (text.includes("economic") || text.includes("market") || text.includes("oil") || text.includes("trade")) return "economic";
    if (text.includes("maritime") || text.includes("shipping") || text.includes("sea") || text.includes("red sea")) return "maritime";
    if (text.includes("energy") || text.includes("gas")) return "energy";
    if (text.includes("logistics") || text.includes("supply")) return "logistics";

    return "geopolitical";
  }

  function detectSignalType(domain, score) {
    if (domain === "military") return localizeText("MILITARY", "عسكري");
    if (domain === "security") return localizeText("SECURITY", "أمني");
    if (domain === "diplomatic") return localizeText("DIPLOMATIC", "دبلوماسي");
    if (domain === "economic") return localizeText("ECONOMIC", "اقتصادي");
    if (domain === "maritime") return localizeText("MARITIME", "بحري");
    if (domain === "energy") return localizeText("ENERGY", "طاقي");
    if (domain === "logistics") return localizeText("LOGISTICS", "لوجستي");
    if (score >= CONFIG.structuralThreshold) return localizeText("STRUCTURAL", "بنيوي");
    return localizeText("GEOPOLITICAL", "جيوسياسي");
  }

  function detectInfluenceBand(score) {
    if (score >= 82) return localizeText("CORE", "محوري");
    if (score >= 62) return localizeText("ACTIVE PRESSURE", "ضغط نشط");
    if (score >= 45) return localizeText("SUPPORT", "مساند");
    return localizeText("WATCH", "مراقبة");
  }

  function detectDecisionMode(score) {
    if (score >= 82) return localizeText("ACTIVE RESPONSE", "استجابة نشطة");
    if (score >= 60) return localizeText("PREPARATION", "تحضير");
    return localizeText("MONITORING", "مراقبة");
  }

  function detectLayer(domain, score) {
    if (score >= 82) return localizeText("Structural Layer", "الطبقة البنيوية");
    if (domain === "military") return localizeText("Military Layer", "الطبقة العسكرية");
    if (domain === "security") return localizeText("Security Layer", "الطبقة الأمنية");
    if (domain === "diplomatic") return localizeText("Diplomatic Layer", "الطبقة الدبلوماسية");
    if (domain === "economic") return localizeText("Economic Layer", "الطبقة الاقتصادية");
    if (domain === "maritime") return localizeText("Maritime Layer", "الطبقة البحرية");
    return localizeText("Signal Layer", "طبقة الإشارة");
  }

  function detectRegion(item) {
    return safeText(item?.region, safeText(item?.country, "global"));
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

  function buildTitle(item, domain) {
    const titleEn = getLocalizedField(item, "title", "en");
    const titleAr = getLocalizedField(item, "title", "ar");

    if (titleEn || titleAr) {
      return {
        en: titleEn || titleAr || "Signal",
        ar: titleAr || titleEn || "إشارة"
      };
    }

    const country = detectCountry(item);
    return {
      en: `${country} ${domain} signal`,
      ar: `${country} ${domain} signal`
    };
  }

  function buildDescription(item, score, mode) {
    const summaryEn = getLocalizedField(item, "summary", "en");
    const summaryAr = getLocalizedField(item, "summary", "ar");

    if (summaryEn || summaryAr) {
      return {
        en: summaryEn || summaryAr || `Analytical signal score ${score}.`,
        ar: summaryAr || summaryEn || `إشارة تحليلية بدرجة ${score}.`
      };
    }

    return {
      en: `Analytical signal generated with score ${score} under ${mode.en}.`,
      ar: `تم توليد إشارة تحليلية بدرجة ${score} ضمن وضع ${mode.ar}.`
    };
  }

  function buildMetrics(item) {
    const impact = clamp(safeNumber(item?.impact, 4) / 10, 0, 1);
    const confidence = clamp(safeNumber(item?.confidence, 4) / 10, 0, 1);
    const urgency = clamp(safeNumber(item?.urgency, 4) / 10, 0, 1);

    return {
      weight: impact,
      volatility: urgency,
      impact: confidence
    };
  }

  function scoreAnalyzedItem(item) {
    const impact = safeNumber(item?.impact, 4) / 10;
    const confidence = safeNumber(item?.confidence, 4) / 10;
    const urgency = safeNumber(item?.urgency, 4) / 10;
    const persistence = safeNumber(item?.persistence, 5) / 10;
    const spread = safeNumber(item?.spread, 5) / 10;
    const sourceWeight = detectSourceWeight(item);

    let weightedComposite = 0.0;

    if (window.IBSS_WEIGHTS && typeof window.IBSS_WEIGHTS.applyWeights === "function") {
      const weighted = window.IBSS_WEIGHTS.applyWeights({
        domain: detectDomain(item),
        impact: safeNumber(item?.impact, 4),
        confidence: safeNumber(item?.confidence, 4),
        urgency: safeNumber(item?.urgency, 4),
        persistence: safeNumber(item?.persistence, 5),
        spread: safeNumber(item?.spread, 5)
      });

      weightedComposite = clamp(safeNumber(weighted?.composite, 4) / 10, 0, 1);
    } else {
      weightedComposite =
        (impact * 0.30) +
        (confidence * 0.20) +
        (urgency * 0.22) +
        (persistence * 0.15) +
        (spread * 0.13);
    }

    const finalScore =
      (weightedComposite * 0.78) +
      (sourceWeight * 0.22);

    return Math.round(clamp(finalScore * 100, 0, 100));
  }

  function normalizeNewsInput(item, index = 0) {
    return {
      id: item?.id || `RAW-${index + 1}`,
      source: safeText(item?.source, "UNKNOWN"),
      title: {
        en: getLocalizedField(item, "title", "en"),
        ar: getLocalizedField(item, "title", "ar")
      },
      summary: {
        en: getLocalizedField(item, "summary", "en"),
        ar: getLocalizedField(item, "summary", "ar")
      },
      domain: detectDomain(item),
      region: detectRegion(item),
      country: detectCountry(item),
      priority: normalizePriority(item?.priority || item?.severity),
      severity: safeNumber(item?.severity, normalizePriority(item?.priority) === "HIGH" ? 80 : normalizePriority(item?.priority) === "MEDIUM" ? 60 : 35),
      confidence: safeNumber(item?.confidence, 5),
      impact: safeNumber(item?.impact, 4),
      urgency: safeNumber(item?.urgency, 4),
      persistence: safeNumber(item?.persistence, 5),
      spread: safeNumber(item?.spread, 5),
      tags: asArray(item?.tags),
      actors: asArray(item?.actors),
      timestamp: item?.timestamp || item?.publishedAt || now(),
      url: safeText(item?.url, "#"),
      raw: item
    };
  }

  function analyzeNewsItem(item, index = 0) {
    const normalized = normalizeNewsInput(item, index);
    const score = scoreAnalyzedItem(normalized);
    const priority = detectPriority(score);
    const signalType = detectSignalType(normalized.domain, score);
    const influenceBand = detectInfluenceBand(score);
    const decisionMode = detectDecisionMode(score);
    const layer = detectLayer(normalized.domain, score);
    const title = buildTitle(normalized, normalized.domain);
    const description = buildDescription(normalized, score, decisionMode);

    return {
      id: generateId(),
      sourceNewsId: normalized.id || null,
      source: normalized.source,
      title,
      description,
      signalType,
      influenceBand,
      decisionMode,
      layer,
      priority,
      score100: score,
      balancedScore100: score,
      severity: normalized.severity,
      confidence: normalized.confidence,
      impact: normalized.impact,
      urgency: normalized.urgency,
      persistence: normalized.persistence,
      spread: normalized.spread,
      region: normalized.region,
      country: normalized.country,
      domain: normalized.domain,
      domains: [normalized.domain],
      actors: normalized.actors,
      tags: normalized.tags,
      live: score >= CONFIG.signalThreshold,
      structural: score >= CONFIG.structuralThreshold,
      timestamp: normalized.timestamp || now(),
      link: normalized.url || "#",
      active: true,
      metrics: buildMetrics(normalized),
      raw: normalized.raw
    };
  }

  function buildGroupKey(signal) {
    return [
      normalizeText(signal.country),
      normalizeText(signal.region),
      normalizeText(signal.domain || signal.signalType?.en || signal.signalType)
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
          domain: signal.domain,
          signalType: signal.signalType,
          items: [],
          count: 0,
          maxScore: 0,
          avgScore: 0,
          priority: "LOW",
          patternDetected: false
        });
      }

      const group = map.get(key);
      group.items.push(signal);
      group.count += 1;
      group.maxScore = Math.max(group.maxScore, safeNumber(signal.balancedScore100, 0));
    });

    const grouped = [...map.values()].map(group => {
      const total = group.items.reduce((sum, item) => sum + safeNumber(item.balancedScore100, 0), 0);
      const avg = group.items.length ? Math.round(total / group.items.length) : 0;

      return {
        ...group,
        avgScore: avg,
        priority: detectPriority(group.maxScore),
        patternDetected: group.count >= CONFIG.patternThreshold
      };
    });

    return grouped
      .sort((a, b) => b.maxScore - a.maxScore)
      .slice(0, CONFIG.maxGroups);
  }

  function readNewsFromPipeline() {
    if (window.IBSS_NEWS_UTILS && typeof window.IBSS_NEWS_UTILS.getAllNews === "function") {
      return asArray(window.IBSS_NEWS_UTILS.getAllNews());
    }

    if (window.IBSS_INGESTION && typeof window.IBSS_INGESTION.getAllNormalized === "function") {
      return asArray(window.IBSS_INGESTION.getAllNormalized());
    }

    return asArray(window.IBSS_NEWS);
  }

  function ingestFromNormalization() {
    const items = readNewsFromPipeline();

    const analyzed = items
      .map((item, index) => analyzeNewsItem(item, index))
      .filter(item => safeNumber(item.balancedScore100, 0) >= CONFIG.signalThreshold)
      .sort((a, b) => safeNumber(b.balancedScore100, 0) - safeNumber(a.balancedScore100, 0))
      .slice(0, CONFIG.maxSignals);

    STATE.analyzed = analyzed;
    STATE.grouped = groupSignals(analyzed);
    STATE.lastUpdate = now();

    return analyzed;
  }

  function analyzeBatch(newsItems) {
    const analyzed = asArray(newsItems)
      .map((item, index) => analyzeNewsItem(item, index))
      .filter(item => safeNumber(item.balancedScore100, 0) >= CONFIG.signalThreshold)
      .sort((a, b) => safeNumber(b.balancedScore100, 0) - safeNumber(a.balancedScore100, 0))
      .slice(0, CONFIG.maxSignals);

    STATE.analyzed = analyzed;
    STATE.grouped = groupSignals(analyzed);
    STATE.lastUpdate = now();

    return analyzed;
  }

  function getSignals() {
    return [...STATE.analyzed].sort((a, b) => safeNumber(b.balancedScore100, 0) - safeNumber(a.balancedScore100, 0));
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
