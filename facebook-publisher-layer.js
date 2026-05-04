// IBSS FACEBOOK PUBLISHER LAYER — Secure Social Bridge
// Version: v3.0
// Safe frontend layer: copy/share/export + secure backend publishing bridge
// IMPORTANT: Never place Facebook Page Access Token inside this file.

window.IBSS_FACEBOOK_LAYER = (function () {
  "use strict";

  const CONFIG = {
    version: "v3.0-secure-social-bridge",
    storageKey: "ibss_facebook_layer_v30",
    maxHistory: 120,
    defaultHashtags: ["IBSS", "StrategicIntelligence", "SovereignStudies"],
    backendEndpoint: "",
    requestTimeoutMs: 15000
  };

  const STATE = {
    history: [],
    lastResult: null
  };

  function safeText(value, fallback = "") {
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function clone(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      console.error("IBSS_FACEBOOK_LAYER clone error:", error);
      return null;
    }
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function getLang() {
    return safeText(localStorage.getItem("ibss_lang") || document.documentElement.lang || "en", "en");
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

  function loadState() {
    try {
      const raw = localStorage.getItem(CONFIG.storageKey);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;

      STATE.history = asArray(parsed.history);
      STATE.lastResult = parsed.lastResult || null;
    } catch (error) {
      console.error("IBSS_FACEBOOK_LAYER loadState error:", error);
    }
  }

  function saveState() {
    try {
      localStorage.setItem(CONFIG.storageKey, JSON.stringify({
        history: STATE.history,
        lastResult: STATE.lastResult
      }));
    } catch (error) {
      console.error("IBSS_FACEBOOK_LAYER saveState error:", error);
    }
  }

  function setBackendEndpoint(endpoint) {
    CONFIG.backendEndpoint = safeText(endpoint, "");
    return CONFIG.backendEndpoint;
  }

  function normalizeHashtags(tags = CONFIG.defaultHashtags) {
    return asArray(tags)
      .map(tag => safeText(String(tag || "").replace(/^#/, ""), ""))
      .filter(Boolean)
      .map(tag => `#${tag.replace(/\s+/g, "")}`)
      .join(" ");
  }

  function getLatestDraft() {
    try {
      return window.IBSS_PUBLISHER?.getLatestDraft?.() || null;
    } catch (error) {
      console.error("IBSS_FACEBOOK_LAYER getLatestDraft error:", error);
      return null;
    }
  }

  function getSystemState() {
    try {
      return window.IBSS_ENGINE?.getSystemState?.() || null;
    } catch (error) {
      console.error("IBSS_FACEBOOK_LAYER getSystemState error:", error);
      return null;
    }
  }

  function getDraftText(draft, lang = getLang()) {
    if (!draft) return "";

    if (lang === "ar") {
      return (
        draft?.payload?.text_ar ||
        draft?.payload?.text_en ||
        draft?.text_ar ||
        draft?.text_en ||
        draft?.text ||
        ""
      );
    }

    return (
      draft?.payload?.text_en ||
      draft?.payload?.text_ar ||
      draft?.text_en ||
      draft?.text_ar ||
      draft?.text ||
      ""
    );
  }

  function buildSystemPost(system = getSystemState(), lang = getLang()) {
    if (!system) return "";

    const topSignal = system.topSignal || system.dominantSignal || {};
    const title = getLocalizedText(topSignal.title, lang) || "IBSS Strategic Signal";
    const reading =
      getLocalizedText(system.voice?.summary, lang) ||
      getLocalizedText(topSignal.description || topSignal.summary, lang) ||
      "";

    if (lang === "ar") {
      return [
        "قراءة سيادية — IBSS / Σ-9X",
        "",
        `الإشارة الأعلى: ${title}`,
        `ضغط النظام: ${system.systemPressure ?? system.ssi ?? "-"}`,
        `الثقة: ${system.confidenceScore ?? "-"}`,
        `القرار: ${system.decision ?? "-"}`,
        `الوضع: ${system.mode ?? "-"}`,
        "",
        reading,
        "",
        "— IBSS / Σ-9X"
      ].join("\n");
    }

    return [
      "IBSS Strategic Signal",
      "",
      `Top Signal: ${title}`,
      `System Pressure: ${system.systemPressure ?? system.ssi ?? "-"}`,
      `Confidence: ${system.confidenceScore ?? "-"}`,
      `Decision: ${system.decision ?? "-"}`,
      `Mode: ${system.mode ?? "-"}`,
      "",
      reading,
      "",
      "— IBSS / Σ-9X"
    ].join("\n");
  }

  function buildFacebookPost(input = {}, lang = getLang()) {
    const baseText =
      typeof input === "string"
        ? input
        : getDraftText(input, lang) ||
          getLocalizedText(input?.text, lang) ||
          getLocalizedText(input?.title, lang) ||
          buildSystemPost(input?.system || null, lang) ||
          "";

    const hashtags = normalizeHashtags(input?.hashtags || CONFIG.defaultHashtags);
    const text = safeText(baseText, lang === "ar" ? "تحديث IBSS" : "IBSS Update");

    if (text.includes("#IBSS")) return text;

    return `${text}\n\n${hashtags}`.trim();
  }

  async function copyText(text) {
    const value = safeText(text, "");
    if (!value) return false;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        return true;
      }

      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.setAttribute("readonly", "readonly");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();

      const success = document.execCommand("copy");
      document.body.removeChild(textarea);

      return success;
    } catch (error) {
      console.error("IBSS_FACEBOOK_LAYER copyText error:", error);
      return false;
    }
  }

  function recordExport(text, meta = {}) {
    const item = {
      id: `FB-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
      createdAt: nowIso(),
      text,
      meta
    };

    STATE.history.unshift(item);

    if (STATE.history.length > CONFIG.maxHistory) {
      STATE.history = STATE.history.slice(0, CONFIG.maxHistory);
    }

    saveState();
    return clone(item);
  }

  async function copyLatestDraft(lang = getLang()) {
    const draft = getLatestDraft();
    const text = buildFacebookPost(draft || {}, lang);
    const copied = await copyText(text);

    if (copied) {
      recordExport(text, {
        action: "copyLatestDraft",
        draftId: draft?.id || null,
        lang
      });
    }

    return copied;
  }

  async function copyPost(input = {}, lang = getLang()) {
    const text = buildFacebookPost(input, lang);
    const copied = await copyText(text);

    if (copied) {
      recordExport(text, {
        action: "copyPost",
        lang
      });
    }

    return copied;
  }

  function openShareDialog(input = {}, lang = getLang()) {
    const text = buildFacebookPost(input, lang);
    const encoded = encodeURIComponent(text);

    try {
      window.open(
        `https://www.facebook.com/sharer/sharer.php?quote=${encoded}`,
        "_blank",
        "noopener,noreferrer,width=720,height=640"
      );

      recordExport(text, {
        action: "openShareDialog",
        lang
      });

      return true;
    } catch (error) {
      console.error("IBSS_FACEBOOK_LAYER openShareDialog error:", error);
      return false;
    }
  }

  async function sendToBackend(input = {}, options = {}) {
    const endpoint = safeText(options.endpoint || CONFIG.backendEndpoint, "");

    if (!endpoint) {
      const result = {
        ok: false,
        status: "NO_BACKEND_ENDPOINT",
        message: "No backend endpoint configured. Direct Facebook publishing requires a secure backend."
      };

      STATE.lastResult = result;
      saveState();
      return result;
    }

    const lang = safeText(options.lang || getLang(), "en");
    const text = buildFacebookPost(input, lang);

    if (!text) {
      const result = {
        ok: false,
        status: "EMPTY_POST",
        message: "No post text generated."
      };

      STATE.lastResult = result;
      saveState();
      return result;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.requestTimeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-IBSS-Client": CONFIG.version
        },
        body: JSON.stringify({
          platform: "facebook",
          text,
          lang,
          meta: {
            source: "IBSS_FACEBOOK_LAYER",
            createdAt: nowIso(),
            draftId: input?.id || input?.draftId || null,
            systemPressure: input?.system?.systemPressure || input?.system?.ssi || null,
            decision: input?.system?.decision || null,
            mode: input?.system?.mode || null
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      const data = await response.json().catch(() => ({}));

      const result = {
        ok: response.ok,
        status: response.status,
        data
      };

      STATE.lastResult = result;

      recordExport(text, {
        action: "sendToBackend",
        lang,
        ok: response.ok,
        status: response.status
      });

      saveState();
      return result;
    } catch (error) {
      clearTimeout(timeout);

      console.error("IBSS_FACEBOOK_LAYER sendToBackend error:", error);

      const result = {
        ok: false,
        status: "SEND_FAILED",
        message: error.message || "Backend request failed."
      };

      STATE.lastResult = result;
      saveState();
      return result;
    }
  }

  async function sendLatestDraftToBackend(options = {}) {
    const draft = getLatestDraft();
    return sendToBackend(draft || {}, options);
  }

  async function sendSystemPostToBackend(options = {}) {
    const system = getSystemState();
    return sendToBackend({ system }, options);
  }

  function getHistory() {
    return clone(STATE.history) || [];
  }

  function getLastResult() {
    return clone(STATE.lastResult);
  }

  function clearHistory() {
    STATE.history = [];
    STATE.lastResult = null;
    saveState();
    return true;
  }

  function attachToPublisherConsole() {
    const copyBtn = document.getElementById("btnCopyDraftPost");
    if (!copyBtn || copyBtn.dataset.facebookLayerBound === "1") return false;

    copyBtn.dataset.facebookLayerBound = "1";

    copyBtn.addEventListener("dblclick", async function () {
      await copyLatestDraft(getLang());
    });

    return true;
  }

  loadState();

  window.addEventListener("load", function () {
    attachToPublisherConsole();
  });

  return {
    CONFIG,

    setBackendEndpoint,

    buildFacebookPost,
    buildSystemPost,

    copyText,
    copyPost,
    copyLatestDraft,

    openShareDialog,

    sendToBackend,
    sendLatestDraftToBackend,
    sendSystemPostToBackend,

    getHistory,
    getLastResult,
    clearHistory,
    attachToPublisherConsole
  };
})();
