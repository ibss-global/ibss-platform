// IBSS INGESTION ENGINE — Real Signals Pipeline
// Version: v3.0 Sovereign Intake Pipeline

window.IBSS_INGESTION = (function () {
  "use strict";

  const CONFIG = {
    version: "v3.0-real-signals-pipeline",
    storageKey: "ibss_ingestion_state_v30_real_pipeline",
    maxItems: 240,
    maxNormalized: 180,
    autoRefreshMs: 60000,
    minAutoRefreshMs: 15000,
    defaultReliability: 64,
    defaultFreshness: 0.72,
    allowExternalFetch: true,
    fetchTimeoutMs: 9000
  };

  const STATE = {
    initialized: false,
    rawItems: [],
    normalized: [],
    sources: [],
    refreshTimer: null,
    lastRefreshAt: null,
    lastError: null,
    lastFetchSummary: null
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

  function nowIso() {
    return new Date().toISOString();
  }

  function buildId(prefix = "ING") {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  }

  function normalizeText(value) {
    return safeText(String(value || ""))
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function clone(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      console.error("IBSS_INGESTION clone error:", error);
      return null;
    }
  }

  function localize(en, ar) {
    return {
      en: safeText(en, "-"),
      ar: safeText(ar, en || "-")
    };
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

  function keywordScore(text) {
    const value = normalizeText(text);

    const high = [
      "war", "strike", "attack", "missile", "invasion", "collapse",
      "ceasefire collapse", "evacuation", "blockade", "assassination",
      "تصعيد", "قصف", "هجوم", "حرب", "انهيار", "حصار", "إخلاء"
    ];

    const medium = [
      "negotiation", "ceasefire", "sanctions", "shipping", "border",
      "governance", "humanitarian", "tension", "crisis",
      "تفاوض", "هدنة", "عقوبات", "شحن", "حدود", "حوكمة", "إنساني", "أزمة"
    ];

    let score = 0;

    high.forEach(word => {
      if (value.includes(word)) score += 10;
    });

    medium.forEach(word => {
      if (value.includes(word)) score += 5;
    });

    return clamp(score, 0, 40);
  }

  function inferDomain(text, fallback = "geopolitical") {
    const value = normalizeText(text);

    if (value.includes("shipping") || value.includes("vessel") || value.includes("maritime") || value.includes("red sea") || value.includes("الشحن") || value.includes("البحر الأحمر")) {
      return "geo-economics";
    }

    if (value.includes("governance") || value.includes("administration") || value.includes("authority") || value.includes("الحوكمة") || value.includes("الإدارة")) {
      return "geo-governance";
    }

    if (value.includes("humanitarian") || value.includes("aid") || value.includes("civilian") || value.includes("إنساني") || value.includes("مدني")) {
      return "human-security";
    }

    if (value.includes("military") || value.includes("strike") || value.includes("missile") || value.includes("attack") || value.includes("قصف") || value.includes("هجوم")) {
      return "geo-security";
    }

    if (value.includes("economy") || value.includes("trade") || value.includes("energy") || value.includes("oil") || value.includes("اقتصاد") || value.includes("تجارة")) {
      return "geo-economics";
    }

    return fallback;
  }

  function inferRegion(text, fallback = "global") {
    const value = normalizeText(text);

    if (value.includes("gaza") || value.includes("غزة")) return "gaza";
    if (value.includes("west bank") || value.includes("الضفة")) return "westbank";
    if (value.includes("lebanon") || value.includes("لبنان")) return "lebanon";
    if (value.includes("iran") || value.includes("إيران") || value.includes("ايران")) return "iran";
    if (value.includes("red sea") || value.includes("البحر الأحمر")) return "redsea";
    if (value.includes("yemen") || value.includes("اليمن")) return "yemen";
    if (value.includes("syria") || value.includes("سوريا")) return "syria";
    if (value.includes("israel") || value.includes("إسرائيل") || value.includes("اسرائيل")) return "levant";

    return fallback;
  }

  function computeScore(item) {
    const direct = safeNumber(item?.score100 ?? item?.balancedScore100 ?? item?.riskScore, NaN);

    if (Number.isFinite(direct)) {
      return clamp(Math.round(direct), 0, 100);
    }

    const text = [
      getLocalizedText(item?.title, "en"),
      getLocalizedText(item?.summary, "en"),
      getLocalizedText(item?.description, "en"),
      getLocalizedText(item?.text, "en")
    ].join(" ");

    const base = priorityScore(item?.priority || item?.severity);
    const keywords = keywordScore(text);
    const reliability = safeNumber(item?.reliabilityScore, CONFIG.defaultReliability);

    return clamp(Math.round((base * 0.48) + keywords + (reliability * 0.20)), 0, 100);
  }

  function normalizeItem(item, index = 0, sourceProfile = null) {
    const title = item?.title || item?.headline || item?.name || localize("Untitled Signal", "إشارة غير معنونة");
    const summary = item?.summary || item?.description || item?.text || item?.content || title;
    const description = item?.description || item?.summary || item?.text || item?.content || summary;

    const joinedText = [
      getLocalizedText(title, "en"),
      getLocalizedText(summary, "en"),
      getLocalizedText(description, "en")
    ].join(" ");

    const region = normalizeText(item?.region || item?.country || item?.countryId || inferRegion(joinedText, "global")) || "global";
    const country = normalizeText(item?.country || item?.countryId || region || "global") || "global";
    const domain = normalizeText(item?.domain || item?.category || inferDomain(joinedText, "geopolitical")) || "geopolitical";

    const reliability =
      item?.reliabilityScore != null
        ? safeNumber(item.reliabilityScore, CONFIG.defaultReliability)
        : safeNumber(sourceProfile?.reliabilityScore, CONFIG.defaultReliability);

    const score = computeScore({
      ...item,
      title,
      summary,
      description,
      reliabilityScore: reliability
    });

    const priority = normalizePriority(item?.priority || item?.severity || inferPriority(score));

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

      reliabilityScore: clamp(reliability, 0, 100),
      freshnessScore: clamp(safeNumber(item?.freshnessScore, CONFIG.defaultFreshness), 0, 1),

      timestamp: safeText(item?.timestamp || item?.publishedAt || item?.createdAt || item?.pubDate, nowIso()),
      source: safeText(item?.source || sourceProfile?.id || item?.sourceName, "IBSS_INGESTION"),
      sourceUnit: safeText(item?.sourceUnit || sourceProfile?.type, "LIVE"),

      signalType: item?.signalType || null,
      decisionMode: item?.decisionMode || item?.mode || null,
      layer: item?.layer || null,
      influenceBand: item?.influenceBand || null,

      live: item?.live !== false,
      raw: clone(item),
      sourceProfile: clone(sourceProfile)
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
        rawItems: STATE.rawItems,
        normalized: STATE.normalized,
        sources: STATE.sources,
        lastRefreshAt: STATE.lastRefreshAt,
        lastError: STATE.lastError,
        lastFetchSummary: STATE.lastFetchSummary
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

      STATE.rawItems = asArray(parsed.rawItems);
      STATE.normalized = asArray(parsed.normalized);
      STATE.sources = asArray(parsed.sources);
      STATE.lastRefreshAt = parsed.lastRefreshAt || null;
      STATE.lastError = parsed.lastError || null;
      STATE.lastFetchSummary = parsed.lastFetchSummary || null;
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
    const normalized = STATE.rawItems
      .map((item, index) => normalizeItem(item, index, item.sourceProfile || null))
      .sort((a, b) => {
        const scoreDiff = safeNumber(b.balancedScore100, 0) - safeNumber(a.balancedScore100, 0);
        if (scoreDiff !== 0) return scoreDiff;

        return new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime();
      });

    STATE.normalized = dedupe(normalized).slice(0, CONFIG.maxNormalized);
    STATE.lastRefreshAt = nowIso();

    saveState();
    return clone(STATE.normalized) || [];
  }

  function dispatchUpdate(action, detail = {}) {
    window.dispatchEvent(new CustomEvent("ibss:ingestion-updated", {
      detail: {
        action,
        ...detail,
        updatedAt: nowIso()
      }
    }));
  }

  function add(item, sourceProfile = null) {
    ensureInit();

    const prepared = {
      ...item,
      id: safeText(item?.id, buildId("ING")),
      createdAt: safeText(item?.createdAt, nowIso()),
      sourceProfile: sourceProfile ? clone(sourceProfile) : item?.sourceProfile || null
    };

    STATE.rawItems.unshift(prepared);
    STATE.rawItems = STATE.rawItems.slice(0, CONFIG.maxItems);

    const normalized = rebuildNormalized();

    dispatchUpdate("add", { item: clone(prepared) });
    return clone(normalized[0] || prepared);
  }

  function addMany(items = [], sourceProfile = null) {
    ensureInit();

    asArray(items).forEach(item => {
      STATE.rawItems.unshift({
        ...item,
        id: safeText(item?.id, buildId("ING")),
        createdAt: safeText(item?.createdAt, nowIso()),
        sourceProfile: sourceProfile ? clone(sourceProfile) : item?.sourceProfile || null
      });
    });

    STATE.rawItems = STATE.rawItems.slice(0, CONFIG.maxItems);

    const normalized = rebuildNormalized();

    dispatchUpdate("addMany", { count: asArray(items).length });
    return clone(normalized);
  }

  function remove(id) {
    ensureInit();

    STATE.rawItems = STATE.rawItems.filter(item => item.id !== id);
    const normalized = rebuildNormalized();

    dispatchUpdate("remove", { id });
    return clone(normalized);
  }

  function clear() {
    ensureInit();

    STATE.rawItems = [];
    STATE.normalized = [];
    STATE.lastRefreshAt = nowIso();
    STATE.lastError = null;
    STATE.lastFetchSummary = null;

    saveState();
    dispatchUpdate("clear");

    return true;
  }

  function registerSource(source = {}) {
    ensureInit();

    const profile = {
      id: safeText(source.id, buildId("SRC")),
      name: safeText(source.name, source.id || "Unnamed Source"),
      type: safeText(source.type, "json"),
      url: safeText(source.url, ""),
      active: source.active !== false,
      reliabilityScore: clamp(safeNumber(source.reliabilityScore, CONFIG.defaultReliability), 0, 100),
      parser: safeText(source.parser, "auto"),
      region: safeText(source.region, ""),
      domain: safeText(source.domain, ""),
      createdAt: safeText(source.createdAt, nowIso())
    };

    STATE.sources = STATE.sources.filter(item => item.id !== profile.id);
    STATE.sources.unshift(profile);

    saveState();

    return clone(profile);
  }

  function registerSources(sources = []) {
    return asArray(sources).map(registerSource);
  }

  function getSources() {
    ensureInit();
    return clone(STATE.sources) || [];
  }

  function getActiveSources() {
    return getSources().filter(source => source.active && source.url);
  }

  async function fetchWithTimeout(url, timeoutMs = CONFIG.fetchTimeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        cache: "no-store"
      });

      clearTimeout(timer);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const contentType = res.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        return await res.json();
      }

      return await res.text();
    } finally {
      clearTimeout(timer);
    }
  }

  function parseJsonPayload(payload, source) {
    if (!payload) return [];

    if (Array.isArray(payload)) return payload;

    if (Array.isArray(payload.items)) return payload.items;
    if (Array.isArray(payload.results)) return payload.results;
    if (Array.isArray(payload.articles)) return payload.articles;
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.signals)) return payload.signals;
    if (Array.isArray(payload.news)) return payload.news;

    if (payload.title || payload.headline || payload.text) return [payload];

    console.warn("IBSS_INGESTION unknown JSON shape:", source?.id || source?.url);
    return [];
  }

  function parseRssXmlText(text) {
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, "application/xml");

    const items = Array.from(xml.querySelectorAll("item, entry"));

    return items.map((node, index) => {
      const title =
        node.querySelector("title")?.textContent ||
        `RSS Item ${index + 1}`;

      const summary =
        node.querySelector("description")?.textContent ||
        node.querySelector("summary")?.textContent ||
        node.querySelector("content")?.textContent ||
        title;

      const link =
        node.querySelector("link")?.getAttribute("href") ||
        node.querySelector("link")?.textContent ||
        "";

      const pubDate =
        node.querySelector("pubDate")?.textContent ||
        node.querySelector("updated")?.textContent ||
        node.querySelector("published")?.textContent ||
        nowIso();

      return {
        id: safeText(link, buildId("RSS")),
        title,
        summary,
        description: summary,
        text: title,
        publishedAt: pubDate,
        sourceUrl: link
      };
    });
  }

  function shapeExternalItem(item, source) {
    const title =
      item.title ||
      item.headline ||
      item.name ||
      item.text ||
      localize("Untitled External Signal", "إشارة خارجية غير معنونة");

    const summary =
      item.summary ||
      item.description ||
      item.content ||
      item.body ||
      item.text ||
      title;

    const text = `${getLocalizedText(title, "en")} ${getLocalizedText(summary, "en")}`;

    return {
      id: safeText(item.id || item.url || item.link || item.sourceUrl, buildId("EXT")),
      title,
      summary,
      description: summary,
      text: item.text || title,

      region: safeText(item.region, source.region || inferRegion(text, "global")),
      country: safeText(item.country || item.countryId, source.region || inferRegion(text, "global")),
      domain: safeText(item.domain || item.category, source.domain || inferDomain(text, "geopolitical")),

      priority: item.priority || item.severity || inferPriority(computeScore(item)),
      score100: item.score100 || item.riskScore || null,

      reliabilityScore: source.reliabilityScore,
      freshnessScore: item.freshnessScore || CONFIG.defaultFreshness,

      timestamp: item.timestamp || item.publishedAt || item.pubDate || item.createdAt || nowIso(),
      source: source.id,
      sourceUnit: source.type,

      sourceUrl: item.url || item.link || item.sourceUrl || source.url,
      rawExternal: clone(item)
    };
  }

  async function fetchSource(source) {
    if (!CONFIG.allowExternalFetch) {
      return {
        sourceId: source.id,
        ok: false,
        count: 0,
        error: "External fetch disabled"
      };
    }

    if (!source?.active || !source?.url) {
      return {
        sourceId: source?.id || "unknown",
        ok: false,
        count: 0,
        error: "Inactive or missing URL"
      };
    }

    try {
      const payload = await fetchWithTimeout(source.url);
      let items = [];

      if (typeof payload === "string") {
        items = parseRssXmlText(payload);
      } else {
        items = parseJsonPayload(payload, source);
      }

      const shaped = items.map(item => shapeExternalItem(item, source));
      addMany(shaped, source);

      return {
        sourceId: source.id,
        ok: true,
        count: shaped.length,
        error: null
      };
    } catch (error) {
      console.error(`IBSS_INGESTION fetchSource error (${source.id}):`, error);

      return {
        sourceId: source.id,
        ok: false,
        count: 0,
        error: error.message || String(error)
      };
    }
  }

  async function refreshExternalSources() {
    ensureInit();

    const sources = getActiveSources();

    if (!sources.length) {
      STATE.lastFetchSummary = {
        refreshedAt: nowIso(),
        sources: 0,
        added: 0,
        errors: 0,
        note: "No active external sources registered"
      };
      saveState();
      return clone(STATE.lastFetchSummary);
    }

    const results = [];

    for (const source of sources) {
      const result = await fetchSource(source);
      results.push(result);
    }

    const added = results.reduce((sum, item) => sum + safeNumber(item.count, 0), 0);
    const errors = results.filter(item => !item.ok).length;

    STATE.lastFetchSummary = {
      refreshedAt: nowIso(),
      sources: sources.length,
      added,
      errors,
      results
    };

    STATE.lastError = errors ? results.filter(item => !item.ok).map(item => `${item.sourceId}: ${item.error}`).join(" | ") : null;

    rebuildNormalized();
    saveState();

    window.dispatchEvent(new CustomEvent("ibss:ingestion", {
      detail: {
        action: "refreshExternalSources",
        summary: clone(STATE.lastFetchSummary)
      }
    }));

    return clone(STATE.lastFetchSummary);
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

    const interval = Math.max(CONFIG.minAutoRefreshMs, safeNumber(ms, CONFIG.autoRefreshMs));

    STATE.refreshTimer = setInterval(() => {
      refreshExternalSources().catch(error => {
        STATE.lastError = error.message || String(error);
        saveState();
      });
    }, interval);

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
    return clone(STATE.rawItems) || [];
  }

  function getAllNormalized() {
    ensureInit();

    if (!STATE.normalized.length && STATE.rawItems.length) {
      rebuildNormalized();
    }

    return clone(STATE.normalized) || [];
  }

  function getLatest(limit = 10) {
    return getAllNormalized().slice(0, Math.max(1, safeNumber(limit, 10)));
  }

  function seedDemoLiveSignals() {
    const items = [
      {
        id: "LIVE-GAZA-NEG-DEMO",
        title: localize("Live negotiation pressure detected in Gaza track", "رصد ضغط تفاوضي حي في مسار غزة"),
        summary: localize(
          "The live intake layer reads the negotiation track as a pressure environment requiring monitoring.",
          "تقرأ طبقة الإدخال الحي مسار التفاوض كبيئة ضغط تتطلب المراقبة."
        ),
        region: "gaza",
        country: "gaza",
        domain: "geo-security",
        priority: "HIGH",
        score100: 76,
        source: "IBSS_LIVE_DEMO",
        sourceUnit: "LIVE"
      },
      {
        id: "LIVE-REDSEA-TRADE-DEMO",
        title: localize("Maritime friction remains active across Red Sea corridor", "الاحتكاك البحري ما يزال نشطًا عبر ممر البحر الأحمر"),
        summary: localize(
          "Shipping insecurity continues to create economic and strategic pressure.",
          "استمرار هشاشة الشحن يخلق ضغطًا اقتصاديًا واستراتيجيًا."
        ),
        region: "redsea",
        country: "redsea",
        domain: "geo-economics",
        priority: "MEDIUM",
        score100: 61,
        source: "IBSS_LIVE_DEMO",
        sourceUnit: "LIVE"
      }
    ];

    return addMany(items, {
      id: "IBSS_LIVE_DEMO",
      name: "IBSS Live Demo Source",
      type: "demo",
      reliabilityScore: 66
    });
  }

  function getDiagnostics() {
    ensureInit();

    return {
      initialized: STATE.initialized,
      rawItems: STATE.rawItems.length,
      normalized: STATE.normalized.length,
      sources: STATE.sources.length,
      activeSources: getActiveSources().length,
      lastRefreshAt: STATE.lastRefreshAt,
      lastError: STATE.lastError,
      lastFetchSummary: clone(STATE.lastFetchSummary),
      autoRefreshRunning: !!STATE.refreshTimer,
      version: CONFIG.version
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
    refreshExternalSources,
    startAutoRefresh,
    stopAutoRefresh,

    registerSource,
    registerSources,
    getSources,
    getActiveSources,

    getAll,
    getAllNormalized,
    getLatest,
    getDiagnostics,

    normalizeItem,
    seedDemoLiveSignals
  };
})();
