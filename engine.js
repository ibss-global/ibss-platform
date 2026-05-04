// IBSS ENGINE CORE — Adaptive Living Presence Full Rebuild
// Version: v3.3 Sovereign Doctrine Integrated + L3 Integrated
// Clean Full Replacement for engine.js

window.IBSS_ENGINE = (function () {
  "use strict";

  const CONFIG = {
    refreshMs: 4000,
    historyLimit: 180,
    reportLimit: 80,
    archiveLimit: 120,
    storageKey: "ibss_engine_state_v33_doctrine_l3_integrated",
    minLiveSignalScore: 40,
    scenarioHighThreshold: 85,
    scenarioPrepThreshold: 70,
    maxFeedItems: 14,
    maxCountryRiskItems: 5,
    maxDrivers: 5,
    memoryWindow: 8,
    pressureJumpThreshold: 6,
    pressureDropThreshold: 6,
    strainPersistenceThreshold: 4
  };

  const STATE = {
    history: [],
    reports: [],
    archive: [],
    lastSystem: null
  };

  const DOCTRINE = {
    SERIES: {
      BLACK_BOX: {
        id: "BLACK_BOX",
        layer: "BLACK_DOCTRINE",
        name: { en: "Black Box", ar: "الصندوق الأسود" },
        question: {
          en: "Who inserted the decision into the system?",
          ar: "من أدخل القرار إلى النظام؟"
        },
        keywords: [
          "unknown source", "hidden actor", "unexplained decision", "decision source",
          "مصدر مجهول", "فاعل غير ظاهر", "قرار غير مفسر", "من أدخل القرار"
        ]
      },
      INVISIBLE_INK: {
        id: "INVISIBLE_INK",
        layer: "BLACK_DOCTRINE",
        name: { en: "Invisible Ink", ar: "الحبر السري" },
        question: {
          en: "What is written but not read?",
          ar: "ماذا كُتب… لكن لم يُقرأ؟"
        },
        keywords: [
          "statement", "proposal", "message", "unacceptable", "acceptable", "victory", "failure",
          "تصريح", "مقترح", "رسالة", "غير مقبول", "مقبول", "نصر", "فشل", "قال"
        ]
      },
      SHOCK_ARCHITECTURE: {
        id: "SHOCK_ARCHITECTURE",
        layer: "BLACK_DOCTRINE",
        name: { en: "Shock Architecture", ar: "الصدمة" },
        question: {
          en: "Is the shock a result or a tool?",
          ar: "هل الصدمة نتيجة… أم أداة؟"
        },
        keywords: [
          "attack", "explosion", "assassination", "urgent", "killed", "strike",
          "هجوم", "انفجار", "اغتيال", "عاجل", "قتل", "ضربة", "صدمة"
        ]
      },
      BEHIND_CURTAIN: {
        id: "BEHIND_CURTAIN",
        layer: "BLACK_DOCTRINE",
        name: { en: "Behind the Curtain", ar: "ما وراء الستار" },
        question: {
          en: "Who wants this information to be known now?",
          ar: "من يريدك أن تعرف هذا الآن؟"
        },
        keywords: [
          "channel", "source", "officials", "senior official", "according to", "leak", "axios",
          "القناة", "مصدر", "مسؤولون", "مسؤول رفيع", "بحسب", "تسريب", "أكسيوس", "كان", "العبرية"
        ]
      },
      BEYOND_WALL: {
        id: "BEYOND_WALL",
        layer: "BLACK_DOCTRINE",
        name: { en: "Beyond the Wall", ar: "خلف الجدار" },
        question: {
          en: "What is structurally forming before it appears?",
          ar: "ماذا يتشكل… قبل أن يظهر؟"
        },
        keywords: [
          "scenario", "trajectory", "future", "structural", "forecast", "trend",
          "سيناريو", "مسار", "استشراف", "بنيوي", "اتجاه", "توقع", "خلف الجدار"
        ]
      },
      BLACK_GATE: {
        id: "BLACK_GATE",
        layer: "BLACK_DOCTRINE",
        name: { en: "Black Gate", ar: "البوابة السوداء" },
        question: {
          en: "Is the system transitioning from deterrence to action?",
          ar: "هل بدأت البوابة تُفتح؟"
        },
        keywords: [
          "deployment", "troops", "missiles", "dark eagle", "centcom", "readiness", "military movement",
          "نشر", "قوات", "صواريخ", "دارك إيغل", "سنتكوم", "جاهزية", "تحشيد", "ألوية", "البوابة"
        ]
      },
      TEMPORAL_WARFARE: {
        id: "TEMPORAL_WARFARE",
        layer: "CONFLICT_SYSTEMS",
        name: { en: "Temporal Warfare", ar: "الحرب الزمنية" },
        question: {
          en: "Who gains time and who is consumed by it?",
          ar: "من يربح الوقت… ومن يُستهلك به؟"
        },
        keywords: [
          "ceasefire", "delay", "phase", "gradual", "30 days", "timeline",
          "وقف إطلاق", "تأجيل", "مرحلة", "تدريجي", "الوقت", "زمني"
        ]
      },
      WAAD: {
        id: "WAAD",
        layer: "CONFLICT_SYSTEMS",
        name: { en: "War Acceptance Architecture", ar: "هندسة قبول الحرب" },
        question: {
          en: "Is war being prepared, or are people being prepared for it?",
          ar: "هل يتم تحضير الحرب… أم تحضير الناس لها؟"
        },
        keywords: [
          "prepare public", "war time", "public opinion", "war acceptance",
          "تهيئة", "زمن حرب", "الجمهور", "الرأي العام", "قبول الحرب"
        ]
      },
      INFORMATION_WARFARE: {
        id: "INFORMATION_WARFARE",
        layer: "CONFLICT_SYSTEMS",
        name: { en: "Information Warfare", ar: "الحرب المعلوماتية" },
        question: {
          en: "Who owns the narrative?",
          ar: "من يملك الرواية؟"
        },
        keywords: [
          "narrative", "media", "image", "claim", "information war",
          "رواية", "إعلام", "صورة", "ادعاء", "سردية", "حرب معلوماتية"
        ]
      },
      STRATEGIC_REFRAMING: {
        id: "STRATEGIC_REFRAMING",
        layer: "CONFLICT_SYSTEMS",
        name: { en: "Strategic Reframing", ar: "إعادة تعريف النصر" },
        question: {
          en: "Did the goal of war change during the war?",
          ar: "هل تغيّر هدف الحرب أثناء الحرب؟"
        },
        keywords: [
          "victory", "failure", "objective", "end goal", "war goal",
          "نصر", "فشل", "هدف", "نهاية الحرب", "معيار النصر"
        ]
      },
      IRAN_NUCLEAR_THRESHOLD: {
        id: "IRAN_NUCLEAR_THRESHOLD",
        layer: "REGIONAL_ENGINES",
        name: { en: "Iran Nuclear Threshold", ar: "إيران — العتبة النووية" },
        question: {
          en: "Is this deterrence or existential prevention?",
          ar: "هل نحن أمام ردع… أم منع وجودي؟"
        },
        keywords: [
          "iran", "nuclear", "uranium", "enrichment", "tehran",
          "إيران", "نووي", "يورانيوم", "تخصيب", "طهران"
        ]
      },
      GAZA_RESTRUCTURING: {
        id: "GAZA_RESTRUCTURING",
        layer: "REGIONAL_ENGINES",
        name: { en: "Gaza Restructuring", ar: "غزة — إعادة التشكيل" },
        question: {
          en: "Who will own Gaza after the war?",
          ar: "من سيملك غزة بعد الحرب؟"
        },
        keywords: [
          "gaza", "yellow line", "civil military", "kiryat gat", "day after",
          "غزة", "الخط الأصفر", "كريات غات", "اليوم التالي", "وقف إطلاق النار"
        ]
      },
      NORTHERN_PRESSURE: {
        id: "NORTHERN_PRESSURE",
        layer: "REGIONAL_ENGINES",
        name: { en: "Northern Pressure", ar: "الجبهة الشمالية" },
        question: {
          en: "Is the pressure controlled or escaping control?",
          ar: "هل الضغط مضبوط… أم يتصاعد؟"
        },
        keywords: [
          "lebanon", "hezbollah", "drone", "north", "northern front",
          "لبنان", "حزب الله", "مسيّرة", "الشمال", "الجبهة الشمالية"
        ]
      },
      REGIONAL_RECONSTRUCTION: {
        id: "REGIONAL_RECONSTRUCTION",
        layer: "REGIONAL_ENGINES",
        name: { en: "Regional Order Reconstruction", ar: "إعادة هندسة المنطقة" },
        question: {
          en: "Is the region being managed or redesigned?",
          ar: "هل المنطقة تُدار… أم يُعاد تصميمها؟"
        },
        keywords: [
          "uae", "centcom", "regional security", "gulf", "middle east order",
          "الإمارات", "سنتكوم", "الأمن الإقليمي", "الخليج", "إعادة هندسة المنطقة"
        ]
      }
    }
  };

  function nowIso() {
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

  function clamp(value, min = 0, max = 100) {
    return Math.max(min, Math.min(max, value));
  }

  function normalizeText(value) {
    return safeText(String(value || ""))
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function titleCase(text) {
    return safeText(text)
      .split(" ")
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  function localize(en, ar) {
    return { en, ar };
  }

  function clone(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      console.error("IBSS_ENGINE clone error:", error);
      return null;
    }
  }

  function getLocalizedText(value, lang = "en") {
    if (!value) return "-";

    if (typeof value === "string" || typeof value === "number") {
      return String(value);
    }

    const localized =
      value?.[lang] ??
      value?.en ??
      value?.ar ??
      value?.name ??
      value?.title ??
      value?.label ??
      value?.text;

    if (typeof localized === "string" || typeof localized === "number") {
      return String(localized);
    }

    return "-";
  }

  function average(list, selector) {
    const arr = asArray(list);
    if (!arr.length) return 0;

    const sum = arr.reduce((acc, item) => {
      return acc + safeNumber(selector(item), 0);
    }, 0);

    return sum / arr.length;
  }

  function dedupeBy(list, keyBuilder) {
    const map = new Map();

    asArray(list).forEach((item, index) => {
      const key = keyBuilder(item, index);
      if (!map.has(key)) {
        map.set(key, item);
      }
    });

    return [...map.values()];
  }

  function buildId(prefix) {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  }

  function normalizePriority(value) {
    const p = String(value || "LOW").toUpperCase().trim();
    if (p === "HIGH") return "HIGH";
    if (p === "MEDIUM") return "MEDIUM";
    return "LOW";
  }

  function priorityWeight(priority) {
    const p = normalizePriority(priority);
    if (p === "HIGH") return 3;
    if (p === "MEDIUM") return 2;
    return 1;
  }

  function inferPriorityFromScore(score100) {
    if (score100 >= 78) return "HIGH";
    if (score100 >= 52) return "MEDIUM";
    return "LOW";
  }

  function normalizeBandCode(score) {
    if (window.IBSS_METRICS?.classifyBand) {
      return window.IBSS_METRICS.classifyBand(score)?.code || "LOW";
    }

    if (score >= 85) return "CRITICAL";
    if (score >= 70) return "HIGH";
    if (score >= 55) return "PRESSURE";
    if (score >= 35) return "WATCH";
    return "LOW";
  }

  function riskLevelFromScore(score) {
    const band = normalizeBandCode(score);
    if (band === "CRITICAL" || band === "HIGH") return "HIGH";
    if (band === "PRESSURE" || band === "WATCH") return "MEDIUM";
    return "LOW";
  }

  function decisionFromSystem(systemPressure, confidenceScore) {
    if (systemPressure >= 90 && confidenceScore >= 78) {
      return { decision: "ACT", mode: "ACTIVE RESPONSE" };
    }

    if (systemPressure >= 78) {
      return { decision: "PRD", mode: "PREPARATION" };
    }

    if (systemPressure >= 55) {
      return { decision: "WATCH+", mode: "HEIGHTENED MONITORING" };
    }

    return { decision: "WATCH", mode: "MONITORING" };
  }

  function sortByScoreDesc(list, selector) {
    return asArray(list)
      .slice()
      .sort((a, b) => safeNumber(selector(b), 0) - safeNumber(selector(a), 0));
  }

  function makeFeedItem(type, priority, en, ar, source = "") {
    return {
      id: buildId("FEED"),
      type: safeText(type, "system"),
      priority: normalizePriority(priority),
      source: safeText(source, ""),
      text: {
        en: safeText(en, "-"),
        ar: safeText(ar, "-")
      },
      createdAt: nowIso()
    };
  }

  function doctrineText(signal) {
    return [
      getLocalizedText(signal?.title, "en"),
      getLocalizedText(signal?.title, "ar"),
      getLocalizedText(signal?.summary, "en"),
      getLocalizedText(signal?.summary, "ar"),
      getLocalizedText(signal?.description, "en"),
      getLocalizedText(signal?.description, "ar"),
      signal?.country,
      signal?.region,
      signal?.domain,
      signal?.source,
      signal?.sourceUnit,
      signal?.signalType,
      signal?.decisionMode,
      signal?.layer,
      JSON.stringify(signal?.raw || {})
    ].filter(Boolean).join(" ");
  }

  function classifyDoctrineSignal(signal) {
    const text = normalizeText(doctrineText(signal));
    const scored = Object.values(DOCTRINE.SERIES)
      .map(series => {
        const score = asArray(series.keywords).reduce((acc, keyword) => {
          return text.includes(normalizeText(keyword)) ? acc + 1 : acc;
        }, 0);

        return { series, score };
      })
      .sort((a, b) => b.score - a.score);

    const primary = scored[0]?.score > 0 ? scored[0].series : DOCTRINE.SERIES.BEYOND_WALL;

    const secondary = scored
      .filter(item => item.score > 0 && item.series.id !== primary.id)
      .slice(0, 4)
      .map(item => item.series);

    const regional =
      primary.layer === "REGIONAL_ENGINES"
        ? primary
        : secondary.find(item => item.layer === "REGIONAL_ENGINES") || null;

    const conflict =
      primary.layer === "CONFLICT_SYSTEMS"
        ? primary
        : secondary.find(item => item.layer === "CONFLICT_SYSTEMS") || null;

    const alertScore = clamp(
      Math.round(((scored[0]?.score || 1) * 18) + (secondary.length * 7)),
      0,
      100
    );

    return {
      primary,
      secondary,
      regional,
      conflict,
      alertScore,
      alertLevel: alertScore >= 70 ? "HIGH" : alertScore >= 40 ? "MEDIUM" : "LOW",
      question: primary.question,
      interpretation: {
        en: `Signal classified under ${primary.name.en}. ${primary.question.en}`,
        ar: `تم تصنيف الإشارة ضمن ${primary.name.ar}. ${primary.question.ar}`
      }
    };
  }

  function summarizeDoctrine(signals) {
    const map = new Map();

    asArray(signals).forEach(signal => {
      const primary = signal?.doctrine?.primary || DOCTRINE.SERIES.BEYOND_WALL;
      const id = primary.id;
      const current = map.get(id) || {
        series: primary,
        count: 0,
        maxAlert: 0,
        avgAlertSum: 0
      };

      current.count += 1;
      current.maxAlert = Math.max(current.maxAlert, safeNumber(signal?.doctrine?.alertScore, 0));
      current.avgAlertSum += safeNumber(signal?.doctrine?.alertScore, 0);

      map.set(id, current);
    });

    const activeSeries = [...map.values()]
      .map(item => ({
        ...item,
        avgAlert: item.count ? Math.round(item.avgAlertSum / item.count) : 0
      }))
      .sort((a, b) => {
        if (b.maxAlert !== a.maxAlert) return b.maxAlert - a.maxAlert;
        return b.count - a.count;
      });

    return {
      activeSeries,
      topSeries: activeSeries[0] || null,
      count: activeSeries.length,
      updatedAt: nowIso()
    };
  }

  function getDataRoot() {
    return window.IBSS_DATA || {};
  }

  function getContent() {
    return asArray(window.IBSS_CONTENT);
  }

  function getCountries() {
    if (window.IBSS_COUNTRIES) return asArray(window.IBSS_COUNTRIES);
    return asArray(getDataRoot().countries);
  }

  function getSeedSignals() {
    if (window.IBSS_SIGNALS) return asArray(window.IBSS_SIGNALS);
    return asArray(getDataRoot().signals);
  }

  function getNewsSeed() {
    if (window.IBSS_NEWS) return asArray(window.IBSS_NEWS);
    return asArray(getDataRoot().newsFeed);
  }

  function getPublishedContent() {
    return getContent().filter(item => item && item.status === "published");
  }

  function getPublishedNewsContent() {
    return getContent().filter(item => item && item.type === "news" && item.status === "published");
  }

  function getContentStats() {
    const content = getContent();

    return {
      total: content.length,
      published: content.filter(item => item?.status === "published").length,
      pending: content.filter(item => item?.status === "pending" || item?.status === "draft").length,
      archived: content.filter(item => item?.status === "archived").length,
      reports: content.filter(item => item?.type === "report").length,
      studies: content.filter(item => item?.type === "study").length,
      briefs: content.filter(item => item?.type === "brief").length,
      news: content.filter(item => item?.type === "news").length,
      policyPapers: content.filter(item => item?.type === "policy_paper").length,
      analyses: content.filter(item => item?.type === "analysis").length,
      models: content.filter(item => item?.type === "model").length
    };
  }

  function getSignalsFromIngestion() {
    try {
      if (window.IBSS_INGESTION?.getAllNormalized) {
        return asArray(window.IBSS_INGESTION.getAllNormalized());
      }
    } catch (error) {
      console.error("IBSS_ENGINE ingestion read error:", error);
    }

    return [];
  }

  function getSignalsFromSeedData() {
    return getSeedSignals().map((item, index) => {
      const directScore = safeNumber(item?.score100, NaN);
      const directBalanced = safeNumber(item?.balancedScore100, NaN);

      const derivedScore = clamp(
        Math.round(
          (safeNumber(item?.metrics?.weight, 0.5) * 35) +
          (safeNumber(item?.metrics?.volatility, 0.5) * 25) +
          (safeNumber(item?.metrics?.impact, 0.5) * 40)
        ),
        0,
        100
      );

      const finalScore = Number.isFinite(directBalanced)
        ? directBalanced
        : Number.isFinite(directScore)
          ? directScore
          : derivedScore;

      return {
        id: safeText(item?.id, `SEED-${index + 1}`),
        title: item?.title || localize("Untitled Signal", "إشارة غير معنونة"),
        summary: item?.summary || item?.report || item?.description || localize("No summary available.", "لا يوجد ملخص."),
        description: item?.description || item?.report || localize("No description available.", "لا يوجد وصف."),
        country: normalizeText(item?.country || item?.countryId || item?.region || "global"),
        region: normalizeText(item?.region || item?.country || "global"),
        domain: normalizeText(
          item?.domain ||
          getLocalizedText(item?.signalType, "en") ||
          getLocalizedText(item?.layer, "en") ||
          "geopolitical"
        ),
        priority: normalizePriority(item?.priority || item?.weight || inferPriorityFromScore(finalScore)),
        score100: finalScore,
        balancedScore100: finalScore,
        reliabilityScore: clamp(safeNumber(item?.reliabilityScore, 72), 0, 100),
        freshnessScore: clamp(safeNumber(item?.freshnessScore, item?.live ? 0.9 : 0.55), 0, 1),
        timestamp: item?.timestamp || nowIso(),
        source: safeText(item?.source, "IBSS_SEED"),
        sourceUnit: safeText(item?.sourceUnit, ""),
        signalType: item?.signalType || null,
        decisionMode: item?.decisionMode || item?.mode || null,
        layer: item?.layer || null,
        influenceBand: item?.influenceBand || null,
        raw: item
      };
    });
  }

  function getFallbackSignalsFromNews() {
    return getNewsSeed().map((item, index) => ({
      id: safeText(item?.id, `NEWS-${index + 1}`),
      title: item?.title || localize("Untitled News Signal", "إشارة خبرية غير معنونة"),
      summary: item?.summary || item?.text || item?.description || localize("No summary available.", "لا يوجد ملخص."),
      description: item?.summary || item?.text || item?.description || localize("No description available.", "لا يوجد وصف."),
      country: normalizeText(item?.country || item?.region || "global"),
      region: normalizeText(item?.region || item?.country || "global"),
      domain: normalizeText(item?.domain || item?.category || "geopolitical"),
      priority: normalizePriority(item?.priority || item?.severity),
      score100: clamp(safeNumber(item?.score100, 50), 0, 100),
      balancedScore100: clamp(safeNumber(item?.balancedScore100, item?.score100 ?? 50), 0, 100),
      reliabilityScore: clamp(safeNumber(item?.reliabilityScore, 60), 0, 100),
      freshnessScore: clamp(safeNumber(item?.freshnessScore, 0.5), 0, 1),
      timestamp: item?.publishedAt || item?.timestamp || nowIso(),
      source: item?.source || item?.sourceName || "NEWS",
      sourceUnit: safeText(item?.sourceUnit, ""),
      signalType: item?.signalType || "news",
      decisionMode: item?.decisionMode || item?.mode || null,
      layer: item?.layer || null,
      influenceBand: item?.influenceBand || null,
      raw: item
    }));
  }
  /* =========================================
     Content API Integration
  ========================================= */

  function getContentAPI() {
    return window.IBSS_CONTENT_API || window.IBSS_CONTENT_UTILS || null;
  }

  function getSafeContentImpact(item) {
    const api = getContentAPI();

    if (api?.computeContentImpact) {
      try {
        return api.computeContentImpact(item) || {};
      } catch (error) {
        console.error("IBSS_ENGINE computeContentImpact error:", error);
      }
    }

    const strategicWeight = clamp(safeNumber(item?.metrics?.strategicWeight, 0), 0, 100);
    const featuredBoost = item?.meta?.featured ? 3 : 0;
    const canonicalBoost = item?.meta?.canonical ? 3 : 0;
    const pinnedBoost = item?.meta?.pinned ? 2 : 0;

    return {
      signalBoost: Math.round((strategicWeight * 0.08) + featuredBoost),
      clusterBoost: Math.round((strategicWeight * 0.06) + canonicalBoost),
      countryBoost: Math.round((strategicWeight * 0.07) + pinnedBoost),
      confidenceBoost: Math.round((strategicWeight * 0.04) + featuredBoost + canonicalBoost)
    };
  }

  function getEngineEligibleContent() {
    const api = getContentAPI();

    if (api?.getEngineEligibleContent) {
      try {
        return asArray(api.getEngineEligibleContent());
      } catch (error) {
        console.error("IBSS_ENGINE getEngineEligibleContent error:", error);
      }
    }

    return getPublishedContent().filter(item =>
      ["study", "report", "analysis", "brief", "policy_paper", "model"].includes(item?.type)
    );
  }

  function getContentCountryAliases(countryIdOrName) {
    if (window.IBSS_UTILS?.getCountryAliases) {
      try {
        return asArray(window.IBSS_UTILS.getCountryAliases(countryIdOrName));
      } catch (error) {
        console.error("IBSS_ENGINE getCountryAliases error:", error);
      }
    }

    const raw = normalizeText(countryIdOrName);
    if (!raw) return [];

    const aliases = new Set([raw]);

    if (raw === "ctr-gaza" || raw === "gaza") {
      aliases.add("ctr-gaza");
      aliases.add("gaza");
      aliases.add("levant");
      aliases.add("palestine");
    }

    if (raw === "ctr-leb" || raw === "lebanon" || raw === "leb") {
      aliases.add("ctr-leb");
      aliases.add("lebanon");
      aliases.add("leb");
      aliases.add("levant");
    }

    if (raw === "ctr-irn" || raw === "iran" || raw === "irn") {
      aliases.add("ctr-irn");
      aliases.add("iran");
      aliases.add("irn");
      aliases.add("regional");
    }

    if (raw === "ctr-rs" || raw === "redsea" || raw === "red sea" || raw === "rs") {
      aliases.add("ctr-rs");
      aliases.add("redsea");
      aliases.add("red sea");
      aliases.add("rs");
      aliases.add("maritime");
    }

    if (raw === "ctr-wb" || raw === "westbank" || raw === "west bank" || raw === "wb") {
      aliases.add("ctr-wb");
      aliases.add("westbank");
      aliases.add("west bank");
      aliases.add("wb");
      aliases.add("palestine");
    }

    return [...aliases];
  }

  function getSignalContentBoost(signal) {
    const api = getContentAPI();
    if (!api || !signal?.id) return 0;

    try {
      const linked = asArray(api.getContentLinkedToSignal?.(signal.id));
      if (!linked.length) return 0;

      return clamp(
        linked.reduce((sum, item) => {
          const impact = getSafeContentImpact(item);
          return sum + safeNumber(impact.signalBoost, 0);
        }, 0),
        0,
        25
      );
    } catch (error) {
      console.error("IBSS_ENGINE signal content boost error:", error);
      return 0;
    }
  }

  function getClusterContentBoost(region, domain) {
    const api = getContentAPI();
    if (!api) return 0;

    const clusterKey = `${normalizeText(region || "global")}::${normalizeText(domain || "general")}`;

    try {
      const linked = asArray(api.getContentLinkedToCluster?.(clusterKey));
      if (!linked.length) return 0;

      return clamp(
        linked.reduce((sum, item) => {
          const impact = getSafeContentImpact(item);
          return sum + safeNumber(impact.clusterBoost, 0);
        }, 0),
        0,
        20
      );
    } catch (error) {
      console.error("IBSS_ENGINE cluster content boost error:", error);
      return 0;
    }
  }

  function getCountryContentBoost(countryIdOrName) {
    const api = getContentAPI();
    if (!api || !countryIdOrName) return 0;

    try {
      const aliases = getContentCountryAliases(countryIdOrName);

      const total = aliases.reduce((sum, alias) => {
        const linked = asArray(api.getContentLinkedToCountry?.(alias));
        if (!linked.length) return sum;

        const localBoost = linked.reduce((inner, item) => {
          const impact = getSafeContentImpact(item);
          return inner + safeNumber(impact.countryBoost, 0);
        }, 0);

        return Math.max(sum, localBoost);
      }, 0);

      return clamp(total, 0, 24);
    } catch (error) {
      console.error("IBSS_ENGINE country content boost error:", error);
      return 0;
    }
  }

  function getSystemContentConfidenceBoost() {
    try {
      const eligible = getEngineEligibleContent();
      if (!eligible.length) return 0;

      const total = eligible.reduce((sum, item) => {
        const impact = getSafeContentImpact(item);
        return sum + safeNumber(impact.confidenceBoost, 0);
      }, 0);

      return clamp(total, 0, 18);
    } catch (error) {
      console.error("IBSS_ENGINE system confidence boost error:", error);
      return 0;
    }
  }

  function getLatestFeaturedContent() {
    const api = getContentAPI();

    try {
      if (api?.getLatestFeaturedContent) {
        const featured = api.getLatestFeaturedContent();
        if (featured) return featured;
      }
    } catch (error) {
      console.error("IBSS_ENGINE latest featured content error:", error);
    }

    const published = getPublishedContent().slice().sort((a, b) =>
      new Date(b?.publishedAt || 0) - new Date(a?.publishedAt || 0)
    );

    const featured = published.find(item => item?.meta?.featured);
    if (featured) return featured;

    const studyLike = published.find(item =>
      ["study", "report", "analysis", "brief", "policy_paper", "model"].includes(item?.type)
    );

    return studyLike || published[0] || null;
  }

  /* =========================================
     Signal Normalization + L3 + Doctrine
  ========================================= */

  function priorityBonus(priority) {
    const p = normalizePriority(priority);
    if (p === "HIGH") return 10;
    if (p === "MEDIUM") return 5;
    return 1;
  }

  function domainBonus(domain) {
    const d = normalizeText(domain);
    if (d.includes("military")) return 6;
    if (d.includes("security")) return 5;
    if (d.includes("geo-security")) return 5;
    if (d.includes("geopolitical")) return 4;
    if (d.includes("maritime")) return 3;
    if (d.includes("energy")) return 3;
    if (d.includes("diplomatic")) return 2;
    if (d.includes("economic")) return 2;
    if (d.includes("governance")) return 4;
    if (d.includes("data")) return 4;
    if (d.includes("technology")) return 4;
    return 3;
  }

  function freshnessBonus(item) {
    const direct = safeNumber(item?.freshnessScore, NaN);

    if (Number.isFinite(direct)) {
      return Math.round(clamp(direct, 0, 1) * 8);
    }

    const ts = new Date(item?.timestamp || 0).getTime();
    if (!ts) return 2;

    const ageHours = (Date.now() - ts) / (1000 * 60 * 60);
    if (ageHours <= 6) return 8;
    if (ageHours <= 18) return 6;
    if (ageHours <= 36) return 4;
    return 2;
  }

  function reliabilityBonus(item) {
    const r = safeNumber(item?.reliabilityScore || item?.sourceProfile?.reliabilityScore, 55);

    if (r >= 85) return 8;
    if (r >= 75) return 6;
    if (r >= 65) return 4;
    if (r >= 55) return 2;
    return 0;
  }

  function normalizeRawSignal(signal, index = 0) {
    const title = signal?.title || localize("Untitled Signal", "إشارة غير معنونة");
    const description = signal?.description || signal?.summary || localize("No summary available.", "لا يوجد ملخص.");
    const country = normalizeText(signal?.country || "global");
    const region = normalizeText(signal?.region || signal?.country || "global");
    const domain = normalizeText(signal?.domain || "geopolitical");
    const reliabilityScore = clamp(safeNumber(signal?.reliabilityScore, 60), 0, 100);
    const freshnessScore = clamp(safeNumber(signal?.freshnessScore, 0.5), 0, 1);
    const baseScore = clamp(safeNumber(signal?.score100, signal?.balancedScore100 ?? 50), 0, 100);

    const preliminaryScore = clamp(
      Math.round(
        (baseScore * 0.72) +
        priorityBonus(signal?.priority) +
        domainBonus(domain) +
        freshnessBonus({ freshnessScore, timestamp: signal?.timestamp }) +
        reliabilityBonus({ reliabilityScore })
      ),
      0,
      100
    );

    const normalized = {
      id: safeText(signal?.id, `SIG-${index + 1}`),
      title,
      summary: signal?.summary || description,
      description,
      country,
      region,
      domain,
      priority: normalizePriority(signal?.priority || inferPriorityFromScore(preliminaryScore)),
      score: preliminaryScore / 100,
      score100: preliminaryScore,
      balancedScore100: preliminaryScore,
      reliabilityScore,
      freshnessScore,
      timestamp: signal?.timestamp || nowIso(),
      source: safeText(signal?.source, "INTAKE"),
      sourceUnit: safeText(signal?.sourceUnit, ""),
      signalType: signal?.signalType || null,
      decisionMode: signal?.decisionMode || signal?.mode || null,
      layer: signal?.layer || null,
      influenceBand: signal?.influenceBand || null,
      live: preliminaryScore >= CONFIG.minLiveSignalScore,
      active: preliminaryScore >= CONFIG.minLiveSignalScore,
      raw: signal
    };

    normalized.doctrine = classifyDoctrineSignal(normalized);

    const doctrineBoost = normalized.doctrine.alertLevel === "HIGH"
      ? 5
      : normalized.doctrine.alertLevel === "MEDIUM"
        ? 3
        : 1;

    const doctrineAdjustedScore = clamp(preliminaryScore + doctrineBoost, 0, 100);

    return {
      ...normalized,
      doctrineBoost,
      score: doctrineAdjustedScore / 100,
      score100: doctrineAdjustedScore,
      balancedScore100: doctrineAdjustedScore,
      priority: normalizePriority(normalized.priority || inferPriorityFromScore(doctrineAdjustedScore)),
      live: doctrineAdjustedScore >= CONFIG.minLiveSignalScore,
      active: doctrineAdjustedScore >= CONFIG.minLiveSignalScore
    };
  }

  function applyL3Layer(signals) {
    if (!window.IBSS_L3_ENGINE?.classifySignals) {
      return {
        l3State: null,
        rankedSignals: signals
      };
    }

    try {
      const l3Ranked = window.IBSS_L3_ENGINE.classifySignals(signals);
      const l3State = window.IBSS_L3_ENGINE.buildL3State(signals);

      if (!l3Ranked.length) {
        return {
          l3State,
          rankedSignals: signals
        };
      }

      const reclassified = l3Ranked.map(signal => ({
        ...signal,
        doctrine: signal.doctrine || classifyDoctrineSignal(signal)
      }));

      return {
        l3State,
        rankedSignals: reclassified
      };
    } catch (error) {
      console.error("IBSS_ENGINE L3 integration error:", error);
      return {
        l3State: null,
        rankedSignals: signals
      };
    }
  }

  function applyDoctrineState(signals) {
    try {
      const classified = asArray(signals).map(signal => ({
        ...signal,
        doctrine: signal.doctrine || classifyDoctrineSignal(signal)
      }));

      return {
        doctrineState: summarizeDoctrine(classified),
        rankedSignals: classified
      };
    } catch (error) {
      console.error("IBSS_ENGINE doctrine integration error:", error);

      return {
        doctrineState: null,
        rankedSignals: signals
      };
    }
  }

  function buildRankedSignals() {
    const ingestionSignals = getSignalsFromIngestion();
    const seedSignals = ingestionSignals.length ? [] : getSignalsFromSeedData();
    const fallbackSignals = ingestionSignals.length || seedSignals.length ? [] : getFallbackSignalsFromNews();

    const rawSignals = ingestionSignals.length
      ? ingestionSignals
      : (seedSignals.length ? seedSignals : fallbackSignals);

    const normalized = rawSignals
      .map(normalizeRawSignal)
      .map(signal => {
        const contentBoost = getSignalContentBoost(signal);
        const finalScore = clamp(safeNumber(signal.score100, 0) + contentBoost, 0, 100);
        const priority = normalizePriority(signal.priority || inferPriorityFromScore(finalScore));

        return {
          ...signal,
          priority,
          contentBoost,
          score: finalScore / 100,
          score100: finalScore,
          balancedScore100: finalScore,
          live: finalScore >= CONFIG.minLiveSignalScore,
          active: finalScore >= CONFIG.minLiveSignalScore
        };
      })
      .sort((a, b) => safeNumber(b.balancedScore100, 0) - safeNumber(a.balancedScore100, 0));

    const deduped = dedupeBy(normalized, (item) => {
      return [
        normalizeText(getLocalizedText(item.title, "en")),
        normalizeText(item.country),
        normalizeText(item.domain)
      ].join("|");
    });

    const l3Applied = applyL3Layer(deduped);
    buildRankedSignals.lastL3State = l3Applied.l3State;

    const doctrineApplied = applyDoctrineState(l3Applied.rankedSignals);
    buildRankedSignals.lastDoctrineState = doctrineApplied.doctrineState;

    return doctrineApplied.rankedSignals
      .slice()
      .sort((a, b) => safeNumber(b.balancedScore100, 0) - safeNumber(a.balancedScore100, 0));
  }

  buildRankedSignals.lastL3State = null;
  buildRankedSignals.lastDoctrineState = null;

  /* =========================================
     Cluster + Theater Builders
  ========================================= */

  function buildClusterName(region, domain) {
    const regionNameEn = region === "global" ? "Global" : titleCase(region.replace(/-/g, " "));
    const domainNameEn = domain === "general" ? "Strategic File" : titleCase(domain.replace(/-/g, " "));

    return {
      en: `${regionNameEn} ${domainNameEn}`,
      ar: `${domainNameEn} ${regionNameEn}`
    };
  }

  function buildTheaterName(region) {
    if (region === "global") {
      return localize("Global Theater", "المسرح العالمي");
    }

    return localize(
      `${titleCase(region.replace(/-/g, " "))} Theater`,
      `مسرح ${titleCase(region.replace(/-/g, " "))}`
    );
  }

  function buildClusterState(rankedSignals) {
    const liveSignals = rankedSignals.filter(signal => signal.live);

    if (!liveSignals.length) {
      return {
        clusters: [],
        theaters: [],
        lastUpdate: nowIso()
      };
    }

    const groupMap = new Map();

    liveSignals.forEach(signal => {
      const region = normalizeText(signal.region || signal.country || "global") || "global";
      const domain = normalizeText(signal.domain || "general") || "general";
      const key = `${region}::${domain}`;

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          key,
          region,
          domain,
          signals: [],
          totalRisk: 0,
          maxRisk: 0,
          avgReliabilitySum: 0,
          doctrineAlertSum: 0
        });
      }

      const bucket = groupMap.get(key);
      const risk = safeNumber(signal.balancedScore100, 0);

      bucket.signals.push(signal);
      bucket.totalRisk += risk;
      bucket.maxRisk = Math.max(bucket.maxRisk, risk);
      bucket.avgReliabilitySum += safeNumber(signal.reliabilityScore, 55);
      bucket.doctrineAlertSum += safeNumber(signal.doctrine?.alertScore, 0);
    });

    const clusters = [...groupMap.values()]
      .map((group, index) => {
        const count = group.signals.length || 1;
        const avgRisk = Math.round(group.totalRisk / count);
        const avgReliability = Math.round(group.avgReliabilitySum / count);
        const avgDoctrineAlert = Math.round(group.doctrineAlertSum / count);
        const densityBonus = Math.min(count * 2, 8);
        const peakBonus = Math.round(group.maxRisk * 0.08);
        const doctrineBonus = avgDoctrineAlert >= 70 ? 4 : avgDoctrineAlert >= 40 ? 2 : 0;
        const contentBoost = getClusterContentBoost(group.region, group.domain);

        const calibratedRisk = clamp(
          Math.round((avgRisk * 0.76) + peakBonus + densityBonus + doctrineBonus + contentBoost),
          0,
          100
        );

        return {
          id: `CL-${index + 1}`,
          key: group.key,
          name: buildClusterName(group.region, group.domain),
          avgRisk: calibratedRisk,
          maxRisk: clamp(group.maxRisk + contentBoost + doctrineBonus, 0, 100),
          escalationLevel: riskLevelFromScore(calibratedRisk),
          priority: calibratedRisk >= 78 ? "CORE" : calibratedRisk >= 55 ? "SUPPORT" : "WATCH",
          trend: "STABLE",
          theaterId: `TH-${group.region}`,
          region: group.region,
          domain: group.domain,
          avgReliability,
          avgDoctrineAlert,
          contentBoost,
          doctrineBonus,
          topDoctrineSeries: summarizeDoctrine(group.signals).topSeries,
          signals: group.signals
        };
      })
      .sort((a, b) => b.avgRisk - a.avgRisk);

    const theaterMap = new Map();

    clusters.forEach(cluster => {
      const region = normalizeText(cluster.region || "global") || "global";

      if (!theaterMap.has(region)) {
        theaterMap.set(region, {
          id: `TH-${region}`,
          region,
          name: buildTheaterName(region),
          clusters: [],
          avgSum: 0,
          maxRisk: 0,
          avgReliabilitySum: 0,
          doctrineAlertSum: 0
        });
      }

      const theater = theaterMap.get(region);
      theater.clusters.push(cluster);
      theater.avgSum += safeNumber(cluster.avgRisk, 0);
      theater.maxRisk = Math.max(theater.maxRisk, safeNumber(cluster.maxRisk, 0));
      theater.avgReliabilitySum += safeNumber(cluster.avgReliability, 55);
      theater.doctrineAlertSum += safeNumber(cluster.avgDoctrineAlert, 0);
    });

    const theaters = [...theaterMap.values()]
      .map(item => {
        const count = item.clusters.length || 1;
        const avgRisk = Math.round(item.avgSum / count);
        const avgReliability = Math.round(item.avgReliabilitySum / count);
        const avgDoctrineAlert = Math.round(item.doctrineAlertSum / count);
        const densityBonus = Math.min(count * 2, 6);
        const peakBonus = Math.round(item.maxRisk * 0.06);
        const doctrineBonus = avgDoctrineAlert >= 70 ? 3 : avgDoctrineAlert >= 40 ? 2 : 0;

        const calibratedRisk = clamp(
          Math.round((avgRisk * 0.80) + peakBonus + densityBonus + doctrineBonus),
          0,
          100
        );

        return {
          id: item.id,
          name: item.name,
          avgRisk: calibratedRisk,
          maxRisk: item.maxRisk,
          escalationLevel: riskLevelFromScore(calibratedRisk),
          priority: calibratedRisk >= 80 ? "CORE" : calibratedRisk >= 58 ? "SUPPORT" : "WATCH",
          trend: "STABLE",
          avgReliability,
          avgDoctrineAlert,
          doctrineBonus,
          topDoctrineSeries: summarizeDoctrine(item.clusters.flatMap(cluster => cluster.signals)).topSeries,
          clusters: item.clusters
        };
      })
      .sort((a, b) => b.avgRisk - a.avgRisk);

    return {
      clusters,
      theaters,
      lastUpdate: nowIso()
    };
  }
  /* =========================================
     Pressure Engines
  ========================================= */

  function buildSignalPressure(rankedSignals) {
    const list = asArray(rankedSignals);
    if (!list.length) return 0;

    const avgScore = Math.round(average(list, item => item.balancedScore100));
    const maxScore = safeNumber(list[0]?.balancedScore100, 0);
    const liveCount = list.filter(signal => signal.live).length;
    const doctrineAvg = Math.round(average(list, item => item.doctrine?.alertScore || 0));
    const doctrineBonus = doctrineAvg >= 70 ? 5 : doctrineAvg >= 40 ? 3 : 0;

    return clamp(
      Math.round((avgScore * 0.66) + (maxScore * 0.18) + Math.min(liveCount, 10) + doctrineBonus),
      0,
      100
    );
  }

  function buildClusterPressure(clusters) {
    const list = asArray(clusters);
    if (!list.length) {
      return {
        count: 0,
        topCluster: null,
        pressure: 0
      };
    }

    const topCluster = list[0];
    const avgRisk = Math.round(average(list, cluster => cluster.avgRisk));
    const doctrineAvg = Math.round(average(list, cluster => cluster.avgDoctrineAlert || 0));
    const doctrineBonus = doctrineAvg >= 70 ? 4 : doctrineAvg >= 40 ? 2 : 0;

    const pressure = clamp(
      Math.round((avgRisk * 0.70) + (safeNumber(topCluster?.maxRisk, 0) * 0.12) + Math.min(list.length * 2, 8) + doctrineBonus),
      0,
      100
    );

    return {
      count: list.length,
      topCluster,
      pressure
    };
  }

  function buildTheaterPressure(theaters) {
    const list = asArray(theaters);
    if (!list.length) {
      return {
        count: 0,
        topTheater: null,
        pressure: 0
      };
    }

    const topTheater = list[0];
    const avgRisk = Math.round(average(list, theater => theater.avgRisk));
    const doctrineAvg = Math.round(average(list, theater => theater.avgDoctrineAlert || 0));
    const doctrineBonus = doctrineAvg >= 70 ? 4 : doctrineAvg >= 40 ? 2 : 0;

    const pressure = clamp(
      Math.round((avgRisk * 0.72) + (safeNumber(topTheater?.maxRisk, 0) * 0.10) + Math.min(list.length * 2, 6) + doctrineBonus),
      0,
      100
    );

    return {
      count: list.length,
      topTheater,
      pressure
    };
  }

  function buildNewsPressure(rankedSignals) {
    const list = asArray(rankedSignals);

    const highCount = list.filter(item => normalizePriority(item.priority) === "HIGH").length;
    const mediumCount = list.filter(item => normalizePriority(item.priority) === "MEDIUM").length;
    const lowCount = list.filter(item => normalizePriority(item.priority) === "LOW").length;

    const doctrineHighCount = list.filter(item => item.doctrine?.alertLevel === "HIGH").length;
    const doctrineMediumCount = list.filter(item => item.doctrine?.alertLevel === "MEDIUM").length;

    const weighted =
      (highCount * 16) +
      (mediumCount * 9) +
      (lowCount * 4) +
      (doctrineHighCount * 4) +
      (doctrineMediumCount * 2);

    return {
      count: list.length,
      highCount,
      mediumCount,
      lowCount,
      doctrineHighCount,
      doctrineMediumCount,
      pressure: clamp(weighted, 0, 100)
    };
  }

  /* =========================================
     Country Risk
  ========================================= */

  function detectTrend(current, previous) {
    if (previous == null) return "STABLE";
    if (current > previous + 2) return "RISING";
    if (current < previous - 2) return "FALLING";
    return "STABLE";
  }

  function findPreviousCountryRisk(name) {
    for (let i = STATE.history.length - 1; i >= 0; i -= 1) {
      const row = STATE.history[i];
      const found = row.countryRiskFeed?.find(item => item.name === name);
      if (found) return found.riskScore;
    }

    return null;
  }

  function matchesCountry(country, signalOrClusterOrTheaterText) {
    const target = normalizeText(signalOrClusterOrTheaterText);
    const aliases = getContentCountryAliases(country.id || getLocalizedText(country.name, "en"));
    return aliases.some(alias => target.includes(alias));
  }

  function buildCountryRiskFeed(rankedSignals, clusters, theaters, newsPressure) {
    const countries = getCountries();

    if (countries.length) {
      return [...countries]
        .map(country => {
          const countryName = getLocalizedText(country.name, "en");

          const relatedSignals = rankedSignals.filter(signal =>
            matchesCountry(country, signal.country) ||
            matchesCountry(country, signal.region) ||
            matchesCountry(country, getLocalizedText(signal.title, "en"))
          );

          const relatedClusters = clusters.filter(cluster =>
            matchesCountry(country, cluster.region) ||
            matchesCountry(country, getLocalizedText(cluster.name, "en"))
          );

          const relatedTheater = theaters.find(theater =>
            matchesCountry(country, getLocalizedText(theater.name, "en"))
          ) || null;

          let baseScore = safeNumber(country.riskScore, 0);

          if (relatedSignals.length) {
            const avgSignal = Math.round(average(relatedSignals, signal => signal.balancedScore100));
            baseScore = Math.round((baseScore * 0.50) + (avgSignal * 0.50));

            const doctrineAvg = Math.round(average(relatedSignals, signal => signal.doctrine?.alertScore || 0));
            if (doctrineAvg >= 70) baseScore += 3;
            else if (doctrineAvg >= 40) baseScore += 1;
          }

          if (relatedClusters.length) {
            const avgCluster = Math.round(average(relatedClusters, cluster => cluster.avgRisk));
            baseScore = Math.round((baseScore * 0.72) + (avgCluster * 0.28));
          }

          if (relatedTheater) {
            baseScore = Math.round((baseScore * 0.84) + (safeNumber(relatedTheater.avgRisk, 0) * 0.16));
          }

          if (safeNumber(newsPressure?.pressure, 0) >= 70) {
            baseScore += 1;
          }

          const contentBoost = getCountryContentBoost(country.id || country.countryId || countryName);
          baseScore = clamp(baseScore + contentBoost, 0, 100);

          const previous = findPreviousCountryRisk(countryName);
          const trend = detectTrend(baseScore, previous);

          return {
            id: country.id || normalizeText(countryName),
            name: countryName,
            nameLocalized: country.name,
            riskScore: baseScore,
            riskLevel: riskLevelFromScore(baseScore),
            trend,
            band: normalizeBandCode(baseScore),
            contentBoost,
            primaryDrivers: asArray(country.primaryDrivers?.en || country.primaryDrivers || []),
            doctrine: summarizeDoctrine(relatedSignals)
          };
        })
        .sort((a, b) => b.riskScore - a.riskScore)
        .slice(0, CONFIG.maxCountryRiskItems);
    }

    return rankedSignals.slice(0, CONFIG.maxCountryRiskItems).map(signal => {
      const name = getLocalizedText(signal.title, "en");
      const baseRisk = Math.round(safeNumber(signal.balancedScore100, 0) * 0.92);
      const contentBoost = getCountryContentBoost(signal.country || name);
      const doctrineBonus = signal.doctrine?.alertLevel === "HIGH" ? 3 : signal.doctrine?.alertLevel === "MEDIUM" ? 1 : 0;
      const riskScore = clamp(baseRisk + contentBoost + doctrineBonus, 0, 100);
      const previous = findPreviousCountryRisk(name);
      const trend = detectTrend(riskScore, previous);

      return {
        id: signal.id || name.toLowerCase().replace(/\s+/g, "-"),
        name,
        nameLocalized: { en: name, ar: getLocalizedText(signal.title, "ar") },
        riskScore,
        riskLevel: riskLevelFromScore(riskScore),
        trend,
        band: normalizeBandCode(riskScore),
        contentBoost,
        primaryDrivers: [
          getLocalizedText(signal.title, "en"),
          safeText(signal.domain, "geopolitical"),
          signal.priority
        ],
        doctrine: summarizeDoctrine([signal])
      };
    });
  }

  function buildUnifiedRisk(topCountry, liveSignalsCount) {
    if (!topCountry) {
      return {
        unit: "Unified Risk Unit",
        topCountry: null,
        riskScore: 0,
        trend: "STABLE",
        riskLevel: "LOW",
        band: "LOW",
        liveSignals: safeNumber(liveSignalsCount, 0),
        drivers: []
      };
    }

    return {
      unit: "Unified Risk Unit",
      topCountry: topCountry.name,
      riskScore: safeNumber(topCountry.riskScore, 0),
      trend: safeText(topCountry.trend, "STABLE"),
      riskLevel: safeText(topCountry.riskLevel, "LOW"),
      band: safeText(topCountry.band, normalizeBandCode(topCountry.riskScore)),
      liveSignals: safeNumber(liveSignalsCount, 0),
      drivers: asArray(topCountry.primaryDrivers).slice(0, 5),
      doctrine: topCountry.doctrine || null
    };
  }

  /* =========================================
     Confidence
  ========================================= */

  function buildConfidenceScore(rankedSignals, clusters, theaters) {
    const signalReliability = rankedSignals.length
      ? average(rankedSignals, signal => signal.reliabilityScore)
      : 0;

    const clusterReliability = clusters.length
      ? average(clusters, cluster => cluster.avgReliability)
      : 0;

    const theaterReliability = theaters.length
      ? average(theaters, theater => theater.avgReliability)
      : 0;

    const doctrineSignal = rankedSignals.length
      ? average(rankedSignals, signal => signal.doctrine?.alertScore || 0)
      : 0;

    const densityBoost =
      Math.min(rankedSignals.length, 12) * 1.0 +
      Math.min(clusters.length, 6) * 1.5 +
      Math.min(theaters.length, 4) * 2.0;

    const reliabilityComposite =
      (signalReliability * 0.48) +
      (clusterReliability * 0.29) +
      (theaterReliability * 0.19) +
      (doctrineSignal * 0.04);

    let score = reliabilityComposite + densityBoost;
    score += getSystemContentConfidenceBoost();

    return clamp(Math.round(score), 0, 100);
  }

  /* =========================================
     Drivers / Causality
  ========================================= */

  function buildSystemDrivers(rankedSignals, clusters, theaters, countryRiskFeed, doctrineState) {
    const drivers = [];

    rankedSignals.slice(0, 2).forEach(signal => {
      drivers.push({
        id: `DRV-SIG-${signal.id}`,
        type: "signal",
        priority: normalizePriority(signal.priority),
        score: safeNumber(signal.balancedScore100, 0),
        label: {
          en: `${getLocalizedText(signal.title, "en")} pressure`,
          ar: `ضغط ${getLocalizedText(signal.title, "ar")}`
        },
        explanation: {
          en: signal.l3?.interpretation?.en || signal.doctrine?.interpretation?.en || `Signal score ${safeNumber(signal.balancedScore100, 0)} contributed directly to system pressure.`,
          ar: signal.l3?.interpretation?.ar || signal.doctrine?.interpretation?.ar || `درجة الإشارة ${safeNumber(signal.balancedScore100, 0)} ساهمت مباشرة في ضغط النظام.`
        }
      });
    });

    if (doctrineState?.topSeries) {
      drivers.push({
        id: `DRV-DOCTRINE-${doctrineState.topSeries.series.id}`,
        type: "doctrine",
        priority: doctrineState.topSeries.maxAlert >= 70 ? "HIGH" : doctrineState.topSeries.maxAlert >= 40 ? "MEDIUM" : "LOW",
        score: safeNumber(doctrineState.topSeries.maxAlert, 0),
        label: {
          en: `${doctrineState.topSeries.series.name.en} doctrine pressure`,
          ar: `ضغط سلسلة ${doctrineState.topSeries.series.name.ar}`
        },
        explanation: {
          en: `${doctrineState.topSeries.count} signals are concentrated under ${doctrineState.topSeries.series.name.en}. ${doctrineState.topSeries.series.question.en}`,
          ar: `${doctrineState.topSeries.count} إشارات متركزة ضمن ${doctrineState.topSeries.series.name.ar}. ${doctrineState.topSeries.series.question.ar}`
        }
      });
    }

    if (clusters[0]) {
      drivers.push({
        id: `DRV-CL-${clusters[0].id}`,
        type: "cluster",
        priority: clusters[0].priority === "CORE" ? "HIGH" : "MEDIUM",
        score: safeNumber(clusters[0].avgRisk, 0),
        label: {
          en: `${getLocalizedText(clusters[0].name, "en")} file pressure`,
          ar: `ضغط ملف ${getLocalizedText(clusters[0].name, "ar")}`
        },
        explanation: {
          en: "The top strategic file raised structured pressure through file concentration.",
          ar: "الملف الاستراتيجي الأعلى رفع الضغط البنيوي عبر تركز الملف."
        }
      });
    }

    if (theaters[0]) {
      drivers.push({
        id: `DRV-TH-${theaters[0].id}`,
        type: "theater",
        priority: theaters[0].priority === "CORE" ? "HIGH" : "MEDIUM",
        score: safeNumber(theaters[0].avgRisk, 0),
        label: {
          en: `${getLocalizedText(theaters[0].name, "en")} theater pressure`,
          ar: `ضغط مسرح ${getLocalizedText(theaters[0].name, "ar")}`
        },
        explanation: {
          en: "The dominant theater concentrated operational pressure across multiple files.",
          ar: "المسرح المهيمن ركز الضغط التشغيلي عبر عدة ملفات."
        }
      });
    }

    if (countryRiskFeed[0]) {
      drivers.push({
        id: `DRV-CTR-${countryRiskFeed[0].id}`,
        type: "country",
        priority: countryRiskFeed[0].riskLevel === "HIGH" ? "HIGH" : "MEDIUM",
        score: safeNumber(countryRiskFeed[0].riskScore, 0),
        label: {
          en: `${safeText(countryRiskFeed[0].name)} risk concentration`,
          ar: `تركز المخاطر في ${safeText(countryRiskFeed[0].name)}`
        },
        explanation: {
          en: "Top country risk reinforced the unified pressure profile.",
          ar: "أعلى خطر دولي عزز ملف الضغط الموحد."
        }
      });
    }

    if (buildRankedSignals.lastL3State) {
      drivers.push({
        id: "DRV-L3-PRESSURE",
        type: "l3",
        priority: buildRankedSignals.lastL3State.l3Pressure >= 70 ? "HIGH" : "MEDIUM",
        score: safeNumber(buildRankedSignals.lastL3State.l3Pressure, 0),
        label: {
          en: "L3 signal classification pressure",
          ar: "ضغط تصنيف الإشارات L3"
        },
        explanation: {
          en: `L3 classified ${safeNumber(buildRankedSignals.lastL3State.activeSignals, 0)} active signals with pressure ${safeNumber(buildRankedSignals.lastL3State.l3Pressure, 0)}.`,
          ar: `صنّفت L3 عدد ${safeNumber(buildRankedSignals.lastL3State.activeSignals, 0)} إشارات نشطة بضغط ${safeNumber(buildRankedSignals.lastL3State.l3Pressure, 0)}.`
        }
      });
    }

    return sortByScoreDesc(drivers, item => item.score).slice(0, CONFIG.maxDrivers);
  }

  /* =========================================
     Adaptive Living Memory / Drift
  ========================================= */

  function getRecentHistory(limit = CONFIG.memoryWindow) {
    return STATE.history.slice(-Math.max(1, limit));
  }

  function computePressureDrift(currentPressure) {
    const recent = getRecentHistory();

    if (!recent.length) {
      return {
        direction: "STABLE",
        delta: 0,
        persistence: 0,
        volatility: 0
      };
    }

    const last = recent[recent.length - 1];
    const previousPressure = safeNumber(last?.systemPressure, currentPressure);
    const delta = currentPressure - previousPressure;

    let direction = "STABLE";
    if (delta >= CONFIG.pressureJumpThreshold) direction = "RISING_FAST";
    else if (delta > 1) direction = "RISING";
    else if (delta <= -CONFIG.pressureDropThreshold) direction = "FALLING_FAST";
    else if (delta < -1) direction = "FALLING";

    let persistence = 0;

    for (let i = recent.length - 1; i >= 0; i -= 1) {
      const value = safeNumber(recent[i]?.systemPressure, 0);
      if (value >= 78) persistence += 1;
      else break;
    }

    let volatility = 0;

    for (let i = 1; i < recent.length; i += 1) {
      volatility += Math.abs(
        safeNumber(recent[i]?.systemPressure, 0) -
        safeNumber(recent[i - 1]?.systemPressure, 0)
      );
    }

    volatility = recent.length > 1 ? Math.round(volatility / (recent.length - 1)) : 0;

    return {
      direction,
      delta,
      persistence,
      volatility
    };
  }

  function buildPresenceState(systemPressure, confidenceScore, drift) {
    let state = "monitoring";
    let intensity = "low";
    let urgency = "low";

    if (systemPressure >= 90 && confidenceScore >= 75) {
      state = "active_response";
      intensity = "critical";
      urgency = "immediate";
    } else if (systemPressure >= 82) {
      state = "preparation";
      intensity = "high";
      urgency = "high";
    } else if (systemPressure >= 60) {
      state = "elevated_watch";
      intensity = "elevated";
      urgency = "medium";
    } else {
      state = "monitoring";
      intensity = "contained";
      urgency = "low";
    }

    if (drift.persistence >= CONFIG.strainPersistenceThreshold && systemPressure >= 70) {
      state = "strategic_strain";
      intensity = "strained";
      urgency = "high";
    }

    return {
      state,
      intensity,
      urgency,
      drift: drift.direction
    };
  }

  function formatDriverNames(driverNames, lang = "en") {
    const arr = asArray(driverNames).filter(Boolean);
    if (!arr.length) return lang === "ar" ? "لا شيء" : "none";

    if (arr.length === 1) return arr[0];

    if (arr.length === 2) {
      return lang === "ar" ? `${arr[0]} و ${arr[1]}` : `${arr[0]} and ${arr[1]}`;
    }

    const head = arr.slice(0, -1).join(lang === "ar" ? "، " : ", ");
    const tail = arr[arr.length - 1];

    return lang === "ar" ? `${head}، و ${tail}` : `${head}, and ${tail}`;
  }

  function buildVoice(system) {
    const topSignal = system?.topSignal || null;
    const topTheater = system?.topTheater || null;
    const topCluster = system?.topCluster || null;
    const topDoctrine = system?.topDoctrineSeries || null;
    const presence = system?.presence || {};
    const drivers = asArray(system?.drivers || []);
    const pressure = safeNumber(system?.systemPressure, 0);
    const confidence = safeNumber(system?.confidenceScore, 0);

    const signalNameEn = topSignal ? getLocalizedText(topSignal.title, "en") : "the current signal layer";
    const signalNameAr = topSignal ? getLocalizedText(topSignal.title, "ar") : "طبقة الإشارات الحالية";

    const theaterNameEn = topTheater ? getLocalizedText(topTheater.name, "en") : "the active theater";
    const theaterNameAr = topTheater ? getLocalizedText(topTheater.name, "ar") : "المسرح النشط";

    const clusterNameEn = topCluster ? getLocalizedText(topCluster.name, "en") : "the strategic file";
    const clusterNameAr = topCluster ? getLocalizedText(topCluster.name, "ar") : "الملف الاستراتيجي";

    const doctrineNameEn = topDoctrine?.series?.name?.en || "the doctrine layer";
    const doctrineNameAr = topDoctrine?.series?.name?.ar || "الطبقة العقائدية";

    const driverNamesEn = drivers.slice(0, 3).map(item => getLocalizedText(item.label, "en"));
    const driverNamesAr = drivers.slice(0, 3).map(item => getLocalizedText(item.label, "ar"));

    const l3State = system?.l3 || null;
    const l3LineEn = l3State
      ? ` L3 active signals: ${safeNumber(l3State.activeSignals, 0)}, L3 pressure: ${safeNumber(l3State.l3Pressure, 0)}.`
      : "";

    const l3LineAr = l3State
      ? ` إشارات L3 النشطة: ${safeNumber(l3State.activeSignals, 0)}، ضغط L3: ${safeNumber(l3State.l3Pressure, 0)}.`
      : "";

    const doctrineLineEn = topDoctrine
      ? ` Doctrine series: ${doctrineNameEn}, alert ${safeNumber(topDoctrine.maxAlert, 0)}.`
      : "";

    const doctrineLineAr = topDoctrine
      ? ` السلسلة العقائدية: ${doctrineNameAr}، إنذار ${safeNumber(topDoctrine.maxAlert, 0)}.`
      : "";

    let postureEn = "Monitoring posture";
    let postureAr = "وضعية مراقبة";

    let summaryEn = "The platform is observing controlled movement across the signal layer.";
    let summaryAr = "المنصة ترصد حركة مضبوطة داخل طبقة الإشارات.";

    let explanationEn = "No single pressure axis is forcing a hard directional shift yet.";
    let explanationAr = "لا يوجد محور ضغط منفرد يفرض تحولاً اتجاهياً حاداً حتى الآن.";

    let advisoryEn = "Maintain observation, preserve linkage quality, and avoid premature escalation logic.";
    let advisoryAr = "استمر في المراقبة، وحافظ على جودة الربط، وتجنب منطق التصعيد المبكر.";

    let intentEn = "Observe and stabilize.";
    let intentAr = "راقب وثبّت.";

    if (presence.state === "elevated_watch") {
      postureEn = "Elevated watch posture";
      postureAr = "وضعية مراقبة مرتفعة";

      summaryEn = `The platform is no longer reading isolated signals, but converging pressure around ${theaterNameEn}.`;
      summaryAr = `المنصة لم تعد تقرأ إشارات معزولة، بل ضغطاً متقارباً حول ${theaterNameAr}.`;

      explanationEn = `${clusterNameEn} is emerging as a structured pressure file with directional significance.${l3LineEn}${doctrineLineEn}`;
      explanationAr = `${clusterNameAr} يبرز كملف ضغط بنيوي ذي دلالة اتجاهية.${l3LineAr}${doctrineLineAr}`;

      advisoryEn = "Tighten monitoring, preserve causal linkage, and prepare for pressure transfer across files.";
      advisoryAr = "شدّد المراقبة، وحافظ على الربط السببي، واستعد لانتقال الضغط بين الملفات.";

      intentEn = "Stabilize and prepare.";
      intentAr = "ثبّت واستعد.";
    }

    if (presence.state === "preparation") {
      postureEn = "Preparation posture";
      postureAr = "وضعية تحضير";

      summaryEn = `System posture is tightening around ${signalNameEn} inside ${theaterNameEn}.`;
      summaryAr = `وضعية النظام تزداد إحكاماً حول ${signalNameAr} داخل ${theaterNameAr}.`;

      explanationEn = `The system detects structured pressure with active contribution from ${formatDriverNames(driverNamesEn)}.${l3LineEn}${doctrineLineEn}`;
      explanationAr = `النظام يرصد ضغطاً بنيوياً مع مساهمة نشطة من ${formatDriverNames(driverNamesAr, "ar")}.${l3LineAr}${doctrineLineAr}`;

      advisoryEn = "Raise readiness, reduce interpretive lag, and align live signals with doctrine and publication context.";
      advisoryAr = "ارفع الجاهزية، وقلل فجوة التفسير، ونسّق بين الإشارات الحية والعقيدة وسياق المنشورات.";

      intentEn = "Prepare and align.";
      intentAr = "تحضّر ونسّق.";
    }

    if (presence.state === "active_response") {
      postureEn = "Active response posture";
      postureAr = "وضعية استجابة نشطة";

      summaryEn = `The platform reads ${signalNameEn} as part of an active pressure architecture rather than a transient spike.`;
      summaryAr = `المنصة تقرأ ${signalNameAr} كجزء من بنية ضغط نشطة لا مجرد قفزة عابرة.`;

      explanationEn = `Pressure ${pressure} with confidence ${confidence} indicates that convergence has moved beyond observation and into operational significance.${l3LineEn}${doctrineLineEn}`;
      explanationAr = `الضغط ${pressure} مع ثقة ${confidence} يشير إلى أن التقارب تجاوز المراقبة ودخل في دلالة تشغيلية.${l3LineAr}${doctrineLineAr}`;

      advisoryEn = "Maintain response discipline, protect narrative coherence, and prioritize dominant pressure channels.";
      advisoryAr = "حافظ على انضباط الاستجابة، واحمِ تماسك السردية، وامنح الأولوية لقنوات الضغط المهيمنة.";

      intentEn = "Contain, respond, and direct.";
      intentAr = "احتوِ واستجب ووجّه.";
    }

    if (presence.state === "strategic_strain") {
      postureEn = "Strategic strain posture";
      postureAr = "وضعية إجهاد استراتيجي";

      summaryEn = "The platform is carrying sustained pressure, not just elevated pressure.";
      summaryAr = "المنصة تحمل ضغطاً مستداماً، لا مجرد ضغط مرتفع.";

      explanationEn = `Persistence across recent cycles suggests strain accumulation around ${clusterNameEn}, ${theaterNameEn}, and ${doctrineNameEn}.${l3LineEn}`;
      explanationAr = `الاستمرار عبر الدورات الأخيرة يشير إلى تراكم إجهاد حول ${clusterNameAr} و${theaterNameAr} و${doctrineNameAr}.${l3LineAr}`;

      advisoryEn = "Avoid reactive overcorrection, prioritize continuity, and watch for pressure migration into secondary theaters.";
      advisoryAr = "تجنب التصحيح الانفعالي الزائد، وأعطِ الأولوية للاستمرارية، وراقب انتقال الضغط إلى مسارح ثانوية.";

      intentEn = "Absorb, contain, and preserve coherence.";
      intentAr = "امتصّ واحتوِ وحافظ على التماسك.";
    }

    return {
      posture: { en: postureEn, ar: postureAr },
      summary: { en: summaryEn, ar: summaryAr },
      explanation: { en: explanationEn, ar: explanationAr },
      advisory: { en: advisoryEn, ar: advisoryAr },
      intent: { en: intentEn, ar: intentAr }
    };
  }
  /* =========================================
     Scenarios
  ========================================= */

  function buildScenarios(systemPressure, confidenceScore) {
    if (systemPressure >= 90) {
      return [
        { key: "A", value: 62 },
        { key: "B", value: 24 },
        { key: "C", value: 14 }
      ];
    }

    if (systemPressure >= CONFIG.scenarioHighThreshold) {
      return [
        { key: "A", value: 49 },
        { key: "B", value: 31 },
        { key: "C", value: 20 }
      ];
    }

    if (systemPressure >= CONFIG.scenarioPrepThreshold) {
      return [
        { key: "A", value: 41 },
        { key: "B", value: 35 },
        { key: "C", value: 24 }
      ];
    }

    if (confidenceScore >= 70) {
      return [
        { key: "A", value: 29 },
        { key: "B", value: 35 },
        { key: "C", value: 36 }
      ];
    }

    return [
      { key: "A", value: 24 },
      { key: "B", value: 33 },
      { key: "C", value: 43 }
    ];
  }

  /* =========================================
     Feed + Snapshot
  ========================================= */

  function rankedToFeed(rankedSignals) {
    return rankedSignals.slice(0, 2).map(item =>
      makeFeedItem(
        "signal_summary",
        item.priority,
        getLocalizedText(item.description, "en"),
        getLocalizedText(item.description, "ar"),
        safeText(item?.source, "ENGINE")
      )
    );
  }

  function buildFeed(system) {
    const lines = [];

    rankedToFeed(system.rankedSignals).forEach(item => lines.push(item));

    if (system.doctrine?.topSeries) {
      lines.push(
        makeFeedItem(
          "doctrine_series",
          system.doctrine.topSeries.maxAlert >= 70 ? "HIGH" : system.doctrine.topSeries.maxAlert >= 40 ? "MEDIUM" : "LOW",
          `Doctrine series: ${system.doctrine.topSeries.series.name.en} — ${system.doctrine.topSeries.series.question.en}`,
          `السلسلة العقائدية: ${system.doctrine.topSeries.series.name.ar} — ${system.doctrine.topSeries.series.question.ar}`,
          "Σ-9X"
        )
      );
    }

    if (system.l3) {
      lines.push(
        makeFeedItem(
          "l3_pressure",
          system.l3.l3Pressure >= 70 ? "HIGH" : system.l3.l3Pressure >= 45 ? "MEDIUM" : "LOW",
          `L3 classification pressure: ${system.l3.l3Pressure} across ${system.l3.activeSignals} active signals`,
          `ضغط تصنيف L3: ${system.l3.l3Pressure} عبر ${system.l3.activeSignals} إشارات نشطة`,
          "L3"
        )
      );
    }

    if (system.topSignal) {
      lines.push(
        makeFeedItem(
          "top_signal",
          system.topSignal.priority || system.level,
          `Top signal: ${getLocalizedText(system.topSignal.title, "en")}`,
          `الإشارة الأعلى: ${getLocalizedText(system.topSignal.title, "ar")}`,
          "ENGINE"
        )
      );
    }

    if (system.topCluster) {
      lines.push(
        makeFeedItem(
          "top_cluster",
          system.level,
          `Top strategic file: ${getLocalizedText(system.topCluster.name, "en")}`,
          `الملف الاستراتيجي الأعلى: ${getLocalizedText(system.topCluster.name, "ar")}`,
          "ENGINE"
        )
      );
    }

    if (system.topTheater) {
      lines.push(
        makeFeedItem(
          "top_theater",
          system.level,
          `Top theater: ${getLocalizedText(system.topTheater.name, "en")}`,
          `المسرح الأعلى: ${getLocalizedText(system.topTheater.name, "ar")}`,
          "ENGINE"
        )
      );
    }

    if (system.featuredPublication) {
      lines.push(
        makeFeedItem(
          "featured_publication",
          normalizePriority(system.featuredPublication.priority || system.level),
          `Featured publication: ${getLocalizedText(system.featuredPublication.title, "en")}`,
          `المنشور المميز: ${getLocalizedText(system.featuredPublication.title, "ar")}`,
          "ENGINE"
        )
      );
    }

    lines.push(
      makeFeedItem(
        "voice_summary",
        system.level,
        getLocalizedText(system.voice?.summary, "en"),
        getLocalizedText(system.voice?.summary, "ar"),
        "ENGINE"
      )
    );

    lines.push(
      makeFeedItem(
        "system_pressure",
        system.level,
        `System pressure: ${system.systemPressure}`,
        `ضغط النظام: ${system.systemPressure}`,
        "ENGINE"
      )
    );

    lines.push(
      makeFeedItem(
        "signal_pressure",
        system.level,
        `Signal pressure: ${system.signalPressure}`,
        `ضغط الإشارات: ${system.signalPressure}`,
        "ENGINE"
      )
    );

    lines.push(
      makeFeedItem(
        "cluster_pressure",
        system.level,
        `Strategic file pressure: ${system.clusterPressure.pressure}`,
        `ضغط الملفات الاستراتيجية: ${system.clusterPressure.pressure}`,
        "ENGINE"
      )
    );

    lines.push(
      makeFeedItem(
        "theater_pressure",
        system.level,
        `Theater pressure: ${system.theaterPressure.pressure}`,
        `ضغط المسرح: ${system.theaterPressure.pressure}`,
        "ENGINE"
      )
    );

    lines.push(
      makeFeedItem(
        "news_pressure",
        system.level,
        `Live pressure count: ${system.newsPressure.count} signals`,
        `عدد عناصر الضغط الحي: ${system.newsPressure.count} إشارات`,
        "ENGINE"
      )
    );

    if (system.unifiedRisk?.topCountry) {
      lines.push(
        makeFeedItem(
          "risk_unit",
          system.unifiedRisk.riskLevel,
          `Unified risk unit tracks ${system.unifiedRisk.topCountry} at score ${system.unifiedRisk.riskScore}`,
          `وحدة المخاطر الموحدة ترصد ${system.unifiedRisk.topCountry} عند درجة ${system.unifiedRisk.riskScore}`,
          "ENGINE"
        )
      );
    }

    asArray(system.drivers).slice(0, 3).forEach(driver => {
      lines.push(
        makeFeedItem(
          "driver",
          driver.priority,
          `Driver: ${getLocalizedText(driver.label, "en")} (${driver.score})`,
          `المحرّك: ${getLocalizedText(driver.label, "ar")} (${driver.score})`,
          "ENGINE"
        )
      );
    });

    const deduped = dedupeBy(lines, item => {
      return [
        item.type,
        normalizePriority(item.priority),
        normalizeText(getLocalizedText(item.text, "en"))
      ].join("|");
    });

    return deduped
      .sort((a, b) => {
        const priorityDiff = priorityWeight(b.priority) - priorityWeight(a.priority);
        if (priorityDiff !== 0) return priorityDiff;
        return 0;
      })
      .slice(0, CONFIG.maxFeedItems);
  }

  function getLatestStudy() {
    const featured = getLatestFeaturedContent();
    if (featured) return featured;

    const published = getPublishedContent()
      .filter(item =>
        item &&
        ["study", "report", "analysis", "brief", "policy_paper", "model"].includes(item.type)
      )
      .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));

    return published[0] || null;
  }

  function getHomeSnapshot(system) {
    const topCountry = asArray(system?.countryRiskFeed)[0] || null;
    const latestStudy = getLatestStudy();

    return {
      topTheater: system?.topTheater || null,
      topCluster: system?.topCluster || null,
      topSignal: system?.topSignal || null,
      topCountry,
      latestStudy,
      unifiedRisk: system?.unifiedRisk || null,
      drivers: system?.drivers || [],
      voice: system?.voice || null,
      presence: system?.presence || null,
      l3: system?.l3 || null,
      doctrine: system?.doctrine || null,
      topDoctrineSeries: system?.topDoctrineSeries || null,
      latestNews: system?.rankedSignals?.slice(0, 3) || []
    };
  }

  /* =========================================
     Reports
  ========================================= */

  function buildReportTitle(system, lang = "en") {
    const theaterName = system.topTheater
      ? getLocalizedText(system.topTheater.name, lang)
      : (lang === "ar" ? "النظام" : "System");

    return lang === "ar"
      ? `تقرير سيادي تلقائي — ${theaterName}`
      : `Auto Sovereign Report — ${theaterName}`;
  }

  function buildReportBody(system, lang = "en") {
    const topTheater = system.topTheater ? getLocalizedText(system.topTheater.name, lang) : (lang === "ar" ? "غير محدد" : "Undefined");
    const topCluster = system.topCluster ? getLocalizedText(system.topCluster.name, lang) : (lang === "ar" ? "غير محدد" : "Undefined");
    const topSignal = system.topSignal ? getLocalizedText(system.topSignal.title, lang) : (lang === "ar" ? "غير محدد" : "Undefined");

    const latestStudy = system.snapshot?.latestStudy
      ? getLocalizedText(system.snapshot.latestStudy.title, lang)
      : (lang === "ar" ? "لا يوجد" : "None");

    const driverText = asArray(system.drivers)
      .slice(0, 3)
      .map(driver => getLocalizedText(driver.label, lang))
      .join(lang === "ar" ? "، " : ", ");

    const presenceText = getLocalizedText(system.voice?.summary, lang);

    const l3Text = system.l3
      ? lang === "ar"
        ? ` ضغط L3 هو ${system.l3.l3Pressure} مع ${system.l3.activeSignals} إشارات نشطة.`
        : ` L3 pressure is ${system.l3.l3Pressure} with ${system.l3.activeSignals} active signals.`
      : "";

    const doctrineTextLine = system.doctrine?.topSeries
      ? lang === "ar"
        ? ` السلسلة العقائدية الأعلى هي ${system.doctrine.topSeries.series.name.ar} بإنذار ${system.doctrine.topSeries.maxAlert}.`
        : ` Top doctrine series is ${system.doctrine.topSeries.series.name.en} with alert ${system.doctrine.topSeries.maxAlert}.`
      : "";

    if (lang === "ar") {
      return {
        summary: `رصد المحرك ضغطًا مركبًا بقيمة ${system.systemPressure} مع ثقة ${system.confidenceScore}.${l3Text}${doctrineTextLine}`,
        body:
          `المسرح الأعلى هو ${topTheater}. ` +
          `الملف الاستراتيجي الأعلى هو ${topCluster}. ` +
          `الإشارة الأعلى هي ${topSignal}. ` +
          `أحدث دراسة مؤسسية مرتبطة بالمشهد هي ${latestStudy}. ` +
          `المحرّكات الأساسية: ${driverText || "لا يوجد"}. ` +
          `الحضور التشغيلي: ${presenceText || "لا يوجد"}.`,
        recommendation: system.systemPressure >= 78
          ? "يوصى بالتحضير ورفع الجاهزية على مستوى المسرح الأعلى وتعزيز الربط بين الإشارات والسلاسل العقائدية والدراسات والمنشورات الميدانية."
          : "يوصى باستمرار المراقبة وتعزيز جمع الإشارات وتنظيف مسارات الربط مع الإنتاج التحليلي المنشور والسلاسل العقائدية."
      };
    }

    return {
      summary: `The engine detected composite pressure at ${system.systemPressure} with confidence ${system.confidenceScore}.${l3Text}${doctrineTextLine}`,
      body:
        `Top theater: ${topTheater}. ` +
        `Top strategic file: ${topCluster}. ` +
        `Top signal: ${topSignal}. ` +
        `Latest institutional publication in the scene: ${latestStudy}. ` +
        `Primary drivers: ${driverText || "none"}. ` +
        `Operational presence: ${presenceText || "none"}.`,
      recommendation: system.systemPressure >= 78
        ? "Maintain preparation posture, raise readiness on the dominant theater, and reinforce linkage between signals, doctrine series, publications, and strategic files."
        : "Continue monitoring, improve signal collection, and clean linkage between live signals, doctrine series, and published analytical content."
    };
  }

  function shouldGenerateReport(system) {
    const last = STATE.reports[STATE.reports.length - 1];

    if (!last) return true;
    if (last.level !== system.level) return true;
    if (last.topSignalId !== (system.topSignal?.id || null)) return true;
    if (last.topClusterId !== (system.topCluster?.id || null)) return true;
    if (last.topTheaterId !== (system.topTheater?.id || null)) return true;
    if (last.topDoctrineId !== (system.topDoctrineSeries?.series?.id || null)) return true;
    if (Math.abs(last.systemPressure - system.systemPressure) >= 8) return true;

    return false;
  }

  function generateAutoReport(system) {
    const en = buildReportBody(system, "en");
    const ar = buildReportBody(system, "ar");

    const report = {
      id: `AUTO-${Date.now()}`,
      createdAt: nowIso(),
      systemPressure: system.systemPressure,
      level: system.level,
      decision: system.decision,
      topSignalId: system.topSignal?.id || null,
      topClusterId: system.topCluster?.id || null,
      topTheaterId: system.topTheater?.id || null,
      topDoctrineId: system.topDoctrineSeries?.series?.id || null,
      l3Pressure: system.l3?.l3Pressure || null,
      doctrineAlert: system.topDoctrineSeries?.maxAlert || null,
      title: {
        en: buildReportTitle(system, "en"),
        ar: buildReportTitle(system, "ar")
      },
      summary: {
        en: en.summary,
        ar: ar.summary
      },
      body: {
        en: en.body,
        ar: ar.body
      },
      recommendation: {
        en: en.recommendation,
        ar: ar.recommendation
      }
    };

    STATE.reports.push(report);

    if (STATE.reports.length > CONFIG.reportLimit) {
      STATE.reports.shift();
    }

    return report;
  }

  /* =========================================
     Persistence
  ========================================= */

  function archiveSnapshot(system) {
    STATE.archive.push({
      id: `ARC-${Date.now()}`,
      createdAt: nowIso(),
      ssi: system.systemPressure,
      level: system.level,
      decision: system.decision,
      topSignalId: system.topSignal?.id || null,
      topClusterId: system.topCluster?.id || null,
      topTheaterId: system.topTheater?.id || null,
      topDoctrineId: system.topDoctrineSeries?.series?.id || null,
      doctrineAlert: system.topDoctrineSeries?.maxAlert || null,
      presenceState: system.presence?.state || null,
      l3Pressure: system.l3?.l3Pressure || null
    });

    if (STATE.archive.length > CONFIG.archiveLimit) {
      STATE.archive.shift();
    }
  }

  function updateHistory(system) {
    STATE.history.push({
      updatedAt: system.updatedAt,
      systemPressure: system.systemPressure,
      signalPressure: system.signalPressure,
      level: system.level,
      decision: system.decision,
      topSignalId: system.topSignal?.id || null,
      topClusterId: system.topCluster?.id || null,
      topTheaterId: system.topTheater?.id || null,
      topDoctrineId: system.topDoctrineSeries?.series?.id || null,
      doctrineAlert: system.topDoctrineSeries?.maxAlert || null,
      presenceState: system.presence?.state || null,
      countryRiskFeed: system.countryRiskFeed,
      l3Pressure: system.l3?.l3Pressure || null
    });

    if (STATE.history.length > CONFIG.historyLimit) {
      STATE.history.shift();
    }
  }

  function saveState() {
    try {
      localStorage.setItem(
        CONFIG.storageKey,
        JSON.stringify({
          history: STATE.history,
          reports: STATE.reports,
          archive: STATE.archive,
          lastSystem: STATE.lastSystem
        })
      );
    } catch (error) {
      console.error("IBSS_ENGINE saveState error:", error);
    }
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(CONFIG.storageKey);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;

      STATE.history = Array.isArray(parsed.history) ? parsed.history : [];
      STATE.reports = Array.isArray(parsed.reports) ? parsed.reports : [];
      STATE.archive = Array.isArray(parsed.archive) ? parsed.archive : [];
      STATE.lastSystem = parsed.lastSystem || null;
    } catch (error) {
      console.error("IBSS_ENGINE loadState error:", error);
    }
  }

  /* =========================================
     Main Compute
  ========================================= */

  function computeSystemState() {
    const rankedSignals = buildRankedSignals();
    const l3State = buildRankedSignals.lastL3State || null;
    const doctrineState = buildRankedSignals.lastDoctrineState || null;
    const topSignal = rankedSignals[0] || null;

    const clusterState = buildClusterState(rankedSignals);
    const clusters = asArray(clusterState.clusters);
    const theaters = asArray(clusterState.theaters);

    const topCluster = clusters[0] || null;
    const topTheater = theaters[0] || null;

    const signalPressure = buildSignalPressure(rankedSignals);
    const clusterPressure = buildClusterPressure(clusters);
    const theaterPressure = buildTheaterPressure(theaters);
    const newsPressure = buildNewsPressure(rankedSignals);
    const confidenceScore = buildConfidenceScore(rankedSignals, clusters, theaters);

    let systemPressure = Math.round(
      (signalPressure * 0.35) +
      (clusterPressure.pressure * 0.24) +
      (theaterPressure.pressure * 0.21) +
      (newsPressure.pressure * 0.16) +
      (safeNumber(doctrineState?.topSeries?.maxAlert, 0) * 0.04)
    );

    if (l3State) {
      systemPressure = Math.max(
        systemPressure,
        safeNumber(l3State.l3Pressure, 0)
      );
    }

    if (safeText(topTheater?.priority).toUpperCase() === "CORE") systemPressure += 4;
    if (safeText(topCluster?.priority).toUpperCase() === "CORE") systemPressure += 2;
    if (safeNumber(doctrineState?.topSeries?.maxAlert, 0) >= 70) systemPressure += 2;

    systemPressure = clamp(systemPressure, 0, 100);

    const level = riskLevelFromScore(systemPressure);
    const decisionState = decisionFromSystem(systemPressure, confidenceScore);
    const liveSignals = rankedSignals.filter(signal => signal.live);
    const scenarios = buildScenarios(systemPressure, confidenceScore);
    const countryRiskFeed = buildCountryRiskFeed(rankedSignals, clusters, theaters, newsPressure);
    const topCountry = countryRiskFeed[0] || null;
    const unifiedRisk = buildUnifiedRisk(topCountry, liveSignals.length);
    const featuredPublication = getLatestFeaturedContent();
    const drivers = buildSystemDrivers(rankedSignals, clusters, theaters, countryRiskFeed, doctrineState);
    const drift = computePressureDrift(systemPressure);
    const presence = buildPresenceState(systemPressure, confidenceScore, drift);

    const system = {
      source: rankedSignals.length ? "engine+l3+doctrine" : "fallback",
      updatedAt: nowIso(),

      ssi: systemPressure,
      systemPressure,
      signalPressure,
      confidenceScore,
      level,
      decision: decisionState.decision,
      mode: decisionState.mode,

      l3: l3State,

      doctrine: doctrineState,
      topDoctrineSeries: doctrineState?.topSeries || null,

      topTheater,
      theaters,
      theaterPressure,

      topCluster,
      clusters,
      clusterPressure,

      topSignal,
      dominantSignal: topSignal,
      rankedSignals,
      liveSignals,
      liveSignalsCount: liveSignals.length,

      scenarios,
      countryRiskFeed,
      topCountry,
      unifiedRisk,

      newsPressure,
      drivers,
      presence,
      drift,
      voice: null,

      feed: [],
      contentStats: getContentStats(),
      publishedContent: getPublishedContent(),
      publishedNewsContent: getPublishedNewsContent(),
      liveNews: rankedSignals,
      featuredPublication,
      snapshot: null,
      latestDraftId: null,
      metricsReference: l3State
        ? "IBSS_METRICS_V3_ADAPTIVE + IBSS_L3_ENGINE + Σ-9X_DOCTRINE_MATRIX"
        : "IBSS_METRICS_V3_ADAPTIVE + Σ-9X_DOCTRINE_MATRIX"
    };

    system.voice = buildVoice(system);
    system.snapshot = getHomeSnapshot(system);
    system.feed = buildFeed(system);

    if (shouldGenerateReport(system)) {
      const report = generateAutoReport(system);

      let draft = null;

      try {
        if (
          window.IBSS_PUBLISHER?.buildPublicationFromReport &&
          window.IBSS_PUBLISHER?.createDraftFromPublication
        ) {
          const publication = window.IBSS_PUBLISHER.buildPublicationFromReport(report);
          draft = window.IBSS_PUBLISHER.createDraftFromPublication(publication);
        }
      } catch (error) {
        console.error("IBSS_ENGINE publisher draft generation error:", error);
      }

      system.latestDraftId = draft?.id || null;

      system.feed.unshift(
        makeFeedItem(
          "report",
          system.level,
          draft
            ? `Auto report and publisher draft generated: ${report.title.en}`
            : `Auto report generated: ${report.title.en}`,
          draft
            ? `تم توليد تقرير ومسودة نشر تلقائية: ${report.title.ar}`
            : `تم توليد تقرير تلقائي: ${report.title.ar}`,
          "ENGINE"
        )
      );

      system.feed = dedupeBy(system.feed, item =>
        `${item.type}|${normalizeText(getLocalizedText(item.text, "en"))}`
      ).slice(0, CONFIG.maxFeedItems);
    }

    updateHistory(system);
    archiveSnapshot(system);
    STATE.lastSystem = system;
    saveState();

    return system;
  }

  /* =========================================
     Public API
  ========================================= */

  function getSystemState() {
    return computeSystemState();
  }

  function getStaticSystemFallback() {
    return computeSystemState();
  }

  function getLastSystemState() {
    return clone(STATE.lastSystem);
  }

  function getCountryRiskFeed() {
    const system = STATE.lastSystem || computeSystemState();
    return clone(system.countryRiskFeed) || [];
  }

  function getUnifiedRiskUnit() {
    const system = STATE.lastSystem || computeSystemState();
    return clone(system.unifiedRisk) || null;
  }

  function getReports() {
    return clone([...STATE.reports].reverse()) || [];
  }

  function getLatestReport() {
    return clone(STATE.reports[STATE.reports.length - 1] || null);
  }

  function getHistory() {
    return clone(STATE.history) || [];
  }

  function getArchive() {
    return clone(STATE.archive) || [];
  }

  function getL3State() {
    const system = STATE.lastSystem || computeSystemState();
    return clone(system.l3 || null);
  }

  function getDoctrineState() {
    const system = STATE.lastSystem || computeSystemState();
    return clone(system.doctrine || null);
  }

  function getDoctrineMatrix() {
    return clone(DOCTRINE) || {};
  }

  loadState();

  const api = {
    CONFIG,
    DOCTRINE,

    getSystemState,
    getStaticSystemFallback,
    getLastSystemState,

    getCountryRiskFeed,
    getUnifiedRiskUnit,

    getReports,
    getLatestReport,
    getHistory,
    getArchive,
    getL3State,
    getDoctrineState,
    getDoctrineMatrix,

    getContentStats,
    getPublishedContent,
    getPublishedNewsContent,

    getHomeSnapshot: function () {
      const system = STATE.lastSystem || computeSystemState();
      return clone(system.snapshot || getHomeSnapshot(system));
    },

    riskLevelFromScore,
    buildUnifiedSignals: buildRankedSignals,
    buildNewsPressure,

    classifyDoctrineSignal: function (signal) {
      return clone(classifyDoctrineSignal(signal));
    },

    summarizeDoctrine: function (signals) {
      return clone(summarizeDoctrine(signals));
    }
  };

  window.IBSS_UTILS = {
    ...(window.IBSS_UTILS || {}),
    getHomeSnapshot: api.getHomeSnapshot
  };

  return api;
})();
