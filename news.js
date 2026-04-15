// IBSS NEWS CORE — Multi-Source Live News Layer
// Version: v6.0 Runtime Integrated

(function () {
  "use strict";

  const CONFIG = {
    refreshMs: 2 * 60 * 1000,
    storageKey: "ibss_news_state_v6",
    maxItems: 180,
    tickerItems: 10,
    homeItems: 3,
    externalItemsLimit: 40,
    fallbackRotateCount: 3
  };

  const DEFAULT_NEWS = [
    {
      id: "NEWS-001",
      source: "Reuters",
      sourceType: "wire",
      priority: "HIGH",
      severity: "HIGH",
      domain: "geo-security",
      region: "gaza",
      country: "gaza",
      title: {
        en: "Military pressure remains concentrated around Gaza structure.",
        ar: "الضغط العسكري ما يزال متركزًا حول بنية غزة."
      },
      summary: {
        en: "Ongoing military pressure continues to shape Gaza as the dominant structural file in the current system picture.",
        ar: "الضغط العسكري المستمر يواصل تشكيل غزة باعتبارها الملف البنيوي المهيمن في صورة النظام الحالية."
      },
      publishedAt: "2026-04-15T08:00:00Z",
      url: "",
      tags: ["gaza", "military", "pressure"],
      impact: 8,
      confidence: 7,
      urgency: 8,
      persistence: 8,
      spread: 6,
      active: true
    },
    {
      id: "NEWS-002",
      source: "Al Jazeera",
      sourceType: "network",
      priority: "HIGH",
      severity: "HIGH",
      domain: "military",
      region: "levant",
      country: "lebanon",
      title: {
        en: "Northern front pressure remains active with hybrid escalation indicators.",
        ar: "ضغط الجبهة الشمالية ما يزال نشطًا مع مؤشرات تصعيد هجينة."
      },
      summary: {
        en: "The Lebanon file remains under elevated pressure with military and political overlap.",
        ar: "ملف لبنان ما يزال تحت ضغط مرتفع مع تداخل عسكري وسياسي."
      },
      publishedAt: "2026-04-15T08:20:00Z",
      url: "",
      tags: ["lebanon", "front", "hybrid"],
      impact: 8,
      confidence: 7,
      urgency: 7,
      persistence: 7,
      spread: 6,
      active: true
    },
    {
      id: "NEWS-003",
      source: "AP",
      sourceType: "wire",
      priority: "MEDIUM",
      severity: "MEDIUM",
      domain: "geopolitical",
      region: "regional",
      country: "iran",
      title: {
        en: "Diplomatic engagement around Iran remains under structured pressure.",
        ar: "الانخراط الدبلوماسي حول إيران ما يزال تحت ضغط منظم."
      },
      summary: {
        en: "Negotiation dynamics remain active, but enforcement pathways are still unclear.",
        ar: "ديناميات التفاوض ما تزال نشطة، لكن مسارات التنفيذ لا تزال غير واضحة."
      },
      publishedAt: "2026-04-15T08:45:00Z",
      url: "",
      tags: ["iran", "negotiation", "diplomatic"],
      impact: 6,
      confidence: 6,
      urgency: 5,
      persistence: 6,
      spread: 5,
      active: true
    }
  ];

  const STATE = {
    items: [],
    lastUpdated: null,
    lastExternalSync: null,
    initialized: false
  };

  function nowIso() {
    return new Date().toISOString();
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
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

  function getLocalizedText(value, lang = "en") {
    if (!value) return "";
    if (typeof value === "string" || typeof value === "number") return String(value);

    const localized =
      value[lang] ??
      value.en ??
      value.ar ??
      value.title ??
      value.name ??
      value.label ??
      value.text;

    if (typeof localized === "string" || typeof localized === "number") {
      return String(localized);
    }

    if (localized && typeof localized === "object") {
      return getLocalizedText(localized, lang);
    }

    return "";
  }

  function normalizePriority(value) {
    const v = String(value || "").toUpperCase().trim();
    if (v === "HIGH") return "HIGH";
    if (v === "MEDIUM") return "MEDIUM";
    return "LOW";
  }

  function normalizeSeverity(value) {
    return normalizePriority(value);
  }

  function normalizeDate(value) {
    const date = new Date(value || nowIso());
    if (Number.isNaN(date.getTime())) return nowIso();
    return date.toISOString();
  }

  function uniqueTags(tags) {
    return [...new Set(asArray(tags).map(tag => safeText(tag)).filter(Boolean))];
  }

  function inferDomainFromText(item) {
    const bag = [
      getLocalizedText(item?.title, "en"),
      getLocalizedText(item?.summary, "en"),
      safeText(item?.domain),
      safeText(item?.category),
      safeText(item?.topic)
    ].join(" ").toLowerCase();

    if (bag.includes("military") || bag.includes("strike") || bag.includes("front")) return "military";
    if (bag.includes("security") || bag.includes("raid") || bag.includes("attack")) return "security";
    if (bag.includes("diplomatic") || bag.includes("talks") || bag.includes("negotiation")) return "diplomatic";
    if (bag.includes("economic") || bag.includes("market") || bag.includes("trade")) return "economic";
    if (bag.includes("maritime") || bag.includes("shipping") || bag.includes("red sea")) return "maritime";
    if (bag.includes("energy") || bag.includes("gas") || bag.includes("oil")) return "energy";
    if (bag.includes("logistics") || bag.includes("supply")) return "logistics";
    if (bag.includes("geo")) return "geopolitical";

    return safeText(item?.domain, safeText(item?.category, "geopolitical"));
  }

  function inferScores(item) {
    const priority = normalizePriority(item?.priority || item?.severity);

    const impact = clamp(
      safeNumber(item?.impact, priority === "HIGH" ? 7 : priority === "MEDIUM" ? 5 : 3),
      1,
      10
    );

    const confidence = clamp(
      safeNumber(item?.confidence, 5),
      1,
      10
    );

    const urgency = clamp(
      safeNumber(item?.urgency, priority === "HIGH" ? 7 : priority === "MEDIUM" ? 5 : 3),
      1,
      10
    );

    const persistence = clamp(
      safeNumber(item?.persistence, 5),
      1,
      10
    );

    const spread = clamp(
      safeNumber(item?.spread, 5),
      1,
      10
    );

    return { impact, confidence, urgency, persistence, spread };
  }

  function normalizeNewsItem(item, index = 0) {
    const titleEn =
      getLocalizedText(item?.title, "en") ||
      safeText(item?.title_en) ||
      safeText(item?.headline) ||
      `News Item ${index + 1}`;

    const titleAr =
      getLocalizedText(item?.title, "ar") ||
      safeText(item?.title_ar) ||
      titleEn;

    const summaryEn =
      getLocalizedText(item?.summary, "en") ||
      safeText(item?.summary_en) ||
      safeText(item?.description) ||
      titleEn;

    const summaryAr =
      getLocalizedText(item?.summary, "ar") ||
      safeText(item?.summary_ar) ||
      summaryEn;

    const priority = normalizePriority(item?.priority || item?.severity);
    const scores = inferScores({ ...item, priority });

    return {
      id: safeText(item?.id, `NEWS-${Date.now()}-${index + 1}`),
      source: safeText(item?.source, safeText(item?.sourceName, "Unknown Source")),
      sourceType: safeText(item?.sourceType, "unknown"),
      priority,
      severity: normalizeSeverity(item?.severity || priority),
      domain: inferDomainFromText(item),
      region: safeText(item?.region, safeText(item?.country, "regional")),
      country: safeText(item?.country, safeText(item?.region, "global")),
      title: {
        en: titleEn,
        ar: titleAr
      },
      summary: {
        en: summaryEn,
        ar: summaryAr
      },
      publishedAt: normalizeDate(item?.publishedAt || item?.timestamp),
      url: safeText(item?.url, "#"),
      tags: uniqueTags(item?.tags),
      impact: scores.impact,
      confidence: scores.confidence,
      urgency: scores.urgency,
      persistence: scores.persistence,
      spread: scores.spread,
      active: item?.active !== false
    };
  }

  function compareByDateDesc(a, b) {
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  }

  function trimItems(items) {
    return items.slice(0, CONFIG.maxItems);
  }

  function buildDedupeKey(item) {
    return [
      normalizeText(getLocalizedText(item.title, "en")),
      normalizeText(item.source),
      normalizeText(item.country || item.region),
      normalizeText(item.domain)
    ].join("|");
  }

  function dedupeNews(items) {
    const map = new Map();

    asArray(items).forEach((item, index) => {
      const normalized = normalizeNewsItem(item, index);
      const key = buildDedupeKey(normalized);
      const existing = map.get(key);

      if (!existing) {
        map.set(key, normalized);
        return;
      }

      const existingTime = new Date(existing.publishedAt).getTime();
      const nextTime = new Date(normalized.publishedAt).getTime();

      if (nextTime >= existingTime) {
        map.set(key, normalized);
      }
    });

    return trimItems([...map.values()].sort(compareByDateDesc));
  }

  function saveState() {
    try {
      localStorage.setItem(
        CONFIG.storageKey,
        JSON.stringify({
          items: STATE.items,
          lastUpdated: STATE.lastUpdated,
          lastExternalSync: STATE.lastExternalSync
        })
      );
    } catch (error) {
      console.error("IBSS_NEWS saveState error:", error);
    }
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(CONFIG.storageKey);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;

      STATE.items = dedupeNews(asArray(parsed.items));
      STATE.lastUpdated = parsed.lastUpdated || null;
      STATE.lastExternalSync = parsed.lastExternalSync || null;
    } catch (error) {
      console.error("IBSS_NEWS loadState error:", error);
    }
  }

  function seedDefaultNews() {
    if (STATE.items.length) return;
    STATE.items = dedupeNews(DEFAULT_NEWS);
    STATE.lastUpdated = nowIso();
    saveState();
  }

  function ensureInitialized() {
    if (STATE.initialized) return;
    loadState();
    seedDefaultNews();
    STATE.initialized = true;
  }

  function setGlobalNews() {
    globalThis.IBSS_NEWS = getAllNews();
  }

  function getAllNews() {
    ensureInitialized();
    return clone(STATE.items).sort(compareByDateDesc);
  }

  function getActiveNews() {
    return getAllNews().filter(item => item.active !== false);
  }

  function getLatestNews(limit = CONFIG.homeItems) {
    const max = Math.max(1, Number(limit) || CONFIG.homeItems);
    return getActiveNews().slice(0, max);
  }

  function getTickerNews(limit = CONFIG.tickerItems) {
    const max = Math.max(1, Number(limit) || CONFIG.tickerItems);

    const preferred = getActiveNews().filter(item =>
      item.priority === "HIGH" || item.priority === "MEDIUM"
    );

    return (preferred.length ? preferred : getActiveNews()).slice(0, max);
  }

  function getNewsByCountry(country) {
    const target = normalizeText(country);
    return getActiveNews().filter(item => normalizeText(item.country) === target);
  }

  function getNewsByDomain(domain) {
    const target = normalizeText(domain);
    return getActiveNews().filter(item => normalizeText(item.domain) === target);
  }

  function getLatestStrategicStudyFromContent() {
    const content = asArray(globalThis.IBSS_CONTENT);

    const eligible = content
      .filter(item => {
        const type = normalizeText(item?.type);
        const status = normalizeText(item?.status);

        return status === "published" && (
          type === "study" ||
          type === "report" ||
          type === "policy_paper" ||
          type === "analysis" ||
          type === "brief"
        );
      })
      .sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime());

    return eligible[0] || null;
  }

  function getTopCountryFromSystem() {
    try {
      if (globalThis.IBSS_ENGINE && typeof globalThis.IBSS_ENGINE.getLastSystemState === "function") {
        const last = globalThis.IBSS_ENGINE.getLastSystemState();
        const feed = asArray(last?.countryRiskFeed);
        if (feed.length) return feed[0];
      }

      if (globalThis.IBSS_ENGINE && typeof globalThis.IBSS_ENGINE.getStaticSystemFallback === "function") {
        const system = globalThis.IBSS_ENGINE.getStaticSystemFallback();
        const feed = asArray(system?.countryRiskFeed);
        if (feed.length) return feed[0];
      }
    } catch (error) {
      console.error("IBSS_NEWS top country error:", error);
    }

    const countries = asArray(globalThis.IBSS_COUNTRIES)
      .slice()
      .sort((a, b) => Number(b.riskScore || 0) - Number(a.riskScore || 0));

    return countries[0] || null;
  }

  function getTopSignalFromSystem() {
    try {
      if (globalThis.IBSS_ENGINE && typeof globalThis.IBSS_ENGINE.getLastSystemState === "function") {
        const last = globalThis.IBSS_ENGINE.getLastSystemState();
        if (last?.topSignal || last?.dominantSignal) {
          return last.topSignal || last.dominantSignal;
        }
      }

      if (globalThis.IBSS_ENGINE && typeof globalThis.IBSS_ENGINE.getStaticSystemFallback === "function") {
        const system = globalThis.IBSS_ENGINE.getStaticSystemFallback();
        if (system?.topSignal || system?.dominantSignal) {
          return system.topSignal || system.dominantSignal;
        }
      }
    } catch (error) {
      console.error("IBSS_NEWS top signal error:", error);
    }

    const signals = asArray(globalThis.IBSS_SIGNALS)
      .slice()
      .sort((a, b) => {
        const aScore = Number(a?.balancedScore100 || a?.score100 || 0);
        const bScore = Number(b?.balancedScore100 || b?.score100 || 0);
        return bScore - aScore;
      });

    return signals[0] || null;
  }

  function getHomeSnapshot() {
    ensureInitialized();

    return {
      topSignal: getTopSignalFromSystem(),
      topCountry: getTopCountryFromSystem(),
      latestStudy: getLatestStrategicStudyFromContent(),
      latestNews: getLatestNews(CONFIG.homeItems)
    };
  }

  function replaceStateItems(items) {
    STATE.items = dedupeNews(items);
    STATE.lastUpdated = nowIso();
    saveState();
    setGlobalNews();
    return getAllNews();
  }

  function addNewsItems(items) {
    ensureInitialized();
    const incoming = asArray(items);
    if (!incoming.length) return getAllNews();
    return replaceStateItems([...incoming, ...STATE.items]);
  }

  function addNewsItem(item) {
    return addNewsItems([item]);
  }

  function replaceNews(items) {
    ensureInitialized();
    return replaceStateItems(asArray(items));
  }

  function markInactive(id) {
    ensureInitialized();

    STATE.items = STATE.items.map(item =>
      item.id === id ? { ...item, active: false } : item
    );

    STATE.lastUpdated = nowIso();
    saveState();
    setGlobalNews();

    return getAllNews();
  }

  function buildMockRotatingNews() {
    const now = new Date();
    const minute = now.getUTCMinutes();
    const isEven = minute % 2 === 0;

    return [
      {
        id: `LIVE-GAZA-${minute}`,
        source: "Live Monitor",
        sourceType: "live",
        priority: isEven ? "HIGH" : "MEDIUM",
        severity: isEven ? "HIGH" : "MEDIUM",
        domain: "geo-security",
        region: "gaza",
        country: "gaza",
        title: {
          en: isEven
            ? "Live monitoring detects renewed structural pressure around Gaza."
            : "Operational monitoring keeps Gaza as the dominant active file.",
          ar: isEven
            ? "الرصد الحي يلتقط تجدد الضغط البنيوي حول غزة."
            : "المراقبة التشغيلية تُبقي غزة الملف النشط المهيمن."
        },
        summary: {
          en: "The Gaza file remains central in the live pressure structure.",
          ar: "ملف غزة ما يزال مركزيًا في بنية الضغط الحية."
        },
        publishedAt: nowIso(),
        url: "",
        tags: ["gaza", "live", "pressure"],
        impact: isEven ? 8 : 6,
        confidence: 6,
        urgency: isEven ? 8 : 5,
        persistence: 7,
        spread: 6,
        active: true
      },
      {
        id: `LIVE-REGIONAL-${minute}`,
        source: "Regional Watch",
        sourceType: "live",
        priority: "MEDIUM",
        severity: "MEDIUM",
        domain: "geopolitical",
        region: "regional",
        country: "iran",
        title: {
          en: "Regional diplomatic pressure remains active in parallel with security uncertainty.",
          ar: "الضغط الدبلوماسي الإقليمي ما يزال نشطًا بالتوازي مع عدم اليقين الأمني."
        },
        summary: {
          en: "The regional file remains active without crossing into full escalation.",
          ar: "الملف الإقليمي ما يزال نشطًا دون عبور إلى التصعيد الكامل."
        },
        publishedAt: nowIso(),
        url: "",
        tags: ["regional", "diplomatic", "uncertainty"],
        impact: 5,
        confidence: 5,
        urgency: 5,
        persistence: 6,
        spread: 5,
        active: true
      },
      {
        id: `LIVE-LEVANT-${minute}`,
        source: "Field Watch",
        sourceType: "live",
        priority: minute % 3 === 0 ? "HIGH" : "LOW",
        severity: minute % 3 === 0 ? "HIGH" : "LOW",
        domain: "security",
        region: "levant",
        country: "lebanon",
        title: {
          en: minute % 3 === 0
            ? "Hybrid pressure indicators remain visible on the northern front."
            : "Northern front activity remains under structured observation.",
          ar: minute % 3 === 0
            ? "مؤشرات الضغط الهجين ما تزال ظاهرة على الجبهة الشمالية."
            : "نشاط الجبهة الشمالية ما يزال تحت المراقبة المنظمة."
        },
        summary: {
          en: "The northern file remains relevant inside the sovereign tracking layer.",
          ar: "الملف الشمالي ما يزال حاضرًا داخل طبقة التتبع السيادي."
        },
        publishedAt: nowIso(),
        url: "",
        tags: ["levant", "lebanon", "front"],
        impact: minute % 3 === 0 ? 7 : 3,
        confidence: 5,
        urgency: minute % 3 === 0 ? 7 : 3,
        persistence: 5,
        spread: 4,
        active: true
      }
    ].slice(0, CONFIG.fallbackRotateCount);
  }

  function readIngestionLayer() {
    try {
      if (globalThis.IBSS_INGESTION) {
        if (typeof globalThis.IBSS_INGESTION.getNormalizedNews === "function") {
          return asArray(globalThis.IBSS_INGESTION.getNormalizedNews());
        }

        if (typeof globalThis.IBSS_INGESTION.getNews === "function") {
          return asArray(globalThis.IBSS_INGESTION.getNews());
        }

        if (typeof globalThis.IBSS_INGESTION.pullLatestNews === "function") {
          return asArray(globalThis.IBSS_INGESTION.pullLatestNews());
        }
      }
    } catch (error) {
      console.error("IBSS_NEWS ingestion layer error:", error);
    }

    return [];
  }

  function readSourcesLayer() {
    try {
      if (globalThis.IBSS_SOURCES) {
        if (typeof globalThis.IBSS_SOURCES.getLiveNews === "function") {
          return asArray(globalThis.IBSS_SOURCES.getLiveNews());
        }

        if (typeof globalThis.IBSS_SOURCES.getNews === "function") {
          return asArray(globalThis.IBSS_SOURCES.getNews());
        }

        if (typeof globalThis.IBSS_SOURCES.fetchLatestNews === "function") {
          return asArray(globalThis.IBSS_SOURCES.fetchLatestNews());
        }
      }
    } catch (error) {
      console.error("IBSS_NEWS sources layer error:", error);
    }

    return [];
  }

  function readGlobalRawFeeds() {
    const buckets = [];

    if (Array.isArray(globalThis.IBSS_SOURCE_NEWS)) {
      buckets.push(...globalThis.IBSS_SOURCE_NEWS);
    }

    if (Array.isArray(globalThis.IBSS_LIVE_NEWS)) {
      buckets.push(...globalThis.IBSS_LIVE_NEWS);
    }

    if (Array.isArray(globalThis.IBSS_RAW_NEWS)) {
      buckets.push(...globalThis.IBSS_RAW_NEWS);
    }

    return buckets;
  }

  function collectExternalNews() {
    const fromIngestion = readIngestionLayer();
    const fromSources = readSourcesLayer();
    const fromGlobals = readGlobalRawFeeds();

    return dedupeNews([
      ...fromIngestion,
      ...fromSources,
      ...fromGlobals
    ]).slice(0, CONFIG.externalItemsLimit);
  }

  function syncExternalNews() {
    ensureInitialized();

    const external = collectExternalNews();

    if (!external.length) {
      return getAllNews();
    }

    STATE.items = dedupeNews([...external, ...STATE.items]);
    STATE.lastUpdated = nowIso();
    STATE.lastExternalSync = nowIso();
    saveState();
    setGlobalNews();

    return getAllNews();
  }

  function refreshMockNews() {
    ensureInitialized();
    return addNewsItems(buildMockRotatingNews());
  }

  function needsRefresh() {
    ensureInitialized();
    if (!STATE.lastUpdated) return true;

    const last = new Date(STATE.lastUpdated).getTime();
    return (Date.now() - last) >= CONFIG.refreshMs;
  }

  function autoRefreshIfNeeded() {
    ensureInitialized();

    if (!needsRefresh()) {
      return getAllNews();
    }

    const external = collectExternalNews();

    if (external.length) {
      STATE.items = dedupeNews([...external, ...STATE.items]);
      STATE.lastUpdated = nowIso();
      STATE.lastExternalSync = nowIso();
      saveState();
      setGlobalNews();
      return getAllNews();
    }

    return refreshMockNews();
  }

  function forceRefresh() {
    ensureInitialized();

    const external = collectExternalNews();

    if (external.length) {
      STATE.items = dedupeNews([...external, ...STATE.items]);
      STATE.lastUpdated = nowIso();
      STATE.lastExternalSync = nowIso();
      saveState();
      setGlobalNews();
      return getAllNews();
    }

    return refreshMockNews();
  }

  function getStats() {
    const items = getActiveNews();

    return {
      total: items.length,
      high: items.filter(item => item.priority === "HIGH").length,
      medium: items.filter(item => item.priority === "MEDIUM").length,
      low: items.filter(item => item.priority === "LOW").length,
      lastUpdated: STATE.lastUpdated,
      lastExternalSync: STATE.lastExternalSync
    };
  }

  ensureInitialized();
  syncExternalNews();
  autoRefreshIfNeeded();
  setGlobalNews();

  globalThis.IBSS_NEWS_UTILS = {
    CONFIG,
    getAllNews,
    getActiveNews,
    getLatestNews,
    getTickerNews,
    getNewsByCountry,
    getNewsByDomain,
    getHomeSnapshot,
    getStats,
    addNewsItem,
    addNewsItems,
    replaceNews,
    markInactive,
    refreshMockNews,
    syncExternalNews,
    autoRefreshIfNeeded,
    forceRefresh,
    needsRefresh
  };
})();
