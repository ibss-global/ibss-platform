window.IBSS_INGESTION = (function () {
  "use strict";

  let STATE = {
    raw: [],
    normalized: [],
    lastUpdate: null
  };

  function now() {
    return new Date().toISOString();
  }

  function generateId(prefix = "NEWS") {
    return prefix + "-" + Math.random().toString(36).slice(2, 10);
  }

  function resolveSource(sourceName) {
    if (!window.IBSS_SOURCES) return null;

    return (
      window.IBSS_SOURCES.getSourceByName(sourceName) ||
      window.IBSS_SOURCES.getSourceById(sourceName) ||
      null
    );
  }

  function normalizeNewsItem(item) {
    const sourceProfile = resolveSource(item.source);

    return {
      id: generateId(),
      title: item.title || "",
      summary: item.summary || item.description || "",
      source: sourceProfile ? sourceProfile.id : item.source || "UNKNOWN",
      sourceProfile: sourceProfile
        ? window.IBSS_SOURCES.buildSourceProfile(sourceProfile)
        : null,
      timestamp: item.timestamp || now(),
      region: item.region || "global",
      domains: item.domains || [],
      actors: item.actors || [],
      tags: item.tags || [],
      severity: estimateSeverity(item),
      confidence: estimateConfidence(sourceProfile),
      raw: item
    };
  }

  function estimateSeverity(item) {
    const text = (item.title + " " + (item.summary || "")).toLowerCase();

    if (text.includes("war") || text.includes("strike") || text.includes("attack")) return 90;
    if (text.includes("tension") || text.includes("pressure")) return 65;
    if (text.includes("talk") || text.includes("meeting")) return 40;

    return 50;
  }

  function estimateConfidence(sourceProfile) {
    if (!sourceProfile) return 40;

    const reliability = window.IBSS_SOURCES.scoreSourceReliability(sourceProfile);
    return Math.round(reliability);
  }

  function ingestBatch(newsArray) {
    if (!Array.isArray(newsArray)) return [];

    const normalized = newsArray.map(normalizeNewsItem);

    STATE.raw.push(...newsArray);
    STATE.normalized.push(...normalized);
    STATE.lastUpdate = now();

    return normalized;
  }

  function getAllNormalized() {
    return [...STATE.normalized];
  }

  function clear() {
    STATE.raw = [];
    STATE.normalized = [];
    STATE.lastUpdate = null;
  }

  function getState() {
    return {
      count: STATE.normalized.length,
      lastUpdate: STATE.lastUpdate
    };
  }

  return {
    ingestBatch,
    getAllNormalized,
    clear,
    getState
  };
})();
