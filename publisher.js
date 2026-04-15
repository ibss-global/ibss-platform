window.IBSS_PUBLISHER = (function () {
  "use strict";

  const CONFIG = {
    storageKey: "ibss_publisher_queue_v1",
    maxQueueSize: 200
  };

  const STATE = {
    queue: [],
    history: [],
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

  function loadState() {
    try {
      const raw = localStorage.getItem(CONFIG.storageKey);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;

      STATE.queue = asArray(parsed.queue);
      STATE.history = asArray(parsed.history);
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
          history: STATE.history
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

  function normalizePriority(priority) {
    const p = String(priority || "LOW").toUpperCase();
    if (p === "HIGH") return "HIGH";
    if (p === "MEDIUM") return "MEDIUM";
    return "LOW";
  }

  function normalizeMode(signal, lang = "en") {
    const value = getLocalizedText(signal?.decisionMode, lang) || signal?.decision || signal?.mode || "";
    return safeText(value, lang === "ar" ? "مراقبة" : "MONITORING");
  }

  function getSignalScore(signal) {
    return Number(
      signal?.balancedScore100 ??
      signal?.score100 ??
      signal?.riskScore ??
      0
    );
  }

  function buildSignalPost(signal, lang = "en") {
    const priority = normalizePriority(signal?.priority || signal?.weight);
    const title = getLocalizedText(signal?.title, lang) || (lang === "ar" ? "إشارة غير معروفة" : "Unknown Signal");
    const description =
      getLocalizedText(signal?.description, lang) ||
      (lang === "ar" ? "تم التقاط إشارة داخل النظام." : "A signal has been detected inside the system.");

    const score = getSignalScore(signal);
    const mode = normalizeMode(signal, lang);

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
    const priority = normalizePriority(newsItem?.priority || newsItem?.severity);
    const title = getLocalizedText(newsItem?.title, lang) || (lang === "ar" ? "تحديث خبري" : "News Update");
    const summary =
      getLocalizedText(newsItem?.summary, lang) ||
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
    const topSignal = system?.topSignal || system?.dominantSignal || null;
    const topTitle = topSignal
      ? getLocalizedText(topSignal.title, lang)
      : (lang === "ar" ? "لا توجد إشارة مهيمنة" : "No dominant signal");

    const pressure = Number(system?.systemPressure || system?.ssi || 0);
    const level = safeText(system?.level, "LOW");
    const mode = safeText(system?.mode || system?.decision, "MONITORING");

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

  function createPostObject(type, payload) {
    return {
      id: `PUB-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
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
    const system = window.IBSS_ENGINE?.getSystemState?.();
    const signal = system?.topSignal || system?.dominantSignal || null;
    if (!signal) return null;
    return queueSignalPost(signal);
  }

  function queueLatestNewsFromFeed(limit = 3) {
    const items = window.IBSS_NEWS_UTILS?.getLatestNews?.(limit) || [];
    return items.map(item => queueNewsPost(item));
  }

  function queueStrategicBriefFromEngine() {
    const system = window.IBSS_ENGINE?.getSystemState?.();
    if (!system) return null;
    return queueSystemBrief(system);
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

    if (STATE.history.length > CONFIG.maxQueueSize) {
      STATE.history = STATE.history.slice(0, CONFIG.maxQueueSize);
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

  function clearQueue() {
    ensureInit();
    STATE.queue = [];
    saveState();
    return true;
  }

  ensureInit();

  return {
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
    markAsPublished,
    removeFromQueue,
    buildSignalPost,
    buildNewsPost,
    buildSystemBrief
  };
})();

window.addEventListener("load", () => {
  bindPublisher();
  renderPublisherPanel();
});
