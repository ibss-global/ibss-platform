window.IBSS_PUBLISHER = (function () {
  "use strict";

  const CONFIG = {
    storageKey: "ibss_publisher_state_v2",
    maxQueueSize: 200,
    maxHistorySize: 300,
    maxSnapshots: 120,
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
    latestFeed: [],
    latestDigest: null,
    latestSnapshot: null
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

  function clamp(value, min = 0, max = 100) {
    return Math.max(min, Math.min(max, value));
  }

  function getLocalizedText(value, lang = "en") {
    if (!value) return "";
    if (typeof value === "string" || typeof value === "number") return String(value);
    return value[lang] || value.en || value.ar || value.name || value.title || value.label || value.text || "";
  }

  function normalizePriority(priority) {
    const p = String(priority || "LOW").toUpperCase();
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

  function ensureInit() {
    if (STATE.initialized) return;
    loadState();
    STATE.initialized = true;
  }

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
      STATE.latestFeed = asArray(parsed.latestFeed);
      STATE.latestDigest = parsed.latestDigest || null;
      STATE.latestSnapshot = parsed.latestSnapshot || null;
    } catch (error) {
      console.error("IBSS_PUBLISHER loadState error:", error);
    }
  }

  function saveState() {
    try {
      localStorage.setItem(CONFIG.storageKey, JSON.stringify({
        queue: STATE.queue,
        history: STATE.history,
        snapshots: STATE.snapshots,
        latestSystem: STATE.latestSystem,
        latestOrchestrated: STATE.latestOrchestrated,
        latestFeed: STATE.latestFeed,
        latestDigest: STATE.latestDigest,
        latestSnapshot: STATE.latestSnapshot
      }));
    } catch (error) {
      console.error("IBSS_PUBLISHER saveState error:", error);
    }
  }

  function buildSystemKey(system) {
    return CONFIG.orchestrationKeyFields
      .map(field => safeText(system?.[field], String(system?.[field] ?? "")))
      .join("|");
  }

  function summarizePressure(system) {
    const signalPressure = safeNumber(system?.signalPressure, 0);
    const clusterPressure = safeNumber(system?.clusterPressure?.pressure, 0);
    const theaterPressure = safeNumber(system?.theaterPressure?.pressure, 0);
    const newsPressure = safeNumber(system?.newsPressure?.pressure, 0);
    const systemPressure = safeNumber(system?.systemPressure || system?.ssi, 0);

    return {
      signalPressure,
      clusterPressure,
      theaterPressure,
      newsPressure,
      systemPressure,
      dominantPressure:
        [
          { key: "signal", value: signalPressure },
          { key: "cluster", value: clusterPressure },
          { key: "theater", value: theaterPressure },
          { key: "news", value: newsPressure }
        ].sort((a, b) => b.value - a.value)[0] || { key: "signal", value: 0 }
    };
  }

  function normalizeFeedItem(item, fallbackPriority = "LOW") {
    if (typeof item === "string") {
      return {
        id: buildId("FEED"),
        type: "text",
        priority: normalizePriority(fallbackPriority),
        text: {
          en: item,
          ar: item
        },
        createdAt: nowIso()
      };
    }

    const priority = normalizePriority(item?.priority || fallbackPriority);

    return {
      id: safeText(item?.id, buildId("FEED")),
      type: safeText(item?.type, "feed"),
      priority,
      source: safeText(item?.source, ""),
      text: {
        en: getLocalizedText(item?.text, "en") || getLocalizedText(item?.title, "en") || "-",
        ar: getLocalizedText(item?.text, "ar") || getLocalizedText(item?.title, "ar") || "-"
      },
      createdAt: safeText(item?.createdAt, nowIso())
    };
  }

  function buildUnifiedFeed(system) {
    const feed = [];
    const level = normalizePriority(system?.level || "LOW");

    asArray(system?.feed).forEach(item => {
      feed.push(normalizeFeedItem(item, level));
    });

    const liveNews = asArray(system?.liveNews).slice(0, 5);
    liveNews.forEach(item => {
      feed.push({
        id: safeText(item?.id, buildId("NEWS")),
        type: "news",
        priority: normalizePriority(item?.priority || item?.severity || level),
        source: safeText(item?.source, ""),
        text: {
          en: getLocalizedText(item?.title, "en") || getLocalizedText(item?.summary, "en") || "-",
          ar: getLocalizedText(item?.title, "ar") || getLocalizedText(item?.summary, "ar") || "-"
        },
        createdAt: safeText(item?.publishedAt || item?.timestamp, nowIso())
      });
    });

    const deduped = [];
    const seen = new Set();

    feed.forEach(item => {
      const key = `${normalizePriority(item.priority)}|${safeText(item.source, "")}|${getLocalizedText(item.text, "en")}`;
      if (seen.has(key)) return;
      seen.add(key);
      deduped.push(item);
    });

    return deduped
      .sort((a, b) => priorityWeight(b.priority) - priorityWeight(a.priority))
      .slice(0, 16);
  }

  function buildDigest(system) {
    const topSignal = system?.topSignal || system?.dominantSignal || null;
    const topCluster = system?.topCluster || null;
    const topTheater = system?.topTheater || null;
    const topCountry = asArray(system?.countryRiskFeed)[0] || null;
    const pressure = summarizePressure(system);

    return {
      key: buildSystemKey(system),
      updatedAt: safeText(system?.updatedAt, nowIso()),
      level: safeText(system?.level, "LOW"),
      decision: safeText(system?.decision, "WATCH"),
      mode: safeText(system?.mode, "MONITORING"),
      source: safeText(system?.source, "fallback"),

      pressure,

      topSignal: topSignal ? {
        id: safeText(topSignal.id, ""),
        title: {
          en: getLocalizedText(topSignal.title, "en"),
          ar: getLocalizedText(topSignal.title, "ar")
        },
        score: safeNumber(topSignal?.balancedScore100 || topSignal?.score100, 0),
        priority: normalizePriority(topSignal?.priority || topSignal?.weight || "LOW"),
        decisionMode: {
          en: getLocalizedText(topSignal?.decisionMode, "en"),
          ar: getLocalizedText(topSignal?.decisionMode, "ar")
        }
      } : null,

      topCluster: topCluster ? {
        id: safeText(topCluster.id, ""),
        name: {
          en: getLocalizedText(topCluster.name, "en"),
          ar: getLocalizedText(topCluster.name, "ar")
        },
        score: safeNumber(topCluster?.avgRisk || topCluster?.maxRisk, 0),
        trend: safeText(topCluster?.trend, "STABLE"),
        escalationLevel: safeText(topCluster?.escalationLevel, "LOW")
      } : null,

      topTheater: topTheater ? {
        id: safeText(topTheater.id, ""),
        name: {
          en: getLocalizedText(topTheater.name, "en"),
          ar: getLocalizedText(topTheater.name, "ar")
        },
        score: safeNumber(topTheater?.avgRisk || topTheater?.maxRisk, 0),
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

      liveSignalsCount: safeNumber(system?.liveSignalsCount || asArray(system?.liveSignals).length, 0),
      newsCount: safeNumber(system?.newsPressure?.count, 0),
      confidenceScore: safeNumber(system?.confidenceScore, 0)
    };
  }

  function buildSnapshot(system, digest, unifiedFeed) {
    return {
      id: buildId("SNAP"),
      createdAt: nowIso(),
      key: digest.key,
      updatedAt: digest.updatedAt,
      level: digest.level,
      decision: digest.decision,
      mode: digest.mode,
      systemPressure: digest.pressure.systemPressure,
      source: digest.source,
      topSignalId: digest.topSignal?.id || null,
      topClusterId: digest.topCluster?.id || null,
      topTheaterId: digest.topTheater?.id || null,
      topCountryId: digest.topCountry?.id || null,
      feedCount: unifiedFeed.length
    };
  }

  function normalizeOrchestratedSystem(system) {
    const digest = buildDigest(system);
    const unifiedFeed = buildUnifiedFeed(system);
    const pressure = summarizePressure(system);

    const orchestrated = {
      ...system,
      publisherDigest: digest,
      publisherFeed: unifiedFeed,
      unifiedFeed,
      unifiedPressure: pressure,
      publisherState: {
        orchestratedAt: nowIso(),
        key: digest.key,
        queueSize: STATE.queue.length,
        historySize: STATE.history.length
      }
    };

    return { orchestrated, digest, unifiedFeed };
  }

  function orchestrateSystem(system) {
    ensureInit();

    if (!system || typeof system !== "object") return null;

    const { orchestrated, digest, unifiedFeed } = normalizeOrchestratedSystem(system);
    const snapshot = buildSnapshot(orchestrated, digest, unifiedFeed);

    STATE.latestSystem = clone(system);
    STATE.latestOrchestrated = clone(orchestrated);
    STATE.latestFeed = clone(unifiedFeed);
    STATE.latestDigest = clone(digest);
    STATE.latestSnapshot = clone(snapshot);

    STATE.snapshots.unshift(snapshot);
    if (STATE.snapshots.length > CONFIG.maxSnapshots) {
      STATE.snapshots = STATE.snapshots.slice(0, CONFIG.maxSnapshots);
    }

    saveState();
    return clone(orchestrated);
  }

  function getLatestSystem() {
    ensureInit();
    return STATE.latestSystem ? clone(STATE.latestSystem) : null;
  }

  function getLatestOrchestratedSystem() {
    ensureInit();

    if (STATE.latestOrchestrated) {
      return clone(STATE.latestOrchestrated);
    }

    if (window.IBSS_ENGINE?.getLastSystemState) {
      const last = window.IBSS_ENGINE.getLastSystemState();
      if (last) return orchestrateSystem(last);
    }

    if (window.IBSS_ENGINE?.getSystemState) {
      const live = window.IBSS_ENGINE.getSystemState();
      if (live) return orchestrateSystem(live);
    }

    return null;
  }

  function getLatestDigest() {
    ensureInit();

    if (STATE.latestDigest) return clone(STATE.latestDigest);

    const system = getLatestOrchestratedSystem();
    return system?.publisherDigest ? clone(system.publisherDigest) : null;
  }

  function getUnifiedFeed() {
    ensureInit();

    if (STATE.latestFeed.length) return clone(STATE.latestFeed);

    const system = getLatestOrchestratedSystem();
    return asArray(system?.publisherFeed || system?.unifiedFeed);
  }

  function createPostObject(type, payload) {
    return {
      id: buildId("PUB"),
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
    const digest = system?.publisherDigest || buildDigest(system || {});
    const topTitle = digest?.topSignal
      ? getLocalizedText(digest.topSignal.title, lang)
      : (lang === "ar" ? "لا توجد إشارة مهيمنة" : "No dominant signal");

    const pressure = safeNumber(digest?.pressure?.systemPressure, safeNumber(system?.systemPressure || system?.ssi, 0));
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

  function queueTopSignalFromEngine() {
    const system =
      window.IBSS_ENGINE?.getSystemState?.() ||
      window.IBSS_ENGINE?.getLastSystemState?.() ||
      getLatestOrchestratedSystem();

    const signal = system?.topSignal || system?.dominantSignal || null;
    if (!signal) return null;

    orchestrateSystem(system);
    return queueSignalPost(signal);
  }

  function queueLatestNewsFromFeed(limit = 3) {
    const items = window.IBSS_NEWS_UTILS?.getLatestNews?.(limit) || [];
    return items.map(item => queueNewsPost(item));
  }

  function queueStrategicBriefFromEngine() {
    const system =
      window.IBSS_ENGINE?.getSystemState?.() ||
      window.IBSS_ENGINE?.getLastSystemState?.() ||
      getLatestOrchestratedSystem();

    if (!system) return null;

    const orchestrated = orchestrateSystem(system);
    return queueSystemBrief(orchestrated || system);
  }

  function generateTopSignalPost() {
    return queueTopSignalFromEngine();
  }

  function generateStrategicBrief() {
    return queueStrategicBriefFromEngine();
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

  function getSnapshots() {
    ensureInit();
    return clone(STATE.snapshots);
  }

  function getLatestSnapshot() {
    ensureInit();
    return STATE.latestSnapshot ? clone(STATE.latestSnapshot) : null;
  }

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

    getQueue,
    getHistory,
    getLatestDraft,
    clearQueue,

    queueSignalPost,
    queueNewsPost,
    queueSystemBrief,
    queueTopSignalFromEngine,
    queueLatestNewsFromFeed,
    queueStrategicBriefFromEngine,

    generateTopSignalPost,
    generateStrategicBrief,

    markAsPublished,
    removeFromQueue,

    buildSignalPost,
    buildNewsPost,
    buildSystemBrief
  };
})();
