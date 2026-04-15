window.IBSS_ENGINE = (function () {
  "use strict";

  const CONFIG = {
    refreshMs: 4000,
    historyLimit: 150,
    reportLimit: 60,
    archiveLimit: 100,
    storageKey: "ibss_engine_state_v6"
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

  function safeText(value, fallback = "") {
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
  }

  function normalizeText(value) {
    return safeText(String(value || ""))
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function getLocalizedText(value, lang = "en") {
    if (value == null) return "-";

    if (typeof value === "string" || typeof value === "number") {
      return String(value);
    }

    const localized =
      value[lang] ??
      value.en ??
      value.ar ??
      value.title ??
      value.name ??
      value.label ??
      value.text;

    if (typeof localized === "string" || typeof localized === "number") {
      return String(localized);
    }

    if (localized && typeof localized === "object") {
      return getLocalizedText(localized, lang);
    }

    return "-";
  }

  function uniqueById(list) {
    const map = new Map();

    asArray(list).forEach((item, index) => {
      if (!item) return;

      const id =
        item.id ||
        [
          getLocalizedText(item.title, "en"),
          getLocalizedText(item.signalType, "en"),
          getLocalizedText(item.region, "en"),
          index
        ].join("::");

      map.set(id, item);
    });

    return [...map.values()];
  }

  function normalizePriority(value) {
    const p = String(value || "LOW").toUpperCase();
    if (p === "HIGH") return "HIGH";
    if (p === "MEDIUM") return "MEDIUM";
    return "LOW";
  }

  function inferPriorityFromScore(score100) {
    if (score100 >= 75) return "HIGH";
    if (score100 >= 50) return "MEDIUM";
    return "LOW";
  }

  function inferSignalTypeFromDomain(domain) {
    const d = String(domain || "").toLowerCase();

    if (d.includes("military")) return { en: "MILITARY", ar: "عسكري" };
    if (d.includes("security")) return { en: "SECURITY", ar: "أمني" };
    if (d.includes("economic")) return { en: "ECONOMIC", ar: "اقتصادي" };
    if (d.includes("diplomatic")) return { en: "DIPLOMATIC", ar: "دبلوماسي" };
    if (d.includes("maritime")) return { en: "MARITIME", ar: "بحري" };
    if (d.includes("energy")) return { en: "ENERGY", ar: "طاقي" };
    if (d.includes("logistics")) return { en: "LOGISTICS", ar: "لوجستي" };
    if (d.includes("geo")) return { en: "GEOPOLITICAL", ar: "جيوسياسي" };

    return { en: "STRUCTURAL", ar: "بنيوي" };
  }

  function inferInfluenceBand(priority) {
    if (priority === "HIGH") return { en: "CORE", ar: "محوري" };
    if (priority === "MEDIUM") return { en: "SUPPORT", ar: "مساند" };
    return { en: "WATCH", ar: "مراقبة" };
  }

  function inferDecisionMode(priority) {
    if (priority === "HIGH") return { en: "WATCH / ACT", ar: "مراقبة / تحرك" };
    if (priority === "MEDIUM") return { en: "PRD", ar: "استعداد" };
    return { en: "WATCH", ar: "مراقبة" };
  }

  function detectPriority(signal) {
    if (signal?.priority) return normalizePriority(signal.priority);
    if (signal?.reportMeta?.priority) return normalizePriority(signal.reportMeta.priority);
    if (signal?.weight) return normalizePriority(signal.weight);

    const score = safeNumber(signal?.balancedScore100, signal?.score100);
    if (score > 0) return inferPriorityFromScore(score);

    return "LOW";
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

  function getNews() {
    try {
      if (window.IBSS_NEWS_UTILS && typeof window.IBSS_NEWS_UTILS.getAllNews === "function") {
        return asArray(window.IBSS_NEWS_UTILS.getAllNews());
      }
    } catch (error) {
      console.error("IBSS getNews utils error:", error);
    }

    return asArray(window.IBSS_NEWS);
  }

  function getPublishedContent() {
    return getContent().filter(item => item && item.status === "published");
  }

  function getPublishedNewsContent() {
    return getContent().filter(item => item && item.type === "news" && item.status === "published");
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

  function normalizeNewsItem(item, index = 0) {
    const titleEn =
      getLocalizedText(item?.title, "en") ||
      safeText(item?.title_en) ||
      safeText(item?.headline) ||
      `News Item ${index + 1}`;

    const titleAr =
      getLocalizedText(item?.title, "ar") ||
      safeText(item?.title_ar) ||
      titleEn;

    const summaryEn =
      getLocalizedText(item?.summary, "en") ||
      safeText(item?.summary_en) ||
      safeText(item?.description) ||
      titleEn;

    const summaryAr =
      getLocalizedText(item?.summary, "ar") ||
      safeText(item?.summary_ar) ||
      summaryEn;

    return {
      id: item?.id || `NEWS-${index + 1}`,
      source: safeText(item?.source, item?.sourceName || "External"),
      priority: normalizePriority(item?.priority || item?.severity),
      severity: normalizePriority(item?.severity || item?.priority),
      domain: safeText(item?.domain, item?.category || "geopolitical"),
      region: safeText(item?.region, item?.country || "global"),
      country: safeText(item?.country, item?.region || "global"),
      title: { en: titleEn, ar: titleAr },
      summary: { en: summaryEn, ar: summaryAr },
      url: safeText(item?.url, "#"),
      publishedAt: item?.publishedAt || item?.timestamp || nowIso(),
      impact: safeNumber(item?.impact, 4),
      confidence: safeNumber(item?.confidence, 4),
      urgency: safeNumber(item?.urgency, 4),
      persistence: safeNumber(item?.persistence, 5),
      spread: safeNumber(item?.spread, 5),
      active: item?.active !== false
    };
  }

  function buildNewsDerivedSignals() {
    const news = getNews().map(normalizeNewsItem);
    if (!news.length) return [];

    return news.map((item, index) => {
      let weighted = {
        composite: 4,
        weightedImpact: 4,
        weightedUrgency: 4,
        weightedPersistence: 5,
        weightedSpread: 5
      };

      try {
        if (window.IBSS_WEIGHTS && typeof window.IBSS_WEIGHTS.applyWeights === "function") {
          weighted = window.IBSS_WEIGHTS.applyWeights({
            domain: item.domain,
            impact: item.impact,
            confidence: item.confidence,
            urgency: item.urgency,
            persistence: item.persistence,
            spread: item.spread
          });
        }
      } catch (error) {
        console.error("IBSS weights error:", error);
      }

      const score100 = Math.round(clamp(weighted.composite, 0, 10) * 10);
      const priority = normalizePriority(item.priority || inferPriorityFromScore(score100));

      return {
        id: item.id ? `NEWS-SIG-${item.id}` : `NEWS-SIG-${index + 1}`,
        title: {
          en: getLocalizedText(item.title, "en"),
          ar: getLocalizedText(item.title, "ar")
        },
        description: {
          en: getLocalizedText(item.summary, "en"),
          ar: getLocalizedText(item.summary, "ar")
        },
        layer: {
          en: "News Intelligence Unit",
          ar: "وحدة تحليل الأخبار"
        },
        signalType: inferSignalTypeFromDomain(item.domain),
        decisionMode: inferDecisionMode(priority),
        influenceBand: inferInfluenceBand(priority),
        priority,
        weight: priority,
        live: true,
        active: true,
        sourceUnit: "NIU",
        sourceNewsId: item.id,
        region: item.region || "Live Stream",
        country: item.country || item.region || "global",
        link: item.url || "#",
        metrics: {
          weight: clamp(weighted.weightedImpact / 10, 0, 1),
          volatility: clamp(weighted.weightedUrgency / 10, 0, 1),
          impact: clamp(item.confidence / 10, 0, 1)
        },
        balancedScore100: score100,
        score100,
        newsMeta: {
          source: item.source,
          publishedAt: item.publishedAt,
          domain: item.domain
        }
      };
    });
  }

  function refreshAnalysisLayer() {
    try {
      if (window.IBSS_ANALYSIS && typeof window.IBSS_ANALYSIS.ingestFromNormalization === "function") {
        window.IBSS_ANALYSIS.ingestFromNormalization();
      }
    } catch (error) {
      console.error("IBSS analysis refresh error:", error);
    }
  }

  function getAnalysisSignals() {
    try {
      if (window.IBSS_ANALYSIS && typeof window.IBSS_ANALYSIS.getSignals === "function") {
        return asArray(window.IBSS_ANALYSIS.getSignals());
      }
    } catch (error) {
      console.error("IBSS analysis signals read error:", error);
    }

    return [];
  }

  function normalizeGenericSignal(signal, index = 0) {
    const priority = normalizePriority(detectPriority(signal));

    const titleEn = getLocalizedText(signal?.title, "en");
    const titleAr = getLocalizedText(signal?.title, "ar");
    const descEn = getLocalizedText(signal?.description, "en");
    const descAr = getLocalizedText(signal?.description, "ar");

    const score100 =
      safeNumber(signal?.balancedScore100, 0) ||
      safeNumber(signal?.score100, 0);

    return {
      ...signal,
      id: signal?.id || `SIG-${index + 1}`,
      title: {
        en: titleEn !== "-" ? titleEn : `Signal ${index + 1}`,
        ar: titleAr !== "-" ? titleAr : `إشارة ${index + 1}`
      },
      description: {
        en: descEn !== "-" ? descEn : "Structured signal.",
        ar: descAr !== "-" ? descAr : "إشارة منظمة."
      },
      layer: signal?.layer || { en: "Core Layer", ar: "الطبقة الأساسية" },
      signalType:
        typeof signal?.signalType === "object"
          ? signal.signalType
          : inferSignalTypeFromDomain(signal?.signalType || signal?.domain),
      decisionMode:
        typeof signal?.decisionMode === "object"
          ? signal.decisionMode
          : inferDecisionMode(priority),
      influenceBand:
        typeof signal?.influenceBand === "object"
          ? signal.influenceBand
          : inferInfluenceBand(priority),
      priority,
      balancedScore100: score100,
      score100,
      live: !!(signal?.live || signal?.active),
      active: signal?.active !== false
    };
  }

  function buildUnifiedSignals() {
    const baseSignals = getSignals().map(normalizeGenericSignal);
    const newsSignals = buildNewsDerivedSignals().map(normalizeGenericSignal);
    const analysisSignals = getAnalysisSignals().map(normalizeGenericSignal);

    return uniqueById([...baseSignals, ...newsSignals, ...analysisSignals]);
  }

  function scoreSignalBase(signal) {
    if (safeNumber(signal?.balancedScore100, 0) > 0 && !signal?.metrics) {
      return clamp(safeNumber(signal.balancedScore100) / 100, 0, 1);
    }

    const metrics = signal?.metrics || {};
    const weight = safeNumber(metrics.weight, 0);
    const volatility = safeNumber(metrics.volatility, 0);
    const impact = safeNumber(metrics.impact, 0);

    let priorityBoost = 0;
    const priority = normalizePriority(detectPriority(signal));

    if (priority === "HIGH") priorityBoost = 0.04;
    else if (priority === "MEDIUM") priorityBoost = 0.02;

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

  function buildRankedSignals() {
    return buildUnifiedSignals()
      .map(signal => {
        const baseScore = scoreSignalBase(signal);
        const score100 = Math.round(baseScore * 100);
        const priority = normalizePriority(detectPriority(signal));

        return {
          ...signal,
          priority,
          score: baseScore,
          score100,
          balancedScore100: safeNumber(signal?.balancedScore100, score100),
          live: !!(signal.live || signal.active)
        };
      })
      .sort((a, b) => {
        const aScore = safeNumber(a.balancedScore100, a.score100);
        const bScore = safeNumber(b.balancedScore100, b.score100);
        return bScore - aScore;
      });
  }

  function buildPressure(rankedSignals) {
    const topSignal = rankedSignals[0] || null;
    const average = rankedSignals.length
      ? rankedSignals.reduce((sum, signal) => sum + safeNumber(signal.score, 0), 0) / rankedSignals.length
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

    return clamp(pressure, 0, 100);
  }

  function buildNewsPressure(newsItems) {
    const list = asArray(newsItems);

    const highCount = list.filter(item =>
      normalizePriority(item.priority || item.severity) === "HIGH"
    ).length;

    const mediumCount = list.filter(item =>
      normalizePriority(item.priority || item.severity) === "MEDIUM"
    ).length;

    const lowCount = list.filter(item =>
      normalizePriority(item.priority || item.severity) === "LOW"
    ).length;

    const weighted = (highCount * 16) + (mediumCount * 9) + (lowCount * 4);

    return {
      count: list.length,
      highCount,
      mediumCount,
      lowCount,
      pressure: clamp(weighted, 0, 100)
    };
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
      return { decision: "ACT", mode: "ACTIVE RESPONSE" };
    }

    if (level === "MEDIUM") {
      return { decision: "PRD", mode: "PREPARATION" };
    }

    return { decision: "WATCH", mode: "MONITORING" };
  }

  function buildScenariosFromLayer(input) {
    try {
      if (window.IBSS_SCENARIO && typeof window.IBSS_SCENARIO.buildScenarioPack === "function") {
        return window.IBSS_SCENARIO.buildScenarioPack(input);
      }
    } catch (error) {
      console.error("IBSS scenario layer error:", error);
    }

    const level = input?.level || "LOW";

    if (level === "HIGH") {
      return {
        dominant: "A",
        scenarios: [
          { key: "A", value: 58, label: "Escalation" },
          { key: "B", value: 27, label: "Managed Pressure" },
          { key: "C", value: 15, label: "Containment" }
        ]
      };
    }

    if (level === "MEDIUM") {
      return {
        dominant: "B",
        scenarios: [
          { key: "A", value: 38, label: "Escalation" },
          { key: "B", value: 37, label: "Managed Pressure" },
          { key: "C", value: 25, label: "Containment" }
        ]
      };
    }

    return {
      dominant: "C",
      scenarios: [
        { key: "A", value: 22, label: "Escalation" },
        { key: "B", value: 33, label: "Managed Pressure" },
        { key: "C", value: 45, label: "Containment" }
      ]
    };
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
          nameLocalized: country.name,
          riskScore: safeNumber(country.riskScore),
          riskLevel: country.riskLevel || riskLevelFromScore(safeNumber(country.riskScore)),
          trend: country.trend || "STABLE",
          primaryDrivers: asArray(country.primaryDrivers?.en || country.primaryDrivers || [])
        }));
    }

    return rankedSignals.slice(0, 5).map(signal => {
      const name = getLocalizedText(signal.title, "en");
      const riskScore = safeNumber(signal.balancedScore100, 0);
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

  function buildCorrelationMap(newsItems) {
    try {
      if (window.IBSS_CORRELATION && typeof window.IBSS_CORRELATION.buildCorrelationMap === "function") {
        return asArray(window.IBSS_CORRELATION.buildCorrelationMap(newsItems));
      }
    } catch (error) {
      console.error("IBSS correlation layer error:", error);
    }

    return [];
  }

  function buildFeed(system) {
    const lines = [];
    const news = getNews()
      .map(normalizeNewsItem)
      .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0))
      .filter(item => normalizePriority(item.priority || item.severity) !== "LOW")
      .slice(0, 5);

    news.forEach(item => {
      lines.push({
        type: "news",
        priority: normalizePriority(item.priority || item.severity),
        source: item.source || "External",
        text: {
          en: getLocalizedText(item.summary, "en") || getLocalizedText(item.title, "en") || "Live external news item.",
          ar: getLocalizedText(item.summary, "ar") || getLocalizedText(item.title, "ar") || "عنصر خبري حي."
        }
      });
    });

    lines.push({
      type: "system",
      priority: system.level,
      text: {
        en: `Pressure index updated to ${system.systemPressure}`,
        ar: `تم تحديث مؤشر الضغط إلى ${system.systemPressure}`
      }
    });

    lines.push({
      type: "system",
      priority: system.level,
      text: {
        en: `System level: ${system.level}`,
        ar: `مستوى النظام: ${system.level === "HIGH" ? "مرتفع" : system.level === "MEDIUM" ? "متوسط" : "منخفض"}`
      }
    });

    lines.push({
      type: "system",
      priority: system.level,
      text: {
        en: `Decision mode: ${system.mode}`,
        ar: `وضع القرار: ${system.mode === "ACTIVE RESPONSE" ? "استجابة نشطة" : system.mode === "PREPARATION" ? "تحضير" : "مراقبة"}`
      }
    });

    if (system.topSignal) {
      lines.push({
        type: "signal",
        priority: system.topSignal.priority || system.level,
        text: {
          en: `Top signal: ${getLocalizedText(system.topSignal.title, "en")}`,
          ar: `الإشارة الأعلى: ${getLocalizedText(system.topSignal.title, "ar")}`
        }
      });
    }

    if (system.newsPressure?.count) {
      lines.push({
        type: "newsPressure",
        priority: system.level,
        text: {
          en: `Live news pressure: ${system.newsPressure.count} items`,
          ar: `الضغط الخبري الحي: ${system.newsPressure.count} عناصر`
        }
      });
    }

    if (system.correlation?.length) {
      const topCluster = system.correlation[0];
      lines.push({
        type: "cluster",
        priority: system.level,
        text: {
          en: `Top correlated cluster: ${topCluster.region} / ${topCluster.domain} (${topCluster.count})`,
          ar: `أعلى كتلة مترابطة: ${topCluster.region} / ${topCluster.domain} (${topCluster.count})`
        }
      });
    }

    if (system.countryRiskFeed.length) {
      lines.push({
        type: "country",
        priority: system.level,
        text: {
          en: `CRU synchronized with ${system.countryRiskFeed.length} country entries`,
          ar: `تمت مزامنة وحدة المخاطر مع ${system.countryRiskFeed.length} مدخلات دول`
        }
      });
    }

    if (system.contentStats?.published > 0) {
      lines.push({
        type: "content",
        priority: system.level,
        text: {
          en: `Published content items: ${system.contentStats.published}`,
          ar: `عدد المواد المنشورة: ${system.contentStats.published}`
        }
      });
    }

    if (system.level === "HIGH") {
      lines.push({
        type: "threshold",
        priority: "HIGH",
        text: {
          en: "High escalation threshold exceeded",
          ar: "تم تجاوز عتبة التصعيد المرتفع"
        }
      });
    } else if (system.level === "MEDIUM") {
      lines.push({
        type: "threshold",
        priority: "MEDIUM",
        text: {
          en: "Structured pressure remains above preparation threshold",
          ar: "الضغط البنيوي ما زال فوق عتبة التحضير"
        }
      });
    } else {
      lines.push({
        type: "threshold",
        priority: "LOW",
        text: {
          en: "Low pressure monitoring remains stable",
          ar: "المراقبة في مستوى ضغط منخفض ما تزال مستقرة"
        }
      });
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

    if (lang === "ar") {
      return {
        summary: `رصد المحرك ضغطًا بقيمة ${system.systemPressure} ضمن مستوى ${level} مع قرار ${decision}.`,
        body:
          `الإشارة المهيمنة الحالية هي ${topName}. ` +
          `${topDesc} ` +
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
      topSignalId: system.topSignal?.id || null
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
      countryRiskFeed: system.countryRiskFeed
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

  function getLatestStudy() {
    const published = getPublishedContent()
      .filter(item =>
        item &&
        (
          item.type === "study" ||
          item.type === "report" ||
          item.type === "analysis" ||
          item.type === "brief" ||
          item.type === "policy_paper"
        )
      )
      .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));

    return published[0] || null;
  }

  function getHomeSnapshot(system) {
    const topCountry = asArray(system?.countryRiskFeed)[0] || null;
    const latestStudy = getLatestStudy();
    const latestNews = getNews()
      .map(normalizeNewsItem)
      .slice()
      .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0))
      .slice(0, 3);

    return {
      topSignal: system?.topSignal || null,
      topCountry,
      latestStudy,
      latestNews
    };
  }

  function deriveDecisionConfidence(system) {
    const signalStrength = safeNumber(system?.topSignal?.balancedScore100, 0);
    const clusterStrength = safeNumber(system?.correlation?.[0]?.intensity, 0);
    const newsStrength = safeNumber(system?.newsPressure?.pressure, 0);

    return clamp(
      Math.round(
        (signalStrength * 0.45) +
        (clusterStrength * 0.30) +
        (newsStrength * 0.25)
      ),
      0,
      100
    );
  }

  function buildDecisionContext(system) {
    const topCluster = system?.correlation?.[0] || null;
    const topSignal = system?.topSignal || null;

    return {
      leadSignal: topSignal ? getLocalizedText(topSignal.title, "en") : "-",
      leadDomain: topSignal ? getLocalizedText(topSignal.signalType, "en") : "-",
      leadCluster: topCluster
        ? `${topCluster.region || "global"} / ${topCluster.domain || "general"}`
        : "-",
      confidence: deriveDecisionConfidence(system),
      nextReviewInMinutes: system.level === "HIGH" ? 15 : system.level === "MEDIUM" ? 30 : 60
    };
  }

  function computeSystemState() {
    refreshAnalysisLayer();

    const rankedSignals = buildRankedSignals();
    const topSignal = rankedSignals[0] || null;

    const newsItems = getNews().map(normalizeNewsItem);
    const newsPressure = buildNewsPressure(newsItems);

    const correlation = buildCorrelationMap(newsItems);
    const topClusterIntensity = safeNumber(correlation?.[0]?.intensity, 0);

    let signalPressure = buildPressure(rankedSignals);

    let systemPressure = clamp(
      Math.round(
        (signalPressure * 0.55) +
        (newsPressure.pressure * 0.20) +
        (topClusterIntensity * 0.25)
      ),
      0,
      100
    );

    const level = riskLevelFromScore(systemPressure);
    const { decision, mode } = decisionFromLevel(level);
    const liveSignals = rankedSignals.filter(signal => signal.live);

    const scenarioPack = buildScenariosFromLayer({
      systemPressure,
      newsPressure: newsPressure.pressure,
      topClusterIntensity,
      liveSignals: liveSignals.length,
      level
    });

    const scenarios = asArray(scenarioPack?.scenarios);
    const countryRiskFeed = buildCountryRiskFeed(rankedSignals);

    const system = {
      source: "engine",
      updatedAt: nowIso(),
      ssi: systemPressure,
      systemPressure,
      signalPressure,
      level,
      decision,
      mode,
      topSignal,
      dominantSignal: topSignal,
      rankedSignals,
      liveSignals,
      liveSignalsCount: liveSignals.length,
      scenarios,
      dominantScenario: scenarioPack?.dominant || null,
      countryRiskFeed,
      newsPressure,
      correlation,
      feed: [],
      contentStats: getContentStats(),
      publishedContent: getPublishedContent(),
      publishedNewsContent: getPublishedNewsContent(),
      liveNews: newsItems,
      snapshot: null,
      decisionContext: null
    };

    system.feed = buildFeed(system);
    system.snapshot = getHomeSnapshot(system);
    system.decisionContext = buildDecisionContext(system);

    if (shouldGenerateReport(system)) {
      const report = generateAutoReport(system);
      system.feed.unshift({
        type: "report",
        priority: system.level,
        text: {
          en: `Auto report generated: ${report.title.en}`,
          ar: `تم توليد تقرير تلقائي: ${report.title.ar}`
        }
      });
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
    refreshAnalysisLayer();

    const rankedSignals = buildRankedSignals();
    const topSignal = rankedSignals[0] || null;

    const newsItems = getNews().map(normalizeNewsItem);
    const newsPressure = buildNewsPressure(newsItems);
    const correlation = buildCorrelationMap(newsItems);
    const topClusterIntensity = safeNumber(correlation?.[0]?.intensity, 0);

    let signalPressure = buildPressure(rankedSignals);

    let pressure = clamp(
      Math.round(
        (signalPressure * 0.55) +
        (newsPressure.pressure * 0.20) +
        (topClusterIntensity * 0.25)
      ),
      0,
      100
    );

    const level = riskLevelFromScore(pressure);
    const { decision, mode } = decisionFromLevel(level);

    const scenarioPack = buildScenariosFromLayer({
      systemPressure: pressure,
      newsPressure: newsPressure.pressure,
      topClusterIntensity,
      liveSignals: rankedSignals.filter(signal => signal.live).length,
      level
    });

    const system = {
      source: "fallback",
      updatedAt: nowIso(),
      ssi: pressure,
      systemPressure: pressure,
      signalPressure,
      level,
      decision,
      mode,
      topSignal,
      dominantSignal: topSignal,
      rankedSignals,
      liveSignals: rankedSignals.filter(signal => signal.live),
      liveSignalsCount: rankedSignals.filter(signal => signal.live).length,
      scenarios: asArray(scenarioPack?.scenarios),
      dominantScenario: scenarioPack?.dominant || null,
      countryRiskFeed: buildCountryRiskFeed(rankedSignals),
      newsPressure,
      correlation,
      feed: [],
      contentStats: getContentStats(),
      publishedContent: getPublishedContent(),
      publishedNewsContent: getPublishedNewsContent(),
      liveNews: newsItems,
      snapshot: null,
      decisionContext: null
    };

    system.feed = buildFeed(system);
    system.snapshot = getHomeSnapshot(system);
    system.decisionContext = buildDecisionContext(system);

    return system;
  }

  loadState();

  const api = {
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
    getPublishedNewsContent,
    getHomeSnapshot: function () {
      const system = STATE.lastSystem || computeSystemState();
      return system.snapshot || getHomeSnapshot(system);
    },
    scoreSignal100,
    riskLevelFromScore,
    buildNewsDerivedSignals,
    buildUnifiedSignals,
    buildNewsPressure
  };

  window.IBSS_UTILS = {
    getHomeSnapshot: api.getHomeSnapshot
  };

  return api;
})();
