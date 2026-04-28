// IBSS AUTO PUBLISH ORCHESTRATOR
// Version: v1.0-clean-auto-publisher-runtime-bridge

window.IBSS_AUTO_PUBLISH = (function () {
  "use strict";

  const CONFIG = {
    version: "v1.0-clean-auto-publisher-runtime-bridge",
    storageKey: "ibss_auto_publish_v10",
    minIntervalMs: 9000,
    pressureDeltaTrigger: 6,
    autoDraftOnNewReport: true,
    autoDraftOnPressureShift: true,
    autoDraftOnTopSignalShift: true,
    defaultDraftMode: "living_presence_post"
  };

  const STATE = {
    lastSystemSignature: "",
    lastDraftAt: 0,
    lastDraftId: null,
    lastTopSignalId: null,
    lastPressure: null,
    lastReportId: null
  };

  function safeText(value, fallback = "") {
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
  }

  function safeNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function nowMs() {
    return Date.now();
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(CONFIG.storageKey);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;

      STATE.lastSystemSignature = safeText(parsed.lastSystemSignature, "");
      STATE.lastDraftAt = safeNumber(parsed.lastDraftAt, 0);
      STATE.lastDraftId = parsed.lastDraftId || null;
      STATE.lastTopSignalId = parsed.lastTopSignalId || null;
      STATE.lastPressure = parsed.lastPressure ?? null;
      STATE.lastReportId = parsed.lastReportId || null;
    } catch (error) {
      console.error("IBSS_AUTO_PUBLISH loadState error:", error);
    }
  }

  function saveState() {
    try {
      localStorage.setItem(CONFIG.storageKey, JSON.stringify(STATE));
    } catch (error) {
      console.error("IBSS_AUTO_PUBLISH saveState error:", error);
    }
  }

  function getTopSignalId(system) {
    return (
      system?.topSignal?.id ||
      system?.dominantSignal?.id ||
      system?.rankedSignals?.[0]?.id ||
      null
    );
  }

  function getLatestReportId() {
    try {
      return window.IBSS_ENGINE?.getLatestReport?.()?.id || null;
    } catch (error) {
      console.error("IBSS_AUTO_PUBLISH latest report error:", error);
      return null;
    }
  }

  function buildSystemSignature(system) {
    return [
      system?.systemPressure ?? system?.ssi ?? 0,
      system?.level || "",
      system?.decision || "",
      system?.mode || "",
      getTopSignalId(system) || "",
      system?.presence?.state || "",
      getLatestReportId() || ""
    ].join("|");
  }

  function canGenerateNow() {
    return nowMs() - STATE.lastDraftAt >= CONFIG.minIntervalMs;
  }

  function chooseDraftMode(system) {
    const pressure = safeNumber(system?.systemPressure ?? system?.ssi, 0);
    const topSignalId = getTopSignalId(system);
    const latestReportId = getLatestReportId();

    if (
      CONFIG.autoDraftOnNewReport &&
      latestReportId &&
      latestReportId !== STATE.lastReportId
    ) {
      return "featured_publication_post";
    }

    if (
      CONFIG.autoDraftOnTopSignalShift &&
      topSignalId &&
      STATE.lastTopSignalId &&
      topSignalId !== STATE.lastTopSignalId
    ) {
      return "signal_post";
    }

    if (
      CONFIG.autoDraftOnPressureShift &&
      STATE.lastPressure !== null &&
      Math.abs(pressure - safeNumber(STATE.lastPressure, pressure)) >= CONFIG.pressureDeltaTrigger
    ) {
      return "strategic_brief";
    }

    return CONFIG.defaultDraftMode;
  }

  function generateDraft(system, mode) {
    if (!window.IBSS_PUBLISHER) return null;

    const options = { system };

    if (mode === "signal_post") {
      return window.IBSS_PUBLISHER.generateTopSignalPost?.(options) || null;
    }

    if (mode === "strategic_brief") {
      return window.IBSS_PUBLISHER.generateStrategicBrief?.(options) || null;
    }

    if (mode === "featured_publication_post") {
      return window.IBSS_PUBLISHER.generateFeaturedPublicationPost?.(options) || null;
    }

    if (mode === "living_presence_post") {
      return window.IBSS_PUBLISHER.generateLivingPresencePost?.(options) || null;
    }

    return window.IBSS_PUBLISHER.generateLivingPresencePost?.(options) || null;
  }

  function processSystem(system) {
    if (!system || !window.IBSS_PUBLISHER) return null;

    const signature = buildSystemSignature(system);
    const pressure = safeNumber(system?.systemPressure ?? system?.ssi, 0);
    const topSignalId = getTopSignalId(system);
    const latestReportId = getLatestReportId();

    if (signature === STATE.lastSystemSignature) {
      return null;
    }

    const mode = chooseDraftMode(system);

    let draft = null;

    if (canGenerateNow()) {
      draft = generateDraft(system, mode);
    }

    STATE.lastSystemSignature = signature;
    STATE.lastPressure = pressure;
    STATE.lastTopSignalId = topSignalId;
    STATE.lastReportId = latestReportId;

    if (draft?.id) {
      STATE.lastDraftAt = nowMs();
      STATE.lastDraftId = draft.id;
    }

    saveState();

    window.dispatchEvent(new CustomEvent("ibss:auto-publish", {
      detail: {
        mode,
        draft,
        systemPressure: pressure,
        topSignalId,
        latestReportId
      }
    }));

    return draft;
  }

  function attachToRuntime() {
    if (window.__IBSS_AUTO_PUBLISH_RUNTIME_ATTACHED__) return true;
    window.__IBSS_AUTO_PUBLISH_RUNTIME_ATTACHED__ = true;

    window.addEventListener("ibss:ingestion", function () {
      try {
        const system =
          window.IBSS_RUNTIME?.getLastSystem?.() ||
          window.IBSS_ENGINE?.getLastSystemState?.() ||
          window.IBSS_ENGINE?.getSystemState?.();

        processSystem(system);
      } catch (error) {
        console.error("IBSS_AUTO_PUBLISH ingestion hook error:", error);
      }
    });

    window.addEventListener("ibss:ingestion-updated", function () {
      try {
        const system =
          window.IBSS_RUNTIME?.getLastSystem?.() ||
          window.IBSS_ENGINE?.getLastSystemState?.() ||
          window.IBSS_ENGINE?.getSystemState?.();

        processSystem(system);
      } catch (error) {
        console.error("IBSS_AUTO_PUBLISH ingestion-updated hook error:", error);
      }
    });

    return true;
  }

  function forceGenerate(mode = CONFIG.defaultDraftMode) {
    const system =
      window.IBSS_RUNTIME?.getLastSystem?.() ||
      window.IBSS_ENGINE?.getLastSystemState?.() ||
      window.IBSS_ENGINE?.getSystemState?.();

    if (!system) return null;

    const draft = generateDraft(system, mode);

    if (draft?.id) {
      STATE.lastDraftAt = nowMs();
      STATE.lastDraftId = draft.id;
      STATE.lastSystemSignature = buildSystemSignature(system);
      STATE.lastPressure = safeNumber(system?.systemPressure ?? system?.ssi, 0);
      STATE.lastTopSignalId = getTopSignalId(system);
      STATE.lastReportId = getLatestReportId();
      saveState();
    }

    return draft;
  }

  function getState() {
    return JSON.parse(JSON.stringify(STATE));
  }

  loadState();
  attachToRuntime();

  return {
    CONFIG,
    processSystem,
    forceGenerate,
    attachToRuntime,
    getState
  };
})();
