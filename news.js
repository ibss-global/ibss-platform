// IBSS NEWS CORE — Multi-Source Live News Layer
// Version: v2.0 Production Foundation

(function () {
  "use strict";

  const NEWS_REFRESH_MS = 5 * 60 * 1000;
  const STORAGE_KEY = "ibss_news_state_v1";

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

  function getLocalizedText(value, lang = "en") {
    if (!value) return "";
    if (typeof value === "string") return value;
    return value[lang] || value.en || value.ar || "";
  }

  function normalizeText(value) {
    return safeText(String(value || ""))
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
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

  function normalizeNewsItem(item, index = 0) {
    const publishedAt = item?.publishedAt || nowIso();
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
      id: safeText(item?.id, `NEWS-AUTO-${index + 1}`),
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
      publishedAt,
      url: safeText(item?.url, ""),
      tags: asArray(item?.tags).map(tag => safeText(tag)).filter(Boolean),
      active: item?.active !== false
    };
  }

  function compareByDateDesc(a, b) {
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  }

  function dedupeNews(items) {
    const map = new Map();

    items.forEach((item, index) => {
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

      if (nextTime > existingTime) {
        map.set(key, normalized);
      }
    });

    return [...map.values()].sort(compareByDateDesc);
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;

      STATE.items = asArray(parsed.items).map((item, index) => normalizeNewsItem(item, index));
      STATE.lastUpdated = parsed.lastUpdated || null;
    } catch (error) {
      console.error("IBSS_NEWS loadState error:", error);
    }
  }

  function saveState() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          items: STATE.items,
          lastUpdated: STATE.lastUpdated
        })
      );
    } catch (error) {
      console.error("IBSS_NEWS saveState error:", error);
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

  function getAllNews() {
    ensureInitialized();
    return clone(STATE.items).sort(compareByDateDesc);
  }

  function getActiveNews() {
    ensureInitialized();
    return getAllNews().filter(item => item.active !== false);
  }

  function getLatestNews(limit = 5) {
    return getActiveNews().slice(0, Math.max(1, Number(limit) || 5));
  }

  function getTickerNews(limit = 8) {
    return getActiveNews()
      .filter(item => item.priority === "HIGH" || item.priority === "MEDIUM")
      .slice(0, Math.max(1, Number(limit) || 8));
  }

  function getNewsByCountry(country) {
    ensureInitialized();
    const target = normalizeText(country);
    return getActiveNews().filter(item => normalizeText(item.country) === target);
  }

  function getNewsByDomain(domain) {
    ensureInitialized();
    const target = normalizeText(domain);
    return getActiveNews().filter(item => normalizeText(item.domain) === target);
  }

  function getLatestStrategicStudyFromContent() {
    const content = asArray(globalThis.IBSS_CONTENT);
    const eligible = content
      .filter(item => {
        const type = normalizeText(item?.type);
        const status = normalizeText(item?.status);
        return (
          status === "published" &&
          (type === "study" || type === "report" || type === "policy_paper" || type === "analysis" || type === "brief")
        );
      })
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    return eligible[0] || null;
  }

  function getTopCountryFromSystem() {
    if (globalThis.IBSS_ENGINE && typeof globalThis.IBSS_ENGINE.getStaticSystemFallback === "function") {
      const system = globalThis.IBSS_ENGINE.getStaticSystemFallback();
      return asArray(system?.countryRiskFeed)[0] || null;
    }

    const countries = asArray(globalThis.IBSS_COUNTRIES)
      .slice()
      .sort((a, b) => Number(b.riskScore || 0) - Number(a.riskScore || 0));

    return countries[0] || null;
  }

  function getTopSignalFromSystem() {
    if (globalThis.IBSS_ENGINE && typeof globalThis.IBSS_ENGINE.getStaticSystemFallback === "function") {
      const system = globalThis.IBSS_ENGINE.getStaticSystemFallback();
      return system?.topSignal || system?.dominantSignal || null;
    }

    const signals = asArray(globalThis.IBSS_SIGNALS)
      .slice()
      .sort((a, b) => {
        const aScore =
          Number(a?.balancedScore100 || a?.score100 || 0) ||
          Math.round(((Number(a?.metrics?.weight || 0) * 0.5) +
            (Number(a?.metrics?.volatility || 0) * 0.25) +
            (Number(a?.metrics?.impact || 0) * 0.25)) * 100);

        const bScore =
          Number(b?.balancedScore100 || b?.score100 || 0) ||
          Math.round(((Number(b?.metrics?.weight || 0) * 0.5) +
            (Number(b?.metrics?.volatility || 0) * 0.25) +
            (Number(b?.metrics?.impact || 0) * 0.25)) * 100);

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

  function addNewsItems(items) {
    ensureInitialized();
    const incoming = asArray(items);
    if (!incoming.length) return getAllNews();

    STATE.items = dedupeNews([...incoming, ...STATE.items]);
    STATE.lastUpdated = nowIso();
    saveState();

    return getAllNews();
  }

  function addNewsItem(item) {
    return addNewsItems([item]);
  }

  function replaceNews(items) {
    ensureInitialized();
    STATE.items = dedupeNews(asArray(items));
    STATE.lastUpdated = nowIso();
    saveState();
    return getAllNews();
  }

  function markInactive(id) {
    ensureInitialized();
    STATE.items = STATE.items.map(item =>
      item.id === id ? { ...item, active: false } : item
    );
    STATE.lastUpdated = nowIso();
    saveState();
    return getAllNews();
  }

  function refreshMockNews() {
    ensureInitialized();

    const now = new Date();
    const seedMinute = now.getUTCMinutes();

    const rotating = [
      {
        id: `LIVE-GAZA-${seedMinute}`,
        source: "Live Monitor",
        sourceType: "live",
        priority: seedMinute % 2 === 0 ? "HIGH" : "MEDIUM",
        severity: seedMinute % 2 === 0 ? "HIGH" : "MEDIUM",
        domain: "geo-security",
        region: "gaza",
        country: "gaza",
        title: {
          en: seedMinute % 2 === 0
            ? "Live monitoring detects renewed structural pressure around Gaza."
            : "Operational monitoring keeps Gaza as the dominant active file.",
          ar: seedMinute % 2 === 0
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
        id: `LIVE-REGIONAL-${seedMinute}`,
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
      }
    ];

    return addNewsItems(rotating);
  }

  function needsRefresh() {
    ensureInitialized();
    if (!STATE.lastUpdated) return true;
    const last = new Date(STATE.lastUpdated).getTime();
    return (Date.now() - last) >= NEWS_REFRESH_MS;
  }

  function autoRefreshIfNeeded() {
    ensureInitialized();
    if (!needsRefresh()) return getAllNews();
    return refreshMockNews();
  }

  loadState();
  seedDefaultNews();

  globalThis.IBSS_NEWS = getAllNews();

  globalThis.IBSS_NEWS_UTILS = {
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
    needsRefresh
  };

  autoRefreshIfNeeded();
  globalThis.IBSS_NEWS = getAllNews();
})();
