// IBSS PUBLISHER — Doctrine Output & Draft Layer
// Version: v1.0-clean-publisher-layer

window.IBSS_PUBLISHER = (function () {
  "use strict";

  const CONFIG = {
    version: "v1.0-clean-publisher-layer",
    storageKey: "ibss_publisher_v10",
    maxDrafts: 80,
    defaultSignature: "— IBSS / Σ-9X"
  };

  const STATE = {
    drafts: []
  };

  function safeText(value, fallback = "") {
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function clone(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      console.error("IBSS_PUBLISHER clone error:", error);
      return null;
    }
  }

  function getLocalizedText(value, lang = "ar") {
    if (!value) return "";
    if (typeof value === "string" || typeof value === "number") return String(value);

    return (
      value?.[lang] ||
      value?.ar ||
      value?.en ||
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

      STATE.drafts = asArray(parsed.drafts);
    } catch (error) {
      console.error("IBSS_PUBLISHER loadState error:", error);
    }
  }

  function saveState() {
    try {
      localStorage.setItem(CONFIG.storageKey, JSON.stringify({
        drafts: STATE.drafts
      }));
    } catch (error) {
      console.error("IBSS_PUBLISHER saveState error:", error);
    }
  }

  function buildId(prefix = "DRAFT") {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  }

  function cleanLines(lines) {
    return asArray(lines)
      .map(line => String(line ?? "").trim())
      .filter((line, index, arr) => {
        if (line !== "") return true;
        return arr[index - 1] !== "";
      })
      .join("\n")
      .trim();
  }

  function buildPublicationFromReport(report) {
    if (!report) return null;

    const factory = window.IBSS_PUBLICATIONS_FACTORY;

    const input = {
      id: report.id || buildId("PUB"),
      type: "report",
      classification: "operational_report",
      status: "published",
      unit: "SSU",
      title: report.title,
      summary: report.summary,
      body: report.body,
      priority: report.level === "HIGH" ? "HIGH" : "MEDIUM",
      region: report.region || "global",
      country: report.country || "global",
      domain: report.domain || "strategic",
      publishedAt: report.createdAt || nowIso(),
      metrics: {
        strategicWeight: report.systemPressure || 0,
        policyRisk: report.systemPressure || 0,
        implementationDifficulty: 0,
        regionalSensitivity: report.systemPressure || 0
      },
      tags: ["IBSS", "Σ-9X", "Sovereign Analysis"],
      authors: ["IBSS"]
    };

    if (factory?.createReport) {
      return factory.createReport(input);
    }

    return input;
  }

  function buildStructuredPost(publication, options = {}) {
    const lang = options.lang || "ar";
    const signature = options.signature || CONFIG.defaultSignature;

    const title = getLocalizedText(publication?.title, lang);
    const summary = getLocalizedText(publication?.summary, lang);
    const body = getLocalizedText(publication?.body, lang);

    return cleanLines([
      title,
      "",
      summary,
      "",
      body,
      "",
      signature
    ]);
  }

  function buildBlackPostFromSystem(system, options = {}) {
    const lang = options.lang || "ar";
    const signature = options.signature || CONFIG.defaultSignature;

    const topTheater =
      getLocalizedText(system?.topTheater?.name, lang) ||
      getLocalizedText(system?.topCluster?.name, lang) ||
      (lang === "ar" ? "النظام" : "System");

    const pressure = system?.systemPressure ?? system?.ssi ?? "-";
    const level = system?.level || "-";
    const decision = system?.decision || "-";

    if (lang === "ar") {
      return cleanLines([
        `${topTheater} — النظام`,
        "",
        "هذا ليس حدثًا منفصلًا.",
        "",
        "إنه ضغط بنيوي يتحرك داخل طبقات القرار.",
        "",
        `ضغط النظام: ${pressure}`,
        `المستوى: ${level}`,
        `القرار: ${decision}`,
        "",
        "السؤال ليس ماذا يحدث…",
        "",
        "السؤال:",
        "من يملك القرار؟",
        "",
        signature
      ]);
    }

    return cleanLines([
      `${topTheater} — System`,
      "",
      "This is not an isolated event.",
      "",
      "It is structural pressure moving through decision layers.",
      "",
      `System Pressure: ${pressure}`,
      `Level: ${level}`,
      `Decision: ${decision}`,
      "",
      "The question is not what is happening…",
      "",
      "The question is:",
      "Who owns the decision?",
      "",
      signature
    ]);
  }

  function createDraft(input = {}) {
    const draft = {
      id: buildId("DRAFT"),
      createdAt: nowIso(),
      updatedAt: nowIso(),
      type: input.type || "facebook_post",
      source: input.source || "publisher",
      publicationId: input.publicationId || null,
      payload: {
        text_ar: safeText(input.text_ar, ""),
        text_en: safeText(input.text_en, ""),
        publication: input.publication || null,
        system: input.system || null,
        meta: input.meta || {}
      }
    };

    STATE.drafts.unshift(draft);

    if (STATE.drafts.length > CONFIG.maxDrafts) {
      STATE.drafts = STATE.drafts.slice(0, CONFIG.maxDrafts);
    }

    saveState();
    return clone(draft);
  }

  function createDraftFromPublication(publication, options = {}) {
    if (!publication) return null;

    const text_ar = buildStructuredPost(publication, { ...options, lang: "ar" });
    const text_en = buildStructuredPost(publication, { ...options, lang: "en" });

    return createDraft({
      type: "publication_post",
      source: "publication",
      publicationId: publication.id || null,
      text_ar,
      text_en,
      publication,
      meta: {
        mode: "structured_publication"
      }
    });
  }

  function createDraftFromLatestReport(options = {}) {
    const report = window.IBSS_ENGINE?.getLatestReport?.();

    if (!report) {
      console.warn("IBSS_PUBLISHER: No latest report found.");
      return null;
    }

    const publication = buildPublicationFromReport(report);
    return createDraftFromPublication(publication, options);
  }

  function createBlackDraftFromSystem(options = {}) {
    const system =
      window.IBSS_ENGINE?.getLastSystemState?.() ||
      window.IBSS_ENGINE?.getSystemState?.();

    if (!system) {
      console.warn("IBSS_PUBLISHER: No system state found.");
      return null;
    }

    const text_ar = buildBlackPostFromSystem(system, { ...options, lang: "ar" });
    const text_en = buildBlackPostFromSystem(system, { ...options, lang: "en" });

    return createDraft({
      type: "black_statement",
      source: "system",
      text_ar,
      text_en,
      system,
      meta: {
        mode: "black_statement",
        systemPressure: system.systemPressure || system.ssi || null,
        level: system.level || null,
        decision: system.decision || null
      }
    });
  }

  function getLatestDraft() {
    return clone(STATE.drafts[0] || null);
  }

  function getDrafts() {
    return clone(STATE.drafts) || [];
  }

  function clearDrafts() {
    STATE.drafts = [];
    saveState();
    return true;
  }

  function getDraftText(draft = getLatestDraft(), lang = "ar") {
    if (!draft) return "";

    if (lang === "ar") {
      return (
        draft?.payload?.text_ar ||
        draft?.payload?.text_en ||
        ""
      );
    }

    return (
      draft?.payload?.text_en ||
      draft?.payload?.text_ar ||
      ""
    );
  }

  loadState();

  return {
    CONFIG,

    buildPublicationFromReport,
    buildStructuredPost,
    buildBlackPostFromSystem,

    createDraft,
    createDraftFromPublication,
    createDraftFromLatestReport,
    createBlackDraftFromSystem,

    getLatestDraft,
    getDrafts,
    getDraftText,
    clearDrafts
  };
})();
