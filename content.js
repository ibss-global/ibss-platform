// IBSS CONTENT REGISTRY — Unified Sovereign Content Layer
// Version: v2.0 Clean Integrated Edition

(function () {
  "use strict";

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

  function normalizeText(value) {
    return safeText(String(value || ""))
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeLocalized(value, fallback = "-") {
    if (typeof value === "string" || typeof value === "number") {
      const text = String(value);
      return {
        ar: safeText(text, fallback),
        en: safeText(text, fallback)
      };
    }

    return {
      ar: safeText(value?.ar, safeText(value?.en, fallback)),
      en: safeText(value?.en, safeText(value?.ar, fallback))
    };
  }

  function getLocalizedText(value, lang = "en") {
    if (!value) return "";
    if (typeof value === "string" || typeof value === "number") return String(value);

    return (
      value[lang] ||
      value.en ||
      value.ar ||
      value.name ||
      value.title ||
      value.label ||
      value.text ||
      ""
    );
  }

  function normalizePriority(priority) {
    const p = String(priority || "LOW").toUpperCase().trim();
    if (p === "HIGH") return "HIGH";
    if (p === "MEDIUM") return "MEDIUM";
    return "LOW";
  }

  function normalizeStatus(status) {
    const s = normalizeText(status || "published");
    if (s === "pending") return "pending";
    if (s === "archived") return "archived";
    if (s === "draft") return "draft";
    return "published";
  }

  function normalizeType(type) {
    const t = normalizeText(type || "report");
    if (
      t === "report" ||
      t === "study" ||
      t === "brief" ||
      t === "news" ||
      t === "policy_paper" ||
      t === "analysis"
    ) {
      return t;
    }

    return "report";
  }

  function normalizeTags(tags) {
    return asArray(tags)
      .map(tag => safeText(String(tag)))
      .filter(Boolean)
      .slice(0, 20);
  }

  function normalizeStringArray(values) {
    return asArray(values)
      .map(value => safeText(String(value)))
      .filter(Boolean);
  }

  function normalizeDate(value) {
    const raw = safeText(value, "");
    if (!raw) return new Date().toISOString();

    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return new Date().toISOString();

    return date.toISOString();
  }

  function normalizeEngagement(engagement) {
    return {
      reactions: safeNumber(engagement?.reactions, 0),
      comments: safeNumber(engagement?.comments, 0),
      shares: safeNumber(engagement?.shares, 0)
    };
  }

  function normalizeLegacyContentItem(item) {
    return {
      id: safeText(item?.id, `CNT-${Date.now()}`),

      title: normalizeLocalized(item?.title, "Untitled Content"),
      summary: normalizeLocalized(item?.summary, "No summary available."),
      body: normalizeLocalized(item?.body, "No body available."),

      type: normalizeType(item?.type),
      classification: safeText(item?.classification, normalizeType(item?.type)),
      edition: safeText(item?.edition, "Foundation Content Edition"),
      status: normalizeStatus(item?.status),

      domain: safeText(item?.domain, "general"),
      region: safeText(item?.region, item?.countryId || "global"),
      country: safeText(item?.country, item?.countryId || item?.region || "global"),
      countryId: safeText(item?.countryId, ""),
      signalIds: normalizeStringArray(item?.signalIds),

      priority: normalizePriority(item?.priority),
      sourcePlatform: safeText(item?.sourcePlatform, "internal"),
      sourceUrl: safeText(item?.sourceUrl, ""),
      publishedAt: normalizeDate(item?.publishedAt),

      tags: normalizeTags(item?.tags),
      author: safeText(item?.author, "IBSS"),
      authors: normalizeStringArray(item?.authors?.length ? item.authors : [item?.author || "IBSS"]),

      unit: safeText(item?.unit, "SSU"),
      metrics: {
        policyRisk: safeNumber(item?.metrics?.policyRisk, 0),
        implementationDifficulty: safeNumber(item?.metrics?.implementationDifficulty, 0),
        regionalSensitivity: safeNumber(item?.metrics?.regionalSensitivity, 0),
        strategicWeight: safeNumber(item?.metrics?.strategicWeight, 0)
      },

      engagement: normalizeEngagement(item?.engagement),

      links: asArray(item?.links),
      meta: {
        featured: !!item?.meta?.featured,
        pinned: !!item?.meta?.pinned,
        canonical: !!item?.meta?.canonical
      }
    };
  }

  function normalizePublicationItem(item) {
    return {
      id: safeText(item?.id, `PUB-${Date.now()}`),

      title: normalizeLocalized(item?.title, "Untitled Publication"),
      summary: normalizeLocalized(item?.summary, "No summary available."),
      body: normalizeLocalized(item?.body, "No body available."),

      type: normalizeType(item?.type),
      classification: safeText(item?.classification, normalizeType(item?.type)),
      edition: safeText(item?.edition, "Publication Edition"),
      status: normalizeStatus(item?.status),

      domain: safeText(item?.domain, "general"),
      region: safeText(item?.region, "global"),
      country: safeText(item?.country, item?.region || "global"),
      countryId: safeText(item?.countryId, ""),
      signalIds: normalizeStringArray(item?.signalIds),

      priority: normalizePriority(item?.priority),
      sourcePlatform: safeText(item?.sourcePlatform, "ibss_publications"),
      sourceUrl: safeText(item?.sourceUrl, ""),
      publishedAt: normalizeDate(item?.publishedAt),

      tags: normalizeTags(item?.tags),
      author: safeText(item?.author, item?.authors?.[0] || "IBSS"),
      authors: normalizeStringArray(item?.authors?.length ? item.authors : [item?.author || "IBSS"]),

      unit: safeText(item?.unit, "SSU"),
      metrics: {
        policyRisk: safeNumber(item?.metrics?.policyRisk, 0),
        implementationDifficulty: safeNumber(item?.metrics?.implementationDifficulty, 0),
        regionalSensitivity: safeNumber(item?.metrics?.regionalSensitivity, 0),
        strategicWeight: safeNumber(item?.metrics?.strategicWeight, 0)
      },

      engagement: normalizeEngagement(item?.engagement),
      links: asArray(item?.links),
      meta: {
        featured: !!item?.meta?.featured,
        pinned: !!item?.meta?.pinned,
        canonical: !!item?.meta?.canonical
      }
    };
  }

  const BASE_CONTENT = [
    {
      id: "CNT-001",
      title: {
        ar: "غزة: من ساحة قتال إلى بنية ضغط",
        en: "Gaza: From Battlefield to Pressure Structure"
      },
      summary: {
        ar: "قراءة سيادية تعتبر غزة نظام ضغط بنيوي تتقاطع فيه القوة العسكرية والهشاشة الحوكمية والضغط الإنساني والتنافس السردي.",
        en: "A sovereign reading that frames Gaza as a structural pressure system where military force, governance fragility, humanitarian stress, and narrative competition intersect."
      },
      body: {
        ar: "هذا المحتوى يمثل تقريرًا أساسيًا ضمن ملف غزة، ويُستخدم كمغذٍ مباشر للإشارة البنيوية الخاصة بها داخل النظام.",
        en: "This content acts as a foundational report within the Gaza file and serves as a direct feeder for its structural signal inside the system."
      },
      type: "report",
      domain: "geo-security",
      countryId: "CTR-GAZA",
      signalIds: ["SIG-GAZA-001"],
      priority: "HIGH",
      status: "published",
      sourcePlatform: "facebook",
      sourceUrl: "",
      publishedAt: "2026-04-13T09:00:00Z",
      tags: ["غزة", "ضغط بنيوي", "حرب", "حوكمة", "إنساني"],
      author: "IBSS",
      engagement: {
        reactions: 0,
        comments: 0,
        shares: 0
      }
    },

    {
      id: "CNT-002",
      title: {
        ar: "لبنان: ضغط الجبهة الشمالية",
        en: "Lebanon: Northern Front Pressure"
      },
      summary: {
        ar: "تحليل يرصد استمرار الضغط على الجبهة الشمالية ضمن نمط هجين يجمع بين العسكري والسياسي.",
        en: "An analysis tracking sustained pressure on the northern front within a hybrid military-political pattern."
      },
      body: {
        ar: "هذا المحتوى يُسجل ضمن ملف لبنان ويغذي الإشارة العسكرية/الهجينة الخاصة بالجبهة الشمالية.",
        en: "This content is registered under the Lebanon file and feeds the military-hybrid signal related to the northern front."
      },
      type: "report",
      domain: "military",
      countryId: "CTR-LEB",
      signalIds: ["SIG-LEB-001"],
      priority: "HIGH",
      status: "published",
      sourcePlatform: "facebook",
      sourceUrl: "",
      publishedAt: "2026-04-13T11:00:00Z",
      tags: ["لبنان", "الجبهة الشمالية", "عسكري", "هجين"],
      author: "IBSS",
      engagement: {
        reactions: 0,
        comments: 0,
        shares: 0
      }
    },

    {
      id: "CNT-003",
      title: {
        ar: "إيران: مفاوضات تحت الضغط",
        en: "Iran: Negotiations Under Pressure"
      },
      summary: {
        ar: "قراءة جيوسياسية للمفاوضات الإيرانية بوصفها مسارًا دبلوماسيًا غير مستقر تحت ضغط إقليمي ودولي.",
        en: "A geopolitical reading of Iran negotiations as an unstable diplomatic process under regional and international pressure."
      },
      body: {
        ar: "هذا المحتوى يُسجل ضمن ملف إيران ويغذي الإشارة الدبلوماسية الخاصة بالمفاوضات والتوازنات الإقليمية.",
        en: "This content is registered under the Iran file and feeds the diplomatic signal tied to negotiations and regional balances."
      },
      type: "brief",
      domain: "geopolitical",
      countryId: "CTR-IRN",
      signalIds: ["SIG-IRN-001"],
      priority: "MEDIUM",
      status: "published",
      sourcePlatform: "facebook",
      sourceUrl: "",
      publishedAt: "2026-04-13T12:30:00Z",
      tags: ["إيران", "مفاوضات", "دبلوماسي", "جيوسياسي"],
      author: "IBSS",
      engagement: {
        reactions: 0,
        comments: 0,
        shares: 0
      }
    },

    {
      id: "CNT-004",
      title: {
        ar: "البحر الأحمر: توتر دون التعطيل الكامل",
        en: "Red Sea: Tension Below Full Disruption"
      },
      summary: {
        ar: "تقدير يعتبر أن مؤشرات البحر الأحمر ما تزال دون مستوى التعطيل الاستراتيجي الكامل لكنها تتطلب مراقبة.",
        en: "An estimate that Red Sea indicators remain below full strategic disruption, but still require monitoring."
      },
      body: {
        ar: "هذا المحتوى يُصنف كورقة سياسات أولية ضمن ملف البحر الأحمر ويغذي الإشارة البحرية في النظام.",
        en: "This content is classified as an initial policy paper under the Red Sea file and feeds the maritime signal in the system."
      },
      type: "policy_paper",
      domain: "geo-military",
      countryId: "CTR-RS",
      signalIds: ["SIG-RS-001"],
      priority: "LOW",
      status: "pending",
      sourcePlatform: "facebook",
      sourceUrl: "",
      publishedAt: "2026-04-13T14:00:00Z",
      tags: ["البحر الأحمر", "بحري", "ردع", "لوجستيات"],
      author: "IBSS",
      engagement: {
        reactions: 0,
        comments: 0,
        shares: 0
      }
    },

    {
      id: "CNT-005",
      title: {
        ar: "الضفة الغربية: مؤشرات تصعيد موضعي",
        en: "West Bank: Localized Escalation Indicators"
      },
      summary: {
        ar: "تحليل أمني يرى أن الضفة الغربية ما تزال في مستوى مراقبة مع قابلية للتوسع ضمن بيئة ضغط متقطعة.",
        en: "A security analysis assessing the West Bank as remaining at a watch level, with potential for expansion under intermittent pressure."
      },
      body: {
        ar: "هذا المحتوى يُسجل كتحليل موجز ضمن ملف الضفة الغربية ويغذي إشارة التصعيد الموضعي.",
        en: "This content is registered as a brief analysis under the West Bank file and feeds the localized escalation signal."
      },
      type: "analysis",
      domain: "security",
      countryId: "CTR-WB",
      signalIds: ["SIG-WB-001"],
      priority: "LOW",
      status: "pending",
      sourcePlatform: "facebook",
      sourceUrl: "",
      publishedAt: "2026-04-13T15:30:00Z",
      tags: ["الضفة الغربية", "أمني", "تصعيد", "مراقبة"],
      author: "IBSS",
      engagement: {
        reactions: 0,
        comments: 0,
        shares: 0
      }
    }
  ].map(normalizeLegacyContentItem);

  const PUBLICATIONS_CONTENT =
    globalThis.IBSS_PUBLICATIONS && typeof globalThis.IBSS_PUBLICATIONS.getAll === "function"
      ? asArray(globalThis.IBSS_PUBLICATIONS.getAll()).map(normalizePublicationItem)
      : [];

  function buildContentKey(item) {
    return safeText(
      item?.id,
      `${safeText(item?.type, "content")}::${safeText(getLocalizedText(item?.title, "en"), "untitled")}`
    );
  }

  function mergeContent(baseContent, publications) {
    const map = new Map();

    [...asArray(baseContent), ...asArray(publications)].forEach(item => {
      const key = buildContentKey(item);

      if (!map.has(key)) {
        map.set(key, item);
        return;
      }

      const existing = map.get(key);
      const existingPublished = new Date(existing?.publishedAt || 0).getTime();
      const currentPublished = new Date(item?.publishedAt || 0).getTime();

      if (currentPublished > existingPublished) {
        map.set(key, item);
      }
    });

    return [...map.values()].sort((a, b) => {
      const aPinned = a?.meta?.pinned ? 1 : 0;
      const bPinned = b?.meta?.pinned ? 1 : 0;

      if (bPinned !== aPinned) return bPinned - aPinned;

      return new Date(b?.publishedAt || 0).getTime() - new Date(a?.publishedAt || 0).getTime();
    });
  }

  function buildIndex(list) {
    return asArray(list).reduce((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {});
  }

  const UNIFIED_CONTENT = mergeContent(BASE_CONTENT, PUBLICATIONS_CONTENT);

  function getAll() {
    return clone(UNIFIED_CONTENT);
  }

  function getPublished() {
    return getAll().filter(item => item.status === "published");
  }

  function getPending() {
    return getAll().filter(item => item.status === "pending");
  }

  function getArchived() {
    return getAll().filter(item => item.status === "archived");
  }

  function getById(id) {
    return getAll().find(item => item.id === id) || null;
  }

  function getByType(type) {
    return getAll().filter(item => item.type === type);
  }

  function getByCountry(country) {
    const target = normalizeText(country);
    return getAll().filter(item =>
      normalizeText(item.country) === target ||
      normalizeText(item.countryId) === target
    );
  }

  function getByDomain(domain) {
    const target = normalizeText(domain);
    return getAll().filter(item => normalizeText(item.domain) === target);
  }

  function getLatestPublished() {
    return getPublished()[0] || null;
  }

  function getFeatured() {
    return getAll().filter(item => !!item?.meta?.featured);
  }

  function getPinned() {
    return getAll().filter(item => !!item?.meta?.pinned);
  }

  function getContentState() {
    return {
      total: UNIFIED_CONTENT.length,
      published: getPublished().length,
      pending: getPending().length,
      archived: getArchived().length,
      publicationsIntegrated: PUBLICATIONS_CONTENT.length
    };
  }

  globalThis.IBSS_CONTENT = UNIFIED_CONTENT;
  globalThis.IBSS_CONTENT_INDEX = buildIndex(UNIFIED_CONTENT);

  globalThis.IBSS_CONTENT_UTILS = {
    getAll,
    getPublished,
    getPending,
    getArchived,
    getById,
    getByType,
    getByCountry,
    getByDomain,
    getLatestPublished,
    getFeatured,
    getPinned,
    getContentState
  };
})();
