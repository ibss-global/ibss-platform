window.IBSS_NEWS_UTILS = (function () {
  "use strict";

  const CONFIG = {
    maxNews: 120,
    maxTickerItems: 24,
    maxFeedItems: 40,
    highPriorityThreshold: 7,
    mediumPriorityThreshold: 4
  };

  const STATE = {
    initialized: false,
    lastUpdate: null,
    cache: [],
    tickerCache: [],
    feedCache: []
  };

  function ensureInit() {
    if (STATE.initialized) return;

    window.addEventListener("ibss:ingestion-updated", handleIngestionUpdate);

    STATE.initialized = true;
    refreshFromIngestion();
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function clone(v) {
    return JSON.parse(JSON.stringify(v));
  }

  function safeText(v, f = "") {
    return typeof v === "string" && v.trim() ? v.trim() : f;
  }

  function normalizePriority(item) {
    const p = String(item?.priority || "").toUpperCase();
    if (p === "HIGH") return "HIGH";
    if (p === "MEDIUM") return "MEDIUM";

    const severity = Number(item?.severity || 0);

    if (severity >= CONFIG.highPriorityThreshold) return "HIGH";
    if (severity >= CONFIG.mediumPriorityThreshold) return "MEDIUM";

    return "LOW";
  }

  function buildNewsObject(item) {
    return {
      id: safeText(item.id, "news-" + Math.random()),

      title: item.title || { en: "-", ar: "-" },
      summary: item.summary || { en: "-", ar: "-" },

      source: safeText(item.source, "unknown"),
      sourceProfile: item.sourceProfile || { reliabilityScore: 50 },

      domain: safeText(item.domain, "general"),
      region: safeText(item.region, "global"),
      country: safeText(item.country, "global"),

      priority: normalizePriority(item),
      severity: Number(item.severity || 0),

      confidence: Number(item.confidence || 0),
      impact: Number(item.impact || 0),
      urgency: Number(item.urgency || 0),

      tags: item.tags || [],
      actors: item.actors || [],

      publishedAt: item.timestamp || nowIso(),
      url: item.url || "#"
    };
  }

  function refreshFromIngestion() {
    try {
      if (!window.IBSS_INGESTION) return;

      const raw = window.IBSS_INGESTION.getAllNormalized();

      const mapped = raw.map(buildNewsObject);

      const sorted = mapped.sort((a, b) => {
        if (b.severity !== a.severity) return b.severity - a.severity;
        return new Date(b.publishedAt) - new Date(a.publishedAt);
      });

      STATE.cache = sorted.slice(0, CONFIG.maxNews);

      buildDerivedCaches();

      STATE.lastUpdate = nowIso();

    } catch (err) {
      console.error("NEWS refresh error:", err);
    }
  }

  function buildDerivedCaches() {
    STATE.tickerCache = STATE.cache.slice(0, CONFIG.maxTickerItems);

    STATE.feedCache = STATE.cache.slice(0, CONFIG.maxFeedItems);
  }

  function handleIngestionUpdate() {
    refreshFromIngestion();
  }

  function getAllNews() {
    ensureInit();
    return clone(STATE.cache);
  }

  function getLatestNews(limit = 10) {
    ensureInit();
    return clone(STATE.cache.slice(0, limit));
  }

  function getTickerNews(limit = CONFIG.maxTickerItems) {
    ensureInit();
    return clone(STATE.tickerCache.slice(0, limit));
  }

  function getFeedNews(limit = CONFIG.maxFeedItems) {
    ensureInit();
    return clone(STATE.feedCache.slice(0, limit));
  }

  function getHighPriorityNews() {
    ensureInit();
    return clone(STATE.cache.filter(n => n.priority === "HIGH"));
  }

  function getByCountry(country) {
    ensureInit();
    const key = String(country || "").toLowerCase();
    return clone(
      STATE.cache.filter(n =>
        String(n.country || "").toLowerCase() === key
      )
    );
  }

  function getByDomain(domain) {
    ensureInit();
    const key = String(domain || "").toLowerCase();
    return clone(
      STATE.cache.filter(n =>
        String(n.domain || "").toLowerCase() === key
      )
    );
  }

  function autoRefreshIfNeeded() {
    ensureInit();

    if (!STATE.lastUpdate) {
      refreshFromIngestion();
      return true;
    }

    const diff = Date.now() - new Date(STATE.lastUpdate).getTime();

    if (diff > 60000) {
      refreshFromIngestion();
      return true;
    }

    return false;
  }

  return {
    getAllNews,
    getLatestNews,
    getTickerNews,
    getFeedNews,

    getHighPriorityNews,
    getByCountry,
    getByDomain,

    autoRefreshIfNeeded
  };
})();
