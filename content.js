// IBSS PUBLISHER CORE — Unified Publication + Orchestration Layer
// Version: v2.0 Clean Orchestrated Publisher

window.IBSS_PUBLISHER = (function () {
  "use strict";

  const CONFIG = {
    storageKey: "ibss_publisher_state_v20_clean_orchestrated",
    maxQueueSize: 240,
    maxHistorySize: 320,
    maxSnapshots: 180,
    maxUnifiedFeed: 24,
    maxContentFeedItems: 6,
    maxNewsFeedItems: 6,
    maxSystemFeedItems: 10,
    orchestrationKeyFields: [
      "updatedAt",
      "level",
      "systemPressure",
      "decision",
      "mode"
    ]
  };

  const STATE = {
    initialized: false,

    queue: [],
    history: [],
    snapshots: [],

    latestSystem: null,
    latestOrchestrated: null,
    latestDigest: null,
    latestFeed: [],
    latestSnapshot: null,
    latestFeaturedPublication: null,
    latestKey: null
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
      console.error("IBSS_PUBLISHER clone error:", error);
      return null;
    }
  }

  function getLocalizedText(value, lang = "en") {
    if (!value) return "";
    if (typeof value === "string" || typeof value === "number") return String(value);

    return (
      value?.[lang] ??
      value?.en ??
      value?.ar ??
      value?.name ??
      value?.title ??
      value?.label ??
      value?.text ??
      ""
    );
  }

  function normalizePriority(priority) {
    const p = String(priority || "LOW").toUpperCase().trim();
    if (p === "HIGH") return "HIGH";
    if (p === "MEDIUM") return "MEDIUM";
    return "LOW";
  }

  function priorityWeight(priority) {
    const p = normalizePriority(priority);
    if (p === "HIGH") return 3;
    if (p === "MEDIUM") return 2;
    return 1;
  }

  function buildId(prefix = "PUB") {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  }

  function sortByDateDesc(list, selector) {
    return asArray(list)
      .slice()
      .sort((a, b) => {
        const aTime = new Date(selector(a) || 0).getTime();
        const bTime = new Date(selector(b) || 0).getTime();
        return bTime - aTime;
      });
  }

  function dedupeBy(list, keyBuilder) {
    const map = new Map();

    asArray(list).forEach((item, index) => {
      const key = keyBuilder(item, index);
      if (!map.has(key)) {
        map.set(key, item);
      }
    });

    return [...map.values()];
  }

  /* =========================================
     Storage
  ========================================= */

  function loadState() {
    try {
      const raw = localStorage.getItem(CONFIG.storageKey);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;

      STATE.queue = asArray(parsed.queue);
      STATE.history = asArray(parsed.history);
      STATE.snapshots = asArray(parsed.snapshots);
      STATE.latestSystem = parsed.latestSystem || null;
      STATE.latestOrchestrated = parsed.latestOrchestrated || null;
      STATE.latestDigest = parsed.latestDigest || null;
      STATE.latestFeed = asArray(parsed.latestFeed);
      STATE.latestSnapshot = parsed.latestSnapshot || null;
      STATE.latestFeaturedPublication = parsed.latestFeaturedPublication || null;
      STATE.latestKey = safeText(parsed.latestKey, null);
    } catch (error) {
      console.error("IBSS_PUBLISHER loadState error:", error);
    }
  }

  function saveState() {
    try {
      localStorage.setItem(
        CONFIG.storageKey,
        JSON.stringify({
          queue: STATE.queue,
          history: STATE.history,
          snapshots: STATE.snapshots,
          latestSystem: STATE.latestSystem,
          latestOrchestrated: STATE.latestOrchestrated,
          latestDigest: STATE.latestDigest,
          latestFeed: STATE.latestFeed,
          latestSnapshot: STATE.latestSnapshot,
          latestFeaturedPublication: STATE.latestFeaturedPublication,
          latestKey: STATE.latestKey
        })
      );
    } catch (error) {
      console.error("IBSS_PUBLISHER saveState error:", error);
    }
  }

  function ensureInit() {
    if (STATE.initialized) return;
    loadState();
    STATE.initialized = true;
  }

  /* =========================================
     Source Readers
  ========================================= */

  function getContentApi() {
    return (
      window.IBSS_CONTENT_API ||
      window.IBSS_CONTENT_UTILS ||
      null
    );
  }

  function getPublishedContent() {
    try {
      const api = getContentApi();
      if (api?.getPublishedContent) return asArray(api.getPublishedContent());
      if (api?.getPublished) return asArray(api.getPublished());
      if (api?.getAllContent) {
        return asArray(api.getAllContent()).filter(item => item?.status === "published");
      }
    } catch (error) {
      console.error("IBSS_PUBLISHER getPublishedContent error:", error);
    }

    return asArray(window.IBSS_CONTENT).filter(item => item?.status === "published");
  }

  function getLatestFeaturedPublication() {
    try {
      const api = getContentApi();

      if (api?.getLatestFeaturedContent) {
        return api.getLatestFeaturedContent();
      }

      const published = getPublishedContent();
      return sortByDateDesc(published, item => item?.publishedAt)[0] || null;
    } catch (error) {
      console.error("IBSS_PUBLISHER getLatestFeaturedPublication error:", error);
      return null;
    }
  }

  function getLatestContentPreviewList(limit = 8, lang = "en") {
    try {
      const api = getContentApi();
      const published = api?.getLatestPublishedContent
        ? asArray(api.getLatestPublishedContent(limit))
        : sortByDateDesc(getPublishedContent(), item => item?.publishedAt).slice(0, Math.max(1, safeNumber(limit, 8)));

      return published.map(item => ({
        id: item.id,
        type: item.type,
        classification: item.classification || item.type || "report",
        unit: item.unit || "SSU",
        edition: item.edition || "",
        title: getLocalizedText(item.title, lang),
        summary: getLocalizedText(item.summary, lang),
        domain: item.domain || "general",
        region: item.region || "global",
        country: item.country || "global",
        priority: item.priority || "LOW",
        publishedAt: item.publishedAt || nowIso()
      }));
    } catch (error) {
      console.error("IBSS_PUBLISHER getLatestContentPreviewList error:", error);
      return [];
    }
  }

  function getContentLinkedToSignal(signalId) {
    try {
      const api = getContentApi();
      if (api?.getContentLinkedToSignal) {
        return asArray(api.getContentLinkedToSignal(signalId));
      }
    } catch (error) {
      console.error("IBSS_PUBLISHER getContentLinkedToSignal error:", error);
    }

    return [];
  }

  function getContentLinkedToCluster(clusterKey) {
    try {
      const api = getContentApi();
      if (api?.getContentLinkedToCluster) {
        return asArray(api.getContentLinkedToCluster(clusterKey));
      }
    } catch (error) {
      console.error("IBSS_PUBLISHER getContentLinkedToCluster error:", error);
    }

    return [];
  }

  function getContentLinkedToCountry(country) {
    try {
      const api = getContentApi();
      if (api?.getContentLinkedToCountry) {
        return asArray(api.getContentLinkedToCountry(country));
      }
    } catch (error) {
      console.error("IBSS_PUBLISHER getContentLinkedToCountry error:", error);
    }

    return [];
  }

  function resolveSourceSystem() {
    try {
      if (window.IBSS_ENGINE?.getLastSystemState) {
        const last = window.IBSS_ENGINE.getLastSystemState();
        if (last) return last;
      }
    } catch (error) {
      console.error("IBSS_PUBLISHER resolve lastSystem error:", error);
    }

    try {
      if (window.IBSS_ENGINE?.getSystemState) {
        const live = window.IBSS_ENGINE.getSystemState();
        if (live) return live;
      }
    } catch (error) {
      console.error("IBSS_PUBLISHER resolve liveSystem error:", error);
    }

    try {
      if (window.IBSS_ENGINE?.getStaticSystemFallback) {
        const fallback = window.IBSS_ENGINE.getStaticSystemFallback();
        if (fallback) return fallback;
      }
    } catch (error) {
      console.error("IBSS_PUBLISHER resolve fallbackSystem error:", error);
    }

    return null;
  }

  /* =========================================
     Keys + Pressure
  ========================================= */

  function buildSystemKey(system) {
    return CONFIG.orchestrationKeyFields
      .map(field => {
        const value = system?.[field];
        if (value == null) return "";
        if (
          typeof value === "string" ||
          typeof value === "number" ||
          typeof value === "boolean"
        ) {
          return String(value);
        }
        return JSON.stringify(value);
      })
      .join("|");
  }

  function summarizePressure(system) {
    const signalPressure = safeNumber(system?.signalPressure, 0);
    const clusterPressure = safeNumber(system?.clusterPressure?.pressure, 0);
    const theaterPressure = safeNumber(system?.theaterPressure?.pressure, 0);
    const newsPressure = safeNumber(system?.newsPressure?.pressure, 0);
    const systemPressure = safeNumber(system?.systemPressure ?? system?.ssi, 0);

    const dominantPressure = [
      { key: "signal", value: signalPressure },
      { key: "cluster", value: clusterPressure },
      { key: "theater", value: theaterPressure },
      { key: "news", value: newsPressure }
    ].sort((a, b) => b.value - a.value)[0] || { key: "signal", value: 0 };

    return {
      signalPressure,
      clusterPressure,
      theaterPressure,
      newsPressure,
      systemPressure,
      dominantPressure
    };
  }

  /* =========================================
     Content Helpers
  ========================================= */

  function buildContentPreview(content) {
    if (!content) return null;

    const signalIds = asArray(content?.linkedSignalIds || content?.signalIds);

    return {
      id: safeText(content?.id, ""),
      type: safeText(content?.type, "report"),
      classification: safeText(content?.classification, safeText(content?.type, "report")),
      edition: safeText(content?.edition, ""),
      unit: safeText(content?.unit, "SSU"),
      domain: safeText(content?.domain, "general"),
      region: safeText(content?.region, "global"),
      country: safeText(content?.country, safeText(content?.countryId, "global")),
      countryId: safeText(content?.countryId, ""),
      priority: normalizePriority(content?.priority),
      publishedAt: safeText(content?.publishedAt, nowIso()),
      title: {
        en: getLocalizedText(content?.title, "en"),
        ar: getLocalizedText(content?.title, "ar")
      },
      summary: {
        en: getLocalizedText(content?.summary, "en"),
        ar: getLocalizedText(content?.summary, "ar")
      },
      body: {
        en: getLocalizedText(content?.body, "en"),
        ar: getLocalizedText(content?.body, "ar")
      },
      signalIds: clone(signalIds) || [],
      tags: clone(asArray(content?.tags)) || [],
      metrics: clone(content?.metrics || {}),
      meta: clone(content?.meta || {})
    };
  }

  function chooseBestContent(list) {
    const items = sortByDateDesc(asArray(list), item => item?.publishedAt);
    return items[0] || null;
  }

  function buildClusterKey(cluster) {
    const region = safeText(cluster?.region, "global");
    const domain = safeText(cluster?.domain, "general");
    return `${normalizeText(region)}::${normalizeText(domain)}`;
  }

  function getSignalRegion(signal) {
    return normalizeText(signal?.region || signal?.country || "");
  }

  function getSignalDomain(signal) {
    return normalizeText(signal?.domain || signal?.layer || signal?.sourceUnit || signal?.signalType || "");
  }

  function scoreContentMatchForSignal(content, signal) {
    if (!content || !signal) return -1;

    let score = 0;

    const signalId = safeText(signal?.id, "");
    const signalIds = asArray(content?.linkedSignalIds || content?.signalIds);

    if (signalId && signalIds.includes(signalId)) score += 1000;

    const signalRegion = getSignalRegion(signal);
    const signalCountry = normalizeText(signal?.country || signal?.countryId || "");
    const signalDomain = getSignalDomain(signal);

    const contentCountry = normalizeText(content?.country || content?.countryId || "");
    const contentRegion = normalizeText(content?.region || "");
    const contentDomain = normalizeText(content?.domain || "");

    if (signalCountry && contentCountry && signalCountry === contentCountry) score += 200;
    if (signalRegion && contentRegion && signalRegion === contentRegion) score += 160;
    if (signalRegion && contentCountry && signalRegion === contentCountry) score += 120;
    if (signalCountry && contentRegion && signalCountry === contentRegion) score += 120;

    if (signalDomain && contentDomain && signalDomain === contentDomain) score += 130;
    if (signalDomain && contentDomain && (signalDomain.includes(contentDomain) || contentDomain.includes(signalDomain))) score += 80;

    const signalTitle = normalizeText(getLocalizedText(signal?.title, "en"));
    const signalDescription = normalizeText(getLocalizedText(signal?.description, "en"));
    const contentTitle = normalizeText(getLocalizedText(content?.title, "en"));
    const contentSummary = normalizeText(getLocalizedText(content?.summary, "en"));

    if (signalTitle && contentTitle && (signalTitle.includes(contentTitle) || contentTitle.includes(signalTitle))) score += 90;
    if (signalDescription && contentSummary && (signalDescription.includes(contentSummary) || contentSummary.includes(signalDescription))) score += 50;

    score += Math.min(asArray(content?.tags).length, 6) * 2;

    const strategicWeight = safeNumber(content?.metrics?.strategicWeight, 0);
    score += Math.round(strategicWeight * 1.5);

    if (content?.meta?.featured) score += 40;
    if (content?.meta?.canonical) score += 50;

    return score;
  }

  function findPublicationForSignal(signal) {
    if (!signal) return null;

    const directMatches = asArray(getContentLinkedToSignal(signal.id));
    if (directMatches.length) {
      return buildContentPreview(chooseBestContent(directMatches));
    }

    const published = getPublishedContent();
    if (!published.length) return null;

    const ranked = published
      .map(item => ({
        item,
        score: scoreContentMatchForSignal(item, signal)
      }))
      .filter(row => row.score > 0)
      .sort((a, b) => b.score - a.score);

    return ranked.length ? buildContentPreview(ranked[0].item) : null;
  }

  function buildContentContext(system) {
    const topSignal = system?.topSignal || system?.dominantSignal || null;
    const topCluster = system?.topCluster || null;
    const topCountry = asArray(system?.countryRiskFeed)[0] || null;

    const signalContent = topSignal ? getContentLinkedToSignal(topSignal.id) : [];
    const clusterContent = topCluster ? getContentLinkedToCluster(buildClusterKey(topCluster)) : [];
    const countryContent = topCountry ? getContentLinkedToCountry(topCountry.name || topCountry.id) : [];

    const featuredContent = getLatestFeaturedPublication();

    return {
      featuredPublication: buildContentPreview(featuredContent),
      topSignalContent: buildContentPreview(chooseBestContent(signalContent)) || findPublicationForSignal(topSignal),
      topClusterContent: buildContentPreview(chooseBestContent(clusterContent)),
      topCountryContent: buildContentPreview(chooseBestContent(countryContent)),
      latestPublications: getLatestContentPreviewList(8, "en")
    };
  }

  /* =========================================
     Feed
  ========================================= */

  function normalizeFeedItem(item, fallbackPriority = "LOW") {
    if (typeof item === "string") {
      return {
        id: buildId("FEED"),
        type: "text",
        priority: normalizePriority(fallbackPriority),
        source: "",
        text: {
          en: item,
          ar: item
        },
        createdAt: nowIso()
      };
    }

    return {
      id: safeText(item?.id, buildId("FEED")),
      type: safeText(item?.type, "feed"),
      priority: normalizePriority(item?.priority || fallbackPriority),
      source: safeText(item?.source, ""),
      text: {
        en: getLocalizedText(item?.text, "en") || getLocalizedText(item?.title, "en") || "-",
        ar: getLocalizedText(item?.text, "ar") || getLocalizedText(item?.title, "ar") || "-"
      },
      createdAt: safeText(item?.createdAt || item?.publishedAt, nowIso())
    };
  }

  function buildContentFeedItems(contentContext, levelPriority) {
    const items = [];

    if (contentContext?.featuredPublication) {
      const featured = contentContext.featuredPublication;
      items.push({
        id: `CONTENT-FEATURED-${featured.id}`,
        type: "content_featured",
        priority: normalizePriority(featured.priority || levelPriority),
        source: safeText(featured.unit, "SSU"),
        text: {
          en: `Featured publication: ${getLocalizedText(featured.title, "en")}`,
          ar: `المنشور المميز: ${getLocalizedText(featured.title, "ar")}`
        },
        createdAt: featured.publishedAt || nowIso()
      });
    }

    [
      contentContext?.topSignalContent,
      contentContext?.topClusterContent,
      contentContext?.topCountryContent
    ].forEach(content => {
      if (!content) return;

      items.push({
        id: `CONTENT-LINK-${content.id}`,
        type: "content_link",
        priority: normalizePriority(content.priority || levelPriority),
        source: safeText(content.unit, "SSU"),
        text: {
          en: `${safeText(content.type, "report").toUpperCase()} linked: ${getLocalizedText(content.title, "en")}`,
          ar: `محتوى مرتبط: ${getLocalizedText(content.title, "ar")}`
        },
        createdAt: content.publishedAt || nowIso()
      });
    });

    return items.slice(0, CONFIG.maxContentFeedItems);
  }

  function buildUnifiedFeed(system, contentContext) {
    const levelPriority = normalizePriority(system?.level || "LOW");
    const feed = [];

    asArray(system?.feed)
      .slice(0, CONFIG.maxSystemFeedItems)
      .forEach(item => {
        feed.push(normalizeFeedItem(item, levelPriority));
      });

    asArray(system?.liveNews)
      .slice(0, CONFIG.maxNewsFeedItems)
      .forEach(item => {
        feed.push({
          id: safeText(item?.id, buildId("NEWS")),
          type: "news",
          priority: normalizePriority(item?.priority || item?.severity || levelPriority),
          source: safeText(item?.source || item?.sourceName, ""),
          text: {
            en: getLocalizedText(item?.title, "en") || getLocalizedText(item?.summary, "en") || "-",
            ar: getLocalizedText(item?.title, "ar") || getLocalizedText(item?.summary, "ar") || "-"
          },
          createdAt: safeText(item?.publishedAt || item?.timestamp, nowIso())
        });
      });

    buildContentFeedItems(contentContext, levelPriority).forEach(item => {
      feed.push(item);
    });

    const deduped = dedupeBy(feed, item => {
      return [
        normalizePriority(item.priority),
        safeText(item.source, ""),
        normalizeText(getLocalizedText(item.text, "en"))
      ].join("|");
    });

    return deduped
      .sort((a, b) => {
        const priorityDiff = priorityWeight(b.priority) - priorityWeight(a.priority);
        if (priorityDiff !== 0) return priorityDiff;

        const aTime = new Date(a.createdAt || 0).getTime();
        const bTime = new Date(b.createdAt || 0).getTime();
        return bTime - aTime;
      })
      .slice(0, CONFIG.maxUnifiedFeed);
  }

  /* =========================================
     Digest + Snapshot
  ========================================= */

  function buildDigest(system, contentContext) {
    const topSignal = system?.topSignal || system?.dominantSignal || null;
    const topCluster = system?.topCluster || null;
    const topTheater = system?.topTheater || null;
    const topCountry = asArray(system?.countryRiskFeed)[0] || null;
    const pressure = summarizePressure(system);

    return {
      key: buildSystemKey(system),
      updatedAt: safeText(system?.updatedAt, nowIso()),
      source: safeText(system?.source, "fallback"),

      level: safeText(system?.level, "LOW"),
      decision: safeText(system?.decision, "WATCH"),
      mode: safeText(system?.mode, "MONITORING"),

      pressure,

      liveSignalsCount: safeNumber(system?.liveSignalsCount ?? asArray(system?.liveSignals).length, 0),
      newsCount: safeNumber(system?.newsPressure?.count, 0),
      confidenceScore: safeNumber(system?.confidenceScore, 0),

      topSignal: topSignal ? {
        id: safeText(topSignal.id, ""),
        title: {
          en: getLocalizedText(topSignal.title, "en"),
          ar: getLocalizedText(topSignal.title, "ar")
        },
        score: safeNumber(topSignal?.balancedScore100 ?? topSignal?.score100, 0),
        priority: normalizePriority(topSignal?.priority || topSignal?.weight || "LOW"),
        decisionMode: {
          en: getLocalizedText(topSignal?.decisionMode, "en"),
          ar: getLocalizedText(topSignal?.decisionMode, "ar")
        },
        signalType: {
          en: getLocalizedText(topSignal?.signalType, "en"),
          ar: getLocalizedText(topSignal?.signalType, "ar")
        }
      } : null,

      topCluster: topCluster ? {
        id: safeText(topCluster.id, ""),
        name: {
          en: getLocalizedText(topCluster.name, "en"),
          ar: getLocalizedText(topCluster.name, "ar")
        },
        score: safeNumber(topCluster?.avgRisk ?? topCluster?.maxRisk, 0),
        trend: safeText(topCluster?.trend, "STABLE"),
        escalationLevel: safeText(topCluster?.escalationLevel, "LOW")
      } : null,

      topTheater: topTheater ? {
        id: safeText(topTheater.id, ""),
        name: {
          en: getLocalizedText(topTheater.name, "en"),
          ar: getLocalizedText(topTheater.name, "ar")
        },
        score: safeNumber(topTheater?.avgRisk ?? topTheater?.maxRisk, 0),
        trend: safeText(topTheater?.trend, "STABLE"),
        escalationLevel: safeText(topTheater?.escalationLevel, "LOW")
      } : null,

      topCountry: topCountry ? {
        id: safeText(topCountry.id, ""),
        name: {
          en: getLocalizedText(topCountry.nameLocalized || topCountry.name, "en"),
          ar: getLocalizedText(topCountry.nameLocalized || topCountry.name, "ar")
        },
        score: safeNumber(topCountry?.riskScore, 0),
        riskLevel: safeText(topCountry?.riskLevel, "LOW"),
        trend: safeText(topCountry?.trend, "STABLE")
      } : null,

      featuredPublication: contentContext?.featuredPublication || null
    };
  }

  function buildSnapshot(digest, unifiedFeed) {
    return {
      id: buildId("SNAP"),
      createdAt: nowIso(),
      key: digest.key,
      updatedAt: digest.updatedAt,
      source: digest.source,
      level: digest.level,
      decision: digest.decision,
      mode: digest.mode,
      systemPressure: safeNumber(digest?.pressure?.systemPressure, 0),
      topSignalId: digest?.topSignal?.id || null,
      topClusterId: digest?.topCluster?.id || null,
      topTheaterId: digest?.topTheater?.id || null,
      topCountryId: digest?.topCountry?.id || null,
      featuredPublicationId: digest?.featuredPublication?.id || null,
      feedCount: unifiedFeed.length
    };
  }

  /* =========================================
     Orchestration
  ========================================= */

  function createOrchestratedSystem(system) {
    const contentContext = buildContentContext(system);
    const digest = buildDigest(system, contentContext);
    const unifiedFeed = buildUnifiedFeed(system, contentContext);
    const snapshot = buildSnapshot(digest, unifiedFeed);

    const orchestrated = {
      ...system,
      source: "engine",
      featuredPublication: contentContext.featuredPublication || null,
      publicationContext: contentContext,
      publisherDigest: digest,
      publisherFeed: unifiedFeed,
      unifiedFeed,
      unifiedPressure: digest.pressure,
      publisherState: {
        key: digest.key,
        orchestratedAt: nowIso(),
        queueSize: STATE.queue.length,
        historySize: STATE.history.length,
        snapshotCount: STATE.snapshots.length
      }
    };

    return {
      orchestrated,
      digest,
      unifiedFeed,
      snapshot,
      featuredPublication: contentContext.featuredPublication || null
    };
  }

  function commitOrchestratedState(rawSystem, orchestratedBundle) {
    STATE.latestSystem = clone(rawSystem);
    STATE.latestOrchestrated = clone(orchestratedBundle.orchestrated);
    STATE.latestDigest = clone(orchestratedBundle.digest);
    STATE.latestFeed = clone(orchestratedBundle.unifiedFeed);
    STATE.latestSnapshot = clone(orchestratedBundle.snapshot);
    STATE.latestFeaturedPublication = clone(orchestratedBundle.featuredPublication);
    STATE.latestKey = safeText(orchestratedBundle.digest?.key, null);

    STATE.snapshots.unshift(orchestratedBundle.snapshot);
    if (STATE.snapshots.length > CONFIG.maxSnapshots) {
      STATE.snapshots = STATE.snapshots.slice(0, CONFIG.maxSnapshots);
    }

    saveState();
  }

  function orchestrateSystem(system, options = {}) {
    ensureInit();

    if (!system || typeof system !== "object") return null;

    const force = !!options.force;
    const key = buildSystemKey(system);

    if (!force && STATE.latestOrchestrated && STATE.latestKey === key) {
      return clone(STATE.latestOrchestrated);
    }

    const bundle = createOrchestratedSystem(system);
    commitOrchestratedState(system, bundle);

    return clone(bundle.orchestrated);
  }

  /* =========================================
     Public Readers
  ========================================= */

  function getLatestSystem() {
    ensureInit();
    return STATE.latestSystem ? clone(STATE.latestSystem) : null;
  }

  function getLatestOrchestratedSystem() {
    ensureInit();

    if (STATE.latestOrchestrated) {
      return clone(STATE.latestOrchestrated);
    }

    const system = resolveSourceSystem();
    if (!system) return null;

    return orchestrateSystem(system, { force: true });
  }

  function getLatestDigest() {
    ensureInit();

    if (STATE.latestDigest) {
      return clone(STATE.latestDigest);
    }

    const system = getLatestOrchestratedSystem();
    return system?.publisherDigest ? clone(system.publisherDigest) : null;
  }

  function getUnifiedFeed() {
    ensureInit();

    if (STATE.latestFeed.length) {
      return clone(STATE.latestFeed);
    }

    const system = getLatestOrchestratedSystem();
    return clone(asArray(system?.publisherFeed || system?.unifiedFeed));
  }

  function getSnapshots() {
    ensureInit();
    return clone(STATE.snapshots);
  }

  function getLatestSnapshot() {
    ensureInit();
    return STATE.latestSnapshot ? clone(STATE.latestSnapshot) : null;
  }

  function getLatestFeaturedPublicationState() {
    ensureInit();

    if (STATE.latestFeaturedPublication) {
      return clone(STATE.latestFeaturedPublication);
    }

    const system = getLatestOrchestratedSystem();
    return clone(system?.featuredPublication || null);
  }

  function getPublicationContext() {
    const system = getLatestOrchestratedSystem();
    return clone(system?.publicationContext || null);
  }

  /* =========================================
     Draft / Queue
  ========================================= */

  function createPostObject(type, payload) {
    return {
      id: buildId("POST"),
      type,
      createdAt: nowIso(),
      status: "draft",
      payload
    };
  }

  function enqueue(post) {
    ensureInit();

    STATE.queue.unshift(post);
    if (STATE.queue.length > CONFIG.maxQueueSize) {
      STATE.queue = STATE.queue.slice(0, CONFIG.maxQueueSize);
    }

    saveState();
    return clone(post);
  }

  function getSignalScore(signal) {
    return safeNumber(signal?.balancedScore100 ?? signal?.score100 ?? signal?.riskScore, 0);
  }

  function getSignalMode(signal, lang = "en") {
    const value =
      getLocalizedText(signal?.decisionMode, lang) ||
      safeText(signal?.decision || signal?.mode, "");

    return safeText(value, lang === "ar" ? "مراقبة" : "MONITORING");
  }

  function buildSignalPost(signal, lang = "en") {
    const priority = normalizePriority(signal?.priority || signal?.weight || "LOW");
    const title =
      getLocalizedText(signal?.title, lang) ||
      (lang === "ar" ? "إشارة غير معروفة" : "Unknown Signal");

    const description =
      getLocalizedText(signal?.description, lang) ||
      (lang === "ar" ? "تم التقاط إشارة داخل النظام." : "A signal has been detected inside the system.");

    const score = getSignalScore(signal);
    const mode = getSignalMode(signal, lang);

    if (lang === "ar") {
      return `⚠ ${priority} SIGNAL — ${title}

درجة الإشارة: ${score}
وضع القرار: ${mode}

${description}

#IBSS #Signals #StrategicIntelligence`;
    }

    return `⚠ ${priority} SIGNAL — ${title}

System Score: ${score}
Decision Mode: ${mode}

${description}

#IBSS #Signals #StrategicIntelligence`;
  }

  function buildNewsPost(newsItem, lang = "en") {
    const priority = normalizePriority(newsItem?.priority || newsItem?.severity || "LOW");
    const title =
      getLocalizedText(newsItem?.title, lang) ||
      (lang === "ar" ? "تحديث خبري" : "News Update");

    const summary =
      getLocalizedText(newsItem?.summary, lang) ||
      getLocalizedText(newsItem?.text, lang) ||
      (lang === "ar" ? "تم تسجيل تحديث جديد داخل وحدة الأخبار." : "A new update has been registered in the news unit.");

    if (lang === "ar") {
      return `• ${priority} NEWS — ${title}

${summary}

#IBSS #News #StrategicUpdate`;
    }

    return `• ${priority} NEWS — ${title}

${summary}

#IBSS #News #StrategicUpdate`;
  }

  function buildSystemBrief(system, lang = "en") {
    const digest = system?.publisherDigest || buildDigest(system || {}, {});
    const topTitle = digest?.topSignal
      ? getLocalizedText(digest.topSignal.title, lang)
      : (lang === "ar" ? "لا توجد إشارة مهيمنة" : "No dominant signal");

    const pressure = safeNumber(
      digest?.pressure?.systemPressure,
      safeNumber(system?.systemPressure ?? system?.ssi, 0)
    );

    const level = safeText(digest?.level || system?.level, "LOW");
    const mode = safeText(digest?.mode || system?.mode || system?.decision, "MONITORING");

    if (lang === "ar") {
      return `ملخص استراتيجي — IBSS

ضغط النظام الحالي: ${pressure}
المستوى: ${level}
وضع القرار: ${mode}

الإشارة المهيمنة: ${topTitle}

#IBSS #StrategicBrief #Intelligence`;
    }

    return `Strategic Brief — IBSS

System Pressure: ${pressure}
Level: ${level}
Decision Mode: ${mode}

Dominant Signal: ${topTitle}

#IBSS #StrategicBrief #Intelligence`;
  }

  function buildFeaturedPublicationPost(publication, lang = "en") {
    if (!publication) return "";

    const title = getLocalizedText(publication.title, lang);
    const summary = getLocalizedText(publication.summary, lang);
    const edition = safeText(publication.edition, "");
    const type = safeText(publication.type, "report").toUpperCase();
    const unit = safeText(publication.unit, "SSU");

    if (lang === "ar") {
      return `📄 ${type} • ${unit}

${title}

${summary}

${edition}

#IBSS #PolicyPaper #SovereignStudies`;
    }

    return `📄 ${type} • ${unit}

${title}

${summary}

${edition}

#IBSS #PolicyPaper #SovereignStudies`;
  }

  function buildLinkedPublicationPost(publication, signal, lang = "en") {
    if (!publication) return "";

    const signalTitle =
      getLocalizedText(signal?.title, lang) ||
      (lang === "ar" ? "إشارة غير محددة" : "Unspecified signal");

    const publicationTitle = getLocalizedText(publication?.title, lang);
    const publicationSummary = getLocalizedText(publication?.summary, lang);
    const publicationType = safeText(publication?.type, "report").toUpperCase();
    const unit = safeText(publication?.unit, "SSU");
    const domain = safeText(publication?.domain, "general");

    if (lang === "ar") {
      return `📄 ${publicationType} • ${unit}

منشور مرتبط بالإشارة: ${signalTitle}

${publicationTitle}

${publicationSummary}

المجال: ${domain}

#IBSS #Signals #SovereignStudies`;
    }

    return `📄 ${publicationType} • ${unit}

Publication linked to signal: ${signalTitle}

${publicationTitle}

${publicationSummary}

Domain: ${domain}

#IBSS #Signals #SovereignStudies`;
  }

  function queueSignalPost(signal) {
    const post = createPostObject("signal", {
      sourceId: signal?.id || null,
      text_en: buildSignalPost(signal, "en"),
      text_ar: buildSignalPost(signal, "ar")
    });

    return enqueue(post);
  }

  function queueNewsPost(newsItem) {
    const post = createPostObject("news", {
      sourceId: newsItem?.id || null,
      text_en: buildNewsPost(newsItem, "en"),
      text_ar: buildNewsPost(newsItem, "ar")
    });

    return enqueue(post);
  }

  function queueSystemBrief(system) {
    const post = createPostObject("brief", {
      sourceId: system?.updatedAt || null,
      text_en: buildSystemBrief(system, "en"),
      text_ar: buildSystemBrief(system, "ar")
    });

    return enqueue(post);
  }

  function queueFeaturedPublicationPost(publication) {
    const preview = buildContentPreview(publication);

    const post = createPostObject("publication", {
      sourceId: preview?.id || null,
      text_en: buildFeaturedPublicationPost(preview, "en"),
      text_ar: buildFeaturedPublicationPost(preview, "ar"),
      publication: preview
    });

    return enqueue(post);
  }

  function queueLinkedPublicationPost(publication, signal) {
    const preview = buildContentPreview(publication);

    const post = createPostObject("linked_publication", {
      sourceId: preview?.id || null,
      linkedSignalId: signal?.id || null,
      text_en: buildLinkedPublicationPost(preview, signal, "en"),
      text_ar: buildLinkedPublicationPost(preview, signal, "ar"),
      publication: preview,
      signal: signal ? {
        id: safeText(signal.id, ""),
        title: {
          en: getLocalizedText(signal.title, "en"),
          ar: getLocalizedText(signal.title, "ar")
        },
        priority: normalizePriority(signal.priority || signal.weight || "LOW"),
        score: getSignalScore(signal)
      } : null
    });

    return enqueue(post);
  }

  function queueTopSignalFromEngine() {
    const system = resolveSourceSystem() || getLatestOrchestratedSystem();
    if (!system) return null;

    const orchestrated = orchestrateSystem(system);
    const signal = orchestrated?.topSignal || orchestrated?.dominantSignal || null;
    if (!signal) return null;

    return queueSignalPost(signal);
  }

  function queueLatestNewsFromFeed(limit = 3) {
    const items = window.IBSS_NEWS_UTILS?.getLatestNews?.(limit) || [];
    return items.map(item => queueNewsPost(item));
  }

  function queueStrategicBriefFromEngine() {
    const system = resolveSourceSystem() || getLatestOrchestratedSystem();
    if (!system) return null;

    const orchestrated = orchestrateSystem(system);
    return queueSystemBrief(orchestrated || system);
  }

  function queueLatestFeaturedPublication() {
    const publication = getLatestFeaturedPublication();
    if (!publication) return null;

    return queueFeaturedPublicationPost(publication);
  }

  function queueLinkedPublicationForSignal(signal) {
    const publication = findPublicationForSignal(signal);
    if (!publication) return null;

    return queueLinkedPublicationPost(publication, signal);
  }

  function generateTopSignalPost() {
    return queueTopSignalFromEngine();
  }

  function generateStrategicBrief() {
    return queueStrategicBriefFromEngine();
  }

  function generateFeaturedPublicationPost() {
    return queueLatestFeaturedPublication();
  }

  function generateLinkedPublicationPost(signal) {
    if (signal) {
      const linked = queueLinkedPublicationForSignal(signal);
      if (linked) return linked;
    }

    return generateFeaturedPublicationPost();
  }

  function markAsPublished(postId, meta = {}) {
    ensureInit();

    const index = STATE.queue.findIndex(item => item.id === postId);
    if (index === -1) return null;

    const post = {
      ...STATE.queue[index],
      status: "published",
      publishedAt: nowIso(),
      publishMeta: meta
    };

    STATE.queue.splice(index, 1);
    STATE.history.unshift(post);

    if (STATE.history.length > CONFIG.maxHistorySize) {
      STATE.history = STATE.history.slice(0, CONFIG.maxHistorySize);
    }

    saveState();
    return clone(post);
  }

  function removeFromQueue(postId) {
    ensureInit();
    STATE.queue = STATE.queue.filter(item => item.id !== postId);
    saveState();
    return true;
  }

  function clearQueue() {
    ensureInit();
    STATE.queue = [];
    saveState();
    return true;
  }

  function getQueue() {
    ensureInit();
    return clone(STATE.queue);
  }

  function getHistory() {
    ensureInit();
    return clone(STATE.history);
  }

  function getLatestDraft() {
    ensureInit();
    return STATE.queue[0] ? clone(STATE.queue[0]) : null;
  }

  /* =========================================
     Sync Hooks
  ========================================= */

  function rebuildFromCurrentSystem() {
    try {
      const system = resolveSourceSystem();
      if (!system) return null;
      return orchestrateSystem(system, { force: true });
    } catch (error) {
      console.error("IBSS_PUBLISHER rebuildFromCurrentSystem error:", error);
      return null;
    }
  }

  function registerPublication(publication) {
    rebuildFromCurrentSystem();
    return publication ? clone(publication) : null;
  }

  window.addEventListener("ibss:publication-intake-updated", function () {
    rebuildFromCurrentSystem();
  });

  ensureInit();

  return {
    CONFIG,

    orchestrateSystem,
    getLatestSystem,
    getLatestOrchestratedSystem,
    getLatestDigest,
    getUnifiedFeed,
    getSnapshots,
    getLatestSnapshot,
    getLatestFeaturedPublication: getLatestFeaturedPublicationState,
    getPublicationContext,

    getQueue,
    getHistory,
    getLatestDraft,
    clearQueue,

    registerPublication,
    findPublicationForSignal,

    queueSignalPost,
    queueNewsPost,
    queueSystemBrief,
    queueFeaturedPublicationPost,
    queueLinkedPublicationPost,
    queueTopSignalFromEngine,
    queueLatestNewsFromFeed,
    queueStrategicBriefFromEngine,
    queueLatestFeaturedPublication,
    queueLinkedPublicationForSignal,

    generateTopSignalPost,
    generateStrategicBrief,
    generateFeaturedPublicationPost,
    generateLinkedPublicationPost,

    markAsPublished,
    removeFromQueue,

    buildSignalPost,
    buildNewsPost,
    buildSystemBrief,
    buildFeaturedPublicationPost,
    buildLinkedPublicationPost
  };
})();
