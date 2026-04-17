window.IBSS_INGESTION = (function () {
  "use strict";

  const CONFIG = {
    refreshMs: 5 * 60 * 1000,
    requestTimeoutMs: 12000,
    maxItems: 300,
    storageKey: "ibss_ingestion_state_v4",
    freshnessHalfLifeHours: 18,
    defaultReliability: 55
  };

  const STATE = {
    initialized: false,
    raw: [],
    normalized: [],
    scored: [],
    lastUpdate: null,
    lastError: null,
    activeRequest: null
  };

  /* =========================
     UTILITIES
  ========================= */

  const now = () => Date.now();
  const nowIso = () => new Date().toISOString();

  const safeText = (v, f = "") => typeof v === "string" && v.trim() ? v.trim() : f;
  const safeNumber = (v, f = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : f;
  };

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  const normalizeText = (v) =>
    safeText(String(v || ""))
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

  const deepClone = (v) => JSON.parse(JSON.stringify(v));

  /* =========================
     SOURCE INTELLIGENCE
  ========================= */

  function detectSource(item) {
    return safeText(
      item.source || item.sourceName || item.provider || "UNKNOWN"
    );
  }

  function sourceReliability(name) {
    const s = normalizeText(name);

    if (s.includes("reuters")) return 88;
    if (s.includes("ap")) return 86;
    if (s.includes("bbc")) return 82;
    if (s.includes("bloomberg")) return 84;
    if (s.includes("al jazeera")) return 74;

    return CONFIG.defaultReliability;
  }

  /* =========================
     DOMAIN / GEO
  ========================= */

  function detectDomain(item) {
    const text = normalizeText(
      `${item.title || ""} ${item.summary || ""} ${item.tags || ""}`
    );

    if (text.match(/missile|army|strike|drone/)) return "military";
    if (text.match(/attack|raid|security/)) return "security";
    if (text.match(/economy|inflation|trade/)) return "economic";
    if (text.match(/talk|ceasefire|diplomatic/)) return "diplomatic";

    return "geopolitical";
  }

  function detectCountry(item) {
    const text = normalizeText(item.title + " " + item.summary);

    if (text.includes("gaza")) return "gaza";
    if (text.includes("israel")) return "israel";
    if (text.includes("iran")) return "iran";

    return "global";
  }

  /* =========================
     FRESHNESS ENGINE
  ========================= */

  function freshnessScore(timestamp) {
    const ageMs = now() - new Date(timestamp).getTime();
    const ageH = ageMs / (1000 * 60 * 60);

    const decay = Math.exp(-ageH / CONFIG.freshnessHalfLifeHours);

    return clamp(decay, 0, 1);
  }

  /* =========================
     NORMALIZATION
  ========================= */

  function normalizeItem(item, index) {
    const source = detectSource(item);

    return {
      id: item.id || `RAW-${index}`,
      title: safeText(item.title, "Untitled"),
      summary: safeText(item.summary, "No summary"),
      timestamp: item.publishedAt || nowIso(),
      source,
      reliability: sourceReliability(source),
      domain: detectDomain(item),
      country: detectCountry(item),
      priority: safeText(item.priority, "LOW").toUpperCase(),
      raw: item
    };
  }

  /* =========================
     DEDUPLICATION
  ========================= */

  function dedupe(list) {
    const map = new Map();

    list.forEach(item => {
      const key = `${normalizeText(item.title)}|${item.country}|${item.domain}`;

      if (!map.has(key)) {
        map.set(key, item);
        return;
      }

      const prev = map.get(key);

      if (new Date(item.timestamp) > new Date(prev.timestamp)) {
        map.set(key, item);
      }
    });

    return [...map.values()];
  }

  /* =========================
     SCORING (SOVEREIGN)
  ========================= */

  function scoreItem(item) {
    const freshness = freshnessScore(item.timestamp);

    const priorityWeight =
      item.priority === "HIGH" ? 0.9 :
      item.priority === "MEDIUM" ? 0.6 : 0.3;

    const reliabilityWeight = item.reliability / 100;

    const score =
      (freshness * 0.35) +
      (priorityWeight * 0.35) +
      (reliabilityWeight * 0.30);

    return {
      ...item,
      freshness,
      score,
      score100: Math.round(score * 100)
    };
  }

  /* =========================
     PIPELINE
  ========================= */

  function process(items) {
    const normalized = items.map(normalizeItem);
    const deduped = dedupe(normalized);
    const scored = deduped.map(scoreItem)
      .sort((a, b) => b.score100 - a.score100)
      .slice(0, CONFIG.maxItems);

    STATE.raw = items;
    STATE.normalized = deduped;
    STATE.scored = scored;
    STATE.lastUpdate = nowIso();

    save();
    emit();

    return scored;
  }

  /* =========================
     FETCH
  ========================= */

  async function fetchFeed(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.requestTimeoutMs);

    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(res.status);
      return await res.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  async function refresh() {
    if (STATE.activeRequest) return STATE.activeRequest;

    STATE.activeRequest = (async () => {
      try {
        let data = [];

        try {
          data = await fetchFeed("/api/intake/feed");
        } catch {
          data = window.IBSS_NEWS || [];
        }

        return process(data);
      } catch (e) {
        STATE.lastError = e.message;
        return STATE.scored;
      } finally {
        STATE.activeRequest = null;
      }
    })();

    return STATE.activeRequest;
  }

  /* =========================
     STORAGE
  ========================= */

  function save() {
    localStorage.setItem(CONFIG.storageKey, JSON.stringify(STATE));
  }

  function load() {
    const raw = localStorage.getItem(CONFIG.storageKey);
    if (!raw) return;

    const parsed = JSON.parse(raw);
    Object.assign(STATE, parsed);
  }

  /* =========================
     EVENTS
  ========================= */

  function emit() {
    window.dispatchEvent(new CustomEvent("ibss:ingestion", {
      detail: {
        count: STATE.scored.length,
        updatedAt: STATE.lastUpdate
      }
    }));
  }

  /* =========================
     PUBLIC API
  ========================= */

  function getAll() {
    return deepClone(STATE.scored);
  }

  function getLatest(n = 20) {
    return getAll().slice(0, n);
  }

  function init() {
    if (STATE.initialized) return;
    load();
    STATE.initialized = true;
  }

  init();

  return {
    refresh,
    getAll,
    getLatest
  };
})();
