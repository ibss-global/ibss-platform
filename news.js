// IBSS NEWS CORE — Multi-Source Live News Layer
// Version: v3.0 Professional Runtime

(function () {
  "use strict";

  const CONFIG = {
    refreshMs: 5 * 60 * 1000,
    storageKey: "ibss_news_state_v3",
    maxItems: 120,
    tickerItems: 10,
    homeItems: 3
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
      active: true
    },
    {
      id: "NEWS-004",
      source: "Bloomberg",
      sourceType: "financial",
      priority: "LOW",
      severity: "LOW",
      domain: "geo-military",
      region: "maritime",
      country: "redsea",
      title: {
        en: "Red Sea tension remains below full disruption threshold.",
        ar: "توتر البحر الأحمر ما يزال دون عتبة التعطيل الكامل."
      },
      summary: {
        en: "Maritime risk indicators remain relevant, though not yet at strategic disruption level.",
        ar: "مؤشرات المخاطر البحرية ما تزال ذات صلة، لكنها لم تصل بعد إلى مستوى التعطيل الاستراتيجي."
      },
      publishedAt: "2026-04-15T09:10:00Z",
      url: "",
      tags: ["red sea", "maritime", "logistics"],
      active: true
    },
    {
      id: "NEWS-005",
      source: "Local Monitor",
      sourceType: "regional",
      priority: "LOW",
      severity: "LOW",
      domain: "security",
      region: "palestine",
      country: "westbank",
      title: {
        en: "Localized security tension in the West Bank remains under watch.",
        ar: "التوتر الأمني الموضعي في الضفة الغربية ما يزال تحت المراقبة."
      },
      summary: {
        en: "The West Bank file remains in observation mode with expansion potential still limited.",
        ar: "ملف الضفة الغربية ما يزال في وضع المراقبة مع بقاء قابلية التوسع محدودة."
      },
      publishedAt: "2026-04-15T09:30:00Z",
      url: "",
      tags: ["west bank", "security", "watch"],
      active: true
    }
  ];

  const STATE = {
    items: [],
    lastUpdated: null,
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

  function normalizeText(value) {
    return safeText(String(value || ""))
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function getLocalizedText(value, lang = "en") {
    if (!value) return "";
    if (typeof value === "string") return value;
    return value[lang] || value.en || value.ar || "";
  }

  function normalizePriority(value) {
    const v = normalizeText(value).toUpperCase();
    if (v === "HIGH") return "HIGH";
    if (v === "MEDIUM") return "MEDIUM";
    return "LOW";
  }

  function normalizeSeverity(value) {
    const v = normalizeText(value).toUpperCase();
    if (v === "HIGH") return "HIGH";
    if (v === "MEDIUM") return "MEDIUM";
    return "LOW";
  }

  function normalizeDate(value) {
    const date = new Date(value || nowIso());
    if (Number.isNaN(date.getTime())) return nowIso();
    return date.toISOString();
  }

  function uniqueTags(tags) {
    return [...new Set(asArray(tags).map(tag => safeText(tag)).filter(Boolean))];
  }

  function normalizeNewsItem(item, index = 0) {
    const titleEn =
      getLocalizedText(item?.title, "en") ||
      item?.title_en ||
      item?.headline ||
      `News Item ${index + 1}`;

    const titleAr =
      getLocalizedText(item?.title, "ar") ||
      item?.title_ar ||
      titleEn;

    const summaryEn =
      getLocalizedText(item?.summary, "en") ||
      item?.summary_en ||
      item?.description ||
      titleEn;

    const summaryAr =
      getLocalizedText(item?.summary, "ar") ||
      item?.summary_ar ||
      summaryEn;

    return {
      id: safeText(item?.id, `NEWS-AUTO-${Date.now()}-${index + 1}`),
      source: safeText(item?.source, "Unknown Source"),
      sourceType: safeText(item?.sourceType, "unknown"),
      priority: normalizePriority(item?.priority),
      severity: normalizeSeverity(item?.severity || item?.priority),
      domain: safeText(item?.domain, "geopolitical"),
      region: safeText(item?.region, "regional"),
      country: safeText(item?.country, ""),
      title: {
        en: titleEn,
        ar: titleAr
      },
      summary: {
        en: summaryEn,
        ar: summaryAr
      },
      publishedAt: normalizeDate(item?.publishedAt),
      url: safeText(item?.url, ""),
      tags: uniqueTags(item?.tags),
      active: item?.active !== false
    };
  }

  function compareByDateDesc(a, b) {
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  }

  function trimItems(items) {
    return items.slice(0, CONFIG.maxItems);
  }

  function dedupeNews(items) {
    const map = new Map();

    asArray(items).forEach((item, index) => {
      const normalized = normalizeNewsItem(item, index);

      const key = [
        normalizeText(getLocalizedText(normalized.title, "en")),
        normalizeText(normalized.source),
        normalizeText(normalized.country || normalized.region)
      ].join("|");

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
          lastUpdated: STATE.lastUpdated
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

    const countries = asArray(globalThis.IBSS_COUNTRIES)
      .slice()
      .sort((a, b) => Number(b.riskScore || 0) - Number(a.riskScore || 0));

    return countries[0] || null;
  }

  function getTopSignalFromSystem() {
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
      latestNews: getLatestNews(3)
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
        active: true
      }
    ];
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
    if (!needsRefresh()) return getAllNews();
    return refreshMockNews();
  }

  function forceRefresh() {
    ensureInitialized();
    return refreshMockNews();
  }

  ensureInitialized();
  setGlobalNews();
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
    addNewsItem,
    addNewsItems,
    replaceNews,
    markInactive,
    refreshMockNews,
    autoRefreshIfNeeded,
    forceRefresh,
    needsRefresh
  };
})();
