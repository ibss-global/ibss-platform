window.IBSS_PUBLICATION_INTAKE = (function () {
  "use strict";

  const CONFIG = {
    version: "v1.0",
    defaultUnit: "SSU",
    defaultLayer: "L1",
    defaultMode: "Structured Analysis",
    defaultType: "study",
    defaultClassification: "Sovereign Analytical Publication",
    defaultEdition: "Standard Analytical Edition",
    defaultStatus: "published",
    defaultDomain: "geopolitical",
    defaultRegion: "global",
    defaultCountry: "global",
    defaultPriority: "MEDIUM",
    defaultAuthor: "IBSS",
    defaultSourcePlatform: "internal",
    idPrefix: "PUB",
    signalPrefix: "SIG",
    storageKey: "ibss_publication_intake_state_v1",
    maxStoredItems: 300
  };

  const STATE = {
    initialized: false,
    publications: [],
    lastPublication: null
  };

  /* =========================================
     Utilities
  ========================================= */

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

  function clone(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      console.error("IBSS_PUBLICATION_INTAKE clone error:", error);
      return null;
    }
  }

  function normalizeText(value) {
    return safeText(String(value || ""))
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function slugify(value) {
    return safeText(String(value || ""))
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s_-]/gu, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function localize(en, ar) {
    return {
      en: safeText(en, "-"),
      ar: safeText(ar, safeText(en, "-"))
    };
  }

  function normalizeLocalized(value, fallback = "-") {
    if (typeof value === "string" || typeof value === "number") {
      const text = safeText(String(value), fallback);
      return { en: text, ar: text };
    }

    return {
      en: safeText(value?.en, safeText(value?.ar, fallback)),
      ar: safeText(value?.ar, safeText(value?.en, fallback))
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
    const p = String(priority || CONFIG.defaultPriority).toUpperCase().trim();
    if (p === "HIGH") return "HIGH";
    if (p === "MEDIUM") return "MEDIUM";
    return "LOW";
  }

  function normalizeStatus(status) {
    const s = normalizeText(status || CONFIG.defaultStatus);
    if (s === "published") return "published";
    if (s === "pending") return "pending";
    if (s === "archived") return "archived";
    if (s === "draft") return "draft";
    return CONFIG.defaultStatus;
  }

  function normalizeType(type) {
    const t = normalizeText(type || CONFIG.defaultType);
    const allowed = ["report", "study", "brief", "news", "policy_paper", "analysis"];
    return allowed.includes(t) ? t : CONFIG.defaultType;
  }

  function normalizeTags(tags) {
    return asArray(tags)
      .map(tag => safeText(String(tag)))
      .filter(Boolean)
      .slice(0, 30);
  }

  function normalizeStringArray(values) {
    return asArray(values)
      .map(value => safeText(String(value)))
      .filter(Boolean);
  }

  function normalizeDate(value) {
    const raw = safeText(value, "");
    if (!raw) return nowIso();

    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return nowIso();

    return date.toISOString();
  }

  function buildId(prefix, seed = "") {
    const base = slugify(seed) || `${Date.now()}`;
    return `${prefix}-${base}-${Date.now()}`;
  }

  /* =========================================
     Persistence
  ========================================= */

  function loadState() {
    try {
      const raw = localStorage.getItem(CONFIG.storageKey);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;

      STATE.publications = asArray(parsed.publications);
      STATE.lastPublication = parsed.lastPublication || null;
    } catch (error) {
      console.error("IBSS_PUBLICATION_INTAKE loadState error:", error);
    }
  }

  function saveState() {
    try {
      localStorage.setItem(
        CONFIG.storageKey,
        JSON.stringify({
          publications: STATE.publications.slice(0, CONFIG.maxStoredItems),
          lastPublication: STATE.lastPublication
        })
      );
    } catch (error) {
      console.error("IBSS_PUBLICATION_INTAKE saveState error:", error);
    }
  }

  function ensureInit() {
    if (STATE.initialized) return;
    loadState();
    STATE.initialized = true;
  }

  /* =========================================
     Structural Inference
  ========================================= */

  function inferLayer(raw) {
    const direct = safeText(raw?.layer, "");
    if (direct) return direct.toUpperCase();

    const text = normalizeText(
      `${getLocalizedText(raw?.title, "en")} ${getLocalizedText(raw?.title, "ar")} ${raw?.rawText || ""}`
    );

    const match = text.match(/\bl\s*([1-9])\b/i) || text.match(/layer\s*[:\-]?\s*l\s*([1-9])/i);
    if (match) return `L${match[1]}`;

    if (text.includes("meta-layer") || text.includes("blueprint deconstruction")) return "L9";

    return CONFIG.defaultLayer;
  }

  function inferMode(raw) {
    const direct = safeText(raw?.mode, "");
    if (direct) return direct;

    const text = normalizeText(raw?.rawText || "");

    if (text.includes("blueprint deconstruction")) return "Blueprint Deconstruction";
    if (text.includes("structural reading")) return "Structural Reading";
    if (text.includes("policy paper")) return "Policy Assessment";
    if (text.includes("executive")) return "Executive Assessment";

    return CONFIG.defaultMode;
  }

  function inferType(raw) {
    const direct = normalizeType(raw?.type);
    if (direct) return direct;

    const text = normalizeText(raw?.rawText || "");

    if (text.includes("policy paper")) return "policy_paper";
    if (text.includes("brief")) return "brief";
    if (text.includes("analysis")) return "analysis";
    if (text.includes("report")) return "report";

    return CONFIG.defaultType;
  }

  function inferClassification(raw, layer, mode, type) {
    const direct = safeText(raw?.classification, "");
    if (direct) return direct;

    if (layer === "L9" && mode === "Blueprint Deconstruction") {
      return "L9 Blueprint Deconstruction";
    }

    if (type === "policy_paper") return "Sovereign Policy Paper";
    if (type === "study") return "Sovereign Analytical Study";
    if (type === "analysis") return "Sovereign Structural Analysis";
    if (type === "report") return "Sovereign Report";

    return CONFIG.defaultClassification;
  }

  function inferEdition(raw, layer, classification) {
    const direct = safeText(raw?.edition, "");
    if (direct) return direct;

    if (layer === "L9") {
      return "L9-SOV Blueprint Deconstruction Edition";
    }

    return `${classification} Edition`;
  }

  function inferDomain(raw) {
    const direct = safeText(raw?.domain, "");
    if (direct) return direct;

    const text = normalizeText(
      `${getLocalizedText(raw?.title, "en")} ${getLocalizedText(raw?.title, "ar")} ${raw?.rawText || ""}`
    );

    if (text.match(/military|operational|war|قتال|حرب|عسكري/)) return "geo-military";
    if (text.match(/security|أمني|سردية|narrative/)) return "geo-security";
    if (text.match(/policy|policy paper|سياسات/)) return "geopolitical";
    if (text.match(/diplomatic|negotiation|مفاوضات|دبلوماسي/)) return "geopolitical";

    return CONFIG.defaultDomain;
  }

  function inferRegion(raw) {
    const direct = safeText(raw?.region, "");
    if (direct) return direct.toLowerCase();

    const text = normalizeText(
      `${getLocalizedText(raw?.title, "en")} ${getLocalizedText(raw?.title, "ar")} ${raw?.rawText || ""}`
    );

    if (text.includes("gaza") || text.includes("غزة")) return "gaza";
    if (text.includes("west bank") || text.includes("الضفة")) return "westbank";
    if (text.includes("lebanon") || text.includes("لبنان")) return "lebanon";
    if (text.includes("iran") || text.includes("إيران")) return "iran";
    if (text.includes("red sea") || text.includes("البحر الأحمر")) return "redsea";

    return CONFIG.defaultRegion;
  }

  function inferCountry(raw, region) {
    const direct = safeText(raw?.country, "");
    if (direct) return direct.toLowerCase();

    return safeText(region, CONFIG.defaultCountry).toLowerCase();
  }

  function inferPriority(raw) {
    const direct = normalizePriority(raw?.priority);
    if (direct) return direct;

    const text = normalizeText(raw?.rawText || "");

    if (text.includes("restricted") || text.includes("l9") || text.includes("war acceptance")) return "HIGH";
    if (text.includes("policy") || text.includes("structural")) return "MEDIUM";

    return CONFIG.defaultPriority;
  }

  function inferSummary(raw) {
    const direct = getLocalizedText(raw?.summary, "en") || getLocalizedText(raw?.summary, "ar");
    if (safeText(direct, "")) {
      return normalizeLocalized(raw.summary, "No summary available.");
    }

    const bodyAr = getLocalizedText(raw?.body, "ar");
    const bodyEn = getLocalizedText(raw?.body, "en");

    return {
      ar: safeText(bodyAr.slice(0, 280), "لا يوجد ملخص متاح."),
      en: safeText(bodyEn.slice(0, 280), "No summary available.")
    };
  }

  function inferTags(raw, normalized) {
    const base = normalizeTags(raw?.tags);

    const auto = [
      normalized.region,
      normalized.layer,
      normalized.mode,
      normalized.type,
      normalized.classification,
      normalized.domain
    ].filter(Boolean);

    return [...new Set([...base, ...auto])].slice(0, 30);
  }

  function inferMetrics(raw, normalized) {
    const metrics = raw?.metrics || {};

    const strategicWeight =
      safeNumber(metrics.strategicWeight,
        normalized.layer === "L9" ? 94 :
        normalized.priority === "HIGH" ? 84 :
        normalized.priority === "MEDIUM" ? 68 : 52
      );

    const policyRisk =
      safeNumber(metrics.policyRisk,
        normalized.type === "policy_paper" ? 88 :
        normalized.domain.includes("security") ? 82 : 64
      );

    const regionalSensitivity =
      safeNumber(metrics.regionalSensitivity,
        normalized.region === "gaza" ? 92 :
        normalized.region === "iran" ? 84 :
        normalized.region === "lebanon" ? 81 : 60
      );

    const implementationDifficulty =
      safeNumber(metrics.implementationDifficulty,
        normalized.layer === "L9" ? 76 :
        normalized.type === "brief" ? 45 : 61
      );

    return {
      policyRisk,
      implementationDifficulty,
      regionalSensitivity,
      strategicWeight
    };
  }

  function inferMeta(raw, normalized) {
    return {
      featured: raw?.meta?.featured === true || normalized.layer === "L9",
      pinned: raw?.meta?.pinned === true || normalized.priority === "HIGH",
      canonical: raw?.meta?.canonical === true || normalized.layer === "L9"
    };
  }

  function inferSignalIds(raw, normalized) {
    const given = normalizeStringArray(raw?.signalIds);
    if (given.length) return given;

    const regionSlug = slugify(normalized.region || "global").toUpperCase();
    const classSlug = slugify(normalized.classification || "study").replace(/-/g, "_").toUpperCase();

    return [
      `${CONFIG.signalPrefix}-${regionSlug}-${classSlug}-001`
    ];
  }

  /* =========================================
     Normalization
  ========================================= */

  function normalizeRawPublication(raw) {
    const layer = inferLayer(raw);
    const mode = inferMode(raw);
    const type = inferType(raw);
    const classification = inferClassification(raw, layer, mode, type);
    const edition = inferEdition(raw, layer, classification);
    const domain = inferDomain(raw);
    const region = inferRegion(raw);
    const country = inferCountry(raw, region);
    const priority = inferPriority(raw);

    const title = normalizeLocalized(raw?.title, "Untitled Publication");
    const body = normalizeLocalized(raw?.body, "No body available.");
    const summary = inferSummary({
      ...raw,
      body
    });

    const normalized = {
      id: safeText(raw?.id, buildId(CONFIG.idPrefix, `${region}-${classification}`)),
      title,
      summary,
      body,

      type,
      classification,
      edition,
      status: normalizeStatus(raw?.status),

      unit: safeText(raw?.unit, CONFIG.defaultUnit),
      layer,
      mode,

      domain,
      region,
      country,
      countryId: safeText(raw?.countryId, `CTR-${slugify(country).toUpperCase()}`),

      signalIds: inferSignalIds(raw, {
        region,
        classification
      }),

      priority,

      sourcePlatform: safeText(raw?.sourcePlatform, CONFIG.defaultSourcePlatform),
      sourceUrl: safeText(raw?.sourceUrl, ""),
      publishedAt: normalizeDate(raw?.publishedAt),

      tags: [],
      author: safeText(raw?.author, CONFIG.defaultAuthor),
      authors: normalizeStringArray(raw?.authors?.length ? raw.authors : [safeText(raw?.author, CONFIG.defaultAuthor)]),

      metrics: {},
      links: asArray(raw?.links),
      meta: {}
    };

    normalized.tags = inferTags(raw, normalized);
    normalized.metrics = inferMetrics(raw, normalized);
    normalized.meta = inferMeta(raw, normalized);

    return normalized;
  }

  /* =========================================
     Registry Ops
  ========================================= */

  function registerPublication(raw) {
    ensureInit();

    const publication = normalizeRawPublication(raw);

    STATE.publications.unshift(publication);
    STATE.publications = STATE.publications.slice(0, CONFIG.maxStoredItems);
    STATE.lastPublication = publication;

    saveState();
    emitPublicationRegistered(publication);

    return clone(publication);
  }

  function registerBatch(list) {
    ensureInit();

    return asArray(list).map(item => registerPublication(item));
  }

  function emitPublicationRegistered(publication) {
    try {
      window.dispatchEvent(new CustomEvent("ibss:publication-registered", {
        detail: {
          id: publication?.id || null,
          type: publication?.type || null,
          layer: publication?.layer || null,
          region: publication?.region || null
        }
      }));
    } catch (error) {
      console.error("IBSS_PUBLICATION_INTAKE emit error:", error);
    }
  }

  /* =========================================
     Readers
  ========================================= */

  function getAll() {
    ensureInit();
    return clone(STATE.publications) || [];
  }

  function getLatest() {
    ensureInit();
    return clone(STATE.lastPublication);
  }

  function getById(id) {
    ensureInit();
    return clone(STATE.publications.find(item => item.id === id) || null);
  }

  function getByLayer(layer) {
    ensureInit();
    const target = safeText(layer, "").toUpperCase();
    return clone(STATE.publications.filter(item => safeText(item.layer, "").toUpperCase() === target));
  }

  function getByRegion(region) {
    ensureInit();
    const target = normalizeText(region);
    return clone(STATE.publications.filter(item => normalizeText(item.region) === target));
  }

  function getBySignalId(signalId) {
    ensureInit();
    const target = safeText(signalId, "");
    return clone(
      STATE.publications.filter(item => asArray(item.signalIds).includes(target))
    );
  }

  function findBestMatchForSignal(signal) {
    ensureInit();
    if (!signal) return null;

    const signalId = safeText(signal?.id, "");
    if (signalId) {
      const direct = STATE.publications.find(item => asArray(item.signalIds).includes(signalId));
      if (direct) return clone(direct);
    }

    const region = normalizeText(signal?.region || signal?.country);
    const domain = normalizeText(signal?.domain);
    const title = normalizeText(getLocalizedText(signal?.title, "en"));

    const ranked = STATE.publications
      .map(item => {
        let score = 0;

        if (normalizeText(item.region) === region) score += 4;
        if (normalizeText(item.country) === region) score += 3;
        if (normalizeText(item.domain) === domain) score += 2;

        const itemTitle = normalizeText(getLocalizedText(item.title, "en"));
        if (title && itemTitle && (title.includes(itemTitle) || itemTitle.includes(title))) score += 2;

        if (safeText(item.layer, "") === "L9") score += 1;
        if (safeText(item.priority, "") === "HIGH") score += 1;

        return { item, score };
      })
      .sort((a, b) => b.score - a.score);

    return ranked[0]?.score > 0 ? clone(ranked[0].item) : null;
  }

  /* =========================================
     IBSS_PUBLICATIONS compatibility
  ========================================= */

  function buildCompatibilityApi() {
    return {
      getAll,
      getLatest,
      getById,
      getByLayer,
      getByRegion,
      getBySignalId,
      findBestMatchForSignal,
      register: registerPublication,
      registerBatch
    };
  }

  ensureInit();

  globalThis.IBSS_PUBLICATIONS = buildCompatibilityApi();

  return {
    CONFIG,
    register: registerPublication,
    registerBatch,
    getAll,
    getLatest,
    getById,
    getByLayer,
    getByRegion,
    getBySignalId,
    findBestMatchForSignal
  };
})();
