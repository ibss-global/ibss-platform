// IBSS FACEBOOK PUBLISHER LAYER — Safe Social Export Layer
// Version: v2.0

window.IBSS_FACEBOOK_LAYER = (function () {
  "use strict";

  const CONFIG = {
    version: "v2.0-safe-social-export-layer",
    storageKey: "ibss_facebook_layer_v20",
    maxHistory: 80,
    defaultHashtags: ["IBSS", "StrategicIntelligence", "SovereignStudies"]
  };

  const STATE = {
    history: []
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
    } catch (error) {
      console.error("IBSS_FACEBOOK_LAYER loadState error:", error);
    }
  }

  function saveState() {
    try {
      localStorage.setItem(CONFIG.storageKey, JSON.stringify({
        history: STATE.history
      }));
    } catch (error) {
      console.error("IBSS_FACEBOOK_LAYER saveState error:", error);
    }
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

  function buildFacebookPost(input = {}, lang = getLang()) {
    const baseText =
      typeof input === "string"
        ? input
        : getDraftText(input, lang) ||
          getLocalizedText(input?.text, lang) ||
          getLocalizedText(input?.title, lang) ||
          "";

    const hashtags = normalizeHashtags(input?.hashtags || CONFIG.defaultHashtags);

    const text = safeText(baseText, lang === "ar" ? "تحديث IBSS" : "IBSS Update");

    if (text.includes("#IBSS")) {
      return text;
    }

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

  function getHistory() {
    return clone(STATE.history) || [];
  }

  function clearHistory() {
    STATE.history = [];
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
    buildFacebookPost,
    copyText,
    copyPost,
    copyLatestDraft,
    openShareDialog,
    getHistory,
    clearHistory,
    attachToPublisherConsole
  };
})();
