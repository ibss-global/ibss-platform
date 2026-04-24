// IBSS INGESTION ENGINE — Stable Live Intake Layer
// Version: v2.0

window.IBSS_INGESTION = (function () {
  "use strict";

  const CONFIG = {
    version: "v2.0-stable-live-intake-layer",
    storageKey: "ibss_ingestion_state_v20",
    maxItems: 160,
    autoRefreshMs: 30000,
    defaultReliability: 64,
    defaultFreshness: 0.72
  };

  const STATE = {
    initialized: false,
    items: [],
    normalized: [],
    refreshTimer: null,
    lastRefreshAt: null
  };

  function safeText(value, fallback = "") {
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
  }

  function safeNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
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

  function localize(en, ar) {
    return {
      en: safeText(en, "-"),
      ar: safeText(ar, en || "-")
    };
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function buildId(prefix = "INTAKE") {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  }

  function clone(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      console.error("IBSS_INGESTION clone error:", error);
      return null;
    }
  }

  function getLocalizedText(value, lang = "en") {
    if (!value) return "";
    if (typeof value === "string" || typeof value === "number") return String(value);

    return (
      value?.[lang] ||
      value?.en ||
      value?.ar ||
      value?.name ||
      value?.title ||
      value?.label ||
      value?.text ||
      ""
    );
  }

  function normalizePriority(value) {
    const p = String(value || "LOW").toUpperCase().trim();
    if (p === "HIGH") return "HIGH";
    if (p === "MEDIUM") return "MEDIUM";
    return "LOW";
  }

  function inferPriority(score) {
    const value = safeNumber(score, 0);
    if (value >= 78) return "HIGH";
    if (value >= 52) return "MEDIUM";
    return "LOW";
  }

  function priorityScore(priority) {
    const p = normalizePriority(priority);
    if (p === "HIGH") return 76;
    if (p === "MEDIUM") return 58;
    return 38;
  }

  function normalizeScore(item) {
    const direct = safeNumber(item?.score100 ?? item?.balancedScore100 ?? item?.riskScore, NaN);

    if (Number.isFinite(direct)) {
      return clamp(Math.round(direct), 0, 100);
    }

    const metrics = item?.metrics || {};
    const metricScore =
      safeNumber(metrics.weight, 0.5) * 35 +
      safeNumber(metrics.volatility, 0.5) * 25 +
      safeNumber(metrics.impact, 0.5) * 40;

    const priorityBase = priorityScore(item?.priority || item?.severity);

    return clamp(Math.round((metricScore * 0.62) + (priorityBase * 0.38)), 0, 100);
  }

  function normalizeItem(item, index = 0) {
    const score = normalizeScore(item);
    const priority = normalizePriority(item?.priority || item?.severity || inferPriority(score));

    const title = item?.title || item?.headline || localize("Untitled Intake Signal", "إشارة إدخال غير معنونة");
    const summary = item?.summary || item?.description || item?.text || title;
    const description = item?.description || item?.summary || item?.text || summary;

    const region = normalizeText(item?.region || item?.country || item?.countryId || "global") || "global";
    const country = normalizeText(item?.country || item?.countryId || item?.region || "global") || "global";
    const domain = normalizeText(item?.domain || item?.category || item?.signalType || "geopolitical") || "geopolitical";

    return {
      id: safeText(item?.id, `ING-${index + 1}`),
      title,
      summary,
      description,
      country,
      region,
      domain,
      priority,
      score100: score,
      balancedScore100: score,
      reliabilityScore: clamp(safeNumber(item?.reliabilityScore, CONFIG.defaultReliability), 0, 100),
      freshnessScore: clamp(safeNumber(item?.freshnessScore, CONFIG.defaultFreshness), 0, 1),
      timestamp: safeText(item?.timestamp || item?.publishedAt || item?.createdAt, nowIso()),
      source: safeText(item?.source || item?.sourceName, "IBSS_INGESTION"),
      sourceUnit: safeText(item?.sourceUnit, "LIVE"),
      signalType: item?.signalType || null,
      decisionMode: item?.decisionMode || item?.mode || null,
      layer: item?.layer || null,
      influenceBand: item?.influenceBand || null,
      live: item?.live !== false,
      raw: clone(item)
    };
  }

  function dedupe(list) {
    const seen = new Set();
    const output = [];

    asArray(list).forEach(item => {
      const key = [
        normalizeText(getLocalizedText(item.title, "en")),
        normalizeText(item.region),
        normalizeText(item.domain),
        normalizeText(item.source)
      ].join("|");

      if (!seen.has(key)) {
        seen.add(key);
        output.push(item);
      }
    });

    return output;
  }

  function saveState() {
    try {
      localStorage.setItem(CONFIG.storageKey, JSON.stringify({
        items: STATE.items,
        normalized: STATE.normalized,
        lastRefreshAt: STATE.lastRefreshAt
      }));
    } catch (error) {
      console.error("IBSS_INGESTION saveState error:", error);
    }
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(CONFIG.storageKey);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;

      STATE.items = asArray(parsed.items);
      STATE.normalized = asArray(parsed.normalized);
      STATE.lastRefreshAt = parsed.lastRefreshAt || null;
    } catch (error) {
      console.error("IBSS_INGESTION loadState error:", error);
    }
  }

  function ensureInit() {
    if (STATE.initialized) return;
    loadState();
    STATE.initialized = true;
  }

  function rebuildNormalized() {
    const normalized = STATE.items
      .map(normalizeItem)
      .sort((a, b) => {
        const scoreDiff = safeNumber(b.balancedScore100, 0) - safeNumber(a.balancedScore100, 0);
        if (scoreDiff !== 0) return scoreDiff;

        return new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime();
      });

    STATE.normalized = dedupe(normalized).slice(0, CONFIG.maxItems);
    STATE.lastRefreshAt = nowIso();

    saveState();

    return clone(STATE.normalized) || [];
  }

  function add(item) {
    ensureInit();

    const prepared = {
      ...item,
      id: safeText(item?.id, buildId("ING")),
      createdAt: safeText(item?.createdAt, nowIso())
    };

    STATE.items.unshift(prepared);
    STATE.items = STATE.items.slice(0, CONFIG.maxItems);

    const normalized = rebuildNormalized();

    window.dispatchEvent(new CustomEvent("ibss:ingestion-updated", {
      detail: {
        action: "add",
        item: clone(prepared)
      }
    }));

    return clone(normalized[0] || prepared);
  }

  function addMany(items = []) {
    ensureInit();

    asArray(items).forEach(item => {
      STATE.items.unshift({
        ...item,
        id: safeText(item?.id, buildId("ING")),
        createdAt: safeText(item?.createdAt, nowIso())
      });
    });

    STATE.items = STATE.items.slice(0, CONFIG.maxItems);

    const normalized = rebuildNormalized();

    window.dispatchEvent(new CustomEvent("ibss:ingestion-updated", {
      detail: {
        action: "addMany",
        count: asArray(items).length
      }
    }));

    return clone(normalized);
  }

  function remove(id) {
    ensureInit();

    STATE.items = STATE.items.filter(item => item.id !== id);
    const normalized = rebuildNormalized();

    window.dispatchEvent(new CustomEvent("ibss:ingestion-updated", {
      detail: {
        action: "remove",
        id
      }
    }));

    return clone(normalized);
  }

  function clear() {
    ensureInit();

    STATE.items = [];
    STATE.normalized = [];
    STATE.lastRefreshAt = nowIso();

    saveState();

    window.dispatchEvent(new CustomEvent("ibss:ingestion-updated", {
      detail: {
        action: "clear"
      }
    }));

    return true;
  }

  function refresh() {
    ensureInit();

    rebuildNormalized();

    window.dispatchEvent(new CustomEvent("ibss:ingestion", {
      detail: {
        action: "refresh",
        refreshedAt: STATE.lastRefreshAt
      }
    }));

    return clone(STATE.normalized);
  }

  function startAutoRefresh(ms = CONFIG.autoRefreshMs) {
    ensureInit();

    stopAutoRefresh();

    STATE.refreshTimer = setInterval(() => {
      refresh();
    }, Math.max(5000, safeNumber(ms, CONFIG.autoRefreshMs)));

    return true;
  }

  function stopAutoRefresh() {
    if (STATE.refreshTimer) {
      clearInterval(STATE.refreshTimer);
      STATE.refreshTimer = null;
    }

    return true;
  }

  function getAll() {
    ensureInit();
    return clone(STATE.items) || [];
  }

  function getAllNormalized() {
    ensureInit();

    if (!STATE.normalized.length && STATE.items.length) {
      rebuildNormalized();
    }

    return clone(STATE.normalized) || [];
  }

  function getLatest(limit = 10) {
    return getAllNormalized().slice(0, Math.max(1, safeNumber(limit, 10)));
  }

  function getDiagnostics() {
    ensureInit();

    return {
      initialized: STATE.initialized,
      items: STATE.items.length,
      normalized: STATE.normalized.length,
      lastRefreshAt: STATE.lastRefreshAt,
      autoRefreshRunning: !!STATE.refreshTimer
    };
  }

  ensureInit();

  return {
    CONFIG,
    add,
    addMany,
    remove,
    clear,
    refresh,
    startAutoRefresh,
    stopAutoRefresh,
    getAll,
    getAllNormalized,
    getLatest,
    getDiagnostics,
    normalizeItem
  };
})();
