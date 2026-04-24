// IBSS VIRAL ENGINE — Strategic Social Draft Generator
// Version: v2.0 Stable Publisher-Compatible

window.IBSS_VIRAL = (function () {
  "use strict";

  const CONFIG = {
    version: "v2.0-stable-publisher-compatible",
    defaultLang: "en",
    maxBodyLength: 900
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

  function clampText(text, maxLength = CONFIG.maxBodyLength) {
    const value = safeText(text, "");
    if (value.length <= maxLength) return value;
    return value.slice(0, maxLength - 3).trim() + "...";
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

  function getScore(signal) {
    return safeNumber(
      signal?.balancedScore100 ??
      signal?.score100 ??
      signal?.riskScore ??
      signal?.score,
      0
    );
  }

  function getTopSignal(system) {
    return (
      system?.topSignal ||
      system?.dominantSignal ||
      asArray(system?.rankedSignals)[0] ||
      null
    );
  }

  function getTopDriver(system, lang = "en") {
    const driver = asArray(system?.drivers)[0];
    if (!driver) return lang === "ar" ? "لا يوجد محرّك محدد" : "No dominant driver";
    return getLocalizedText(driver.label, lang);
  }

  function getTopPublication(system) {
    return (
      system?.featuredPublication ||
      system?.publicationContext?.featuredPublication ||
      system?.snapshot?.latestStudy ||
      null
    );
  }

  function buildEnglish(system) {
    const signal = getTopSignal(system);
    const publication = getTopPublication(system);

    const title = signal
      ? getLocalizedText(signal.title, "en")
      : "No dominant signal detected";

    const description = signal
      ? getLocalizedText(signal.description || signal.summary, "en")
      : "The system remains in monitoring mode with no dominant signal currently forcing escalation.";

    const priority = normalizePriority(signal?.priority || system?.level || "LOW");
    const score = getScore(signal);
    const pressure = safeNumber(system?.systemPressure ?? system?.ssi, 0);
    const confidence = safeNumber(system?.confidenceScore, 0);
    const mode = safeText(system?.mode || system?.decision, "MONITORING");
    const driver = getTopDriver(system, "en");

    const publicationLine = publication
      ? `\nLinked publication: ${getLocalizedText(publication.title, "en")}`
      : "";

    return clampText(
`IBSS Strategic Signal

${priority} SIGNAL — ${title}

Signal Score: ${score}
System Pressure: ${pressure}
Confidence: ${confidence}
Decision Mode: ${mode}

Primary Driver:
${driver}

Reading:
${description}${publicationLine}

This is not treated as an isolated headline. It is read as part of a structured pressure environment where signals, theater movement, and institutional context are being interpreted together.

#IBSS #StrategicIntelligence #SovereignStudies`
    );
  }

  function buildArabic(system) {
    const signal = getTopSignal(system);
    const publication = getTopPublication(system);

    const title = signal
      ? getLocalizedText(signal.title, "ar")
      : "لا توجد إشارة مهيمنة";

    const description = signal
      ? getLocalizedText(signal.description || signal.summary, "ar")
      : "يبقى النظام في وضع المراقبة دون وجود إشارة مهيمنة تفرض تصعيدًا مباشرًا.";

    const priority = normalizePriority(signal?.priority || system?.level || "LOW");
    const score = getScore(signal);
    const pressure = safeNumber(system?.systemPressure ?? system?.ssi, 0);
    const confidence = safeNumber(system?.confidenceScore, 0);
    const mode = safeText(system?.mode || system?.decision, "MONITORING");
    const driver = getTopDriver(system, "ar");

    const publicationLine = publication
      ? `\nالمنشور المرتبط: ${getLocalizedText(publication.title, "ar")}`
      : "";

    return clampText(
`IBSS — إشارة استراتيجية

${priority} SIGNAL — ${title}

درجة الإشارة: ${score}
ضغط النظام: ${pressure}
الثقة: ${confidence}
وضع القرار: ${mode}

المحرّك الأساسي:
${driver}

القراءة:
${description}${publicationLine}

لا تُقرأ هذه الإشارة كعنوان منفصل، بل كجزء من بيئة ضغط بنيوية يتم فيها ربط الإشارات بحركة المسرح والسياق المؤسسي.

#IBSS #StrategicIntelligence #SovereignStudies`
    );
  }

  function generate(system, lang = CONFIG.defaultLang) {
    const signal = getTopSignal(system);
    const publication = getTopPublication(system);

    const text_en = buildEnglish(system || {});
    const text_ar = buildArabic(system || {});

    return {
      type: "viral_signal",
      createdAt: new Date().toISOString(),
      status: "draft",
      payload: {
        text_en,
        text_ar,
        sourceId: safeText(signal?.id, ""),
        signal: signal ? {
          id: safeText(signal.id, ""),
          title: {
            en: getLocalizedText(signal.title, "en"),
            ar: getLocalizedText(signal.title, "ar")
          },
          priority: normalizePriority(signal.priority || system?.level || "LOW"),
          score: getScore(signal)
        } : null,
        publication: publication ? {
          id: safeText(publication.id, ""),
          title: {
            en: getLocalizedText(publication.title, "en"),
            ar: getLocalizedText(publication.title, "ar")
          },
          type: safeText(publication.type, ""),
          unit: safeText(publication.unit, "")
        } : null,
        meta: {
          lang,
          systemPressure: safeNumber(system?.systemPressure ?? system?.ssi, 0),
          confidenceScore: safeNumber(system?.confidenceScore, 0),
          mode: safeText(system?.mode || system?.decision, "MONITORING"),
          generatedBy: "IBSS_VIRAL"
        }
      }
    };
  }

  function generateText(system, lang = CONFIG.defaultLang) {
    return lang === "ar" ? buildArabic(system || {}) : buildEnglish(system || {});
  }

  return {
    CONFIG,
    generate,
    generateText,
    buildEnglish,
    buildArabic
  };
})();
