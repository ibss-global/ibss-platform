window.IBSS_INGESTION = (function () {
  "use strict";

  const CONFIG = {
    refreshMs: 5 * 60 * 1000,
    requestTimeoutMs: 12000,
    maxItems: 300,
    maxPerSource: 120,
    storageKey: "ibss_ingestion_state_v3",
    primaryFeedUrl: "/api/intake/feed",
    fallbackFeedUrl: "/ibss-feed.json",
    enableAutoRefresh: true,
    acceptedLanguages: ["en", "ar"],
    defaultSourceReliability: 55
  };

  const STATE = {
    initialized: false,
    normalized: [],
    raw: [],
    sources: [],
    lastUpdate: null,
    lastError: null,
    activeRequest: null
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

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function normalizeText(value) {
    return safeText(String(value || ""))
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function buildId(prefix = "ING") {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function localize(enText, arText) {
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

    return (
      value?.[lang] ||
      value?.en ||
      value?.ar ||
      value?.title ||
      value?.name ||
      value?.label ||
      ""
    );
  }

  function normalizePriority(value) {
    const p = String(value || "").toUpperCase().trim();
    if (p === "HIGH") return "HIGH";
    if (p === "MEDIUM") return "MEDIUM";
    return "LOW";
  }

  function detectLanguage(item) {
    const explicit = normalizeText(item?.language || item?.lang);
    if (CONFIG.acceptedLanguages.includes(explicit)) return explicit;

    const arTitle = getLocalizedField(item, "title", "ar");
    const arSummary = getLocalizedField(item, "summary", "ar");
    if (/[ء-ي]/.test(`${arTitle} ${arSummary}`)) return "ar";

    return "en";
  }

  function detectSourceName(item) {
    return safeText(
      item?.source ||
      item?.sourceName ||
      item?.provider ||
      item?.publisher ||
      item?.origin,
      "UNKNOWN"
    );
  }

  function detectSourceReliability(item) {
    const profileScore = safeNumber(item?.sourceProfile?.reliabilityScore, NaN);
    if (Number.isFinite(profileScore)) {
      return clamp(profileScore, 0, 100);
    }

    const source = normalizeText(detectSourceName(item));

    if (source.includes("reuters")) return 88;
    if (source.includes("associated press") || source.includes("ap")) return 86;
    if (source.includes("bloomberg")) return 84;
    if (source.includes("financial times")) return 82;
    if (source.includes("al jazeera")) return 74;
    if (source.includes("bbc")) return 80;
    if (source.includes("monitor")) return 66;
    if (source.includes("watch")) return 62;
    if (source.includes("local")) return 58;

    return CONFIG.defaultSourceReliability;
  }

  function detectDomain(item) {
    const direct =
      normalizeText(item?.domain || item?.category || item?.topic || item?.vertical);

    if (direct) return direct;

    const text = normalizeText([
      getLocalizedField(item, "title", "en"),
      getLocalizedField(item, "summary", "en"),
      getLocalizedField(item, "title", "ar"),
      getLocalizedField(item, "summary", "ar"),
      safeText(item?.region),
      safeText(item?.country),
      asArray(item?.tags).join(" ")
    ].join(" "));

    if (
      text.includes("military") ||
      text.includes("strike") ||
      text.includes("army") ||
      text.includes("missile") ||
      text.includes("drone") ||
      text.includes("front")
    ) return "military";

    if (
      text.includes("security") ||
      text.includes("raid") ||
      text.includes("attack") ||
      text.includes("terror") ||
      text.includes("intelligence")
    ) return "security";

    if (
      text.includes("diplomatic") ||
      text.includes("negotiation") ||
      text.includes("talk") ||
      text.includes("mediation") ||
      text.includes("ceasefire")
    ) return "diplomatic";

    if (
      text.includes("economic") ||
      text.includes("market") ||
      text.includes("inflation") ||
      text.includes("trade") ||
      text.includes("tariff")
    ) return "economic";

    if (
      text.includes("oil") ||
      text.includes("gas") ||
      text.includes("energy")
    ) return "energy";

    if (
      text.includes("shipping") ||
      text.includes("maritime") ||
      text.includes("sea") ||
      text.includes("port") ||
      text.includes("red sea")
    ) return "maritime";

    if (
      text.includes("supply") ||
      text.includes("corridor") ||
      text.includes("route") ||
      text.includes("logistics")
    ) return "logistics";

    return "geopolitical";
  }

  function detectRegion(item) {
    return safeText(
      item?.region ||
      item?.geo?.region ||
      item?.country ||
      item?.location?.region,
      "global"
    );
  }

  function detectCountry(item) {
    if (safeText(item?.country)) return safeText(item.country);

    const tags = asArray(item?.tags).map(normalizeText);

    if (tags.includes("gaza")) return "gaza";
    if (tags.includes("west bank")) return "westbank";
    if (tags.includes("lebanon")) return "lebanon";
    if (tags.includes("iran")) return "iran";
    if (tags.includes("red sea")) return "redsea";

    return safeText(item?.region, "global");
  }

  function normalizeUrl(url) {
    const value = safeText(url, "");
    if (!value) return "#";
    if (value.startsWith("http://") || value.startsWith("https://")) return value;
    return "#";
  }

  function normalizeTimestamp(item) {
    const raw =
      item?.timestamp ||
      item?.publishedAt ||
      item?.published_at ||
      item?.createdAt ||
      item?.date ||
      nowIso();

    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return nowIso();
    return date.toISOString();
  }

  function normalizeTags(item) {
    return asArray(item?.tags)
      .map(tag => safeText(String(tag)))
      .filter(Boolean)
      .slice(0, 12);
  }

  function normalizeActors(item) {
    return asArray(item?.actors)
      .map(actor => safeText(String(actor)))
      .filter(Boolean)
      .slice(0, 10);
  }

  function normalizeNumericScore(value, fallback = 5) {
    return clamp(Math.round(safeNumber(value, fallback)), 0, 10);
  }

  function deriveSeverityFromPriority(priority) {
    if (priority === "HIGH") return 8;
    if (priority === "MEDIUM") return 6;
    return 3;
  }

  function normalizeTitle(item) {
    const en = getLocalizedField(item, "title", "en");
    const ar = getLocalizedField(item, "title", "ar");

    return {
      en: safeText(en, safeText(ar, "Untitled Signal")),
      ar: safeText(ar, safeText(en, "إشارة غير معنونة"))
    };
  }

  function normalizeSummary(item, title) {
    const en = getLocalizedField(item, "summary", "en");
    const ar = getLocalizedField(item, "summary", "ar");

    return {
      en: safeText(en, safeText(title?.en, "No summary available.")),
      ar: safeText(ar, safeText(title?.ar, "لا يوجد ملخص متاح."))
    };
  }

  function normalizeSourceProfile(item) {
    return {
      name: detectSourceName(item),
      reliabilityScore: detectSourceReliability(item)
    };
  }

  function normalizeRawItem(item, index = 0, sourceId = null) {
    const priority = normalizePriority(item?.priority || item?.severity);
    const title = normalizeTitle(item);
    const summary = normalizeSummary(item, title);

    return {
      id: safeText(item?.id, buildId("RAW")),
      sourceId: safeText(sourceId, "unknown-source"),
      source: detectSourceName(item),
      sourceProfile: normalizeSourceProfile(item),

      title,
      summary,

      domain: detectDomain(item),
      region: detectRegion(item),
      country: detectCountry(item),
      language: detectLanguage(item),

      priority,
      severity: normalizeNumericScore(
        item?.severity,
        deriveSeverityFromPriority(priority)
      ),
      confidence: normalizeNumericScore(item?.confidence, 6),
      impact: normalizeNumericScore(item?.impact, 5),
      urgency: normalizeNumericScore(item?.urgency, 5),
      persistence: normalizeNumericScore(item?.persistence, 5),
      spread: normalizeNumericScore(item?.spread, 5),

      tags: normalizeTags(item),
      actors: normalizeActors(item),

      timestamp: normalizeTimestamp(item),
      url: normalizeUrl(item?.url || item?.link),

      rawIndex: index,
      raw: item
    };
  }

  function buildDeduplicationKey(item) {
    return [
      normalizeText(item?.source),
      normalizeText(getLocalizedField(item, "title", "en")),
      normalizeText(item?.country),
      normalizeText(item?.domain)
    ].join("|");
  }

  function dedupeItems(items) {
    const map = new Map();

    asArray(items).forEach(item => {
      const key = buildDeduplicationKey(item);

      if (!map.has(key)) {
        map.set(key, item);
        return;
      }

      const existing = map.get(key);
      const existingDate = new Date(existing.timestamp).getTime();
      const currentDate = new Date(item.timestamp).getTime();

      if (currentDate > existingDate) {
        map.set(key, item);
      }
    });

    return [...map.values()];
  }

  function sortItems(items) {
    return asArray(items)
      .slice()
      .sort((a, b) => {
        const aPriority = priorityRank(a.priority);
        const bPriority = priorityRank(b.priority);
        if (bPriority !== aPriority) return bPriority - aPriority;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
  }

  function priorityRank(priority) {
    if (priority === "HIGH") return 3;
    if (priority === "MEDIUM") return 2;
    return 1;
  }

  function normalizeSourcePayload(source, sourceIndex = 0) {
    const sourceId = safeText(source?.id, `source-${sourceIndex + 1}`);
    const rawItems = asArray(
      source?.items ||
      source?.data ||
      source?.news ||
      source?.entries ||
      source?.signals
    );

    const normalizedItems = rawItems
      .map((item, index) => normalizeRawItem(item, index, sourceId))
      .filter(item => item.language && CONFIG.acceptedLanguages.includes(item.language));

    return {
      id: sourceId,
      name: safeText(source?.name, sourceId),
      type: safeText(source?.type, "feed"),
      items: normalizedItems.slice(0, CONFIG.maxPerSource)
    };
  }

  function extractSourcesFromPayload(payload) {
    if (!payload) return [];

    if (Array.isArray(payload)) {
      return [{
        id: "default-feed",
        name: "Default Feed",
        type: "feed",
        items: payload
      }];
    }

    if (Array.isArray(payload?.sources)) {
      return payload.sources;
    }

    if (Array.isArray(payload?.items)) {
      return [{
        id: "payload-items",
        name: "Payload Items",
        type: "feed",
        items: payload.items
      }];
    }

    return [];
  }

  async function fetchJsonWithTimeout(url, timeoutMs = CONFIG.requestTimeoutMs) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
        headers: {
          "Accept": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} from ${url}`);
      }

      return await response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async function tryLoadPrimaryFeed() {
    return await fetchJsonWithTimeout(CONFIG.primaryFeedUrl);
  }

  async function tryLoadFallbackFeed() {
    return await fetchJsonWithTimeout(CONFIG.fallbackFeedUrl);
  }

  function loadWindowSources() {
    return asArray(window.IBSS_SOURCES).length
      ? { sources: deepClone(window.IBSS_SOURCES) }
      : null;
  }

  function loadWindowNewsArray() {
    return asArray(window.IBSS_NEWS).length
      ? { items: deepClone(window.IBSS_NEWS) }
      : null;
  }

  async function resolvePayload() {
    const sources = [];

    try {
      const primary = await tryLoadPrimaryFeed();
      if (primary) sources.push({ payload: primary, channel: "primary" });
    } catch (error) {
      console.warn("IBSS_INGESTION primary feed unavailable:", error);
    }

    if (!sources.length) {
      try {
        const fallback = await tryLoadFallbackFeed();
        if (fallback) sources.push({ payload: fallback, channel: "fallback-feed" });
      } catch (error) {
        console.warn("IBSS_INGESTION fallback feed unavailable:", error);
      }
    }

    if (!sources.length) {
      const windowSources = loadWindowSources();
      if (windowSources) sources.push({ payload: windowSources, channel: "window-sources" });
    }

    if (!sources.length) {
      const windowNews = loadWindowNewsArray();
      if (windowNews) sources.push({ payload: windowNews, channel: "window-news" });
    }

    if (!sources.length) {
      return {
        sources: [],
        channel: "empty"
      };
    }

    const mergedSources = sources.flatMap(sourceRef => {
      return extractSourcesFromPayload(sourceRef.payload).map(source => ({
        ...source,
        channel: sourceRef.channel
      }));
    });

    return {
      sources: mergedSources,
      channel: sources[0].channel
    };
  }

  function saveState() {
    try {
      localStorage.setItem(CONFIG.storageKey, JSON.stringify({
        normalized: STATE.normalized,
        raw: STATE.raw,
        sources: STATE.sources,
        lastUpdate: STATE.lastUpdate,
        lastError: STATE.lastError
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

      STATE.normalized = asArray(parsed.normalized);
      STATE.raw = asArray(parsed.raw);
      STATE.sources = asArray(parsed.sources);
      STATE.lastUpdate = safeText(parsed.lastUpdate, null);
      STATE.lastError = parsed.lastError || null;
    } catch (error) {
      console.error("IBSS_INGESTION loadState error:", error);
    }
  }

  function commitSources(rawSources) {
    const normalizedSources = rawSources
      .map(normalizeSourcePayload)
      .filter(source => source.items.length > 0);

    const normalizedItems = normalizedSources.flatMap(source => source.items);

    const finalItems = sortItems(
      dedupeItems(normalizedItems)
    ).slice(0, CONFIG.maxItems);

    STATE.sources = normalizedSources.map(source => ({
      id: source.id,
      name: source.name,
      type: source.type,
      count: source.items.length
    }));

    STATE.raw = normalizedItems;
    STATE.normalized = finalItems;
    STATE.lastUpdate = nowIso();
    STATE.lastError = null;

    saveState();
    emitUpdate();

    return finalItems;
  }

  function emitUpdate() {
    try {
      window.dispatchEvent(new CustomEvent("ibss:ingestion-updated", {
        detail: {
          count: STATE.normalized.length,
          lastUpdate: STATE.lastUpdate,
          sources: STATE.sources
        }
      }));
    } catch (error) {
      console.error("IBSS_INGESTION emitUpdate error:", error);
    }
  }

  async function refresh() {
    ensureInit();

    if (STATE.activeRequest) {
      return STATE.activeRequest;
    }

    STATE.activeRequest = (async () => {
      try {
        const resolved = await resolvePayload();
        return commitSources(resolved.sources);
      } catch (error) {
        STATE.lastError = safeText(error?.message, "INGESTION_REFRESH_FAILED");
        saveState();
        console.error("IBSS_INGESTION refresh error:", error);
        return STATE.normalized;
      } finally {
        STATE.activeRequest = null;
      }
    })();

    return STATE.activeRequest;
  }

  function injectItems(items, sourceMeta = {}) {
    ensureInit();

    const source = {
      id: safeText(sourceMeta.id, buildId("manual")),
      name: safeText(sourceMeta.name, "Manual Intake"),
      type: safeText(sourceMeta.type, "manual"),
      items: asArray(items)
    };

    const currentStructuredSources = asArray(STATE.sources).map(sourceInfo => ({
      id: sourceInfo.id,
      name: sourceInfo.name,
      type: sourceInfo.type,
      items: []
    }));

    const merged = [
      ...currentStructuredSources,
      source
    ];

    return commitSources(merged);
  }

  function clear() {
    STATE.normalized = [];
    STATE.raw = [];
    STATE.sources = [];
    STATE.lastUpdate = null;
    STATE.lastError = null;
    saveState();
    emitUpdate();
  }

  function getAllNormalized() {
    return deepClone(STATE.normalized);
  }

  function getAllRaw() {
    return deepClone(STATE.raw);
  }

  function getLatest(limit = 20) {
    return getAllNormalized().slice(0, Math.max(1, Number(limit) || 20));
  }

  function getByPriority(priority) {
    const target = normalizePriority(priority);
    return getAllNormalized().filter(item => item.priority === target);
  }

  function getByCountry(country) {
    const target = normalizeText(country);
    return getAllNormalized().filter(item => normalizeText(item.country) === target);
  }

  function getByDomain(domain) {
    const target = normalizeText(domain);
    return getAllNormalized().filter(item => normalizeText(item.domain) === target);
  }

  function getSourceState() {
    return {
      sourceCount: STATE.sources.length,
      itemCount: STATE.normalized.length,
      lastUpdate: STATE.lastUpdate,
      lastError: STATE.lastError,
      sources: deepClone(STATE.sources)
    };
  }

  function ensureInit() {
    if (STATE.initialized) return;
    loadState();
    STATE.initialized = true;
  }

  function startAutoRefresh() {
    ensureInit();

    if (!CONFIG.enableAutoRefresh) return false;
    if (window.__IBSS_INGESTION_TIMER__) return true;

    window.__IBSS_INGESTION_TIMER__ = setInterval(() => {
      refresh();
    }, CONFIG.refreshMs);

    return true;
  }

  function stopAutoRefresh() {
    if (window.__IBSS_INGESTION_TIMER__) {
      clearInterval(window.__IBSS_INGESTION_TIMER__);
      window.__IBSS_INGESTION_TIMER__ = null;
    }
  }

  ensureInit();

  return {
    CONFIG,
    refresh,
    injectItems,
    clear,

    getAllNormalized,
    getAllRaw,
    getLatest,
    getByPriority,
    getByCountry,
    getByDomain,
    getSourceState,

    startAutoRefresh,
    stopAutoRefresh
  };
})();
