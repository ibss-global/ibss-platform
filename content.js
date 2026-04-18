// IBSS CONTENT REGISTRY — Unified Sovereign Content Layer
// Version: v3.0 Engine-Integrated Clean Edition

(function () {
  "use strict";

  /* =========================================
     Core Utilities
  ========================================= */

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
      .slice(0, 24);
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

  function titleCase(text) {
    return safeText(text)
      .split(" ")
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  /* =========================================
     Country + Region Aliases
  ========================================= */

  function normalizeCountryAlias(value) {
    const v = normalizeText(value);

    if (!v) return "global";

    if (["ctr-gaza", "gaza", "gazastrip"].includes(v)) return "gaza";
    if (["ctr-leb", "leb", "lebanon"].includes(v)) return "lebanon";
    if (["ctr-irn", "irn", "iran"].includes(v)) return "iran";
    if (["ctr-rs", "rs", "red sea", "redsea"].includes(v)) return "redsea";
    if (["ctr-wb", "wb", "west bank", "westbank"].includes(v)) return "westbank";

    return v;
  }

  function countryAliases(value) {
    const normalized = normalizeCountryAlias(value);

    const map = {
      gaza: ["gaza", "ctr-gaza"],
      lebanon: ["lebanon", "leb", "ctr-leb"],
      iran: ["iran", "irn", "ctr-irn"],
      redsea: ["redsea", "red sea", "rs", "ctr-rs"],
      westbank: ["westbank", "west bank", "wb", "ctr-wb"],
      global: ["global"]
    };

    return map[normalized] || [normalized];
  }

  /* =========================================
     Domain Helpers
  ========================================= */

  function normalizeDomain(domain) {
    const d = normalizeText(domain || "general");

    if (d.includes("geo-security")) return "geo-security";
    if (d.includes("geo-military")) return "geo-military";
    if (d.includes("governance-security")) return "governance-security";
    if (d.includes("military")) return "military";
    if (d.includes("security")) return "security";
    if (d.includes("geopolitical")) return "geopolitical";
    if (d.includes("diplomatic")) return "diplomatic";
    if (d.includes("economic")) return "economic";
    if (d.includes("maritime")) return "maritime";
    if (d.includes("energy")) return "energy";
    if (d.includes("logistics")) return "logistics";

    return d || "general";
  }

  function getClusterDomainCandidates(domain) {
    const d = normalizeDomain(domain);

    const map = {
      "geo-security": ["geo-security", "security", "geopolitical"],
      "geo-military": ["geo-military", "military", "geopolitical", "maritime"],
      "governance-security": ["governance-security", "security", "geopolitical"],
      military: ["military", "geo-military"],
      security: ["security", "geo-security", "governance-security"],
      geopolitical: ["geopolitical", "geo-security", "geo-military"],
      maritime: ["maritime", "geo-military", "logistics"],
      diplomatic: ["diplomatic", "geopolitical"],
      economic: ["economic", "geopolitical"],
      logistics: ["logistics", "maritime", "geopolitical"],
      energy: ["energy", "economic", "geopolitical"]
    };

    return map[d] || [d];
  }

  /* =========================================
     Content Normalization
  ========================================= */

  function normalizeContentMeta(meta) {
    return {
      featured: !!meta?.featured,
      pinned: !!meta?.pinned,
      canonical: !!meta?.canonical
    };
  }

  function normalizeMetrics(metrics) {
    return {
      policyRisk: clamp(safeNumber(metrics?.policyRisk, 0), 0, 100),
      implementationDifficulty: clamp(safeNumber(metrics?.implementationDifficulty, 0), 0, 100),
      regionalSensitivity: clamp(safeNumber(metrics?.regionalSensitivity, 0), 0, 100),
      strategicWeight: clamp(safeNumber(metrics?.strategicWeight, 0), 0, 100)
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

      domain: normalizeDomain(item?.domain || "general"),
      region: normalizeCountryAlias(item?.region || item?.country || item?.countryId || "global"),
      country: normalizeCountryAlias(item?.country || item?.countryId || item?.region || "global"),
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
      metrics: normalizeMetrics(item?.metrics),

      engagement: normalizeEngagement(item?.engagement),
      links: asArray(item?.links),
      meta: normalizeContentMeta(item?.meta)
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

      domain: normalizeDomain(item?.domain || "general"),
      region: normalizeCountryAlias(item?.region || item?.country || item?.countryId || "global"),
      country: normalizeCountryAlias(item?.country || item?.countryId || item?.region || "global"),
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
      metrics: normalizeMetrics(item?.metrics),

      engagement: normalizeEngagement(item?.engagement),
      links: asArray(item?.links),
      meta: normalizeContentMeta(item?.meta)
    };
  }

  /* =========================================
     Base Content
  ========================================= */

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
      },
      meta: {
        canonical: true
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

  /* =========================================
     External Publications Integration
  ========================================= */

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

      const aFeatured = a?.meta?.featured ? 1 : 0;
      const bFeatured = b?.meta?.featured ? 1 : 0;

      if (bFeatured !== aFeatured) return bFeatured - aFeatured;

      return new Date(b?.publishedAt || 0).getTime() - new Date(a?.publishedAt || 0).getTime();
    });
  }

  const UNIFIED_CONTENT = mergeContent(BASE_CONTENT, PUBLICATIONS_CONTENT);

  function buildIndex(list) {
    return asArray(list).reduce((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {});
  }

  /* =========================================
     Filters
  ========================================= */

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
    return getAll().filter(item => item.type === normalizeType(type));
  }

  function getByCountry(country) {
    const aliases = countryAliases(country);

    return getAll().filter(item => {
      const itemCountry = normalizeCountryAlias(item.country);
      const itemCountryId = normalizeCountryAlias(item.countryId);
      return aliases.includes(itemCountry) || aliases.includes(itemCountryId);
    });
  }

  function getByDomain(domain) {
    const target = normalizeDomain(domain);
    return getAll().filter(item => normalizeDomain(item.domain) === target);
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

  function getCanonical() {
    return getAll().filter(item => !!item?.meta?.canonical);
  }

  function getContentState() {
    return {
      total: UNIFIED_CONTENT.length,
      published: getPublished().length,
      pending: getPending().length,
      archived: getArchived().length,
      featured: getFeatured().length,
      pinned: getPinned().length,
      publicationsIntegrated: PUBLICATIONS_CONTENT.length
    };
  }

  /* =========================================
     Engine Impact Logic
  ========================================= */

  function priorityWeight(priority) {
    const p = normalizePriority(priority);
    if (p === "HIGH") return 1.0;
    if (p === "MEDIUM") return 0.65;
    return 0.35;
  }

  function typeWeight(type) {
    const t = normalizeType(type);

    if (t === "policy_paper") return 1.00;
    if (t === "study") return 0.95;
    if (t === "report") return 0.85;
    if (t === "analysis") return 0.72;
    if (t === "brief") return 0.56;
    if (t === "news") return 0.35;

    return 0.50;
  }

  function recencyWeight(publishedAt) {
    const ts = new Date(publishedAt || 0).getTime();
    if (!ts) return 0.35;

    const ageHours = (Date.now() - ts) / (1000 * 60 * 60);

    if (ageHours <= 24) return 1.00;
    if (ageHours <= 72) return 0.88;
    if (ageHours <= 168) return 0.74;
    if (ageHours <= 336) return 0.60;
    if (ageHours <= 720) return 0.48;
    return 0.32;
  }

  function metricsWeight(metrics) {
    const policyRisk = safeNumber(metrics?.policyRisk, 0);
    const implementationDifficulty = safeNumber(metrics?.implementationDifficulty, 0);
    const regionalSensitivity = safeNumber(metrics?.regionalSensitivity, 0);
    const strategicWeight = safeNumber(metrics?.strategicWeight, 0);

    const composite =
      (policyRisk * 0.24) +
      (implementationDifficulty * 0.14) +
      (regionalSensitivity * 0.26) +
      (strategicWeight * 0.36);

    return clamp(composite / 100, 0, 1);
  }

  function metaWeight(meta) {
    let score = 0;

    if (meta?.featured) score += 0.20;
    if (meta?.pinned) score += 0.25;
    if (meta?.canonical) score += 0.30;

    return clamp(score, 0, 0.50);
  }

  function engagementWeight(engagement) {
    const reactions = safeNumber(engagement?.reactions, 0);
    const comments = safeNumber(engagement?.comments, 0);
    const shares = safeNumber(engagement?.shares, 0);

    const raw = (reactions * 0.03) + (comments * 0.12) + (shares * 0.20);
    return clamp(raw / 10, 0, 0.35);
  }

  function computeImpactBase(item) {
    const statusPenalty =
      item?.status === "published" ? 1 :
      item?.status === "pending" ? 0.45 :
      item?.status === "draft" ? 0.25 :
      0.10;

    const base =
      (priorityWeight(item.priority) * 0.24) +
      (typeWeight(item.type) * 0.18) +
      (recencyWeight(item.publishedAt) * 0.18) +
      (metricsWeight(item.metrics) * 0.25) +
      (metaWeight(item.meta) * 0.10) +
      (engagementWeight(item.engagement) * 0.05);

    return clamp(base * statusPenalty, 0, 1);
  }

  function computeContentImpact(item) {
    const base = computeImpactBase(item);

    return {
      base,
      signalBoost: clamp(Math.round(base * 18), 0, 18),
      clusterBoost: clamp(Math.round(base * 14), 0, 14),
      countryBoost: clamp(Math.round(base * 16), 0, 16),
      confidenceBoost: clamp(Math.round(base * 10), 0, 10)
    };
  }

  /* =========================================
     Engine Linkage Helpers
  ========================================= */

  function getEngineEligibleContent() {
    return getPublished().filter(item =>
      item.type === "report" ||
      item.type === "study" ||
      item.type === "analysis" ||
      item.type === "brief" ||
      item.type === "policy_paper"
    );
  }

  function getContentLinkedToSignal(signalId) {
    const target = safeText(signalId, "");
    if (!target) return [];

    return getEngineEligibleContent().filter(item =>
      asArray(item.signalIds).includes(target)
    );
  }

  function getContentLinkedToCountry(country) {
    const aliases = countryAliases(country);

    return getEngineEligibleContent().filter(item => {
      const itemCountry = normalizeCountryAlias(item.country);
      const itemCountryId = normalizeCountryAlias(item.countryId);

      return aliases.includes(itemCountry) || aliases.includes(itemCountryId);
    });
  }

  function getContentLinkedToCluster(clusterKey) {
    const [regionPart, domainPart] = safeText(clusterKey, "global::general").split("::");
    const regionAliases = countryAliases(regionPart);
    const domainCandidates = getClusterDomainCandidates(domainPart);

    return getEngineEligibleContent().filter(item => {
      const itemCountry = normalizeCountryAlias(item.country);
      const itemCountryId = normalizeCountryAlias(item.countryId);
      const itemRegion = normalizeCountryAlias(item.region);
      const itemDomain = normalizeDomain(item.domain);

      const regionMatch =
        regionAliases.includes(itemCountry) ||
        regionAliases.includes(itemCountryId) ||
        regionAliases.includes(itemRegion);

      const domainMatch = domainCandidates.includes(itemDomain);

      return regionMatch && domainMatch;
    });
  }

  function getLatestFeaturedContent() {
    const featured = getFeatured()
      .filter(item => item.status === "published")
      .sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime());

    if (featured.length) return clone(featured[0]);

    const pinned = getPinned()
      .filter(item => item.status === "published")
      .sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime());

    if (pinned.length) return clone(pinned[0]);

    const latestPolicyLike = getEngineEligibleContent()
      .sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime());

    return latestPolicyLike[0] ? clone(latestPolicyLike[0]) : null;
  }

  /* =========================================
     Preview Helpers
  ========================================= */

  function buildPreviewCard(item, lang = "en") {
    if (!item) return null;

    return {
      id: item.id,
      type: item.type,
      unit: item.unit,
      title: getLocalizedText(item.title, lang),
      summary: getLocalizedText(item.summary, lang),
      edition: item.edition,
      domain: item.domain,
      country: item.country,
      countryId: item.countryId,
      priority: item.priority,
      publishedAt: item.publishedAt,
      sourcePlatform: item.sourcePlatform,
      tags: clone(item.tags || []),
      meta: clone(item.meta || {})
    };
  }

  function getPublicationPreviewList(limit = 12, lang = "en") {
    return getPublished()
      .slice(0, Math.max(1, safeNumber(limit, 12)))
      .map(item => buildPreviewCard(item, lang));
  }

  /* =========================================
     Exports
  ========================================= */

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
    getCanonical,
    getContentState
  };

  globalThis.IBSS_CONTENT_API = {
    getAll,
    getPublished,
    getPending,
    getArchived,
    getById,
    getByType,
    getByCountry,
    getByDomain,
    getFeatured,
    getPinned,
    getCanonical,
    getLatestPublished,
    getEngineEligibleContent,
    getContentLinkedToSignal,
    getContentLinkedToCluster,
    getContentLinkedToCountry,
    getLatestFeaturedContent,
    computeContentImpact,
    getPublicationPreviewList,
    buildPreviewCard,
    getContentState
  };
})();
