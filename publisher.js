// IBSS PUBLISHER — Doctrine Output & Draft Layer
// Version: v1.1-clean-command-publisher-layer

window.IBSS_PUBLISHER = (function () {
  "use strict";

  const CONFIG = {
    version: "v1.1-clean-command-publisher-layer",
    storageKey: "ibss_publisher_v11",
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

  function getSystemState() {
    try {
      return (
        window.IBSS_ENGINE?.getLastSystemState?.() ||
        window.IBSS_ENGINE?.getSystemState?.() ||
        window.IBSS_ENGINE?.getStaticSystemFallback?.() ||
        null
      );
    } catch (error) {
      console.error("IBSS_PUBLISHER getSystemState error:", error);
      return null;
    }
  }

  function getFeaturedPublication(system) {
    return (
      system?.featuredPublication ||
      system?.publicationContext?.featuredPublication ||
      system?.snapshot?.latestStudy ||
      null
    );
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
    const mode = system?.mode || "-";

    const voiceSummary = getLocalizedText(system?.voice?.summary, lang);
    const advisory = getLocalizedText(system?.voice?.advisory, lang);
    const topSignal = getLocalizedText(system?.topSignal?.title, lang);

    if (lang === "ar") {
      return cleanLines([
        `${topTheater} — قراءة سيادية`,
        "",
        topSignal ? `الإشارة الأعلى: ${topSignal}` : "",
        "",
        voiceSummary || "هذا ليس حدثًا منفصلًا، بل ضغط بنيوي يتحرك داخل طبقات القرار.",
        "",
        `ضغط النظام: ${pressure}`,
        `المستوى: ${level}`,
        `القرار: ${decision}`,
        `الوضع: ${mode}`,
        "",
        advisory || "المطلوب هو الحفاظ على تماسك القراءة وعدم التعامل مع الإشارة كعنوان منفرد.",
        "",
        signature
      ]);
    }

    return cleanLines([
      `${topTheater} — Sovereign Reading`,
      "",
      topSignal ? `Top Signal: ${topSignal}` : "",
      "",
      voiceSummary || "This is not an isolated event. It is structural pressure moving through decision layers.",
      "",
      `System Pressure: ${pressure}`,
      `Level: ${level}`,
      `Decision: ${decision}`,
      `Mode: ${mode}`,
      "",
      advisory || "Maintain narrative coherence and avoid reading the signal as a detached headline.",
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

  function saveDraft(draftLike = {}) {
    if (draftLike?.payload?.text_ar || draftLike?.payload?.text_en) {
      return createDraft({
        type: draftLike.type || "viral_signal",
        source: draftLike.source || draftLike?.payload?.meta?.generatedBy || "external",
        text_ar: draftLike.payload.text_ar || "",
        text_en: draftLike.payload.text_en || "",
        publication: draftLike.payload.publication || null,
        system: draftLike.payload.system || null,
        meta: draftLike.payload.meta || {}
      });
    }

    return createDraft(draftLike);
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
    const system = getSystemState();

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

  function generateTopSignalPost() {
    const system = getSystemState();

    if (!system) {
      console.warn("IBSS_PUBLISHER: No system state found for top signal post.");
      return null;
    }

    if (window.IBSS_VIRAL?.generate) {
      const viralDraft = window.IBSS_VIRAL.generate(system, "ar");
      return saveDraft(viralDraft);
    }

    return createBlackDraftFromSystem({
      mode: "top_signal_fallback"
    });
  }

  function generateStrategicBrief() {
    const system = getSystemState();

    if (!system) {
      console.warn("IBSS_PUBLISHER: No system state found for strategic brief.");
      return null;
    }

    const voiceSummaryAr = getLocalizedText(system?.voice?.summary, "ar");
    const voiceSummaryEn = getLocalizedText(system?.voice?.summary, "en");

    const advisoryAr = getLocalizedText(system?.voice?.advisory, "ar");
    const advisoryEn = getLocalizedText(system?.voice?.advisory, "en");

    const topSignalAr = getLocalizedText(system?.topSignal?.title, "ar") || "غير محدد";
    const topSignalEn = getLocalizedText(system?.topSignal?.title, "en") || "Undefined";

    const text_ar = cleanLines([
      "موجز سيادي استراتيجي",
      "",
      `الإشارة الأعلى: ${topSignalAr}`,
      `ضغط النظام: ${system.systemPressure ?? system.ssi ?? "-"}`,
      `الثقة: ${system.confidenceScore ?? "-"}`,
      `القرار: ${system.decision || "-"}`,
      `الوضع: ${system.mode || "-"}`,
      "",
      voiceSummaryAr,
      "",
      advisoryAr,
      "",
      CONFIG.defaultSignature
    ]);

    const text_en = cleanLines([
      "Strategic Sovereign Brief",
      "",
      `Top Signal: ${topSignalEn}`,
      `System Pressure: ${system.systemPressure ?? system.ssi ?? "-"}`,
      `Confidence: ${system.confidenceScore ?? "-"}`,
      `Decision: ${system.decision || "-"}`,
      `Mode: ${system.mode || "-"}`,
      "",
      voiceSummaryEn,
      "",
      advisoryEn,
      "",
      CONFIG.defaultSignature
    ]);

    return createDraft({
      type: "strategic_brief",
      source: "publisher_command",
      text_ar,
      text_en,
      system,
      meta: {
        mode: "strategic_brief"
      }
    });
  }

  function generateFeaturedPublicationPost() {
    const system = getSystemState();
    const publication = getFeaturedPublication(system);

    if (publication) {
      return createDraftFromPublication(publication);
    }

    return createDraftFromLatestReport();
  }

  function generateLivingPresencePost() {
    return createBlackDraftFromSystem({
      mode: "living_presence"
    });
  }

  function orchestrateSystem(system) {
    if (!system || typeof system !== "object") return system;

    const featuredPublication = getFeaturedPublication(system);
    const feed = asArray(system.feed);

    return {
      ...system,
      source: "orchestrated",
      featuredPublication,
      unifiedFeed: feed,
      publisherFeed: feed,
      publisherDigest: {
        source: "IBSS_PUBLISHER",
        version: CONFIG.version,
        latestDraftId: STATE.drafts[0]?.id || null,
        draftsCount: STATE.drafts.length
      }
    };
  }

  function getUnifiedFeed() {
    const system = getSystemState();
    return asArray(system?.feed);
  }

  function getLatestFeaturedPublication() {
    const system = getSystemState();
    return getFeaturedPublication(system);
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
      return draft?.payload?.text_ar || draft?.payload?.text_en || "";
    }

    return draft?.payload?.text_en || draft?.payload?.text_ar || "";
  }

  loadState();

  return {
    CONFIG,

    buildPublicationFromReport,
    buildStructuredPost,
    buildBlackPostFromSystem,

    createDraft,
    saveDraft,
    createDraftFromPublication,
    createDraftFromLatestReport,
    createBlackDraftFromSystem,

    generateTopSignalPost,
    generateStrategicBrief,
    generateFeaturedPublicationPost,
    generateLivingPresencePost,

    orchestrateSystem,
    getUnifiedFeed,
    getLatestFeaturedPublication,

    getLatestDraft,
    getDrafts,
    getDraftText,
    clearDrafts
  };
})();
