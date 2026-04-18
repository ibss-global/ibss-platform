window.IBSS_RUNTIME = (function () {
  "use strict";

  const CONFIG = {
    storageKey: "ibss_runtime_state_v5_clean",
    defaultRefreshMs: 4000,
    minRefreshMs: 1000,
    maxRefreshMs: 60000,

    tickerStepPx: 0.7,
    tickerFrameThrottleMs: 20,
    minTickerCopies: 3,
    deadTickerRetryEvery: 18,
    resizeDebounceMs: 180
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
    tickerSignature: "",
    tickerCopies: CONFIG.minTickerCopies,
    tickerOffset: 0,
    tickerFrameCounter: 0,
    tickerFrozenChecks: 0,
    tickerLastFrameAt: 0,
    tickerCycleWidth: 0,

    afterRender: null,
    beforeResolve: null,
    afterResolve: null,
    systemProvider: null,
    tickerItemsProvider: null,

    resizeTimer: null
  };

  /* =========================================
     Utilities
  ========================================= */

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
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      console.error("IBSS_RUNTIME deepClone error:", error);
      return null;
    }
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
    const p = String(value || "LOW").toUpperCase().trim();
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

  function nowMs() {
    return Date.now();
  }

  /* =========================================
     Storage
  ========================================= */

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
      STATE.refreshMs = clamp(
        safeNumber(parsed.refreshMs, CONFIG.defaultRefreshMs),
        CONFIG.minRefreshMs,
        CONFIG.maxRefreshMs
      );
    } catch (error) {
      console.error("IBSS_RUNTIME loadState error:", error);
    }
  }

  /* =========================================
     Ticker Core
  ========================================= */

  function stopTicker() {
    if (STATE.tickerAnimationId) {
      cancelAnimationFrame(STATE.tickerAnimationId);
      STATE.tickerAnimationId = null;
    }

    STATE.tickerOffset = 0;
    STATE.tickerFrameCounter = 0;
    STATE.tickerFrozenChecks = 0;
    STATE.tickerLastFrameAt = 0;
    STATE.tickerCycleWidth = 0;

    if (STATE.tickerTrackEl) {
      STATE.tickerTrackEl.style.transform = "translateX(0px)";
    }
  }

  function clearTicker() {
    stopTicker();

    if (STATE.tickerTrackEl) {
      STATE.tickerTrackEl.innerHTML = "";
      STATE.tickerTrackEl.style.transform = "translateX(0px)";
    }

    STATE.tickerItems = [];
    STATE.tickerSignature = "";
  }

  function normalizeTickerItems(items) {
    const base = asArray(items).length ? asArray(items) : [{
      priority: "LOW",
      text: STATE.lang === "ar" ? "لا توجد بيانات." : "No data available."
    }];

    return base.map(item => ({
      priority: normalizePriority(item?.priority || "LOW"),
      text: safeText(item?.text, STATE.lang === "ar" ? "لا توجد بيانات." : "No data available.")
    }));
  }

  function buildTickerItemsFromSystem(system) {
    try {
      if (typeof STATE.tickerItemsProvider === "function") {
        const custom = STATE.tickerItemsProvider(system);
        if (Array.isArray(custom) && custom.length) {
          return normalizeTickerItems(custom);
        }
      }
    } catch (error) {
      console.error("IBSS_RUNTIME tickerItemsProvider error:", error);
    }

    const unifiedFeed = asArray(system?.publisherFeed || system?.unifiedFeed);
    if (unifiedFeed.length) {
      return normalizeTickerItems(
        unifiedFeed.map(item => ({
          priority: normalizePriority(item?.priority || system?.level || "LOW"),
          text: getLocalizedText(item?.text, STATE.lang) || "-"
        }))
      );
    }

    const feed = asArray(system?.feed);
    if (feed.length) {
      return normalizeTickerItems(
        feed.map(item => {
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
        })
      );
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

    return normalizeTickerItems(synthetic);
  }

  function measureSingleCycleWidth() {
    if (!STATE.tickerTrackEl) return 0;

    const children = Array.from(STATE.tickerTrackEl.children);
    if (!children.length) return 0;

    const singleSetCount = Math.floor(children.length / STATE.tickerCopies);
    if (!singleSetCount) return 0;

    let width = 0;
    for (let i = 0; i < singleSetCount; i += 1) {
      const node = children[i];
      width += node.offsetWidth;
    }

    const style = getComputedStyle(STATE.tickerTrackEl);
    const gap = safeNumber(parseFloat(style.columnGap || style.gap || "0"), 0);

    if (singleSetCount > 1) {
      width += gap * (singleSetCount - 1);
    }

    return width;
  }

  function renderTickerMarkup(items) {
    if (!STATE.tickerTrackEl) return;

    const normalizedItems = normalizeTickerItems(items);
    const repeated = [];

    for (let i = 0; i < STATE.tickerCopies; i += 1) {
      repeated.push(...normalizedItems);
    }

    STATE.tickerTrackEl.innerHTML = repeated.map(item => `
      <div class="ticker-item">
        <span class="ticker-dot ${escapeHtml(priorityClass(item.priority))}"></span>
        <span class="ticker-item-text" dir="${STATE.lang === "ar" ? "rtl" : "ltr"}">${escapeHtml(item.text)}</span>
      </div>
    `).join("");

    STATE.tickerTrackEl.style.willChange = "transform";
    STATE.tickerTrackEl.style.transform = "translateX(0px)";
    STATE.tickerOffset = 0;

    requestAnimationFrame(() => {
      STATE.tickerCycleWidth = measureSingleCycleWidth();
    });
  }

  function animateTicker(ts) {
    if (!STATE.tickerTrackEl) return;

    if (!STATE.tickerLastFrameAt) {
      STATE.tickerLastFrameAt = ts;
    }

    const elapsed = ts - STATE.tickerLastFrameAt;
    if (elapsed < CONFIG.tickerFrameThrottleMs) {
      STATE.tickerAnimationId = requestAnimationFrame(animateTicker);
      return;
    }

    STATE.tickerLastFrameAt = ts;

    if (STATE.tickerCycleWidth <= 0) {
      STATE.tickerCycleWidth = measureSingleCycleWidth();
      STATE.tickerAnimationId = requestAnimationFrame(animateTicker);
      return;
    }

    STATE.tickerOffset += CONFIG.tickerStepPx;

    if (STATE.tickerOffset >= STATE.tickerCycleWidth) {
      STATE.tickerOffset = 0;
    }

    const translateX = STATE.lang === "ar" ? STATE.tickerOffset : -STATE.tickerOffset;
    STATE.tickerTrackEl.style.transform = `translateX(${translateX}px)`;
    STATE.tickerFrameCounter += 1;

    if (STATE.tickerFrameCounter % CONFIG.deadTickerRetryEvery === 0) {
      const transform = STATE.tickerTrackEl.style.transform || "";
      if (!transform.includes("translateX")) {
        STATE.tickerFrozenChecks += 1;
      } else {
        STATE.tickerFrozenChecks = 0;
      }

      if (STATE.tickerFrozenChecks >= 2) {
        STATE.tickerTrackEl.style.transform = `translateX(${translateX}px)`;
        STATE.tickerFrozenChecks = 0;
      }
    }

    STATE.tickerAnimationId = requestAnimationFrame(animateTicker);
  }

  function restartTicker() {
    if (!STATE.tickerTrackEl || !STATE.system) return;

    const items = buildTickerItemsFromSystem(STATE.system);
    STATE.tickerItems = deepClone(items);
    STATE.tickerSignature = JSON.stringify(items);

    renderTickerMarkup(items);
    stopTicker();
    STATE.tickerAnimationId = requestAnimationFrame(animateTicker);
  }

  function refreshTicker(system) {
    if (!STATE.tickerTrackEl) return;

    const items = buildTickerItemsFromSystem(system);
    const signature = JSON.stringify(items);

    if (signature !== STATE.tickerSignature) {
      STATE.tickerItems = deepClone(items);
      STATE.tickerSignature = signature;

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

  /* =========================================
     Refresh Loop
  ========================================= */

  function destroyRefreshTimer() {
    if (STATE.refreshTimer) {
      clearInterval(STATE.refreshTimer);
      STATE.refreshTimer = null;
    }
  }

  function getRawSystem() {
    try {
      if (typeof STATE.beforeResolve === "function") {
        STATE.beforeResolve();
      }

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

    let resolved = rawSystem;

    try {
      if (window.IBSS_PUBLISHER?.orchestrateSystem) {
        resolved = window.IBSS_PUBLISHER.orchestrateSystem(rawSystem) || rawSystem;
      }
    } catch (error) {
      console.error("IBSS_RUNTIME publisher orchestration error:", error);
      resolved = rawSystem;
    }

    try {
      if (typeof STATE.afterResolve === "function") {
        STATE.afterResolve(resolved);
      }
    } catch (error) {
      console.error("IBSS_RUNTIME afterResolve error:", error);
    }

    return resolved;
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
    }, clamp(STATE.refreshMs, CONFIG.minRefreshMs, CONFIG.maxRefreshMs));
  }

  /* =========================================
     Global Events
  ========================================= */

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
      clearTimeout(STATE.resizeTimer);
      STATE.resizeTimer = setTimeout(() => {
        restartTicker();
      }, CONFIG.resizeDebounceMs);
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

  /* =========================================
     Public API
  ========================================= */

  function start(options = {}) {
    loadState();

    STATE.started = true;
    STATE.pageId = safeText(options.pageId, STATE.pageId || "unknown");
    STATE.lang = safeText(options.lang, STATE.lang || "en");
    STATE.refreshMs = clamp(
      safeNumber(options.refreshMs, CONFIG.defaultRefreshMs),
      CONFIG.minRefreshMs,
      CONFIG.maxRefreshMs
    );

    STATE.tickerTrackEl = options.tickerTrackEl || null;
    STATE.afterRender = typeof options.afterRender === "function" ? options.afterRender : null;
    STATE.beforeResolve = typeof options.beforeResolve === "function" ? options.beforeResolve : null;
    STATE.afterResolve = typeof options.afterResolve === "function" ? options.afterResolve : null;
    STATE.systemProvider = typeof options.systemProvider === "function" ? options.systemProvider : null;
    STATE.tickerItemsProvider = typeof options.tickerItemsProvider === "function" ? options.tickerItemsProvider : null;

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
      restartTicker();
    }
  }

  function stop() {
    STATE.started = false;
    destroyRefreshTimer();
    clearTicker();
  }

  function forceRender() {
    return runFrame();
  }

  function getState() {
    return {
      started: STATE.started,
      pageId: STATE.pageId,
      lang: STATE.lang,
      refreshMs: STATE.refreshMs,
      hasTicker: !!STATE.tickerTrackEl,
      hasSystem: !!STATE.system,
      tickerItemsCount: STATE.tickerItems.length,
      tickerCycleWidth: STATE.tickerCycleWidth
    };
  }

  return {
    CONFIG,
    start,
    stop,
    setLanguage,
    forceRender,
    restartTicker,
    getState
  };
})();
