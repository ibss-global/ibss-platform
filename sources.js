// IBSS SOURCES REGISTRY — Real Source Registry
// Version: v3.0

window.IBSS_SOURCES = (function () {
  "use strict";

  const CONFIG = {
    version: "v3.0-real-source-registry",
    storageKey: "ibss_sources_registry_v30",
    defaultReliability: 60
  };

  const STATE = {
    registry: {}
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

  function clone(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      console.error("IBSS_SOURCES clone error:", error);
      return null;
    }
  }

  function nowIso() {
    return new Date().toISOString();
  }

  const DEFAULT_SOURCES = {
    IBSS_SEED: {
      id: "IBSS_SEED",
      name: "IBSS Seed Dataset",
      type: "internal",
      url: "",
      active: true,
      reliabilityScore: 72,
      confidenceWeight: 0.72,
      parser: "internal",
      region: "global",
      domain: "geopolitical"
    },

    IBSS_NEWS: {
      id: "IBSS_NEWS",
      name: "IBSS News Layer",
      type: "internal",
      url: "",
      active: true,
      reliabilityScore: 68,
      confidenceWeight: 0.68,
      parser: "internal",
      region: "global",
      domain: "geopolitical"
    },

    IBSS_CONTENT: {
      id: "IBSS_CONTENT",
      name: "IBSS Content Registry",
      type: "internal",
      url: "",
      active: true,
      reliabilityScore: 82,
      confidenceWeight: 0.82,
      parser: "internal",
      region: "global",
      domain: "geopolitical"
    },

    IBSS_INGESTION: {
      id: "IBSS_INGESTION",
      name: "IBSS Live Ingestion",
      type: "internal",
      url: "",
      active: true,
      reliabilityScore: 64,
      confidenceWeight: 0.64,
      parser: "internal",
      region: "global",
      domain: "geopolitical"
    },

    IBSS_LIVE_DEMO: {
      id: "IBSS_LIVE_DEMO",
      name: "IBSS Live Demo Source",
      type: "demo",
      url: "",
      active: true,
      reliabilityScore: 66,
      confidenceWeight: 0.66,
      parser: "demo",
      region: "global",
      domain: "geopolitical"
    }
  };

  function normalizeSource(source = {}) {
    const id = normalizeKey(source.id || source.name || "UNKNOWN_SOURCE");

    return {
      id,
      name: safeText(source.name, id),
      type: safeText(source.type, "json"),
      url: safeText(source.url, ""),
      active: source.active !== false,
      reliabilityScore: clamp(safeNumber(source.reliabilityScore, CONFIG.defaultReliability), 0, 100),
      confidenceWeight: Math.max(0, Math.min(1, safeNumber(source.confidenceWeight, safeNumber(source.reliabilityScore, CONFIG.defaultReliability) / 100))),
      parser: safeText(source.parser, "auto"),
      region: safeText(source.region, "global"),
      domain: safeText(source.domain, "geopolitical"),
      description: source.description || {
        en: safeText(source.description_en, "No description available."),
        ar: safeText(source.description_ar, "لا يوجد وصف.")
      },
      createdAt: safeText(source.createdAt, nowIso()),
      updatedAt: nowIso()
    };
  }

  function saveState() {
    try {
      localStorage.setItem(CONFIG.storageKey, JSON.stringify({
        registry: STATE.registry
      }));
    } catch (error) {
      console.error("IBSS_SOURCES saveState error:", error);
    }
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(CONFIG.storageKey);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;

      STATE.registry = parsed.registry || {};
    } catch (error) {
      console.error("IBSS_SOURCES loadState error:", error);
    }
  }

  function seedDefaults() {
    Object.values(DEFAULT_SOURCES).forEach(source => {
      const normalized = normalizeSource(source);
      if (!STATE.registry[normalized.id]) {
        STATE.registry[normalized.id] = normalized;
      }
    });

    saveState();
  }

  function registerSource(source) {
    const normalized = normalizeSource(source);
    STATE.registry[normalized.id] = normalized;
    saveState();

    try {
      if (window.IBSS_INGESTION?.registerSource && normalized.url) {
        window.IBSS_INGESTION.registerSource(normalized);
      }
    } catch (error) {
      console.error("IBSS_SOURCES ingestion register bridge error:", error);
    }

    return clone(normalized);
  }

  function registerSources(sources = []) {
    return Array.isArray(sources) ? sources.map(registerSource) : [];
  }

  function getSource(id) {
    const key = normalizeKey(id);
    return clone(STATE.registry[key] || null);
  }

  function getSourceProfile(id) {
    const key = normalizeKey(id);

    if (STATE.registry[key]) {
      return clone(STATE.registry[key]);
    }

    return normalizeSource({
      id: key || "UNKNOWN_SOURCE",
      name: key || "Unknown Source",
      type: "unknown",
      reliabilityScore: CONFIG.defaultReliability,
      active: true
    });
  }

  function getAllSources() {
    return Object.values(STATE.registry).map(item => clone(item));
  }

  function getActiveSources() {
    return getAllSources().filter(source => source.active);
  }

  function getExternalSources() {
    return getAllSources().filter(source => source.active && source.url);
  }

  function setActive(id, active) {
    const key = normalizeKey(id);

    if (!STATE.registry[key]) return null;

    STATE.registry[key].active = !!active;
    STATE.registry[key].updatedAt = nowIso();
    saveState();

    return clone(STATE.registry[key]);
  }

  function removeSource(id) {
    const key = normalizeKey(id);

    if (!STATE.registry[key]) return false;

    delete STATE.registry[key];
    saveState();

    return true;
  }

  function clearCustomSources() {
    Object.keys(STATE.registry).forEach(key => {
      if (!DEFAULT_SOURCES[key]) {
        delete STATE.registry[key];
      }
    });

    saveState();
    return true;
  }

  function getReliability(id) {
    return safeNumber(getSourceProfile(id)?.reliabilityScore, CONFIG.defaultReliability);
  }

  function getConfidenceWeight(id) {
    return safeNumber(getSourceProfile(id)?.confidenceWeight, CONFIG.defaultReliability / 100);
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

  function syncExternalSourcesToIngestion() {
    const externalSources = getExternalSources();

    if (!window.IBSS_INGESTION?.registerSources) {
      return {
        ok: false,
        count: externalSources.length,
        error: "IBSS_INGESTION not available"
      };
    }

    window.IBSS_INGESTION.registerSources(externalSources);

    return {
      ok: true,
      count: externalSources.length,
      error: null
    };
  }

  function registerJsonFeed(id, name, url, options = {}) {
    return registerSource({
      id,
      name,
      url,
      type: "json",
      parser: "json",
      active: options.active !== false,
      reliabilityScore: options.reliabilityScore || CONFIG.defaultReliability,
      region: options.region || "global",
      domain: options.domain || "geopolitical",
      description: options.description || undefined
    });
  }

  function registerRssFeed(id, name, url, options = {}) {
    return registerSource({
      id,
      name,
      url,
      type: "rss",
      parser: "rss",
      active: options.active !== false,
      reliabilityScore: options.reliabilityScore || CONFIG.defaultReliability,
      region: options.region || "global",
      domain: options.domain || "geopolitical",
      description: options.description || undefined
    });
  }

  function getDiagnostics() {
    const all = getAllSources();
    const external = getExternalSources();

    return {
      version: CONFIG.version,
      totalSources: all.length,
      activeSources: all.filter(item => item.active).length,
      externalSources: external.length,
      sourceIds: all.map(item => item.id)
    };
  }

  loadState();
  seedDefaults();

  return {
    CONFIG,

    registerSource,
    registerSources,
    registerJsonFeed,
    registerRssFeed,

    getSource,
    getSourceProfile,
    getAllSources,
    getActiveSources,
    getExternalSources,

    setActive,
    removeSource,
    clearCustomSources,

    getReliability,
    getConfidenceWeight,
    enrichItem,

    syncExternalSourcesToIngestion,
    getDiagnostics
  };
})();
