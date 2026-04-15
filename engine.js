window.IBSS_ENGINE = (function () {
  "use strict";

  const CONFIG = {
    refreshMs: 4000,
    historyLimit: 150,
    reportLimit: 60,
    archiveLimit: 100,
    storageKey: "ibss_engine_state_v4"
  };

  const STATE = {
    history: [],
    reports: [],
    archive: [],
    lastSystem: null
  };

  function safeNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function getLocalizedText(value, lang = "en") {
    if (!value) return "-";
    if (typeof value === "string") return value;
    return value[lang] || value.en || value.ar || "-";
  }

  function normalizeText(value) {
    return String(value || "").trim().toLowerCase();
  }

  function getSignals() {
    return asArray(window.IBSS_SIGNALS);
  }

  function getContent() {
    return asArray(window.IBSS_CONTENT);
  }

  function getCountries() {
    return asArray(window.IBSS_COUNTRIES);
  }

  function getLatestNews(limit = 6) {
    return window.IBSS_NEWS_UTILS?.getLatestNews?.(limit) || [];
  }

  function getTickerNews(limit = 8) {
    return window.IBSS_NEWS_UTILS?.getTickerNews?.(limit) || [];
  }

  function autoRefreshNews() {
    if (window.IBSS_NEWS_UTILS?.autoRefreshIfNeeded) {
      return window.IBSS_NEWS_UTILS.autoRefreshIfNeeded();
    }
    return [];
  }

  function getPublishedContent() {
    return getContent().filter(item => item && item.status === "published");
  }

  function getContentStats() {
    const content = getContent();

    return {
      total: content.length,
      published: content.filter(item => item && item.status === "published").length,
      pending: content.filter(item => item && item.status === "pending").length,
      reports: content.filter(item => item && item.type === "report").length,
      studies: content.filter(item => item && item.type === "study").length,
      briefs: content.filter(item => item && item.type === "brief").length,
      news: content.filter(item => item && item.type === "news").length,
      policyPapers: content.filter(item => item && item.type === "policy_paper").length,
      analyses: content.filter(item => item && item.type === "analysis").length
    };
  }

  function detectPriority(signal) {
    if (signal?.priority) return signal.priority;
    if (signal?.reportMeta?.priority) return signal.reportMeta.priority;
    if (signal?.weight) return signal.weight;
    return "LOW";
  }

  function scoreSignalBase(signal) {
    const metrics = signal?.metrics || {};
    const weight = safeNumber(metrics.weight, 0);
    const volatility = safeNumber(metrics.volatility, 0);
    const impact = safeNumber(metrics.impact, 0);

    let priorityBoost = 0;
    const priority = detectPriority(signal);

    if (priority === "HIGH") priorityBoost = 0.08;
    else if (priority === "MEDIUM") priorityBoost = 0.04;

    return clamp(
      (weight * 0.5) +
      (volatility * 0.25) +
      (impact * 0.25) +
      priorityBoost,
      0,
      1
    );
  }

  function scoreSignal100(signal) {
    return Math.round(scoreSignalBase(signal) * 100);
  }

  function detectTrend(current, previous) {
    if (previous == null) return "STABLE";
    if (current > previous + 2) return "RISING";
    if (current < previous - 2) return "FALLING";
    return "STABLE";
  }

  function riskLevelFromScore(score) {
    if (score >= 75) return "HIGH";
    if (score >= 50) return "MEDIUM";
    return "LOW";
  }

  function decisionFromLevel(level) {
    if (level === "HIGH") {
      return {
        decision: "ACT",
        mode: "ACTIVE RESPONSE"
      };
    }

    if (level === "MEDIUM") {
      return {
        decision: "PRD",
        mode: "PREPARATION"
      };
    }

    return {
      decision: "WATCH",
      mode: "MONITORING"
    };
  }

  function scoreNewsSeverity(item) {
    const sev = normalizeText(item?.severity || item?.priority);
    if (sev === "high") return 8;
    if (sev === "medium") return 4;
    return 1;
  }

  function buildNewsPressure(latestNews) {
    const activeNews = asArray(latestNews);
    if (!activeNews.length) {
      return {
        score: 0,
        count: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0
      };
    }

    let score = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;

    activeNews.forEach(item => {
      const sev = normalizeText(item?.severity || item?.priority);
      if (sev === "high") highCount += 1;
      else if (sev === "medium") mediumCount += 1;
      else lowCount += 1;

      score += scoreNewsSeverity(item);
    });

    return {
      score: clamp(score, 0, 20),
      count: activeNews.length,
      highCount,
      mediumCount,
      lowCount
    };
  }

  function buildRankedSignals() {
    return getSignals()
      .map(signal => {
        const score = scoreSignalBase(signal);
        const score100 = Math.round(score * 100);
        const priority = detectPriority(signal);

        return {
          ...signal,
          priority,
          score,
          score100,
          balancedScore100: score100,
          live: !!(signal.live || signal.active)
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  function buildPressure(rankedSignals, newsPressure) {
    const topSignal = rankedSignals[0] || null;
    const average = rankedSignals.length
      ? rankedSignals.reduce((sum, signal) => sum + signal.score, 0) / rankedSignals.length
      : 0;

    const activeSignals = rankedSignals.filter(signal => signal.live).length;

    let pressure = Math.round(
      Math.min(
        (average * 55) +
        ((topSignal?.score || 0) * 25) +
        Math.min(activeSignals, 10),
        100
      )
    );

    if (topSignal?.priority === "HIGH") pressure += 8;
    else if (topSignal?.priority === "MEDIUM") pressure += 4;

    pressure += safeNumber(newsPressure?.score, 0);

    return clamp(pressure, 0, 100);
  }

  function buildScenarios(level, newsPressure) {
    const highNews = safeNumber(newsPressure?.highCount, 0);

    if (level === "HIGH") {
      return [
        { key: "A", value: clamp(58 + highNews, 0, 100) },
        { key: "B", value: clamp(27 - Math.min(highNews, 4), 0, 100) },
        { key: "C", value: clamp(15 - Math.min(highNews, 2), 0, 100) }
      ];
    }

    if (level === "MEDIUM") {
      return [
        { key: "A", value: clamp(38 + Math.min(highNews, 3), 0, 100) },
        { key: "B", value: 37 },
        { key: "C", value: clamp(25 - Math.min(highNews, 3), 0, 100) }
      ];
    }

    return [
      { key: "A", value: 22 },
      { key: "B", value: 33 },
      { key: "C", value: 45 }
    ];
  }

  function findPreviousCountryRisk(name) {
    for (let i = STATE.history.length - 1; i >= 0; i -= 1) {
      const row = STATE.history[i];
      const found = row.countryRiskFeed?.find(item => item.name === name);
      if (found) return found.riskScore;
    }
    return null;
  }

  function buildCountryRiskFeed(rankedSignals) {
    const countries = getCountries();

    if (countries.length) {
      return [...countries]
        .sort((a, b) => safeNumber(b.riskScore) - safeNumber(a.riskScore))
        .slice(0, 5)
        .map(country => ({
          id: country.id,
          name: getLocalizedText(country.name, "en"),
          riskScore: safeNumber(country.riskScore),
          riskLevel: country.riskLevel || riskLevelFromScore(safeNumber(country.riskScore)),
          trend: country.trend || "STABLE",
          primaryDrivers: asArray(country.primaryDrivers?.en || [])
        }));
    }

    return rankedSignals.slice(0, 5).map(signal => {
      const name = getLocalizedText(signal.title, "en");
      const riskScore = signal.balancedScore100;
      const previous = findPreviousCountryRisk(name);
      const trend = detectTrend(riskScore, previous);

      return {
        id: signal.id || name.toLowerCase().replace(/\s+/g, "-"),
        name,
        riskScore,
        riskLevel: riskLevelFromScore(riskScore),
        trend,
        primaryDrivers: [
          getLocalizedText(signal.title, "en"),
          getLocalizedText(signal.signalType, "en"),
          getLocalizedText(signal.decisionMode, "en")
        ]
      };
    });
  }

  function buildNewsFeedLines(latestNews) {
    return asArray(latestNews).slice(0, 4).map(item => {
      const title = getLocalizedText(item.title, "en");
      const source = item?.source || "Source";
      return `News: ${title} | ${source}`;
    });
  }

  function buildFeed(system) {
    const lines = [
      `Pressure index updated to ${system.systemPressure}`,
      `System level: ${system.level}`,
      `Decision mode: ${system.mode}`
    ];

    if (system.topSignal) {
      lines.push(`Top signal: ${getLocalizedText(system.topSignal.title, "en")}`);
    }

    if (system.countryRiskFeed.length) {
      lines.push(`CRU synchronized with ${system.countryRiskFeed.length} country entries`);
    }

    if (system.contentStats?.published > 0) {
      lines.push(`Published content items: ${system.contentStats.published}`);
    }

    if (system.newsPressure?.count > 0) {
      lines.push(
        `Live news intake: ${system.newsPressure.count} items | HIGH ${system.newsPressure.highCount} | MEDIUM ${system.newsPressure.mediumCount}`
      );
    }

    buildNewsFeedLines(system.latestNews).forEach(line => lines.push(line));

    if (system.level === "HIGH") {
      lines.push("High escalation threshold exceeded");
    } else if (system.level === "MEDIUM") {
      lines.push("Structured pressure remains above preparation threshold");
    } else {
      lines.push("Low pressure monitoring remains stable");
    }

    return lines;
  }

  function buildReportTitle(system, lang = "en") {
    const topName = system.topSignal
      ? getLocalizedText(system.topSignal.title, lang)
      : (lang === "ar" ? "لا توجد إشارة" : "No Signal");

    return lang === "ar"
      ? `تقرير تلقائي — ${topName}`
      : `Auto Report — ${topName}`;
  }

  function buildReportBody(system, lang = "en") {
    const topName = system.topSignal
      ? getLocalizedText(system.topSignal.title, lang)
      : (lang === "ar" ? "غير محدد" : "Undefined");

    const topDesc = system.topSignal
      ? getLocalizedText(system.topSignal.description, lang)
      : (lang === "ar" ? "لا يوجد وصف." : "No description.");

    const level = lang === "ar"
      ? (system.level === "HIGH" ? "مرتفع" : system.level === "MEDIUM" ? "متوسط" : "منخفض")
      : system.level;

    const decision = lang === "ar"
      ? (system.decision === "ACT" ? "تحرك" : system.decision === "PRD" ? "استعداد" : "مراقبة")
      : system.decision;

    const newsLine = lang === "ar"
      ? `رُصدت ${system.newsPressure?.count || 0} مادة خبرية حية ضمن الدورة الحالية.`
      : `${system.newsPressure?.count || 0} live news items were processed in the current cycle.`;

    if (lang === "ar") {
      return {
        summary: `رصد المحرك ضغطًا بقيمة ${system.systemPressure} ضمن مستوى ${level} مع قرار ${decision}.`,
        body:
          `الإشارة المهيمنة الحالية هي ${topName}. ` +
          `${topDesc} ` +
          `${newsLine} ` +
          `محرك السيناريو يوزّع الاحتمالات على النحو التالي: ` +
          `أ ${system.scenarios[0]?.value || 0}%، ` +
          `ب ${system.scenarios[1]?.value || 0}%، ` +
          `ج ${system.scenarios[2]?.value || 0}%.`,
        recommendation:
          system.level === "HIGH"
            ? "يوصى برفع الجاهزية التشغيلية ومتابعة التحديثات بشكل لصيق."
            : system.level === "MEDIUM"
              ? "يوصى بالحفاظ على وضعية التحضير وتكثيف المراقبة."
              : "يوصى باستمرار المراقبة دون تصعيد إضافي."
      };
    }

    return {
      summary: `The engine detected pressure at ${system.systemPressure} under ${level} conditions with decision mode ${decision}.`,
      body:
        `The dominant signal is ${topName}. ` +
        `${topDesc} ` +
        `${newsLine} ` +
        `Scenario distribution currently stands at ` +
        `A ${system.scenarios[0]?.value || 0}%, ` +
        `B ${system.scenarios[1]?.value || 0}%, ` +
        `C ${system.scenarios[2]?.value || 0}%.`,
      recommendation:
        system.level === "HIGH"
          ? "Raise operational readiness and sustain close monitoring."
          : system.level === "MEDIUM"
            ? "Maintain preparation posture and intensify observation."
            : "Continue monitoring without further escalation."
    };
  }

  function shouldGenerateReport(system) {
    const last = STATE.reports[STATE.reports.length - 1];
    if (!last) return true;
    if (last.level !== system.level) return true;
    if (last.topSignalId !== (system.topSignal?.id || null)) return true;
    if (Math.abs(last.systemPressure - system.systemPressure) >= 8) return true;
    return false;
  }

  function generateAutoReport(system) {
    const en = buildReportBody(system, "en");
    const ar = buildReportBody(system, "ar");

    const report = {
      id: `AUTO-${Date.now()}`,
      createdAt: nowIso(),
      systemPressure: system.systemPressure,
      level: system.level,
      decision: system.decision,
      topSignalId: system.topSignal?.id || null,
      newsCount: system.newsPressure?.count || 0,
      title: {
        en: buildReportTitle(system, "en"),
        ar: buildReportTitle(system, "ar")
      },
      summary: {
        en: en.summary,
        ar: ar.summary
      },
      body: {
        en: en.body,
        ar: ar.body
      },
      recommendation: {
        en: en.recommendation,
        ar: ar.recommendation
      }
    };

    STATE.reports.push(report);

    if (STATE.reports.length > CONFIG.reportLimit) {
      STATE.reports.shift();
    }

    return report;
  }

  function archiveSnapshot(system) {
    STATE.archive.push({
      id: `ARC-${Date.now()}`,
      createdAt: nowIso(),
      ssi: system.systemPressure,
      level: system.level,
      decision: system.decision,
      topSignalId: system.topSignal?.id || null,
      newsCount: system.newsPressure?.count || 0
    });

    if (STATE.archive.length > CONFIG.archiveLimit) {
      STATE.archive.shift();
    }
  }

  function updateHistory(system) {
    STATE.history.push({
      updatedAt: system.updatedAt,
      systemPressure: system.systemPressure,
      level: system.level,
      decision: system.decision,
      topSignalId: system.topSignal?.id || null,
      countryRiskFeed: system.countryRiskFeed,
      newsCount: system.newsPressure?.count || 0
    });

    if (STATE.history.length > CONFIG.historyLimit) {
      STATE.history.shift();
    }
  }

  function saveState() {
    try {
      localStorage.setItem(
        CONFIG.storageKey,
        JSON.stringify({
          history: STATE.history,
          reports: STATE.reports,
          archive: STATE.archive,
          lastSystem: STATE.lastSystem
        })
      );
    } catch (error) {
      console.error("IBSS saveState error:", error);
    }
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(CONFIG.storageKey);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;

      STATE.history = Array.isArray(parsed.history) ? parsed.history : [];
      STATE.reports = Array.isArray(parsed.reports) ? parsed.reports : [];
      STATE.archive = Array.isArray(parsed.archive) ? parsed.archive : [];
      STATE.lastSystem = parsed.lastSystem || null;
    } catch (error) {
      console.error("IBSS loadState error:", error);
    }
  }

  function computeSystemState() {
    autoRefreshNews();

    const rankedSignals = buildRankedSignals();
    const topSignal = rankedSignals[0] || null;
    const latestNews = getLatestNews(6);
    const newsPressure = buildNewsPressure(latestNews);
    const systemPressure = buildPressure(rankedSignals, newsPressure);
    const level = riskLevelFromScore(systemPressure);
    const { decision, mode } = decisionFromLevel(level);
    const liveSignals = rankedSignals.filter(signal => signal.live);
    const scenarios = buildScenarios(level, newsPressure);
    const countryRiskFeed = buildCountryRiskFeed(rankedSignals);

    const system = {
      source: "engine",
      updatedAt: nowIso(),
      ssi: systemPressure,
      systemPressure,
      level,
      decision,
      mode,
      topSignal,
      dominantSignal: topSignal,
      rankedSignals,
      liveSignals,
      liveSignalsCount: liveSignals.length,
      scenarios,
      countryRiskFeed,
      latestNews,
      tickerNews: getTickerNews(8),
      newsPressure,
      feed: [],
      contentStats: getContentStats(),
      publishedContent: getPublishedContent()
    };

    system.feed = buildFeed(system);

    if (shouldGenerateReport(system)) {
      const report = generateAutoReport(system);
      system.feed.unshift(`Auto report generated: ${report.title.en}`);
    }

    updateHistory(system);
    archiveSnapshot(system);
    STATE.lastSystem = system;
    saveState();

    return system;
  }

  function getSystemState() {
    return computeSystemState();
  }

  function getLastSystemState() {
    return STATE.lastSystem;
  }

  function getCountryRiskFeed() {
    const system = STATE.lastSystem || computeSystemState();
    return system.countryRiskFeed;
  }

  function getReports() {
    return [...STATE.reports].reverse();
  }

  function getLatestReport() {
    return STATE.reports[STATE.reports.length - 1] || null;
  }

  function getHistory() {
    return [...STATE.history];
  }

  function getArchive() {
    return [...STATE.archive];
  }

  function getStaticSystemFallback() {
    const rankedSignals = buildRankedSignals();
    const topSignal = rankedSignals[0] || null;
    const latestNews = getLatestNews(6);
    const newsPressure = buildNewsPressure(latestNews);
    const pressure = buildPressure(rankedSignals, newsPressure);
    const level = riskLevelFromScore(pressure);
    const { decision, mode } = decisionFromLevel(level);
    const countryRiskFeed = buildCountryRiskFeed(rankedSignals);

    return {
      source: "fallback",
      updatedAt: nowIso(),
      ssi: pressure,
      systemPressure: pressure,
      level,
      decision,
      mode,
      topSignal,
      dominantSignal: topSignal,
      rankedSignals,
      liveSignals: rankedSignals.filter(signal => signal.live),
      liveSignalsCount: rankedSignals.filter(signal => signal.live).length,
      scenarios: buildScenarios(level, newsPressure),
      countryRiskFeed,
      latestNews,
      tickerNews: getTickerNews(8),
      newsPressure,
      feed: buildFeed({
        systemPressure: pressure,
        level,
        decision,
        mode,
        topSignal,
        latestNews,
        newsPressure,
        countryRiskFeed,
        contentStats: getContentStats()
      }),
      contentStats: getContentStats(),
      publishedContent: getPublishedContent()
    };
  }

  loadState();

  return {
    CONFIG,
    getSystemState,
    getLastSystemState,
    getStaticSystemFallback,
    getCountryRiskFeed,
    getReports,
    getLatestReport,
    getHistory,
    getArchive,
    getContentStats,
    getPublishedContent,
    scoreSignal100,
    riskLevelFromScore
  };
})();
