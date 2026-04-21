window.IBSS_PUBLICATION_INTAKE = (function () {
  "use strict";

  const CONFIG = {
    storageKey: "ibss_publications_v4_final_unified",
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

  function clamp(value, min = 0, max = 100) {
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
      "model",
      "study",
      "report",
      "brief",
      "analysis",
      "policy_paper",
      "news",
      "paper",
      "strategic_brief",
      "news_analysis",
      "sovereign_study",
      "signal_update",
      "platform_post"
    ];

    return allowed.includes(t) ? t : "study";
  }

  function normalizeStringArray(values) {
    return asArray(values)
      .map(item => safeText(String(item)))
      .filter(Boolean);
  }

  function normalizeTags(values) {
    return normalizeStringArray(values).slice(0, 40);
  }

  function normalizeDate(value, fallback = null) {
    const raw = safeText(value, "");
    if (!raw) return fallback || nowIso();

    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return fallback || nowIso();

    return date.toISOString();
  }

  function uniqueArray(values) {
    return [...new Set(normalizeStringArray(values))];
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
     Country / Key Helpers
  ========================= */

  function countryAliases(value) {
    const raw = normalizeText(value);
    if (!raw) return ["global"];

    const aliases = new Set([raw]);

    if (raw === "ctr-gaza" || raw === "gaza") {
      aliases.add("ctr-gaza");
      aliases.add("gaza");
      aliases.add("levant");
      aliases.add("palestine");
    }

    if (raw === "ctr-leb" || raw === "lebanon" || raw === "leb") {
      aliases.add("ctr-leb");
      aliases.add("lebanon");
      aliases.add("leb");
      aliases.add("levant");
    }

    if (raw === "ctr-irn" || raw === "iran" || raw === "irn") {
      aliases.add("ctr-irn");
      aliases.add("iran");
      aliases.add("irn");
      aliases.add("regional");
    }

    if (raw === "ctr-rs" || raw === "redsea" || raw === "red sea" || raw === "rs") {
      aliases.add("ctr-rs");
      aliases.add("redsea");
      aliases.add("red sea");
      aliases.add("rs");
      aliases.add("maritime");
    }

    if (raw === "ctr-wb" || raw === "westbank" || raw === "west bank" || raw === "wb") {
      aliases.add("ctr-wb");
      aliases.add("westbank");
      aliases.add("west bank");
      aliases.add("wb");
      aliases.add("palestine");
    }

    return [...aliases];
  }

  function inferClusterKeys(raw, normalized) {
    const explicit = uniqueArray(raw.clusterKeys);
    if (explicit.length) return explicit;

    const region = normalizeText(normalized.region);
    const domain = normalizeText(normalized.domain);

    if (!region) return [];
    if (!domain) return [region];

    return [`${region}::${domain}`];
  }

  function inferTheaterKeys(raw, normalized) {
    const explicit = uniqueArray(raw.theaterKeys);
    if (explicit.length) return explicit;

    const region = normalizeText(normalized.region);
    if (!region) return [];

    return [region];
  }

  /* =========================
     Normalization
  ========================= */

  function normalizePublication(raw = {}, existing = null) {
    const createdAt = existing?.createdAt || nowIso();
    const publishedAt = normalizeDate(raw.publishedAt, existing?.publishedAt || nowIso());

    const preliminary = {
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

      signalIds: uniqueArray(raw.signalIds != null ? raw.signalIds : existing?.signalIds),
      clusterKeys: [],
      theaterKeys: [],

      author: safeText(raw.author, existing?.author || "IBSS"),
      authors: uniqueArray(
        raw.authors != null
          ? raw.authors
          : (existing?.authors?.length ? existing.authors : [raw.author || existing?.author || "IBSS"])
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

    preliminary.clusterKeys = inferClusterKeys(raw, preliminary);
    preliminary.theaterKeys = inferTheaterKeys(raw, preliminary);

    return preliminary;
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

      const aWeight = safeNumber(a?.metrics?.strategicWeight, 0);
      const bWeight = safeNumber(b?.metrics?.strategicWeight, 0);
      if (bWeight !== aWeight) return bWeight - aWeight;

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
     Content Bridge
  ========================= */

  function getBaseContentWithoutIntake() {
    const all = asArray(window.IBSS_CONTENT);
    return all.filter(item => item?.sourcePlatform !== "ibss_intake");
  }

  function buildContentLikePublication(item) {
    return {
      id: item.id,
      title: clone(item.title),
      summary: clone(item.summary),
      body: clone(item.body),
      type: item.type,
      classification: item.classification,
      edition: item.edition,
      layer: item.layer,
      mode: item.mode,
      status: item.status,
      domain: item.domain,
      region: item.region,
      country: item.country,
      countryId: item.countryId,
      signalIds: clone(item.signalIds || []),
      clusterKeys: clone(item.clusterKeys || []),
      theaterKeys: clone(item.theaterKeys || []),
      priority: item.priority,
      sourcePlatform: "ibss_intake",
      sourceUrl: item.sourceUrl,
      publishedAt: item.publishedAt,
      tags: clone(item.tags || []),
      author: item.author,
      authors: clone(item.authors || []),
      unit: item.unit,
      metrics: clone(item.metrics || {}),
      engagement: {
        reactions: 0,
        comments: 0,
        shares: 0
      },
      links: [],
      meta: clone(item.meta || {})
    };
  }

  function getIntegratedContent() {
    const base = getBaseContentWithoutIntake();
    const intake = getAll().map(buildContentLikePublication);
    const map = new Map();

    [...base, ...intake].forEach(item => {
      const key = safeText(item?.id, "");
      if (!key) return;
      map.set(key, item);
    });

    return sortPublications([...map.values()]);
  }

  function findByCountryInList(list, country) {
    const aliases = countryAliases(country);

    return list.filter(item => {
      const countryValue = normalizeText(item.country);
      const countryIdValue = normalizeText(item.countryId);
      const regionValue = normalizeText(item.region);

      return (
        aliases.includes(countryValue) ||
        aliases.includes(countryIdValue) ||
        aliases.includes(regionValue)
      );
    });
  }

  function findByDomainInList(list, domain) {
    const target = normalizeText(domain);
    return list.filter(item => normalizeText(item.domain) === target);
  }

  function findByTypeInList(list, type) {
    const target = normalizeType(type);
    return list.filter(item => item.type === target);
  }

  function findContentLinkedToSignal(signalId) {
    const target = safeText(signalId, "");
    if (!target) return [];

    return getIntegratedContent().filter(item =>
      item.status === "published" && asArray(item.signalIds).includes(target)
    );
  }

  function findContentLinkedToCountry(country) {
    return findByCountryInList(
      getIntegratedContent().filter(item => item.status === "published"),
      country
    );
  }

  function findContentLinkedToCluster(clusterKey) {
    const raw = safeText(clusterKey, "");
    if (!raw) return [];

    const parts = raw.split("::");
    const region = normalizeText(parts[0] || "");
    const domain = normalizeText(parts[1] || "");

    return getIntegratedContent().filter(item => {
      if (item.status !== "published") return false;

      const regionMatch =
        normalizeText(item.region) === region ||
        normalizeText(item.country) === region ||
        normalizeText(item.countryId) === region ||
        asArray(item.clusterKeys).map(normalizeText).includes(raw.toLowerCase());

      const domainMatch = !domain || normalizeText(item.domain) === domain;

      return regionMatch && domainMatch;
    });
  }

  function buildPreviewCard(item, lang = "en") {
    if (!item) return null;

    return {
      id: item.id,
      type: item.type,
      classification: item.classification || item.type,
      unit: item.unit || "SSU",
      title: getLocalizedText(item.title, lang),
      summary: getLocalizedText(item.summary, lang),
      body: getLocalizedText(item.body, lang),
      edition: item.edition || "",
      domain: item.domain || "general",
      region: item.region || "global",
      country: item.country || "global",
      countryId: item.countryId || "",
      priority: item.priority || "LOW",
      publishedAt: item.publishedAt || nowIso(),
      meta: clone(item.meta || {}),
      metrics: clone(item.metrics || {})
    };
  }

  function patchContentLayer() {
    const integrated = getIntegratedContent();

    window.IBSS_CONTENT = integrated;
    window.IBSS_CONTENT_INDEX = integrated.reduce((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {});

    if (!window.IBSS_CONTENT_UTILS) {
      window.IBSS_CONTENT_UTILS = {};
    }

    if (!window.IBSS_CONTENT_API) {
      window.IBSS_CONTENT_API = {};
    }

    const api = window.IBSS_CONTENT_API;
    const utils = window.IBSS_CONTENT_UTILS;

    function getAllContent() {
      return clone(getIntegratedContent()) || [];
    }

    function getPublishedContent() {
      return getAllContent().filter(item => item.status === "published");
    }

    function getPendingContent() {
      return getAllContent().filter(item => item.status === "pending" || item.status === "draft");
    }

    function getArchivedContent() {
      return getAllContent().filter(item => item.status === "archived");
    }

    function getFeaturedContent() {
      return getAllContent().filter(item => !!item?.meta?.featured);
    }

    function getPinnedContent() {
      return getAllContent().filter(item => !!item?.meta?.pinned);
    }

    function getCanonicalContent() {
      return getAllContent().filter(item => !!item?.meta?.canonical);
    }

    function getLatestPublished() {
      return getPublishedContent()[0] || null;
    }

    function getLatestFeaturedContent() {
      const featured = getFeaturedContent().filter(item => item.status === "published");
      if (featured.length) return featured[0];

      const pinned = getPinnedContent().filter(item => item.status === "published");
      if (pinned.length) return pinned[0];

      return getLatestPublished();
    }

    function getById(id) {
      return getAllContent().find(item => item.id === id) || null;
    }

    function getByType(type) {
      return findByTypeInList(getAllContent(), type);
    }

    function getByCountry(country) {
      return findByCountryInList(getAllContent(), country);
    }

    function getByDomain(domain) {
      return findByDomainInList(getAllContent(), domain);
    }

    function getPublicationPreviewList(limit = 12, lang = "en") {
      return getPublishedContent()
        .slice(0, Math.max(1, safeNumber(limit, 12)))
        .map(item => buildPreviewCard(item, lang));
    }

    function getEngineEligibleContent() {
      return getPublishedContent().filter(item =>
        ["study", "report", "analysis", "brief", "policy_paper", "model"].includes(item.type)
      );
    }

    function computeContentImpact(item) {
      const strategicWeight = clamp(safeNumber(item?.metrics?.strategicWeight, 0), 0, 100);
      const featuredBoost = item?.meta?.featured ? 3 : 0;
      const canonicalBoost = item?.meta?.canonical ? 3 : 0;
      const pinnedBoost = item?.meta?.pinned ? 2 : 0;

      return {
        signalBoost: Math.round((strategicWeight * 0.08) + featuredBoost),
        clusterBoost: Math.round((strategicWeight * 0.06) + canonicalBoost),
        countryBoost: Math.round((strategicWeight * 0.07) + pinnedBoost),
        confidenceBoost: Math.round((strategicWeight * 0.04) + featuredBoost + canonicalBoost)
      };
    }

    function getContentState() {
      const all = getAllContent();
      return {
        total: all.length,
        published: getPublishedContent().length,
        pending: getPendingContent().length,
        archived: getArchivedContent().length,
        featured: getFeaturedContent().length,
        pinned: getPinnedContent().length,
        canonical: getCanonicalContent().length,
        intakeIntegrated: getAll().length
      };
    }

    api.getAll = getAllContent;
    api.getPublished = getPublishedContent;
    api.getPending = getPendingContent;
    api.getArchived = getArchivedContent;
    api.getById = getById;
    api.getByType = getByType;
    api.getByCountry = getByCountry;
    api.getByDomain = getByDomain;
    api.getFeatured = getFeaturedContent;
    api.getPinned = getPinnedContent;
    api.getCanonical = getCanonicalContent;
    api.getLatestPublished = getLatestPublished;
    api.getLatestFeaturedContent = getLatestFeaturedContent;
    api.getPublicationPreviewList = getPublicationPreviewList;
    api.getEngineEligibleContent = getEngineEligibleContent;
    api.computeContentImpact = computeContentImpact;
    api.getContentLinkedToSignal = function (signalId) {
      return clone(findContentLinkedToSignal(signalId)) || [];
    };
    api.getContentLinkedToCountry = function (country) {
      return clone(findContentLinkedToCountry(country)) || [];
    };
    api.getContentLinkedToCluster = function (clusterKey) {
      return clone(findContentLinkedToCluster(clusterKey)) || [];
    };
    api.buildPreviewCard = buildPreviewCard;
    api.getContentState = getContentState;
    api.reloadFromIntake = function () {
      patchContentLayer();
      return true;
    };

    utils.getAll = getAllContent;
    utils.getPublished = getPublishedContent;
    utils.getPending = getPendingContent;
    utils.getArchived = getArchivedContent;
    utils.getById = getById;
    utils.getByType = getByType;
    utils.getByCountry = getByCountry;
    utils.getByDomain = getByDomain;
    utils.getFeatured = getFeaturedContent;
    utils.getPinned = getPinnedContent;
    utils.getCanonical = getCanonicalContent;
    utils.getLatestPublished = getLatestPublished;
    utils.getContentState = getContentState;
  }

  /* =========================
     Publisher Hook
  ========================= */

  function patchPublisherLayer() {
    if (!window.IBSS_PUBLISHER) return;

    if (typeof window.IBSS_PUBLISHER.registerPublication !== "function") {
      window.IBSS_PUBLISHER.registerPublication = function () {
        return true;
      };
    }
  }

  function syncExternalLayers(action, publication) {
    try {
      patchContentLayer();
    } catch (error) {
      console.error("IBSS_PUBLICATION_INTAKE -> CONTENT sync error:", error);
    }

    try {
      patchPublisherLayer();
      if (window.IBSS_PUBLISHER?.registerPublication && (action === "register" || action === "update")) {
        window.IBSS_PUBLISHER.registerPublication(publication);
      }
    } catch (error) {
      console.error("IBSS_PUBLICATION_INTAKE -> PUBLISHER sync error:", error);
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
    patchContentLayer();
    dispatchChange({ action: "remove", publication: clone(existing) });
    return true;
  }

  function clearAll() {
    ensureInit();
    STATE.registry.clear();
    saveState();
    patchContentLayer();
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
    const featured = getFeatured().filter(item => item.status === "published");
    if (featured.length) return featured[0];
    return getPublished()[0] || null;
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

  /* =========================
     Init
  ========================= */

  ensureInit();
  patchPublisherLayer();
  patchContentLayer();

  window.addEventListener("ibss:publication-intake-updated", function () {
    patchContentLayer();
  });

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
