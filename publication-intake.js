window.IBSS_PUBLICATION_INTAKE = (function () {
  "use strict";

  const CONFIG = {
    storageKey: "ibss_publications_v2_full",
    idPrefix: "PUB",
    maxItems: 500
  };

  const STATE = {
    registry: new Map(),
    initialized: false
  };

  /* =========================
     Utilities
  ========================= */

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

  function clone(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      console.error("IBSS_PUBLICATION_INTAKE clone error:", error);
      return null;
    }
  }

  function generateId(type = "publication") {
    const stamp = Date.now().toString(36);
    const rand = Math.floor(Math.random() * 100000).toString(36);
    return `${CONFIG.idPrefix}-${type}-${stamp}-${rand}`.toUpperCase();
  }

  function localize(en, ar) {
    return { en, ar };
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
    const t = normalizeText(type || "study");
    const allowed = [
      "study",
      "report",
      "brief",
      "analysis",
      "policy_paper",
      "news",
      "paper"
    ];
    return allowed.includes(t) ? t : "study";
  }

  function normalizeStringArray(values) {
    return asArray(values)
      .map(item => safeText(String(item)))
      .filter(Boolean);
  }

  function normalizeTags(values) {
    return normalizeStringArray(values).slice(0, 30);
  }

  function normalizeDate(value, fallback = null) {
    const raw = safeText(value, "");
    if (!raw) return fallback || nowIso();

    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return fallback || nowIso();

    return date.toISOString();
  }

  function buildMetrics(rawMetrics = {}) {
    return {
      policyRisk: clamp(safeNumber(rawMetrics.policyRisk, 0), 0, 100),
      implementationDifficulty: clamp(safeNumber(rawMetrics.implementationDifficulty, 0), 0, 100),
      regionalSensitivity: clamp(safeNumber(rawMetrics.regionalSensitivity, 0), 0, 100),
      strategicWeight: clamp(safeNumber(rawMetrics.strategicWeight, 0), 0, 100)
    };
  }

  function buildMeta(rawMeta = {}) {
    return {
      featured: !!rawMeta.featured,
      pinned: !!rawMeta.pinned,
      canonical: !!rawMeta.canonical
    };
  }

  function dispatchChange(detail = {}) {
    try {
      window.dispatchEvent(new CustomEvent("ibss:publication-intake-updated", {
        detail
      }));
    } catch (error) {
      console.error("IBSS_PUBLICATION_INTAKE dispatchChange error:", error);
    }
  }

  /* =========================
     Storage
  ========================= */

  function saveState() {
    try {
      const items = [...STATE.registry.values()];
      localStorage.setItem(CONFIG.storageKey, JSON.stringify(items));
    } catch (error) {
      console.error("IBSS_PUBLICATION_INTAKE saveState error:", error);
    }
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(CONFIG.storageKey);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;

      parsed.forEach(item => {
        if (item?.id) {
          STATE.registry.set(item.id, item);
        }
      });
    } catch (error) {
      console.error("IBSS_PUBLICATION_INTAKE loadState error:", error);
    }
  }

  function ensureInit() {
    if (STATE.initialized) return;
    loadState();
    STATE.initialized = true;
  }

  /* =========================
     Normalization
  ========================= */

  function normalizePublication(raw = {}, existing = null) {
    const createdAt = existing?.createdAt || nowIso();
    const publishedAt = normalizeDate(raw.publishedAt, existing?.publishedAt || nowIso());

    return {
      id: safeText(raw.id, existing?.id || generateId(raw.type)),

      type: normalizeType(raw.type || existing?.type || "study"),
      classification: safeText(raw.classification, existing?.classification || ""),
      edition: safeText(raw.edition, existing?.edition || ""),
      layer: safeText(raw.layer, existing?.layer || ""),
      mode: safeText(raw.mode, existing?.mode || ""),

      title: normalizeLocalized(raw.title || existing?.title, "Untitled Publication"),
      summary: normalizeLocalized(raw.summary || existing?.summary, "No summary available."),
      body: normalizeLocalized(raw.body || existing?.body, "No body available."),

      unit: safeText(raw.unit, existing?.unit || "SSU"),
      status: normalizeStatus(raw.status || existing?.status || "published"),
      priority: normalizePriority(raw.priority || existing?.priority || "LOW"),

      domain: safeText(raw.domain, existing?.domain || "general"),
      region: safeText(raw.region, existing?.region || "global"),
      country: safeText(raw.country, existing?.country || raw.region || existing?.region || "global"),
      countryId: safeText(raw.countryId, existing?.countryId || ""),

      signalIds: normalizeStringArray(raw.signalIds != null ? raw.signalIds : existing?.signalIds),
      clusterKeys: normalizeStringArray(raw.clusterKeys != null ? raw.clusterKeys : existing?.clusterKeys),
      theaterKeys: normalizeStringArray(raw.theaterKeys != null ? raw.theaterKeys : existing?.theaterKeys),

      author: safeText(raw.author, existing?.author || "IBSS"),
      authors: normalizeStringArray(
        raw.authors != null ? raw.authors : (existing?.authors?.length ? existing.authors : [raw.author || existing?.author || "IBSS"])
      ),

      sourcePlatform: safeText(raw.sourcePlatform, existing?.sourcePlatform || "internal"),
      sourceUrl: safeText(raw.sourceUrl, existing?.sourceUrl || ""),

      tags: normalizeTags(raw.tags != null ? raw.tags : existing?.tags),
      metrics: buildMetrics(raw.metrics || existing?.metrics || {}),
      meta: buildMeta(raw.meta || existing?.meta || {}),

      createdAt,
      updatedAt: nowIso(),
      publishedAt
    };
  }

  function buildDedupKey(item) {
    return [
      normalizeType(item.type),
      normalizeText(getLocalizedText(item.title, "en")),
      normalizeText(item.region),
      normalizeText(item.country)
    ].join("|");
  }

  function sortPublications(list) {
    return asArray(list).slice().sort((a, b) => {
      const aPinned = a?.meta?.pinned ? 1 : 0;
      const bPinned = b?.meta?.pinned ? 1 : 0;
      if (bPinned !== aPinned) return bPinned - aPinned;

      const aFeatured = a?.meta?.featured ? 1 : 0;
      const bFeatured = b?.meta?.featured ? 1 : 0;
      if (bFeatured !== aFeatured) return bFeatured - aFeatured;

      const aCanonical = a?.meta?.canonical ? 1 : 0;
      const bCanonical = b?.meta?.canonical ? 1 : 0;
      if (bCanonical !== aCanonical) return bCanonical - aCanonical;

      const aTime = new Date(a?.publishedAt || a?.updatedAt || 0).getTime();
      const bTime = new Date(b?.publishedAt || b?.updatedAt || 0).getTime();
      return bTime - aTime;
    });
  }

  function trimIfNeeded() {
    const all = sortPublications([...STATE.registry.values()]);
    if (all.length <= CONFIG.maxItems) return;

    const keep = all.slice(0, CONFIG.maxItems);
    STATE.registry.clear();
    keep.forEach(item => STATE.registry.set(item.id, item));
  }

  /* =========================
     Publisher / Content Hooks
  ========================= */

  function syncExternalLayers(action, publication) {
    try {
      if (window.IBSS_PUBLISHER?.registerPublication && (action === "register" || action === "update")) {
        window.IBSS_PUBLISHER.registerPublication(publication);
      }
    } catch (error) {
      console.error("IBSS_PUBLICATION_INTAKE -> PUBLISHER sync error:", error);
    }

    try {
      if (window.IBSS_CONTENT_API?.reloadFromIntake) {
        window.IBSS_CONTENT_API.reloadFromIntake();
      }
    } catch (error) {
      console.error("IBSS_PUBLICATION_INTAKE -> CONTENT sync error:", error);
    }
  }

  /* =========================
     Registry Actions
  ========================= */

  function register(raw = {}) {
    ensureInit();

    const normalized = normalizePublication(raw);

    const incomingKey = buildDedupKey(normalized);
    const existingDuplicate = [...STATE.registry.values()].find(item =>
      item.id !== normalized.id && buildDedupKey(item) === incomingKey
    );

    if (existingDuplicate) {
      const merged = normalizePublication(raw, existingDuplicate);
      STATE.registry.set(existingDuplicate.id, merged);
      saveState();
      syncExternalLayers("update", merged);
      dispatchChange({ action: "dedupe-update", publication: clone(merged) });
      return clone(merged);
    }

    STATE.registry.set(normalized.id, normalized);
    trimIfNeeded();
    saveState();
    syncExternalLayers("register", normalized);
    dispatchChange({ action: "register", publication: clone(normalized) });

    return clone(normalized);
  }

  function update(id, patch = {}) {
    ensureInit();
    const existing = STATE.registry.get(id);
    if (!existing) return null;

    const updated = normalizePublication({ ...existing, ...patch, id }, existing);
    STATE.registry.set(id, updated);

    saveState();
    syncExternalLayers("update", updated);
    dispatchChange({ action: "update", publication: clone(updated) });

    return clone(updated);
  }

  function remove(id) {
    ensureInit();
    const existing = STATE.registry.get(id);
    if (!existing) return false;

    STATE.registry.delete(id);
    saveState();
    dispatchChange({ action: "remove", publication: clone(existing) });
    return true;
  }

  function clearAll() {
    ensureInit();
    STATE.registry.clear();
    saveState();
    dispatchChange({ action: "clear-all" });
    return true;
  }

  /* =========================
     Readers
  ========================= */

  function getAll() {
    ensureInit();
    return clone(sortPublications([...STATE.registry.values()])) || [];
  }

  function getById(id) {
    ensureInit();
    return clone(STATE.registry.get(id) || null);
  }

  function getPublished() {
    return getAll().filter(item => item.status === "published");
  }

  function getPending() {
    return getAll().filter(item => item.status === "pending" || item.status === "draft");
  }

  function getArchived() {
    return getAll().filter(item => item.status === "archived");
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

  function getLatest() {
    return getAll()[0] || null;
  }

  function getLatestFeatured() {
    return getFeatured()[0] || null;
  }

  /* =========================
     Queries
  ========================= */

  function findBySignal(signal) {
    if (!signal?.id) return null;
    return getPublished().find(pub => asArray(pub.signalIds).includes(signal.id)) || null;
  }

  function findByCluster(cluster) {
    if (!cluster) return null;

    const clusterKey =
      typeof cluster === "string"
        ? cluster
        : `${safeText(cluster.region, "global")}::${safeText(cluster.domain, "general")}`;

    return getPublished().find(pub => asArray(pub.clusterKeys).includes(clusterKey)) || null;
  }

  function findByCountry(country) {
    const target = normalizeText(
      typeof country === "string"
        ? country
        : getLocalizedText(country?.nameLocalized || country?.name, "en")
    );

    if (!target) return null;

    return getPublished().find(pub => {
      return (
        normalizeText(pub.country) === target ||
        normalizeText(pub.countryId) === target ||
        normalizeText(pub.region) === target
      );
    }) || null;
  }

  function findTopByRegion(region) {
    const target = normalizeText(region);
    const matches = getPublished().filter(pub => normalizeText(pub.region) === target);

    return sortPublications(matches).sort((a, b) =>
      safeNumber(b?.metrics?.strategicWeight, 0) - safeNumber(a?.metrics?.strategicWeight, 0)
    )[0] || null;
  }

  function findTopGlobal() {
    return getPublished().sort((a, b) =>
      safeNumber(b?.metrics?.strategicWeight, 0) - safeNumber(a?.metrics?.strategicWeight, 0)
    )[0] || null;
  }

  function getState() {
    ensureInit();

    return {
      total: STATE.registry.size,
      published: getPublished().length,
      pending: getPending().length,
      archived: getArchived().length,
      featured: getFeatured().length,
      pinned: getPinned().length,
      canonical: getCanonical().length
    };
  }

  return {
    CONFIG,

    register,
    update,
    remove,
    clearAll,

    getAll,
    getById,
    getPublished,
    getPending,
    getArchived,
    getFeatured,
    getPinned,
    getCanonical,
    getLatest,
    getLatestFeatured,

    findBySignal,
    findByCluster,
    findByCountry,
    findTopByRegion,
    findTopGlobal,

    getState
  };
})();
