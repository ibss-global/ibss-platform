window.IBSS_INGESTION = (function () {
  "use strict";

  const CONFIG = {
    refreshMs: 5 * 60 * 1000,
    requestTimeoutMs: 12000,
    maxItems: 300,
    maxPerSource: 120,
    storageKey: "ibss_ingestion_state_v5",
    freshnessHalfLifeHours: 18,
    defaultReliability: 55,
    primaryFeedUrl: "/api/intake/feed",
    fallbackFeedUrl: "/ibss-feed.json",
    enableAutoRefresh: true
  };

  const STATE = {
    initialized: false,
    raw: [],
    normalized: [],
    sources: [],
    lastUpdate: null,
    lastError: null,
    activeRequest: null
  };

  function now() {
    return Date.now();
  }

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

  function priorityRank(priority) {
    if (priority === "HIGH") return 3;
    if (priority === "MEDIUM") return 2;
    return 1;
  }

  function normalizePriority(value) {
    const p = String(value || "").toUpperCase().trim();
    if (p === "HIGH") return "HIGH";
    if (p === "MEDIUM") return "MEDIUM";
    return "LOW";
  }

  function getLocalizedText(value, lang = "en") {
    if (!value) return "";
    if (typeof value === "string" || typeof value === "number") return String(value);

    return (
      value?.[lang] ||
      value?.en ||
      value?.ar ||
      value?.title ||
      value?.name ||
      value?.label ||
      value?.text ||
      ""
    );
  }

  function detectSource(item) {
    return safeText(
      item?.source ||
      item?.sourceName ||
      item?.provider ||
      item?.publisher ||
      item?.origin,
      "UNKNOWN"
    );
  }

  function sourceReliability(name) {
    const s = normalizeText(name);

    if (s.includes("reuters")) return 88;
    if (s.includes("associated press")) return 86;
    if (s === "ap") return 86;
    if (s.includes("bbc")) return 82;
    if (s.includes("bloomberg")) return 84;
    if (s.includes("financial times")) return 82;
    if (s.includes("al jazeera")) return 74;
    if (s.includes("monitor")) return 66;
    if (s.includes("watch")) return 62;

    return CONFIG.defaultReliability;
  }

  function detectDomain(item) {
    const direct = normalizeText(item?.domain || item?.category || item?.topic || item?.vertical);
    if (direct) return direct;

    const text = normalizeText([
      getLocalizedText(item?.title, "en"),
      getLocalizedText(item?.summary, "en"),
      getLocalizedText(item?.description, "en"),
      getLocalizedText(item?.title, "ar"),
      getLocalizedText(item?.summary, "ar"),
      getLocalizedText(item?.description, "ar"),
      safeText(item?.tags),
      asArray(item?.tags).join(" ")
    ].join(" "));

    if (text.match(/missile|army|strike|drone|front|military/)) return "military";
    if (text.match(/attack|raid|security|terror|intelligence/)) return "security";
    if (text.match(/economy|inflation|trade|market|tariff|economic/)) return "economic";
    if (text.match(/talk|ceasefire|diplomatic|mediation|negotiation/)) return "diplomatic";
    if (text.match(/oil|gas|energy/)) return "energy";
    if (text.match(/shipping|maritime|sea|port|red sea/)) return "maritime";
    if (text.match(/cyber|hack|malware/)) return "cyber";

    return "geopolitical";
  }

  function detectCountry(item) {
    const explicit = normalizeText(item?.country);
    if (explicit) return explicit;

    const text = normalizeText([
      getLocalizedText(item?.title, "en"),
      getLocalizedText(item?.summary, "en"),
      getLocalizedText(item?.description, "en"),
      getLocalizedText(item?.title, "ar"),
      getLocalizedText(item?.summary, "ar"),
      getLocalizedText(item?.description, "ar"),
      asArray(item?.tags).join(" ")
    ].join(" "));

    if (text.includes("gaza")) return "gaza";
    if (text.includes("israel")) return "israel";
    if (text.includes("iran")) return "iran";
    if (text.includes("lebanon")) return "lebanon";
    if (text.includes("west bank")) return "westbank";
    if (text.includes("red sea")) return "redsea";

    return "global";
  }

  function detectRegion(item) {
    return safeText(item?.region, detectCountry(item));
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

  function freshnessScore(timestamp) {
    const ageMs = now() - new Date(timestamp).getTime();
    const ageH = ageMs / (1000 * 60 * 60);
    const decay = Math.exp(-ageH / CONFIG.freshnessHalfLifeHours);

    return clamp(decay, 0, 1);
  }

  function normalizeSeverity(priority, item) {
    const explicit = safeNumber(item?.severity, NaN);
    if (Number.isFinite(explicit)) return clamp(Math.round(explicit), 0, 10);

    if (priority === "HIGH") return 8;
    if (priority === "MEDIUM") return 6;
    return 3;
  }

  function normalizeImpact(item) {
    return clamp(Math.round(safeNumber(item?.impact, 5)), 0, 10);
  }

  function normalizeUrgency(item) {
    return clamp(Math.round(safeNumber(item?.urgency, 5)), 0, 10);
  }

  function normalizeConfidence(item) {
    return clamp(Math.round(safeNumber(item?.confidence, 6)), 0, 10);
  }

  function normalizeTitle(item) {
    const en =
      getLocalizedText(item?.title, "en") ||
      safeText(item?.title, "");
    const ar =
      getLocalizedText(item?.title, "ar") ||
      safeText(item?.title_ar, "");

    return {
      en: safeText(en, safeText(ar, "Untitled Signal")),
      ar: safeText(ar, safeText(en, "إشارة غير معنونة"))
    };
  }

  function normalizeSummary(item, title) {
    const en =
      getLocalizedText(item?.summary, "en") ||
      getLocalizedText(item?.description, "en");
    const ar =
      getLocalizedText(item?.summary, "ar") ||
      getLocalizedText(item?.description, "ar");

    return {
      en: safeText(en, safeText(title?.en, "No summary available.")),
      ar: safeText(ar, safeText(title?.ar, "لا يوجد ملخص متاح."))
    };
  }

  function buildNormalizedItem(item, index = 0, sourceId = "default") {
    const priority = normalizePriority(item?.priority || item?.severity);
    const title = normalizeTitle(item);
    const summary = normalizeSummary(item, title);
    const timestamp = normalizeTimestamp(item);
    const source = detectSource(item);
    const reliability = sourceReliability(source);

    const severity = normalizeSeverity(priority, item);
    const impact = normalizeImpact(item);
    const urgency = normalizeUrgency(item);
    const confidence = normalizeConfidence(item);

    const freshness = freshnessScore(timestamp);
    const priorityWeight =
      priority === "HIGH" ? 0.9 :
      priority === "MEDIUM" ? 0.6 : 0.3;
    const reliabilityWeight = reliability / 100;

    const score =
      (freshness * 0.25) +
      (priorityWeight * 0.30) +
      (reliabilityWeight * 0.20) +
      ((severity / 10) * 0.10) +
      ((impact / 10) * 0.07) +
      ((urgency / 10) * 0.05) +
      ((confidence / 10) * 0.03);

    const score100 = clamp(Math.round(score * 100), 0, 100);

    return {
      id: safeText(item?.id, buildId("RAW")),
      sourceId,
      source,
      reliability,

      title,
      summary,

      timestamp,
      priority,
      domain: detectDomain(item),
      region: detectRegion(item),
      country: detectCountry(item),

      severity,
      impact,
      urgency,
      confidence,
      freshness,
      score,
      score100,

      tags: normalizeTags(item),
      url: safeText(item?.url || item?.link, "#"),

      rawIndex: index,
      raw: item
    };
  }

  function buildDeduplicationKey(item) {
    return [
      normalizeText(getLocalizedText(item?.title, "en")),
      normalizeText(item?.country),
      normalizeText(item?.domain),
      normalizeText(item?.source)
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
        const pr = priorityRank(b.priority) - priorityRank(a.priority);
        if (pr !== 0) return pr;

        const sr = safeNumber(b.score100, 0) - safeNumber(a.score100, 0);
        if (sr !== 0) return sr;

        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
  }

  function normalizeSourcePayload(source, sourceIndex = 0) {
    const sourceId = safeText(source?.id, `source-${sourceIndex + 1}`);
    const sourceName = safeText(source?.name, sourceId);
    const sourceType = safeText(source?.type, "feed");

    const rawItems = asArray(
      source?.items ||
      source?.data ||
      source?.news ||
      source?.entries ||
      source?.signals
    );

    const items = rawItems
      .map((item, index) => buildNormalizedItem(item, index, sourceId))
      .slice(0, CONFIG.maxPerSource);

    return {
      id: sourceId,
      name: sourceName,
      type: sourceType,
      items
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
        headers: { "Accept": "application/json" }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} from ${url}`);
      }

      return await response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async function tryPrimaryFeed() {
    return await fetchJsonWithTimeout(CONFIG.primaryFeedUrl);
  }

  async function tryFallbackFeed() {
    return await fetchJsonWithTimeout(CONFIG.fallbackFeedUrl);
  }

  function tryWindowNews() {
    if (asArray(window.IBSS_NEWS).length) {
      return { items: deepClone(window.IBSS_NEWS) };
    }
    return null;
  }

  function buildSovereignFallbackPayload() {
    return {
      items: [
        {
          id: "fallback-gaza-1",
          title: {
            en: "Gaza Structural Pressure",
            ar: "ضغط بنيوي في غزة"
          },
          summary: {
            en: "Fallback sovereign signal generated to keep the intelligence chain alive.",
            ar: "إشارة سيادية احتياطية تم توليدها للحفاظ على بقاء السلسلة الاستخبارية حية."
          },
          source: "SOVEREIGN_FALLBACK",
          priority: "HIGH",
          domain: "military",
          region: "gaza",
          country: "gaza",
          severity: 8,
          impact: 7,
          urgency: 7,
          confidence: 8,
          publishedAt: nowIso(),
          tags: ["gaza", "structural", "fallback"]
        },
        {
          id: "fallback-gaza-2",
          title: {
            en: "Live Monitoring Detects Renewed Structural Pressure",
            ar: "الرصد الحي يلتقط تجدد الضغط البنيوي"
          },
          summary: {
            en: "Fallback monitoring line sustaining ticker and feed continuity.",
            ar: "سطر مراقبة احتياطي يحافظ على استمرارية الشريط والتغذية."
          },
          source: "SOVEREIGN_FALLBACK",
          priority: "MEDIUM",
          domain: "security",
          region: "gaza",
          country: "gaza",
          severity: 6,
          impact: 6,
          urgency: 6,
          confidence: 7,
          publishedAt: nowIso(),
          tags: ["monitoring", "gaza"]
        }
      ]
    };
  }

  async function resolvePayload() {
    try {
      const primary = await tryPrimaryFeed();
      const primarySources = extractSourcesFromPayload(primary);
      if (primarySources.length) return primarySources;
    } catch (error) {
      console.warn("IBSS_INGESTION primary feed unavailable:", error);
    }

    try {
      const fallback = await tryFallbackFeed();
      const fallbackSources = extractSourcesFromPayload(fallback);
      if (fallbackSources.length) return fallbackSources;
    } catch (error) {
      console.warn("IBSS_INGESTION fallback feed unavailable:", error);
    }

    const windowNews = tryWindowNews();
    if (windowNews) {
      const localSources = extractSourcesFromPayload(windowNews);
      if (localSources.length) return localSources;
    }

    return extractSourcesFromPayload(buildSovereignFallbackPayload());
  }

  function saveState() {
    try {
      localStorage.setItem(CONFIG.storageKey, JSON.stringify({
        raw: STATE.raw,
        normalized: STATE.normalized,
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

      STATE.raw = asArray(parsed.raw);
      STATE.normalized = asArray(parsed.normalized);
      STATE.sources = asArray(parsed.sources);
      STATE.lastUpdate = safeText(parsed.lastUpdate, null);
      STATE.lastError = parsed.lastError || null;
    } catch (error) {
      console.error("IBSS_INGESTION loadState error:", error);
    }
  }

  function emitUpdate() {
    const detail = {
      count: STATE.normalized.length,
      updatedAt: STATE.lastUpdate,
      sources: STATE.sources
    };

    try {
      window.dispatchEvent(new CustomEvent("ibss:ingestion", { detail }));
      window.dispatchEvent(new CustomEvent("ibss:ingestion-updated", { detail }));
    } catch (error) {
      console.error("IBSS_INGESTION emitUpdate error:", error);
    }
  }

  function commitSources(rawSources) {
    const normalizedSources = asArray(rawSources)
      .map(normalizeSourcePayload)
      .filter(source => source.items.length > 0);

    const flatItems = normalizedSources.flatMap(source => source.items);
    const finalItems = sortItems(dedupeItems(flatItems)).slice(0, CONFIG.maxItems);

    STATE.sources = normalizedSources.map(source => ({
      id: source.id,
      name: source.name,
      type: source.type,
      count: source.items.length
    }));

    STATE.raw = flatItems;
    STATE.normalized = finalItems;
    STATE.lastUpdate = nowIso();
    STATE.lastError = null;

    saveState();
    emitUpdate();

    return deepClone(finalItems);
  }

  async function refresh() {
    ensureInit();

    if (STATE.activeRequest) {
      return STATE.activeRequest;
    }

    STATE.activeRequest = (async () => {
      try {
        const sources = await resolvePayload();
        return commitSources(sources);
      } catch (error) {
        STATE.lastError = safeText(error?.message, "INGESTION_REFRESH_FAILED");
        saveState();
        console.error("IBSS_INGESTION refresh error:", error);

        if (!STATE.normalized.length) {
          return commitSources(extractSourcesFromPayload(buildSovereignFallbackPayload()));
        }

        return deepClone(STATE.normalized);
      } finally {
        STATE.activeRequest = null;
      }
    })();

    return STATE.activeRequest;
  }

  function injectItems(items, sourceMeta = {}) {
    ensureInit();

    const syntheticSource = {
      id: safeText(sourceMeta.id, buildId("manual")),
      name: safeText(sourceMeta.name, "Manual Intake"),
      type: safeText(sourceMeta.type, "manual"),
      items: asArray(items)
    };

    return commitSources([syntheticSource]);
  }

  function clear() {
    STATE.raw = [];
    STATE.normalized = [];
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

  function getAll() {
    return getAllNormalized();
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

  function ensureInit() {
    if (STATE.initialized) return;

    loadState();
    STATE.initialized = true;

    if (!STATE.normalized.length) {
      commitSources(extractSourcesFromPayload(buildSovereignFallbackPayload()));
    }

    if (CONFIG.enableAutoRefresh) {
      startAutoRefresh();
    }
  }

  ensureInit();

  return {
    CONFIG,
    refresh,
    injectItems,
    clear,

    getAll,
    getAllRaw,
    getAllNormalized,
    getLatest,
    getByPriority,
    getByCountry,
    getByDomain,
    getSourceState,

    startAutoRefresh,
    stopAutoRefresh
  };
})();
 تم  هل هناك شيء اخر؟؟
