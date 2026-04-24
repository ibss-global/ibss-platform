// IBSS AUDIO ENGINE — Stable Voice Layer
// Version: v2.0 Browser Speech Compatible

window.IBSS_AUDIO = (function () {
  "use strict";

  const CONFIG = {
    version: "v2.0-browser-speech-compatible",
    storageKey: "ibss_audio_state_v20",
    minSpeakIntervalMs: 12000,
    maxTextLength: 420,
    defaultLang: "en"
  };

  const STATE = {
    enabled: false,
    lastSpokenAt: 0,
    lastSignature: "",
    lastSystem: null,
    selectedVoice: null
  };

  function safeText(value, fallback = "") {
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
  }

  function safeNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
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

  function getLang() {
    const htmlLang = document.documentElement.lang;
    const stored = localStorage.getItem("ibss_lang");
    return safeText(stored || htmlLang || CONFIG.defaultLang, CONFIG.defaultLang);
  }

  function isSupported() {
    return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  }

  function saveState() {
    try {
      localStorage.setItem(CONFIG.storageKey, JSON.stringify({
        enabled: STATE.enabled,
        lastSpokenAt: STATE.lastSpokenAt,
        lastSignature: STATE.lastSignature
      }));
    } catch (error) {
      console.error("IBSS_AUDIO saveState error:", error);
    }
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(CONFIG.storageKey);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;

      STATE.enabled = !!parsed.enabled;
      STATE.lastSpokenAt = safeNumber(parsed.lastSpokenAt, 0);
      STATE.lastSignature = safeText(parsed.lastSignature, "");
    } catch (error) {
      console.error("IBSS_AUDIO loadState error:", error);
    }
  }

  function clampText(text) {
    const value = safeText(text, "");
    if (value.length <= CONFIG.maxTextLength) return value;
    return value.slice(0, CONFIG.maxTextLength - 3).trim() + "...";
  }

  function buildSignature(system) {
    return [
      system?.updatedAt || "",
      system?.level || "",
      system?.systemPressure || system?.ssi || "",
      system?.decision || "",
      system?.mode || "",
      system?.topSignal?.id || ""
    ].join("|");
  }

  function buildSpeechText(system, lang = "en") {
    const pressure = safeNumber(system?.systemPressure ?? system?.ssi, 0);
    const confidence = safeNumber(system?.confidenceScore, 0);
    const mode = safeText(system?.mode || system?.decision, lang === "ar" ? "مراقبة" : "Monitoring");
    const voice = system?.voice || {};
    const summary = getLocalizedText(voice.summary, lang);
    const advisory = getLocalizedText(voice.advisory, lang);
    const topSignal = getLocalizedText(system?.topSignal?.title, lang);

    if (lang === "ar") {
      return clampText(
        `تحديث IBSS. ضغط النظام ${pressure}. الثقة ${confidence}. الوضع ${mode}. ` +
        `${topSignal ? "الإشارة الأعلى: " + topSignal + ". " : ""}` +
        `${summary ? summary + ". " : ""}` +
        `${advisory ? advisory : ""}`
      );
    }

    return clampText(
      `IBSS update. System pressure ${pressure}. Confidence ${confidence}. Mode ${mode}. ` +
      `${topSignal ? "Top signal: " + topSignal + ". " : ""}` +
      `${summary ? summary + ". " : ""}` +
      `${advisory ? advisory : ""}`
    );
  }

  function selectVoice(lang = "en") {
    if (!isSupported()) return null;

    const voices = window.speechSynthesis.getVoices() || [];
    if (!voices.length) return null;

    const target = lang === "ar" ? "ar" : "en";

    return (
      voices.find(voice => String(voice.lang || "").toLowerCase().startsWith(target)) ||
      voices.find(voice => String(voice.lang || "").toLowerCase().includes(target)) ||
      voices[0] ||
      null
    );
  }

  function stop() {
    if (!isSupported()) return false;

    try {
      window.speechSynthesis.cancel();
      return true;
    } catch (error) {
      console.error("IBSS_AUDIO stop error:", error);
      return false;
    }
  }

  function speak(text, lang = "en", options = {}) {
    if (!STATE.enabled && !options.force) return false;
    if (!isSupported()) return false;

    const content = clampText(text);
    if (!content) return false;

    try {
      stop();

      const utterance = new SpeechSynthesisUtterance(content);
      utterance.lang = lang === "ar" ? "ar" : "en-US";
      utterance.rate = lang === "ar" ? 0.92 : 0.95;
      utterance.pitch = 0.95;
      utterance.volume = 0.85;

      const voice = selectVoice(lang);
      if (voice) utterance.voice = voice;

      window.speechSynthesis.speak(utterance);

      STATE.lastSpokenAt = Date.now();
      saveState();

      return true;
    } catch (error) {
      console.error("IBSS_AUDIO speak error:", error);
      return false;
    }
  }

  function updateFromSystem(system, options = {}) {
    STATE.lastSystem = system || null;

    if (!STATE.enabled || !system) return false;

    const now = Date.now();
    const signature = buildSignature(system);

    if (!options.force) {
      if (signature === STATE.lastSignature) return false;
      if (now - STATE.lastSpokenAt < CONFIG.minSpeakIntervalMs) return false;
    }

    const lang = getLang();
    const text = buildSpeechText(system, lang);

    const spoken = speak(text, lang, { force: true });

    if (spoken) {
      STATE.lastSignature = signature;
      saveState();
    }

    return spoken;
  }

  async function enable() {
    STATE.enabled = true;
    saveState();

    if (STATE.lastSystem) {
      updateFromSystem(STATE.lastSystem, { force: true });
    }

    return true;
  }

  async function disable() {
    STATE.enabled = false;
    stop();
    saveState();
    return true;
  }

  async function toggle() {
    if (STATE.enabled) {
      return disable();
    }

    return enable();
  }

  function isEnabled() {
    return !!STATE.enabled;
  }

  function getState() {
    return {
      enabled: STATE.enabled,
      supported: isSupported(),
      lastSpokenAt: STATE.lastSpokenAt,
      lastSignature: STATE.lastSignature,
      hasLastSystem: !!STATE.lastSystem
    };
  }

  loadState();

  if (isSupported()) {
    window.speechSynthesis.onvoiceschanged = function () {
      STATE.selectedVoice = selectVoice(getLang());
    };
  }

  return {
    CONFIG,
    isSupported,
    isEnabled,
    enable,
    disable,
    toggle,
    stop,
    speak,
    updateFromSystem,
    buildSpeechText,
    getState
  };
})();
