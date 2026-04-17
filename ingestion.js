window.IBSS_INGESTION = (function () {
  "use strict";

  const CONFIG = {
    refreshMs: 5 * 60 * 1000,
    requestTimeoutMs: 12000,
    maxItems: 300,
    maxPerSource: 120,
    storageKey: "ibss_ingestion_state_v5",
    primaryFeedUrl: "/api/intake/feed",
    fallbackFeedUrl: "/ibss-feed.json",
    enableAutoRefresh: true,
    acceptedLanguages: ["en", "ar"],
    defaultSourceReliability: 55,
    freshnessHalfLifeHours: 18
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

  /* =========================
     CORE UTILS
  ========================= */

  function nowIso() {
    return new Date().toISOString();
  }

  function nowMs() {
    return Date.now();
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

  function priorityRank(priority) {
    if (priority === "HIGH") return 3;
    if (priority === "MEDIUM") return 2;
    return 1;
  }

  /* =========================
     LOCALIZED READERS
  ========================= */

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
      value?.text ||
      ""
    );
  }

  /* =========================
     SOURCE INTELLIGENCE
  ========================= */

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
    const explicit = safeNumber(item?.sourceProfile?.reliabilityScore, NaN);
    if (Number.isFinite(explicit)) {
      return clamp(explicit, 0, 100);
    }

    const source = normalizeText(detectSourceName(item));

    if (source.includes("reuters")) return 88;
    if (source.includes("associated press")) return 86;
    if (source === "ap") return 86;
    if (source.includes("bloomberg")) return 84;
    if (source.includes("financial times")) return 82;
    if (source.includes("bbc")) return 80;
    if (source.includes("al jazeera")) return 74;
    if (source.includes("monitor")) return 66;
    if (source.includes("watch")) return 62;
    if (source.includes("local")) return 58;

    return CONFIG.defaultSourceReliability;
  }

  /* =========================
     LANGUAGE / GEO / DOMAIN
  ========================= */

  function detectLanguage(item) {
    const explicit = normalizeText(item?.language || item?.lang);
    if (CONFIG.acceptedLanguages.includes(explicit)) return explicit;

    const arTitle = getLocalizedField(item, "title", "ar");
    const arSummary = getLocalizedField(item, "summary", "ar");

    if (/[ء-ي]/.test(`${arTitle} ${arSummary}`)) return "ar";
    return "en";
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

    if (
      text.includes("cyber") ||
      text.includes("hacking") ||
      text.includes("network")
    ) return "cyber";

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

    const text = normalizeText([
      getLocalizedField(item, "title", "en"),
      getLocalizedField(item, "summary", "en"),
      getLocalizedField(item, "title", "ar"),
      getLocalizedField(item, "summary", "ar"),
      asArray(item?.tags).join(" ")
    ].join(" "));

    if (text.includes("gaza")) return "gaza";
    if (text.includes("west bank")) return "westbank";
    if (text.includes("lebanon")) return "lebanon";
    if (text.includes("iran")) return "iran";
    if (text.includes("red sea")) return "redsea";
    if (text.includes("israel")) return "israel";
    if (text.includes("syria")) return "syria";
    if (text.includes("egypt")) return "egypt";
    if (text.includes("jordan")) return "jordan";

    return safeText(item?.region, "global");
  }

  /* =========================
     TIMESTAMP / URL / TAGS
  ========================= */

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

  /* =========================
     PRIORITY / SCORES
  ========================= */

  function normalizePriority(value) {
    const p = String(value || "").toUpperCase().trim();
    if (p === "HIGH") return "HIGH";
    if (p === "MEDIUM") return "MEDIUM";
    return "LOW";
  }

  function deriveSeverityFromPriority(priority) {
    if (priority === "HIGH") return 8;
    if (priority === "MEDIUM") return 6;
    return 3;
  }

  function normalizeNumericScore(value, fallback = 5) {
    return clamp(Math.round(safeNumber(value, fallback)), 0, 10);
  }

  function freshnessScore(timestamp) {
    const ageMs = nowMs() - new Date(timestamp).getTime();
    const ageHours = ageMs / (1000 * 60 * 60);
    const decay = Math.exp(-ageHours / CONFIG.freshnessHalfLifeHours);
    return clamp(decay, 0, 1);
  }

  /* =========================
     NORMALIZATION PIPELINE
  ========================= */

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
    const timestamp = normalizeTimestamp(item);
    const reliability = detectSourceReliability(item);
    const freshness = freshnessScore(timestamp);

    const severity = normalizeNumericScore(
      item?.severity,
      deriveSeverityFromPriority(priority)
    );
    const confidence = normalizeNumericScore(item?.confidence, 6);
    const impact = normalizeNumericScore(item?.impact, 5);
    const urgency = normalizeNumericScore(item?.urgency, 5);
    const persistence = normalizeNumericScore(item?.persistence, 5);
    const spread = normalizeNumericScore(item?.spread, 5);

    const strategicScore10 =
      (severity * 0.25) +
      (impact * 0.20) +
      (urgency * 0.18) +
      (confidence * 0.15) +
      (persistence * 0.12) +
      (spread * 0.10);

    const finalScore100 = clamp(
      Math.round(
        (strategicScore10 * 10 * 0.70) +
        (reliability * 0.20) +
        (freshness * 100 * 0.10)
      ),
      0,
      100
    );

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
      severity,
      confidence,
      impact,
      urgency,
      persistence,
      spread,

      reliabilityScore: reliability,
      freshnessScore: freshness,
      score100: finalScore100,

      tags: normalizeTags(item),
      actors: normalizeActors(item),

      timestamp,
      url: normalizeUrl(item?.url || item?.link),

      rawIndex: index,
      raw: item
    };
  }

  /* =========================
     DEDUPE / SORT
  ========================= */

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
        const pDiff = priorityRank(b.priority) - priorityRank(a.priority);
        if (pDiff !== 0) return pDiff;

        const sDiff = safeNumber(b.score100, 0) - safeNumber(a.score100, 0);
        if (sDiff !== 0) return sDiff;

        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
  }

  /* =========================
     SOURCE PAYLOAD NORMALIZATION
  ========================= */

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

  /* =========================
     FALLBACK SOVEREIGN SEED
  ========================= */

  function buildSovereignFallbackSeed() {
    const ts = nowIso();

    return [
      {
        id: "seed-gaza-1",
        source: "IBSS_SEED",
        title: {
          en: "Military pressure remains concentrated around Gaza structure",
          ar: "الضغط العسكري ما زال متركزًا حول بنية غزة"
        },
        summary: {
          en: "Live monitoring detects persistent military and structural pressure around Gaza.",
          ar: "الرصد الحي يلتقط ضغطًا عسكريًا وبنيويًا مستمرًا حول غزة."
        },
        domain: "military",
        region: "gaza",
        country: "gaza",
        priority: "HIGH",
        severity: 9,
        impact: 9,
        urgency: 8,
        confidence: 8,
        persistence: 8,
        spread: 7,
        tags: ["gaza", "military", "pressure"],
        timestamp: ts
      },
      {
        id: "seed-lebanon-1",
        source: "IBSS_SEED",
        title: {
          en: "Northern front tension sustains pressure near Lebanon",
          ar: "توتر الجبهة الشمالية يحافظ على الضغط قرب لبنان"
        },
        summary: {
          en: "Cross-border tension sustains a high-watch environment around Lebanon.",
          ar: "التوتر عبر الحدود يحافظ على بيئة مراقبة مرتفعة حول لبنان."
        },
        domain: "security",
        region: "lebanon",
        country: "lebanon",
        priority: "HIGH",
        severity: 8,
        impact: 8,
        urgency: 7,
        confidence: 7,
        persistence: 7,
        spread: 6,
        tags: ["lebanon", "security", "border"],
        timestamp: ts
      },
      {
        id: "seed-iran-1",
        source: "IBSS_SEED",
        title: {
          en: "Iranian strategic posture remains under structured pressure",
          ar: "التموضع الاستراتيجي الإيراني ما يزال تحت ضغط بنيوي"
        },
        summary: {
          en: "Regional posture indicates continued pressure with medium escalation probability.",
          ar: "التموضع الإقليمي يشير إلى ضغط مستمر مع احتمال تصعيد متوسط."
        },
        domain: "diplomatic",
        region: "iran",
        country: "iran",
        priority: "MEDIUM",
        severity: 6,
        impact: 7,
        urgency: 5,
        confidence: 7,
        persistence: 6,
        spread: 5,
        tags: ["iran", "diplomatic", "regional"],
        timestamp: ts
      },
      {
        id: "seed-redsea-1",
        source: "IBSS_SEED",
        title: {
          en: "Maritime corridor volatility persists in the Red Sea",
          ar: "تقلب الممر البحري مستمر في البحر الأحمر"
        },
        summary: {
          en: "Shipping-route fragility continues to generate maritime watch pressure.",
          ar: "هشاشة خط الملاحة ما تزال تولد ضغط مراقبة بحري."
        },
        domain: "maritime",
        region: "red sea",
        country: "redsea",
        priority: "MEDIUM",
        severity: 5,
        impact: 6,
        urgency: 5,
        confidence: 6,
        persistence: 5,
        spread: 5,
        tags: ["red sea", "maritime", "shipping"],
        timestamp: ts
      }
    ];
  }

  /* =========================
     FETCH HELPERS
  ========================= */

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
      sources.push({
        payload: { items: buildSovereignFallbackSeed() },
        channel: "sovereign-seed"
      });
    }

    const mergedSources = sources.flatMap(sourceRef => {
      return extractSourcesFromPayload(sourceRef.payload).map(source => ({
        ...source,
        channel: sourceRef.channel
      }));
    });

    return {
      sources: mergedSources,
      channel: sources[0]?.channel || "empty"
    };
  }

  /* =========================
     STORAGE
  ========================= */

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

  /* =========================
     COMMIT / EVENTS
  ========================= */

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

  /* =========================
     PUBLIC PIPELINE
  ========================= */

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

        if (!STATE.normalized.length) {
          return commitSources([{
            id: "seed-source",
            name: "Sovereign Seed",
            type: "seed",
            items: buildSovereignFallbackSeed()
          }]);
        }

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

    return commitSources([source]);
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

  /* =========================
     READ API
  ========================= */

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

  /* =========================
     INIT / AUTO REFRESH
  ========================= */

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

  if (!STATE.normalized.length) {
    refresh();
  }

  if (CONFIG.enableAutoRefresh) {
    startAutoRefresh();
  }

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
