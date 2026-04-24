// IBSS RUNTIME ENGINE — Clean Stable Runtime
// Version: v8.0 Stable Dashboard Runtime

window.IBSS_RUNTIME = (function () {
  "use strict";

  const CONFIG = {
    storageKey: "ibss_runtime_state_v80_stable",
    defaultRefreshMs: 4000,
    minRefreshMs: 1000,
    maxRefreshMs: 60000,

    tickerStepPx: 0.7,
    tickerFrameThrottleMs: 20,
    minTickerCopies: 3,
    resizeDebounceMs: 180,

    autoAudio: true,
    autoIngestionRefresh: true,
    staleSystemFallbackMs: 30000
  };

  const STATE = {
    started: false,
    pageId: null,
    lang: "en",
    refreshMs: CONFIG.defaultRefreshMs,
    refreshTimer: null,

    system: null,
    lastResolvedSystem: null,
    lastResolvedAt: 0,
    lastSuccessfulRenderAt: 0,
    consecutiveResolveErrors: 0,

    tickerTrackEl: null,
    tickerAnimationId: null,
    tickerItems: [],
    tickerSignature: "",
    tickerCopies: CONFIG.minTickerCopies,
    tickerOffset: 0,
    tickerCycleWidth: 0,
    tickerLastFrameAt: 0,

    afterRender: null,
    beforeResolve: null,
    afterResolve: null,
    onError: null,
    systemProvider: null,
    tickerItemsProvider: null,

    resizeTimer: null,
    rendering: false
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
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      console.error("IBSS_RUNTIME clone error:", error);
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

  function logError(scope, error) {
    console.error(`IBSS_RUNTIME ${scope} error:`, error);
    if (typeof STATE.onError === "function") {
      try {
        STATE.onError({ scope, error });
      } catch (hookError) {
        console.error("IBSS_RUNTIME onError hook error:", hookError);
      }
    }
  }

  function saveState() {
    try {
      localStorage.setItem(CONFIG.storageKey, JSON.stringify({
        pageId: STATE.pageId,
        lang: STATE.lang,
        refreshMs: STATE.refreshMs
      }));
    } catch (error) {
      logError("saveState", error);
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
      logError("loadState", error);
    }
  }

  function resolveTickerElement(options = {}) {
    if (options.tickerTrackEl) return options.tickerTrackEl;
    return document.getElementById("tickerTrack") || null;
  }

  function stopTicker() {
    if (STATE.tickerAnimationId) {
      cancelAnimationFrame(STATE.tickerAnimationId);
      STATE.tickerAnimationId = null;
    }

    STATE.tickerOffset = 0;
    STATE.tickerCycleWidth = 0;
    STATE.tickerLastFrameAt = 0;

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
    const fallback = STATE.lang === "ar" ? "لا توجد بيانات." : "No data available.";

    const base = asArray(items).length
      ? asArray(items)
      : [{ priority: "LOW", text: fallback }];

    return base.map(item => ({
      priority: normalizePriority(item?.priority || "LOW"),
      text: safeText(item?.text, fallback)
    }));
  }

  function buildTickerItemsFromSystem(system) {
    try {
      if (typeof STATE.tickerItemsProvider === "function") {
        const customItems = STATE.tickerItemsProvider(system);
        if (Array.isArray(customItems) && customItems.length) {
          return normalizeTickerItems(customItems);
        }
      }
    } catch (error) {
      logError("tickerItemsProvider", error);
    }

    const unifiedFeed = asArray(system?.publisherFeed || system?.unifiedFeed);
    if (unifiedFeed.length) {
      return normalizeTickerItems(unifiedFeed.map(item => ({
        priority: normalizePriority(item?.priority || system?.level || "LOW"),
        text: getLocalizedText(item?.text, STATE.lang) || "-"
      })));
    }

    const feed = asArray(system?.feed);
    if (feed.length) {
      return normalizeTickerItems(feed.map(item => {
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
      }));
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
      width += children[i].offsetWidth;
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

    STATE.tickerAnimationId = requestAnimationFrame(animateTicker);
  }

  function restartTicker() {
    if (!STATE.tickerTrackEl || !STATE.system) return;

    const items = buildTickerItemsFromSystem(STATE.system);

    STATE.tickerItems = deepClone(items) || [];
    STATE.tickerSignature = JSON.stringify(items);

    stopTicker();
    renderTickerMarkup(items);
    STATE.tickerAnimationId = requestAnimationFrame(animateTicker);
  }

  function refreshTicker(system) {
    if (!STATE.tickerTrackEl) {
      STATE.tickerTrackEl = document.getElementById("tickerTrack") || null;
    }

    if (!STATE.tickerTrackEl) return;

    const items = buildTickerItemsFromSystem(system);
    const signature = JSON.stringify(items);

    if (signature !== STATE.tickerSignature) {
      STATE.tickerItems = deepClone(items) || [];
      STATE.tickerSignature = signature;

      stopTicker();
      renderTickerMarkup(items);
      STATE.tickerAnimationId = requestAnimationFrame(animateTicker);
      return;
    }

    if (!STATE.tickerAnimationId) {
      renderTickerMarkup(items);
      STATE.tickerAnimationId = requestAnimationFrame(animateTicker);
    }
  }

  function destroyRefreshTimer() {
    if (STATE.refreshTimer) {
      clearInterval(STATE.refreshTimer);
      STATE.refreshTimer = null;
    }
  }

  function getFallbackSystem() {
    const isFreshEnough =
      STATE.lastResolvedSystem &&
      Date.now() - STATE.lastResolvedAt <= CONFIG.staleSystemFallbackMs;

    return isFreshEnough ? STATE.lastResolvedSystem : null;
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
      logError("getRawSystem", error);
    }

    return null;
  }

  function isAlreadyOrchestrated(system) {
    return !!(
      system &&
      (
        system.source === "orchestrated" ||
        system.publisherDigest ||
        system.publisherFeed ||
        system.unifiedFeed
      )
    );
  }

  function getResolvedSystem() {
    const rawSystem = getRawSystem();

    if (!rawSystem) {
      STATE.consecutiveResolveErrors += 1;
      return getFallbackSystem();
    }

    let resolved = rawSystem;

    try {
      if (!isAlreadyOrchestrated(rawSystem) && window.IBSS_PUBLISHER?.orchestrateSystem) {
        resolved = window.IBSS_PUBLISHER.orchestrateSystem(rawSystem) || rawSystem;
      }
    } catch (error) {
      logError("publisherOrchestration", error);
      resolved = rawSystem;
    }

    try {
      if (typeof STATE.afterResolve === "function") {
        STATE.afterResolve(resolved);
      }
    } catch (error) {
      logError("afterResolve", error);
    }

    STATE.lastResolvedSystem = resolved;
    STATE.lastResolvedAt = Date.now();
    STATE.consecutiveResolveErrors = 0;

    return resolved;
  }

  function render(system) {
    if (!system || STATE.rendering) return null;

    STATE.rendering = true;

    try {
      STATE.system = system;

      refreshTicker(system);

      if (CONFIG.autoAudio) {
        try {
          if (window.IBSS_AUDIO?.updateFromSystem) {
            window.IBSS_AUDIO.updateFromSystem(system);
          }
        } catch (error) {
          logError("audioUpdate", error);
        }
      }

      if (typeof STATE.afterRender === "function") {
        STATE.afterRender(system);
      }

      STATE.lastSuccessfulRenderAt = Date.now();
      return system;
    } catch (error) {
      logError("render", error);
      return null;
    } finally {
      STATE.rendering = false;
    }
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

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        stopTicker();
      } else if (STATE.started) {
        restartTicker();
        runFrame();
      }
    });
  }

  function ensureIngestionRefresh() {
    if (!CONFIG.autoIngestionRefresh) return;

    try {
      if (window.IBSS_INGESTION?.refresh) {
        window.IBSS_INGESTION.refresh();
      }

      if (window.IBSS_INGESTION?.startAutoRefresh) {
        window.IBSS_INGESTION.startAutoRefresh();
      }
    } catch (error) {
      logError("ensureIngestionRefresh", error);
    }
  }

  function start(options = {}) {
    if (STATE.started) {
      stop();
    }

    loadState();

    STATE.started = true;
    STATE.pageId = safeText(options.pageId, STATE.pageId || "unknown");
    STATE.lang = safeText(options.lang, STATE.lang || "en");
    STATE.refreshMs = clamp(
      safeNumber(options.refreshMs, CONFIG.defaultRefreshMs),
      CONFIG.minRefreshMs,
      CONFIG.maxRefreshMs
    );

    STATE.tickerTrackEl = resolveTickerElement(options);

    STATE.afterRender = typeof options.afterRender === "function" ? options.afterRender : null;
    STATE.beforeResolve = typeof options.beforeResolve === "function" ? options.beforeResolve : null;
    STATE.afterResolve = typeof options.afterResolve === "function" ? options.afterResolve : null;
    STATE.onError = typeof options.onError === "function" ? options.onError : null;
    STATE.systemProvider = typeof options.systemProvider === "function" ? options.systemProvider : null;
    STATE.tickerItemsProvider = typeof options.tickerItemsProvider === "function" ? options.tickerItemsProvider : null;

    saveState();
    bindGlobalEvents();
    ensureIngestionRefresh();
    restartRefreshLoop();

    return runFrame();
  }

  function stop() {
    STATE.started = false;
    destroyRefreshTimer();
    clearTicker();
  }

  function restart() {
    if (!STATE.started) return null;
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

  function setRefreshMs(ms) {
    STATE.refreshMs = clamp(
      safeNumber(ms, CONFIG.defaultRefreshMs),
      CONFIG.minRefreshMs,
      CONFIG.maxRefreshMs
    );

    saveState();

    if (STATE.started) {
      restartRefreshLoop();
    }

    return STATE.refreshMs;
  }

  function forceRender() {
    return runFrame();
  }

  function getLastSystem() {
    return STATE.lastResolvedSystem ? deepClone(STATE.lastResolvedSystem) : null;
  }

  function getDiagnostics() {
    return {
      started: STATE.started,
      pageId: STATE.pageId,
      lang: STATE.lang,
      refreshMs: STATE.refreshMs,

      hasSystem: !!STATE.system,
      hasLastResolvedSystem: !!STATE.lastResolvedSystem,
      lastResolvedAt: STATE.lastResolvedAt,
      lastSuccessfulRenderAt: STATE.lastSuccessfulRenderAt,
      consecutiveResolveErrors: STATE.consecutiveResolveErrors,

      hasTicker: !!STATE.tickerTrackEl,
      tickerItemsCount: STATE.tickerItems.length,
      tickerCycleWidth: STATE.tickerCycleWidth,
      tickerOffset: STATE.tickerOffset,
      tickerRunning: !!STATE.tickerAnimationId,

      hasSystemProvider: typeof STATE.systemProvider === "function",
      hasTickerItemsProvider: typeof STATE.tickerItemsProvider === "function",
      hasAfterRender: typeof STATE.afterRender === "function"
    };
  }

  return {
    CONFIG,
    start,
    stop,
    restart,
    setLanguage,
    setRefreshMs,
    forceRender,
    restartTicker,
    getLastSystem,
    getDiagnostics
  };
})();
