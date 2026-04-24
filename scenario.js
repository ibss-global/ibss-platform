// IBSS SOURCES REGISTRY — Stable Source Profile Layer
// Version: v2.0

window.IBSS_SOURCES = (function () {
  "use strict";

  const CONFIG = {
    version: "v2.0-stable-source-profile-layer",
    defaultReliability: 60,
    defaultType: "internal"
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

  function normalizeKey(value) {
    return safeText(String(value || ""))
      .toUpperCase()
      .replace(/\s+/g, "_")
      .replace(/[^A-Z0-9_:-]/g, "")
      .trim();
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function clone(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      console.error("IBSS_SOURCES clone error:", error);
      return null;
    }
  }

  const registry = {
    IBSS_SEED: {
      id: "IBSS_SEED",
      name: "IBSS Seed Dataset",
      type: "internal",
      reliabilityScore: 72,
      confidenceWeight: 0.72,
      active: true,
      description: {
        en: "Internal fallback dataset for platform continuity.",
        ar: "مجموعة بيانات داخلية لضمان استمرارية المنصة."
      }
    },

    IBSS_NEWS: {
      id: "IBSS_NEWS",
      name: "IBSS News Layer",
      type: "internal",
      reliabilityScore: 68,
      confidenceWeight: 0.68,
      active: true,
      description: {
        en: "Internal live news layer.",
        ar: "طبقة الأخبار الحية الداخلية."
      }
    },

    IBSS_CONTENT: {
      id: "IBSS_CONTENT",
      name: "IBSS Content Registry",
      type: "internal",
      reliabilityScore: 82,
      confidenceWeight: 0.82,
      active: true,
      description: {
        en: "Published institutional studies and analytical content.",
        ar: "الدراسات والمنشورات التحليلية المؤسسية."
      }
    },

    IBSS_INGESTION: {
      id: "IBSS_INGESTION",
      name: "IBSS Live Ingestion",
      type: "internal",
      reliabilityScore: 64,
      confidenceWeight: 0.64,
      active: true,
      description: {
        en: "Live intake layer for manual or future external signals.",
        ar: "طبقة إدخال حي للإشارات اليدوية أو الخارجية مستقبلًا."
      }
    },

    IBSS_LOCAL: {
      id: "IBSS_LOCAL",
      name: "IBSS Local Input",
      type: "manual",
      reliabilityScore: 58,
      confidenceWeight: 0.58,
      active: true,
      description: {
        en: "Manual local input entered inside the platform.",
        ar: "إدخال محلي يدوي داخل المنصة."
      }
    },

    ENGINE: {
      id: "ENGINE",
      name: "IBSS Engine",
      type: "system",
      reliabilityScore: 86,
      confidenceWeight: 0.86,
      active: true,
      description: {
        en: "Computed system-level output from the decision engine.",
        ar: "مخرجات محسوبة من محرك القرار."
      }
    },

    SSU: {
      id: "SSU",
      name: "Sovereign Strategic Studies Unit",
      type: "unit",
      reliabilityScore: 84,
      confidenceWeight: 0.84,
      active: true,
      description: {
        en: "Strategic studies and sovereign interpretation unit.",
        ar: "وحدة الدراسات الاستراتيجية والتفسير السيادي."
      }
    },

    CRU: {
      id: "CRU",
      name: "Country Risk Unit",
      type: "unit",
      reliabilityScore: 78,
      confidenceWeight: 0.78,
      active: true,
      description: {
        en: "Country risk and regional pressure monitoring unit.",
        ar: "وحدة مخاطر الدول ورصد الضغط الإقليمي."
      }
    },

    NEWS: {
      id: "NEWS",
      name: "News Desk",
      type: "unit",
      reliabilityScore: 65,
      confidenceWeight: 0.65,
      active: true,
      description: {
        en: "News and live update desk.",
        ar: "وحدة الأخبار والتحديثات الحية."
      }
    },

    LIVE: {
      id: "LIVE",
      name: "Live Signal Layer",
      type: "system",
      reliabilityScore: 62,
      confidenceWeight: 0.62,
      active: true,
      description: {
        en: "Live signal processing layer.",
        ar: "طبقة معالجة الإشارات الحية."
      }
    }
  };

  function buildProfile(input = {}) {
    const id = normalizeKey(input.id || input.name || "UNKNOWN_SOURCE");

    return {
      id,
      name: safeText(input.name, id),
      type: safeText(input.type, CONFIG.defaultType),
      reliabilityScore: clamp(safeNumber(input.reliabilityScore, CONFIG.defaultReliability), 0, 100),
      confidenceWeight: Math.max(0, Math.min(1, safeNumber(input.confidenceWeight, CONFIG.defaultReliability / 100))),
      active: input.active !== false,
      description: input.description || {
        en: safeText(input.description_en, "No description available."),
        ar: safeText(input.description_ar, "لا يوجد وصف.")
      },
      createdAt: safeText(input.createdAt, nowIso()),
      updatedAt: safeText(input.updatedAt, nowIso())
    };
  }

  function registerSource(source) {
    const profile = buildProfile(source);
    registry[profile.id] = profile;
    return clone(profile);
  }

  function getSource(id) {
    const key = normalizeKey(id);
    return clone(registry[key] || null);
  }

  function getSourceProfile(id) {
    const key = normalizeKey(id);

    if (registry[key]) {
      return clone(registry[key]);
    }

    return buildProfile({
      id: key || "UNKNOWN_SOURCE",
      name: key || "Unknown Source",
      type: "unknown",
      reliabilityScore: CONFIG.defaultReliability,
      confidenceWeight: CONFIG.defaultReliability / 100,
      active: true
    });
  }

  function getReliability(id) {
    return safeNumber(getSourceProfile(id)?.reliabilityScore, CONFIG.defaultReliability);
  }

  function getConfidenceWeight(id) {
    return safeNumber(getSourceProfile(id)?.confidenceWeight, CONFIG.defaultReliability / 100);
  }

  function isActive(id) {
    return !!getSourceProfile(id)?.active;
  }

  function getAllSources() {
    return Object.values(registry).map(item => clone(item));
  }

  function getActiveSources() {
    return getAllSources().filter(item => item.active);
  }

  function enrichItem(item = {}) {
    const sourceId =
      item.source ||
      item.sourceUnit ||
      item.unit ||
      item.sourceName ||
      "UNKNOWN_SOURCE";

    const profile = getSourceProfile(sourceId);

    return {
      ...item,
      sourceProfile: profile,
      reliabilityScore: item.reliabilityScore != null
        ? clamp(safeNumber(item.reliabilityScore, profile.reliabilityScore), 0, 100)
        : profile.reliabilityScore
    };
  }

  return {
    CONFIG,
    registerSource,
    getSource,
    getSourceProfile,
    getReliability,
    getConfidenceWeight,
    isActive,
    getAllSources,
    getActiveSources,
    enrichItem
  };
})();
