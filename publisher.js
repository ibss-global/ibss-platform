// IBSS PUBLISHER — Doctrine Output & Draft Layer
// Version: v1.1-clean-operational-publisher-layer

window.IBSS_PUBLISHER = (function () {
  "use strict";

  const CONFIG = {
    version: "v1.1-clean-operational-publisher-layer",
    storageKey: "ibss_publisher_v11",
    maxDrafts: 80,
    maxFeedItems: 14,
    defaultSignature: "— IBSS / Σ-9X"
  };

  const STATE = {
    drafts: [],
    lastUnifiedFeed: []
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

  function buildId(prefix = "DRAFT") {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(CONFIG.storageKey);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;

      STATE.drafts = asArray(parsed.drafts);
      STATE.lastUnifiedFeed = asArray(parsed.lastUnifiedFeed);
    } catch (error) {
      console.error("IBSS_PUBLISHER loadState error:", error);
    }
  }

  function saveState() {
    try {
      localStorage.setItem(CONFIG.storageKey, JSON.stringify({
        drafts: STATE.drafts,
        lastUnifiedFeed: STATE.lastUnifiedFeed
      }));
    } catch (error) {
      console.error("IBSS_PUBLISHER saveState error:", error);
    }
  }

  function getSystem(options = {}) {
    if (options.system) return options.system;

    try {
      return (
        window.IBSS_ENGINE?.getLastSystemState?.() ||
        window.IBSS_ENGINE?.getSystemState?.() ||
        window.IBSS_ENGINE?.getStaticSystemFallback?.() ||
        null
      );
    } catch (error) {
      console.error("IBSS_PUBLISHER getSystem error:", error);
      return null;
    }
  }

  function createDraft(input = {}) {
    const draft = {
      id: input.id || buildId("DRAFT"),
      createdAt: input.createdAt || nowIso(),
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

  function saveDraft(input = {}) {
    if (!input) return null;

    if (input.payload) {
      return createDraft({
        type: input.type || "facebook_post",
        source: input.source || "external",
        publicationId: input.publicationId || null,
        text_ar: input.payload.text_ar || input.text_ar || "",
        text_en: input.payload.text_en || input.text_en || "",
        publication: input.payload.publication || input.publication || null,
        system: input.payload.system || input.system || null,
        meta: input.payload.meta || input.meta || {}
      });
    }

    return createDraft(input);
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

  function buildTopSignalPost(system, lang = "ar") {
    const signature = CONFIG.defaultSignature;
    const signal = system?.topSignal || system?.dominantSignal || asArray(system?.rankedSignals)[0] || null;

    const title = getLocalizedText(signal?.title, lang) || (lang === "ar" ? "إشارة غير محددة" : "Undefined Signal");
    const desc = getLocalizedText(signal?.description || signal?.summary, lang);
    const pressure = safeNumber(system?.systemPressure || system?.ssi, 0);
    const score = safeNumber(signal?.balancedScore100 || signal?.score100, 0);
    const decision = safeText(system?.decision || system?.mode, "-");

    if (lang === "ar") {
      return cleanLines([
        "قراءة سيادية — الإشارة الأعلى",
        "",
        title,
        "",
        desc,
        "",
        `درجة الإشارة: ${score}`,
        `ضغط النظام: ${pressure}`,
        `وضع القرار: ${decision}`,
        "",
        "هذه الإشارة لا تُقرأ كخبر منفصل، بل كمؤشر داخل بنية ضغط أوسع.",
        "",
        signature
      ]);
    }

    return cleanLines([
      "Sovereign Reading — Top Signal",
      "",
      title,
      "",
      desc,
      "",
      `Signal Score: ${score}`,
      `System Pressure: ${pressure}`,
      `Decision Mode: ${decision}`,
      "",
      "This signal is not read as an isolated item, but as an indicator within a wider pressure architecture.",
      "",
      signature
    ]);
  }

  function buildStrategicBriefPost(system, lang = "ar") {
    const signature = CONFIG.defaultSignature;

    const topTheater = getLocalizedText(system?.topTheater?.name, lang) || (lang === "ar" ? "المسرح النشط" : "Active Theater");
    const topCluster = getLocalizedText(system?.topCluster?.name, lang) || (lang === "ar" ? "الملف الاستراتيجي النشط" : "Active Strategic File");
    const topSignal = getLocalizedText(system?.topSignal?.title || system?.dominantSignal?.title, lang) || "-";

    const pressure = safeNumber(system?.systemPressure || system?.ssi, 0);
    const confidence = safeNumber(system?.confidenceScore, 0);
    const level = safeText(system?.level, "-");
    const decision = safeText(system?.decision || system?.mode, "-");

    const drivers = asArray(system?.drivers)
      .slice(0, 3)
      .map(item => getLocalizedText(item?.label, lang))
      .filter(Boolean)
      .join(lang === "ar" ? "، " : ", ");

    if (lang === "ar") {
      return cleanLines([
        "موجز استراتيجي سيادي",
        "",
        `المسرح الأعلى: ${topTheater}`,
        `الملف الأعلى: ${topCluster}`,
        `الإشارة الأعلى: ${topSignal}`,
        "",
        `ضغط النظام: ${pressure}`,
        `الثقة: ${confidence}`,
        `المستوى: ${level}`,
        `القرار: ${decision}`,
        "",
        `المحرّكات الأساسية: ${drivers || "غير محدد"}`,
        "",
        "التقدير:",
        "النظام يقرأ ضغطًا مركبًا لا يتحرك من إشارة واحدة فقط، بل من تقاطع الإشارة مع الملف والمسرح والمحرّكات.",
        "",
        signature
      ]);
    }

    return cleanLines([
      "Sovereign Strategic Brief",
      "",
      `Top Theater: ${topTheater}`,
      `Top File: ${topCluster}`,
      `Top Signal: ${topSignal}`,
      "",
      `System Pressure: ${pressure}`,
      `Confidence: ${confidence}`,
      `Level: ${level}`,
      `Decision: ${decision}`,
      "",
      `Primary Drivers: ${drivers || "undefined"}`,
      "",
      "Estimate:",
      "The system reads composite pressure, not a single isolated signal. The movement emerges from the intersection of signal, file, theater, and drivers.",
      "",
      signature
    ]);
  }

  function buildFeaturedPublicationPost(system, lang = "ar") {
    const signature = CONFIG.defaultSignature;
    const publication =
      system?.featuredPublication ||
      system?.snapshot?.latestStudy ||
      window.IBSS_PUBLICATIONS?.getLatest?.() ||
      null;

    if (!publication) {
      return lang === "ar"
        ? cleanLines(["منشور مميز", "", "لا توجد ورقة منشورة متاحة حاليًا.", "", signature])
        : cleanLines(["Featured Publication", "", "No featured publication is currently available.", "", signature]);
    }

    const title = getLocalizedText(publication.title, lang);
    const summary = getLocalizedText(publication.summary, lang);
    const type = safeText(publication.type || publication.classification, "publication");
    const domain = safeText(publication.domain, "-");

    if (lang === "ar") {
      return cleanLines([
        "منشور مؤسسي مميز",
        "",
        title,
        "",
        summary,
        "",
        `التصنيف: ${type}`,
        `المجال: ${domain}`,
        "",
        "هذه الورقة لا تُقرأ كمنشور منفصل، بل كمرجع داخل مسار التحليل السيادي الحي.",
        "",
        signature
      ]);
    }

    return cleanLines([
      "Featured Institutional Publication",
      "",
      title,
      "",
      summary,
      "",
      `Classification: ${type}`,
      `Domain: ${domain}`,
      "",
      "This paper is not read as a standalone publication, but as a reference within the living sovereign analysis track.",
      "",
      signature
    ]);
  }

  function buildLivingPresencePost(system, lang = "ar") {
    const signature = CONFIG.defaultSignature;
    const voice = system?.voice || {};
    const presence = system?.presence || {};

    const posture = getLocalizedText(voice.posture, lang) || "-";
    const summary = getLocalizedText(voice.summary, lang) || "-";
    const explanation = getLocalizedText(voice.explanation, lang) || "-";
    const advisory = getLocalizedText(voice.advisory, lang) || "-";

    const pressure = safeNumber(system?.systemPressure || system?.ssi, 0);
    const urgency = safeText(presence.urgency, "-");
    const drift = safeText(presence.drift, "-");

    if (lang === "ar") {
      return cleanLines([
        "الحضور الحي للنظام",
        "",
        posture,
        "",
        summary,
        "",
        explanation,
        "",
        `ضغط النظام: ${pressure}`,
        `الاستعجال: ${urgency}`,
        `الانجراف: ${drift}`,
        "",
        `التوجيه: ${advisory}`,
        "",
        signature
      ]);
    }

    return cleanLines([
      "Living System Presence",
      "",
      posture,
      "",
      summary,
      "",
      explanation,
      "",
      `System Pressure: ${pressure}`,
      `Urgency: ${urgency}`,
      `Drift: ${drift}`,
      "",
      `Advisory: ${advisory}`,
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

  function createBlackDraftFromSystem(options = {}) {
    const system = getSystem(options);

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

  function generateTopSignalPost(options = {}) {
    const system = getSystem(options);
    if (!system) return null;

    return createDraft({
      type: "signal_post",
      source: "publisher",
      text_ar: buildTopSignalPost(system, "ar"),
      text_en: buildTopSignalPost(system, "en"),
      system,
      meta: {
        mode: "top_signal_post"
      }
    });
  }

  function generateStrategicBrief(options = {}) {
    const system = getSystem(options);
    if (!system) return null;

    return createDraft({
      type: "strategic_brief",
      source: "publisher",
      text_ar: buildStrategicBriefPost(system, "ar"),
      text_en: buildStrategicBriefPost(system, "en"),
      system,
      meta: {
        mode: "strategic_brief"
      }
    });
  }

  function generateFeaturedPublicationPost(options = {}) {
    const system = getSystem(options);

    return createDraft({
      type: "publication_post",
      source: "publisher",
      text_ar: buildFeaturedPublicationPost(system, "ar"),
      text_en: buildFeaturedPublicationPost(system, "en"),
      publication: system?.featuredPublication || system?.snapshot?.latestStudy || null,
      system,
      meta: {
        mode: "featured_publication_post"
      }
    });
  }

  function generateLivingPresencePost(options = {}) {
    const system = getSystem(options);
    if (!system) return null;

    return createDraft({
      type: "living_presence_post",
      source: "publisher",
      text_ar: buildLivingPresencePost(system, "ar"),
      text_en: buildLivingPresencePost(system, "en"),
      system,
      meta: {
        mode: "living_presence_post"
      }
    });
  }

  function buildFeedItem(type, priority, text_ar, text_en, source = "PUBLISHER") {
    return {
      id: buildId("FEED"),
      type,
      priority: safeText(priority, "LOW"),
      source,
      text: {
        ar: safeText(text_ar, "-"),
        en: safeText(text_en, "-")
      },
      createdAt: nowIso()
    };
  }

  function buildUnifiedFeed(system) {
    const baseFeed = asArray(system?.feed);
    const drivers = asArray(system?.drivers);
    const feed = [];

    baseFeed.forEach(item => feed.push(item));

    if (system?.voice?.summary) {
      feed.push(buildFeedItem(
        "living_voice",
        system.level,
        getLocalizedText(system.voice.summary, "ar"),
        getLocalizedText(system.voice.summary, "en"),
        "PUBLISHER"
      ));
    }

    drivers.slice(0, 3).forEach(driver => {
      feed.push(buildFeedItem(
        "driver",
        driver.priority,
        getLocalizedText(driver.label, "ar"),
        getLocalizedText(driver.label, "en"),
        "PUBLISHER"
      ));
    });

    const deduped = [];
    const seen = new Set();

    feed.forEach(item => {
      const key = `${item.type}|${getLocalizedText(item.text, "en")}`;
      if (seen.has(key)) return;
      seen.add(key);
      deduped.push(item);
    });

    STATE.lastUnifiedFeed = deduped.slice(0, CONFIG.maxFeedItems);
    saveState();

    return clone(STATE.lastUnifiedFeed);
  }

  function orchestrateSystem(system) {
    if (!system) return null;

    const unifiedFeed = buildUnifiedFeed(system);

    const publisherDigest = {
      source: "orchestrated",
      updatedAt: nowIso(),
      feedItems: unifiedFeed.length,
      latestDraftId: STATE.drafts[0]?.id || null,
      latestDraftType: STATE.drafts[0]?.type || null
    };

    return {
      ...system,
      source: "orchestrated",
      publisherDigest,
      unifiedFeed,
      publisherFeed: unifiedFeed,
      publicationContext: {
        featuredPublication: system.featuredPublication || system.snapshot?.latestStudy || null,
        topSignalContent: null,
        topClusterContent: null,
        topCountryContent: null
      }
    };
  }

  function getUnifiedFeed() {
    return clone(STATE.lastUnifiedFeed) || [];
  }

  function getLatestFeaturedPublication() {
    return (
      window.IBSS_PUBLICATIONS?.getLatest?.() ||
      null
    );
  }

  function getLatestDraft() {
    return clone(STATE.drafts[0] || null);
  }

  function getDrafts() {
    return clone(STATE.drafts) || [];
  }

  function getDraftText(draft = getLatestDraft(), lang = "ar") {
    if (!draft) return "";

    if (lang === "ar") {
      return draft?.payload?.text_ar || draft?.payload?.text_en || "";
    }

    return draft?.payload?.text_en || draft?.payload?.text_ar || "";
  }

  function clearDrafts() {
    STATE.drafts = [];
    saveState();
    return true;
  }

  loadState();

  return {
    CONFIG,

    buildPublicationFromReport,
    buildStructuredPost,
    buildBlackPostFromSystem,

    buildTopSignalPost,
    buildStrategicBriefPost,
    buildFeaturedPublicationPost,
    buildLivingPresencePost,

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
    buildUnifiedFeed,
    getUnifiedFeed,
    getLatestFeaturedPublication,

    getLatestDraft,
    getDrafts,
    getDraftText,
    clearDrafts
  };
})();
