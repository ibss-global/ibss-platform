// IBSS SOURCES CORE — Living Integration Layer
// Version: v1.0 Full System Bridge (DATA → ENGINE)

window.IBSS_SOURCES = (function () {
  "use strict";

  /* =========================
     STATE
  ========================= */

  const STATE = {
    initialized: false,

    signals: [],
    news: [],
    countries: [],
    content: [],

    lastUpdate: null,
    sourceMode: "fallback" // fallback | hybrid | live
  };

  /* =========================
     UTILITIES
  ========================= */

  function nowIso() {
    return new Date().toISOString();
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function clone(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (e) {
      console.error("IBSS_SOURCES clone error:", e);
      return null;
    }
  }

  function safeText(v, f = "") {
    return typeof v === "string" && v.trim() ? v.trim() : f;
  }

  /* =========================
     LOAD FROM DATA
  ========================= */

  function loadFromDataCore() {
    const data = window.IBSS_DATA;

    if (!data) {
      console.warn("IBSS_SOURCES: No IBSS_DATA found");
      return;
    }

    STATE.signals = asArray(data.signals);
    STATE.news = asArray(data.newsFeed);
    STATE.countries = asArray(data.countries);
    STATE.content = asArray(data.content);

    STATE.lastUpdate = nowIso();
  }

  /* =========================
     GLOBAL EXPOSURE (CRITICAL)
  ========================= */

  function exposeToWindow() {
    // Engine compatibility layer

    window.IBSS_SIGNALS = clone(STATE.signals) || [];
    window.IBSS_NEWS = clone(STATE.news) || [];
    window.IBSS_COUNTRIES = clone(STATE.countries) || [];
    window.IBSS_CONTENT = clone(STATE.content) || [];

    // Indexes (important for speed)

    window.IBSS_SIGNAL_INDEX = buildIndex(window.IBSS_SIGNALS);
    window.IBSS_COUNTRY_INDEX = buildIndex(window.IBSS_COUNTRIES);
    window.IBSS_CONTENT_INDEX = buildIndex(window.IBSS_CONTENT);

    // Metadata

    window.IBSS_SOURCE_META = {
      mode: STATE.sourceMode,
      lastUpdate: STATE.lastUpdate,
      counts: {
        signals: window.IBSS_SIGNALS.length,
        news: window.IBSS_NEWS.length,
        countries: window.IBSS_COUNTRIES.length,
        content: window.IBSS_CONTENT.length
      }
    };
  }

  function buildIndex(list) {
    const index = {};
    asArray(list).forEach(item => {
      if (item?.id) index[item.id] = item;
    });
    return index;
  }

  /* =========================
     LIVE EXTENSION (READY)
  ========================= */

  function injectLiveSignals(newSignals = []) {
    const merged = [...newSignals, ...STATE.signals];

    STATE.signals = dedupeById(merged);
    STATE.sourceMode = "hybrid";

    sync();
  }

  function injectLiveNews(newNews = []) {
    const merged = [...newNews, ...STATE.news];

    STATE.news = dedupeById(merged);
    STATE.sourceMode = "hybrid";

    sync();
  }

  function injectLiveContent(newContent = []) {
    const merged = [...newContent, ...STATE.content];

    STATE.content = dedupeById(merged);
    STATE.sourceMode = "hybrid";

    sync();
  }

  function dedupeById(list) {
    const map = new Map();

    asArray(list).forEach(item => {
      if (!item?.id) return;
      map.set(item.id, item);
    });

    return [...map.values()];
  }

  /* =========================
     SYNC
  ========================= */

  function sync() {
    STATE.lastUpdate = nowIso();
    exposeToWindow();

    dispatchUpdate();
  }

  function dispatchUpdate() {
    try {
      window.dispatchEvent(
        new CustomEvent("ibss:sources-updated", {
          detail: {
            mode: STATE.sourceMode,
            timestamp: STATE.lastUpdate
          }
        })
      );
    } catch (e) {
      console.error("IBSS_SOURCES dispatch error:", e);
    }
  }

  /* =========================
     PUBLIC API
  ========================= */

  function getSignals() {
    return clone(STATE.signals);
  }

  function getNews() {
    return clone(STATE.news);
  }

  function getCountries() {
    return clone(STATE.countries);
  }

  function getContent() {
    return clone(STATE.content);
  }

  function getState() {
    return {
      mode: STATE.sourceMode,
      lastUpdate: STATE.lastUpdate,
      signals: STATE.signals.length,
      news: STATE.news.length,
      countries: STATE.countries.length,
      content: STATE.content.length
    };
  }

  /* =========================
     INIT
  ========================= */

  function init() {
    if (STATE.initialized) return;

    loadFromDataCore();
    exposeToWindow();

    STATE.initialized = true;

    dispatchUpdate();
  }

  init();

  return {
    getSignals,
    getNews,
    getCountries,
    getContent,
    getState,

    injectLiveSignals,
    injectLiveNews,
    injectLiveContent,

    sync
  };
})();
