// IBSS ANALYSIS ENGINE — Stable Analytical Support Layer
// Version: v2.0

window.IBSS_ANALYSIS = (function () {
  "use strict";

  const CONFIG = {
    version: "v2.0-stable-analytical-support-layer",
    maxDrivers: 5,
    maxFindings: 6
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

  function clamp(value, min = 0, max = 100) {
    return Math.max(min, Math.min(max, value));
  }

  function normalizeText(value) {
    return safeText(String(value || ""))
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
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

  function riskBand(score, lang = "en") {
    if (window.IBSS_METRICS?.classifyBand) {
      const band = window.IBSS_METRICS.classifyBand(score);
      return lang === "ar" ? band.ar : band.en;
    }

    const value = safeNumber(score, 0);
    if (value >= 85) return lang === "ar" ? "حرج" : "Critical";
    if (value >= 70) return lang === "ar" ? "مرتفع" : "High";
    if (value >= 55) return lang === "ar" ? "ضغط" : "Pressure";
    if (value >= 35) return lang === "ar" ? "مراقبة" : "Watch";
    return lang === "ar" ? "منخفض" : "Low";
  }

  function extractKeywords(text, limit = 8) {
    const value = normalizeText(text);

    if (!value) return [];

    const stopWords = new Set([
      "the", "and", "or", "of", "to", "in", "on", "for", "with", "from", "as", "is", "are", "be", "by",
      "a", "an", "this", "that", "it", "its", "into", "under", "over", "within", "across",
      "في", "من", "إلى", "على", "عن", "مع", "هذا", "هذه", "ذلك", "تلك", "هو", "هي", "أن", "إن", "ما"
    ]);

    const words = value
      .replace(/[^\p{L}\p{N}\s-]/gu, " ")
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));

    const counts = new Map();

    words.forEach(word => {
      counts.set(word, (counts.get(word) || 0) + 1);
    });

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, Math.max(1, safeNumber(limit, 8)))
      .map(([word]) => word);
  }

  function analyzeSignal(signal, lang = "en") {
    const title = getLocalizedText(signal?.title, lang);
    const description = getLocalizedText(signal?.description || signal?.summary, lang);
    const score = clamp(safeNumber(signal?.balancedScore100 ?? signal?.score100 ?? signal?.riskScore, 0), 0, 100);
    const priority = normalizePriority(signal?.priority);
    const domain = safeText(signal?.domain, "general");
    const region = safeText(signal?.region || signal?.country, "global");

    const finding =
      lang === "ar"
        ? `الإشارة "${title}" تقع ضمن حزمة ${riskBand(score, "ar")} بدرجة ${score}.`
        : `The signal "${title}" sits inside the ${riskBand(score, "en")} band at score ${score}.`;

    return {
      id: safeText(signal?.id, ""),
      title,
      description,
      score,
      priority,
      domain,
      region,
      band: riskBand(score, lang),
      keywords: extractKeywords(`${title} ${description}`, 8),
      finding
    };
  }

  function analyzeCluster(cluster, lang = "en") {
    const name = getLocalizedText(cluster?.name, lang);
    const score = clamp(safeNumber(cluster?.avgRisk ?? cluster?.maxRisk, 0), 0, 100);
    const signalCount = asArray(cluster?.signals).length || safeNumber(cluster?.signalCount, 0);

    return {
      id: safeText(cluster?.id, ""),
      key: safeText(cluster?.key, ""),
      name,
      score,
      signalCount,
      band: riskBand(score, lang),
      priority: safeText(cluster?.priority, "WATCH"),
      finding: lang === "ar"
        ? `الملف "${name}" يجمع ${signalCount} إشارات ضمن حزمة ${riskBand(score, "ar")}.`
        : `The file "${name}" concentrates ${signalCount} signals inside the ${riskBand(score, "en")} band.`
    };
  }

  function analyzeTheater(theater, lang = "en") {
    const name = getLocalizedText(theater?.name, lang);
    const score = clamp(safeNumber(theater?.avgRisk ?? theater?.maxRisk, 0), 0, 100);
    const clusterCount = asArray(theater?.clusters).length || safeNumber(theater?.clusterCount, 0);

    return {
      id: safeText(theater?.id, ""),
      name,
      score,
      clusterCount,
      band: riskBand(score, lang),
      priority: safeText(theater?.priority, "WATCH"),
      finding: lang === "ar"
        ? `المسرح "${name}" يحتوي ${clusterCount} ملفات استراتيجية ويقع ضمن حزمة ${riskBand(score, "ar")}.`
        : `The theater "${name}" contains ${clusterCount} strategic files and sits inside the ${riskBand(score, "en")} band.`
    };
  }

  function analyzeSystem(system, lang = "en") {
    const pressure = clamp(safeNumber(system?.systemPressure ?? system?.ssi, 0), 0, 100);
    const confidence = clamp(safeNumber(system?.confidenceScore, 0), 0, 100);

    const topSignal = system?.topSignal || system?.dominantSignal || asArray(system?.rankedSignals)[0] || null;
    const topCluster = system?.topCluster || asArray(system?.clusters)[0] || null;
    const topTheater = system?.topTheater || asArray(system?.theaters)[0] || null;
    const topCountry = system?.topCountry || asArray(system?.countryRiskFeed)[0] || null;

    const findings = [];

    findings.push(
      lang === "ar"
        ? `ضغط النظام الحالي ${pressure} ضمن حزمة ${riskBand(pressure, "ar")} مع ثقة ${confidence}.`
        : `Current system pressure is ${pressure}, inside the ${riskBand(pressure, "en")} band, with confidence ${confidence}.`
    );

    if (topSignal) {
      findings.push(analyzeSignal(topSignal, lang).finding);
    }

    if (topCluster) {
      findings.push(analyzeCluster(topCluster, lang).finding);
    }

    if (topTheater) {
      findings.push(analyzeTheater(topTheater, lang).finding);
    }

    if (topCountry) {
      const countryName = getLocalizedText(topCountry.nameLocalized || topCountry.name, lang);
      const countryScore = safeNumber(topCountry.riskScore, 0);

      findings.push(
        lang === "ar"
          ? `أعلى خطر دولي ظاهر هو ${countryName} بدرجة ${countryScore}.`
          : `The highest visible country risk is ${countryName} at score ${countryScore}.`
      );
    }

    const drivers = asArray(system?.drivers)
      .slice(0, CONFIG.maxDrivers)
      .map(driver => ({
        id: safeText(driver?.id, ""),
        type: safeText(driver?.type, "driver"),
        priority: normalizePriority(driver?.priority),
        score: safeNumber(driver?.score, 0),
        label: getLocalizedText(driver?.label, lang),
        explanation: getLocalizedText(driver?.explanation, lang)
      }));

    const recommendation =
      pressure >= 78
        ? lang === "ar"
          ? "يوصى برفع الجاهزية وربط الإشارات المسيطرة بسياق المنشورات والتحليل المؤسسي."
          : "Raise readiness and link dominant signals with publication context and institutional analysis."
        : pressure >= 55
          ? lang === "ar"
            ? "يوصى بتشديد المراقبة وتحسين الربط بين الملفات والمسرح الأعلى."
            : "Tighten monitoring and improve linkage between files and the top theater."
          : lang === "ar"
            ? "يوصى باستمرار المراقبة دون افتراض تصعيد مبكر."
            : "Continue monitoring without assuming premature escalation.";

    return {
      updatedAt: system?.updatedAt || new Date().toISOString(),
      pressure,
      confidence,
      level: safeText(system?.level, "LOW"),
      decision: safeText(system?.decision, "WATCH"),
      mode: safeText(system?.mode, "MONITORING"),
      band: riskBand(pressure, lang),
      topSignal: topSignal ? analyzeSignal(topSignal, lang) : null,
      topCluster: topCluster ? analyzeCluster(topCluster, lang) : null,
      topTheater: topTheater ? analyzeTheater(topTheater, lang) : null,
      drivers,
      findings: findings.slice(0, CONFIG.maxFindings),
      recommendation
    };
  }

  function buildBrief(system, lang = "en") {
    const analysis = analyzeSystem(system || {}, lang);

    if (lang === "ar") {
      return {
        title: "موجز تحليلي — IBSS",
        summary: `ضغط النظام ${analysis.pressure}، المستوى ${analysis.level}، وضع القرار ${analysis.mode}.`,
        findings: analysis.findings,
        recommendation: analysis.recommendation
      };
    }

    return {
      title: "Analytical Brief — IBSS",
      summary: `System pressure ${analysis.pressure}, level ${analysis.level}, decision mode ${analysis.mode}.`,
      findings: analysis.findings,
      recommendation: analysis.recommendation
    };
  }

  function getCurrentAnalysis(lang = "en") {
    const system =
      window.IBSS_RUNTIME?.getLastSystem?.() ||
      window.IBSS_ENGINE?.getLastSystemState?.() ||
      window.IBSS_ENGINE?.getSystemState?.() ||
      null;

    return analyzeSystem(system || {}, lang);
  }

  return {
    CONFIG,
    extractKeywords,
    riskBand,
    analyzeSignal,
    analyzeCluster,
    analyzeTheater,
    analyzeSystem,
    buildBrief,
    getCurrentAnalysis
  };
})();
