window.IBSS_RUNTIME = (function () {
  "use strict";

  const CONFIG = {
    storageKey: "ibss_runtime_state_v4",
    defaultRefreshMs: 4000,
    tickerStepPx: 1,
    tickerFrameMs: 22,
    minTickerCopies: 3,
    deadTickerRetryEvery: 10
  };

  const STATE = {
    started: false,
    pageId: null,
    lang: "en",

    system: null,
    refreshMs: CONFIG.defaultRefreshMs,
    refreshTimer: null,

    tickerTrackEl: null,
    tickerAnimationId: null,
    tickerItems: [],
    tickerCopies: CONFIG.minTickerCopies,
    tickerOffset: 0,
    tickerFrameCounter: 0,
    tickerFrozenChecks: 0,

    afterRender: null,
    systemProvider: null
  };

  function safeText(value, fallback = "") {
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
  }

  function safeNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
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

  function normalizePriority(value) {
    const p = String(value || "LOW").toUpperCase();
    if (p === "HIGH") return "HIGH";
    if (p === "MEDIUM") return "MEDIUM";
    return "LOW";
  }

  function priorityClass(value) {
    const p = normalizePriority(value);
    if (p === "HIGH") return "high";
    if (p === "MEDIUM") return "medium";
    return "low";
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text ?? "";
    return div.innerHTML;
  }

  function saveState() {
    try {
      localStorage.setItem(CONFIG.storageKey, JSON.stringify({
        pageId: STATE.pageId,
        lang: STATE.lang,
        refreshMs: STATE.refreshMs
      }));
    } catch (error) {
      console.error("IBSS_RUNTIME saveState error:", error);
    }
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(CONFIG.storageKey);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;

      STATE.pageId = parsed.pageId || null;
      STATE.lang = parsed.lang || "en";
      STATE.refreshMs = safeNumber(parsed.refreshMs, CONFIG.defaultRefreshMs);
    } catch (error) {
      console.error("IBSS_RUNTIME loadState error:", error);
    }
  }

  function stopTicker() {
    if (STATE.tickerAnimationId) {
      cancelAnimationFrame(STATE.tickerAnimationId);
      STATE.tickerAnimationId = null;
    }

    STATE.tickerOffset = 0;
    STATE.tickerFrameCounter = 0;
    STATE.tickerFrozenChecks = 0;
  }

  function clearTicker() {
    stopTicker();

    if (STATE.tickerTrackEl) {
      STATE.tickerTrackEl.innerHTML = "";
      STATE.tickerTrackEl.scrollLeft = 0;
    }

    STATE.tickerItems = [];
  }

  function destroyRefreshTimer() {
    if (STATE.refreshTimer) {
      clearInterval(STATE.refreshTimer);
      STATE.refreshTimer = null;
    }
  }

  function buildTickerItemsFromSystem(system) {
    const unifiedFeed = asArray(system?.publisherFeed || system?.unifiedFeed);
    if (unifiedFeed.length) {
      return unifiedFeed.map(item => ({
        priority: normalizePriority(item?.priority || system?.level || "LOW"),
        text: getLocalizedText(item?.text, STATE.lang) || "-"
      }));
    }

    const feed = asArray(system?.feed);
    if (feed.length) {
      return feed.map(item => {
        if (typeof item === "string") {
          return {
            priority: normalizePriority(system?.level || "LOW"),
            text: item
          };
        }

        return {
          priority: normalizePriority(item?.priority || system?.level || "LOW"),
          text: getLocalizedText(item?.text, STATE.lang) || "-"
        };
      });
    }

    const synthetic = [];

    if (safeNumber(system?.signalPressure, 0) > 0) {
      synthetic.push({
        priority: normalizePriority(system?.level || "LOW"),
        text: STATE.lang === "ar"
          ? `ضغط الإشارات: ${safeNumber(system.signalPressure, 0)}`
          : `Signal pressure: ${safeNumber(system.signalPressure, 0)}`
      });
    }

    if (safeNumber(system?.clusterPressure?.pressure, 0) > 0) {
      synthetic.push({
        priority: normalizePriority(system?.level || "LOW"),
        text: STATE.lang === "ar"
          ? `ضغط الملفات الاستراتيجية: ${safeNumber(system.clusterPressure.pressure, 0)}`
          : `Strategic file pressure: ${safeNumber(system.clusterPressure.pressure, 0)}`
      });
    }

    if (safeNumber(system?.theaterPressure?.pressure, 0) > 0) {
      synthetic.push({
        priority: normalizePriority(system?.level || "LOW"),
        text: STATE.lang === "ar"
          ? `ضغط المسرح: ${safeNumber(system.theaterPressure.pressure, 0)}`
          : `Theater pressure: ${safeNumber(system.theaterPressure.pressure, 0)}`
      });
    }

    if (system?.topSignal) {
      synthetic.push({
        priority: normalizePriority(system?.topSignal?.priority || system?.level || "LOW"),
        text: STATE.lang === "ar"
          ? `الإشارة الأعلى: ${getLocalizedText(system.topSignal.title, "ar")}`
          : `Top signal: ${getLocalizedText(system.topSignal.title, "en")}`
      });
    }

    if (!synthetic.length) {
      synthetic.push({
        priority: "LOW",
        text: STATE.lang === "ar"
          ? "النظام في وضع المراقبة."
          : "System remains in monitoring mode."
      });
    }

    return synthetic;
  }

  function renderTickerMarkup(items) {
    if (!STATE.tickerTrackEl) return;

    const base = asArray(items).length ? asArray(items) : [{
      priority: "LOW",
      text: STATE.lang === "ar" ? "لا توجد بيانات." : "No data available."
    }];

    const repeated = [];
    for (let i = 0; i < STATE.tickerCopies; i += 1) {
      repeated.push(...base);
    }

    STATE.tickerTrackEl.innerHTML = repeated.map(item => `
      <div class="ticker-item">
        <span class="ticker-dot ${escapeHtml(priorityClass(item.priority))}"></span>
        <span class="ticker-item-text" dir="${STATE.lang === "ar" ? "rtl" : "ltr"}">${escapeHtml(item.text)}</span>
      </div>
    `).join("");

    STATE.tickerTrackEl.scrollLeft = 0;
    STATE.tickerOffset = 0;
  }

  function tickerContentWidth() {
    if (!STATE.tickerTrackEl) return 0;
    return Math.max(0, STATE.tickerTrackEl.scrollWidth / STATE.tickerCopies);
  }

  function animateTicker() {
    if (!STATE.tickerTrackEl) return;

    const fullCycleWidth = tickerContentWidth();
    if (fullCycleWidth <= 0) {
      STATE.tickerAnimationId = requestAnimationFrame(animateTicker);
      return;
    }

    STATE.tickerOffset += CONFIG.tickerStepPx;

    if (STATE.tickerOffset >= fullCycleWidth) {
      STATE.tickerOffset = 0;
    }

    STATE.tickerTrackEl.scrollLeft = STATE.tickerOffset;
    STATE.tickerFrameCounter += 1;

    if (STATE.tickerFrameCounter % CONFIG.deadTickerRetryEvery === 0) {
      const actual = safeNumber(STATE.tickerTrackEl.scrollLeft, 0);
      if (Math.abs(actual - STATE.tickerOffset) > 8) {
        STATE.tickerFrozenChecks += 1;
      } else {
        STATE.tickerFrozenChecks = 0;
      }

      if (STATE.tickerFrozenChecks >= 2) {
        STATE.tickerTrackEl.scrollLeft = STATE.tickerOffset;
        STATE.tickerFrozenChecks = 0;
      }
    }

    STATE.tickerAnimationId = requestAnimationFrame(animateTicker);
  }

  function refreshTicker(system) {
    if (!STATE.tickerTrackEl) return;

    const items = buildTickerItemsFromSystem(system);
    const signature = JSON.stringify(items);

    if (JSON.stringify(STATE.tickerItems) !== signature) {
      STATE.tickerItems = deepClone(items);
      renderTickerMarkup(items);
      stopTicker();
      STATE.tickerAnimationId = requestAnimationFrame(animateTicker);
      return;
    }

    if (!STATE.tickerAnimationId) {
      renderTickerMarkup(items);
      STATE.tickerAnimationId = requestAnimationFrame(animateTicker);
    }
  }

  function getRawSystem() {
    try {
      if (typeof STATE.systemProvider === "function") {
        return STATE.systemProvider();
      }

      if (window.IBSS_ENGINE?.getSystemState) {
        return window.IBSS_ENGINE.getSystemState();
      }

      if (window.IBSS_ENGINE?.getStaticSystemFallback) {
        return window.IBSS_ENGINE.getStaticSystemFallback();
      }
    } catch (error) {
      console.error("IBSS_RUNTIME getRawSystem error:", error);
    }

    return null;
  }

  function getResolvedSystem() {
    const rawSystem = getRawSystem();
    if (!rawSystem) return null;

    try {
      if (window.IBSS_PUBLISHER?.orchestrateSystem) {
        return window.IBSS_PUBLISHER.orchestrateSystem(rawSystem);
      }
    } catch (error) {
      console.error("IBSS_RUNTIME publisher orchestration error:", error);
    }

    return rawSystem;
  }

  function render(system) {
    if (!system) return null;

    STATE.system = system;
    refreshTicker(system);

    if (typeof STATE.afterRender === "function") {
      try {
        STATE.afterRender(system);
      } catch (error) {
        console.error("IBSS_RUNTIME afterRender error:", error);
      }
    }

    return system;
  }

  function runFrame() {
    const system = getResolvedSystem();
    if (!system) return null;
    return render(system);
  }

  function restartRefreshLoop() {
    destroyRefreshTimer();

    STATE.refreshTimer = setInterval(() => {
      runFrame();
    }, clamp(STATE.refreshMs, 1000, 60000));
  }

  function bindGlobalEvents() {
    if (window.__IBSS_RUNTIME_EVENTS_BOUND__) return;
    window.__IBSS_RUNTIME_EVENTS_BOUND__ = true;

    window.addEventListener("ibss:ingestion", function () {
      runFrame();
    });

    window.addEventListener("ibss:ingestion-updated", function () {
      runFrame();
    });

    window.addEventListener("resize", function () {
      if (!STATE.tickerTrackEl || !STATE.system) return;
      renderTickerMarkup(buildTickerItemsFromSystem(STATE.system));
    });
  }

  function ensureIngestionRefresh() {
    try {
      if (window.IBSS_INGESTION?.refresh) {
        window.IBSS_INGESTION.refresh();
      }

      if (window.IBSS_INGESTION?.startAutoRefresh) {
        window.IBSS_INGESTION.startAutoRefresh();
      }
    } catch (error) {
      console.error("IBSS_RUNTIME ensureIngestionRefresh error:", error);
    }
  }

  function start(options = {}) {
    loadState();

    STATE.started = true;
    STATE.pageId = safeText(options.pageId, STATE.pageId || "unknown");
    STATE.lang = safeText(options.lang, STATE.lang || "en");
    STATE.refreshMs = safeNumber(options.refreshMs, CONFIG.defaultRefreshMs);

    STATE.tickerTrackEl = options.tickerTrackEl || null;
    STATE.afterRender = typeof options.afterRender === "function" ? options.afterRender : null;
    STATE.systemProvider = typeof options.systemProvider === "function" ? options.systemProvider : null;

    saveState();
    bindGlobalEvents();
    ensureIngestionRefresh();
    restartRefreshLoop();

    return runFrame();
  }

  function setLanguage(lang) {
    STATE.lang = safeText(lang, "en");
    saveState();

    if (STATE.system) {
      refreshTicker(STATE.system);
    }
  }

  function stop() {
    STATE.started = false;
    destroyRefreshTimer();
    clearTicker();
  }

  function getState() {
    return {
      started: STATE.started,
      pageId: STATE.pageId,
      lang: STATE.lang,
      refreshMs: STATE.refreshMs,
      hasTicker: !!STATE.tickerTrackEl,
      hasSystem: !!STATE.system
    };
  }

  return {
    CONFIG,
    start,
    stop,
    setLanguage,
    getState
  };
})();
