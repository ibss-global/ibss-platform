window.IBSS_ENGINE = (function () {
  "use strict";

  const CONFIG = {
    refreshMs: 4000,
    historyLimit: 180,
    reportLimit: 80,
    archiveLimit: 120,
    storageKey: "ibss_engine_state_v8"
  };

  const STATE = {
    history: [],
    reports: [],
    archive: [],
    lastSystem: null
  };

  function nowIso() {
    return new Date().toISOString();
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function safeText(value, fallback = "") {
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
  }

  function safeNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function normalizeText(value) {
    return safeText(String(value || ""))
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function localize(en, ar) {
    return { en, ar };
  }

  function titleCase(text) {
    return safeText(text)
      .split(" ")
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  function getLocalizedText(value, lang = "en") {
    if (!value) return "-";

    if (typeof value === "string" || typeof value === "number") {
      return String(value);
    }

    const localized =
      value[lang] ??
      value.en ??
      value.ar ??
      value.name ??
      value.title ??
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

  function detectPriority(signal) {
    if (signal?.priority) return normalizePriority(signal.priority);
    if (signal?.reportMeta?.priority) return normalizePriority(signal.reportMeta.priority);
    if (signal?.weight) return normalizePriority(signal.weight);

    const score = safeNumber(signal?.balancedScore100, safeNumber(signal?.score100, 0));
    return inferPriorityFromScore(score);
  }

  function inferSignalTypeFromDomain(domain) {
    const d = String(domain || "").toLowerCase();

    if (d.includes("military")) return localize("MILITARY", "عسكري");
    if (d.includes("security")) return localize("SECURITY", "أمني");
    if (d.includes("economic")) return localize("ECONOMIC", "اقتصادي");
    if (d.includes("diplomatic")) return localize("DIPLOMATIC", "دبلوماسي");
    if (d.includes("maritime")) return localize("MARITIME", "بحري");
    if (d.includes("geo")) return localize("GEOPOLITICAL", "جيوسياسي");

    return localize("STRUCTURAL", "بنيوي");
  }

  function inferInfluenceBand(priority) {
    if (priority === "HIGH") return localize("CORE", "محوري");
    if (priority === "MEDIUM") return localize("SUPPORT", "مساند");
    return localize("WATCH", "مراقبة");
  }

  function inferDecisionMode(priority) {
    if (priority === "HIGH") return localize("WATCH / ACT", "مراقبة / تحرك");
    if (priority === "MEDIUM") return localize("PRD", "استعداد");
    return localize("WATCH", "مراقبة");
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
    if (window.IBSS_NEWS_UTILS && typeof window.IBSS_NEWS_UTILS.getAllNews === "function") {
      return asArray(window.IBSS_NEWS_UTILS.getAllNews());
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

  function uniqueById(list) {
    const map = new Map();

    asArray(list).forEach((item, index) => {
      if (!item) return;

      const id =
        item.id ||
        `${getLocalizedText(item.title, "en")}::${getLocalizedText(item.signalType, "en")}::${index + 1}`;

      if (!map.has(id)) {
        map.set(id, item);
      }
    });

    return [...map.values()];
  }

  function buildNewsDerivedSignals() {
    const news = getNews();
    if (!news.length) return [];

    return news.map((item, index) => {
      const impact = clamp(safeNumber(item.impact, 6) / 10, 0, 1);
      const confidence = clamp(safeNumber(item.confidence, 6) / 10, 0, 1);
      const urgency = clamp(safeNumber(item.urgency, 6) / 10, 0, 1);

      const baseScore = clamp(
        (impact * 0.45) +
        (confidence * 0.30) +
        (urgency * 0.25),
        0,
        1
      );

      const score100 = Math.round(baseScore * 100);
      const priority = normalizePriority(item.priority || inferPriorityFromScore(score100));

      return {
        id: item.id ? `NEWS-SIG-${item.id}` : `NEWS-SIG-${index + 1}`,
        title: {
          en: getLocalizedText(item.title, "en") || "News Signal",
          ar: getLocalizedText(item.title, "ar") || "إشارة خبرية"
        },
        description: {
          en: getLocalizedText(item.summary, "en") || "Live news-derived signal.",
          ar: getLocalizedText(item.summary, "ar") || "إشارة مولدة من الأخبار الحية."
        },
        layer: {
          en: "News Intelligence Unit",
          ar: "وحدة تحليل الأخبار"
        },
        signalType: inferSignalTypeFromDomain(item.domain || item.category || "geopolitical"),
        decisionMode: inferDecisionMode(priority),
        influenceBand: inferInfluenceBand(priority),
        priority,
        weight: priority,
        live: true,
        active: true,
        sourceUnit: "NIU",
        sourceNewsId: item.id || null,
        region: item.region || item.country || "Live Stream",
        country: item.country || item.region || "global",
        domain: item.domain || item.category || "geopolitical",
        link: item.url || "#",
        metrics: {
          weight: impact,
          volatility: urgency,
          impact: confidence
        },
        newsMeta: {
          source: item.source || item.sourceName || "External",
          publishedAt: item.publishedAt || item.timestamp || nowIso()
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

  function buildUnifiedSignals() {
    const baseSignals = getSignals();
    const newsSignals = buildNewsDerivedSignals();
    const analysisSignals = getAnalysisSignals();

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

    if (priority === "HIGH") priorityBoost = 0.08;
    else if (priority === "MEDIUM") priorityBoost = 0.04;

    return clamp(
      (weight * 0.50) +
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

  function buildSignalPressure(rankedSignals) {
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

  function resolveClusterAPI() {
    const candidates = [
      window.IBSS_CLUSTER,
      window.IBSS_CLUSTER_ENGINE,
      window.IBSS_THEATER,
      window.IBSS_THEATER_LAYER
    ];

    for (const api of candidates) {
      if (!api || typeof api !== "object") continue;

      if (typeof api.compute === "function") {
        return { api, method: "compute" };
      }

      if (typeof api.getState === "function") {
        return { api, method: "getState" };
      }

      if (typeof api.getClusterState === "function") {
        return { api, method: "getClusterState" };
      }
    }

    return null;
  }

  function normalizeClusterEntry(item, index = 0) {
    if (!item) return null;

    return {
      id: item.id || `CLUSTER-${index + 1}`,
      name: item.name || item.title || localize(`Cluster ${index + 1}`, `عنقود ${index + 1}`),
      avgRisk: safeNumber(item.avgRisk, item.riskScore),
      maxRisk: safeNumber(item.maxRisk, item.avgRisk),
      escalationLevel: safeText(item.escalationLevel, riskLevelFromScore(safeNumber(item.avgRisk, 0))),
      priority: safeText(item.priority, "SUPPORT"),
      trend: safeText(item.trend, "STABLE"),
      theaterId: item.theaterId || item.parentTheaterId || null,
      region: safeText(item.region, ""),
      signals: asArray(item.signals)
    };
  }

  function normalizeTheaterEntry(item, index = 0) {
    if (!item) return null;

    return {
      id: item.id || `THEATER-${index + 1}`,
      name: item.name || item.title || localize(`Theater ${index + 1}`, `مسرح ${index + 1}`),
      avgRisk: safeNumber(item.avgRisk, item.riskScore),
      maxRisk: safeNumber(item.maxRisk, item.avgRisk),
      escalationLevel: safeText(item.escalationLevel, riskLevelFromScore(safeNumber(item.avgRisk, 0))),
      priority: safeText(item.priority, "SUPPORT"),
      trend: safeText(item.trend, "STABLE"),
      clusters: asArray(item.clusters)
    };
  }

  function buildFallbackClusterState(rankedSignals) {
    const liveSignals = rankedSignals.filter(signal => signal.live);

    if (!liveSignals.length) {
      return {
        clusters: [],
        theaters: [],
        lastUpdate: nowIso()
      };
    }

    const groups = new Map();

    liveSignals.forEach(signal => {
      const region = normalizeText(signal.region || signal.country || "global") || "global";
      const domain = normalizeText(signal.domain || getLocalizedText(signal.signalType, "en") || "general") || "general";
      const key = `${region}::${domain}`;

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          region,
          domain,
          signals: [],
          totalRisk: 0,
          maxRisk: 0
        });
      }

      const bucket = groups.get(key);
      const risk = safeNumber(signal.balancedScore100, signal.score100);

      bucket.signals.push(signal);
      bucket.totalRisk += risk;
      bucket.maxRisk = Math.max(bucket.maxRisk, risk);
    });

    const clusters = [...groups.values()]
      .map((group, index) => {
        const avgRisk = group.signals.length ? Math.round(group.totalRisk / group.signals.length) : 0;
        const regionLabel = group.region === "global"
          ? localize("Global", "عالمي")
          : localize(titleCase(group.region), titleCase(group.region));
        const domainLabel = group.domain === "general"
          ? localize("Strategic File", "ملف استراتيجي")
          : localize(titleCase(group.domain), titleCase(group.domain));

        return normalizeClusterEntry({
          id: `FCL-${index + 1}`,
          name: {
            en: `${getLocalizedText(regionLabel, "en")} ${getLocalizedText(domainLabel, "en")}`,
            ar: `${getLocalizedText(domainLabel, "ar")} ${getLocalizedText(regionLabel, "ar")}`
          },
          avgRisk,
          maxRisk: group.maxRisk,
          escalationLevel: riskLevelFromScore(avgRisk),
          priority: avgRisk >= 75 ? "CORE" : avgRisk >= 50 ? "SUPPORT" : "WATCH",
          trend: "STABLE",
          theaterId: `FTH-${group.region}`,
          region: group.region,
          signals: group.signals
        }, index);
      })
      .filter(Boolean)
      .sort((a, b) => b.avgRisk - a.avgRisk);

    const theaterMap = new Map();

    clusters.forEach(cluster => {
      const region = normalizeText(cluster.region || "global") || "global";

      if (!theaterMap.has(region)) {
        theaterMap.set(region, {
          id: `FTH-${region}`,
          region,
          name: region === "global"
            ? localize("Global Theater", "المسرح العالمي")
            : localize(`${titleCase(region)} Theater`, `مسرح ${titleCase(region)}`),
          clusters: [],
          avgSum: 0,
          maxRisk: 0
        });
      }

      const theater = theaterMap.get(region);
      theater.clusters.push(cluster);
      theater.avgSum += safeNumber(cluster.avgRisk, 0);
      theater.maxRisk = Math.max(theater.maxRisk, safeNumber(cluster.maxRisk, 0));
    });

    const theaters = [...theaterMap.values()]
      .map((item, index) => {
        const avgRisk = item.clusters.length ? Math.round(item.avgSum / item.clusters.length) : 0;
        return normalizeTheaterEntry({
          id: item.id || `FTH-${index + 1}`,
          name: item.name,
          avgRisk,
          maxRisk: item.maxRisk,
          escalationLevel: riskLevelFromScore(avgRisk),
          priority: avgRisk >= 75 ? "CORE" : avgRisk >= 50 ? "SUPPORT" : "WATCH",
          trend: "STABLE",
          clusters: item.clusters
        }, index);
      })
      .filter(Boolean)
      .sort((a, b) => b.avgRisk - a.avgRisk);

    return {
      clusters,
      theaters,
      lastUpdate: nowIso()
    };
  }

  function refreshClusterLayer(rankedSignals) {
    try {
      const resolved = resolveClusterAPI();

      if (resolved) {
        const raw = resolved.api[resolved.method]();
        const clusters = asArray(raw?.clusters).map(normalizeClusterEntry).filter(Boolean);
        const theaters = asArray(raw?.theaters).map(normalizeTheaterEntry).filter(Boolean);

        if (clusters.length || theaters.length) {
          return {
            clusters: clusters.sort((a, b) => b.avgRisk - a.avgRisk),
            theaters: theaters.sort((a, b) => b.avgRisk - a.avgRisk),
            lastUpdate: raw?.lastUpdate || nowIso()
          };
        }
      }
    } catch (error) {
      console.error("IBSS cluster refresh error:", error);
    }

    return buildFallbackClusterState(rankedSignals);
  }

  function buildClusterPressure(clusters) {
    const list = asArray(clusters);
    if (!list.length) {
      return {
        count: 0,
        highCount: 0,
        elevatedCount: 0,
        topCluster: null,
        pressure: 0
      };
    }

    const topCluster = list[0] || null;
    const avgRisk = Math.round(
      list.reduce((sum, cluster) => sum + safeNumber(cluster.avgRisk, 0), 0) / list.length
    );

    const highCount = list.filter(cluster => {
      const level = safeText(cluster.escalationLevel).toUpperCase();
      return level === "HIGH" || level === "SEVERE";
    }).length;

    const elevatedCount = list.filter(cluster =>
      safeText(cluster.escalationLevel).toUpperCase() === "ELEVATED"
    ).length;

    let pressure = Math.round(
      (avgRisk * 0.65) +
      (safeNumber(topCluster?.maxRisk, 0) * 0.20) +
      (Math.min(list.length, 8) * 2.2)
    );

    const topLevel = safeText(topCluster?.escalationLevel).toUpperCase();
    if (topLevel === "SEVERE") pressure += 8;
    else if (topLevel === "HIGH") pressure += 4;

    return {
      count: list.length,
      highCount,
      elevatedCount,
      topCluster,
      pressure: clamp(pressure, 0, 100)
    };
  }

  function buildTheaterPressure(theaters) {
    const list = asArray(theaters);
    if (!list.length) {
      return {
        count: 0,
        topTheater: null,
        pressure: 0
      };
    }

    const topTheater = list[0] || null;

    const avgRisk = Math.round(
      list.reduce((sum, theater) => sum + safeNumber(theater.avgRisk, 0), 0) / list.length
    );

    let pressure = Math.round(
      (avgRisk * 0.70) +
      (safeNumber(topTheater?.maxRisk, 0) * 0.20) +
      (Math.min(list.length, 5) * 2)
    );

    const priority = safeText(topTheater?.priority).toUpperCase();
    const level = safeText(topTheater?.escalationLevel).toUpperCase();

    if (priority === "CORE") pressure += 5;
    if (level === "SEVERE") pressure += 6;
    else if (level === "HIGH") pressure += 3;

    return {
      count: list.length,
      topTheater,
      pressure: clamp(pressure, 0, 100)
    };
  }

  function detectTrend(current, previous) {
    if (previous == null) return "STABLE";
    if (current > previous + 2) return "RISING";
    if (current < previous - 2) return "FALLING";
    return "STABLE";
  }

  function riskLevelFromScore(score) {
    if (score >= 78) return "HIGH";
    if (score >= 52) return "MEDIUM";
    return "LOW";
  }

  function decisionFromLevel(level, systemPressure, confidenceScore) {
    if (level === "HIGH") {
      if (systemPressure >= 85 && confidenceScore >= 75) {
        return { decision: "ACT", mode: "ACTIVE RESPONSE" };
      }
      return { decision: "PRD", mode: "PREPARATION" };
    }

    if (level === "MEDIUM") {
      if (systemPressure >= 65) {
        return { decision: "PRD", mode: "PREPARATION" };
      }
      return { decision: "WATCH+", mode: "HEIGHTENED MONITORING" };
    }

    return { decision: "WATCH", mode: "MONITORING" };
  }

  function buildScenarios(level, signalPressure, clusterPressure, theaterPressure) {
    const clusterTop = safeNumber(clusterPressure?.pressure, 0);
    const theaterTop = safeNumber(theaterPressure?.pressure, 0);
    const signalTop = safeNumber(signalPressure, 0);

    if (level === "HIGH") {
      const a = clamp(Math.round((clusterTop * 0.25) + 38), 35, 68);
      const b = clamp(Math.round((theaterTop * 0.18) + 18), 18, 38);
      const c = clamp(100 - a - b, 8, 30);

      return [
        { key: "A", value: a },
        { key: "B", value: b },
        { key: "C", value: c }
      ];
    }

    if (level === "MEDIUM") {
      const a = clamp(Math.round((signalTop * 0.16) + 22), 22, 48);
      const b = clamp(Math.round((clusterTop * 0.14) + 20), 20, 42);
      const c = clamp(100 - a - b, 18, 38);

      return [
        { key: "A", value: a },
        { key: "B", value: b },
        { key: "C", value: c }
      ];
    }

    return [
      { key: "A", value: 18 },
      { key: "B", value: 30 },
      { key: "C", value: 52 }
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
        nameLocalized: { en: name, ar: getLocalizedText(signal.title, "ar") },
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

  function buildConfidenceScore(newsPressure, clusterPressure, theaterPressure, rankedSignals) {
    const newsCount = safeNumber(newsPressure?.count, 0);
    const clusterCount = safeNumber(clusterPressure?.count, 0);
    const theaterCount = safeNumber(theaterPressure?.count, 0);
    const signalCount = asArray(rankedSignals).length;

    let score =
      Math.min(newsCount, 10) * 3 +
      Math.min(clusterCount, 6) * 5 +
      Math.min(theaterCount, 3) * 8 +
      Math.min(signalCount, 20) * 1.2;

    const theaterPriority = safeText(theaterPressure?.topTheater?.priority).toUpperCase();
    const clusterEsc = safeText(clusterPressure?.topCluster?.escalationLevel).toUpperCase();

    if (theaterPriority === "CORE") score += 8;
    if (clusterEsc === "SEVERE") score += 6;
    if (clusterEsc === "HIGH") score += 3;

    return clamp(Math.round(score), 0, 100);
  }

  function buildFeed(system) {
    const lines = [];
    const news = getNews()
      .slice()
      .sort((a, b) => new Date(b.publishedAt || b.timestamp || 0) - new Date(a.publishedAt || a.timestamp || 0))
      .slice(0, 5);

    news.forEach(item => {
      lines.push({
        type: "news",
        priority: normalizePriority(item.priority || item.severity),
        source: item.source || item.sourceName || "External",
        text: {
          en: getLocalizedText(item.summary, "en") || getLocalizedText(item.title, "en") || "Live external news item.",
          ar: getLocalizedText(item.summary, "ar") || getLocalizedText(item.title, "ar") || "عنصر خبري حي."
        }
      });
    });

    if (system.topTheater) {
      lines.push({
        type: "theater",
        priority: system.level,
        text: {
          en: `Top theater: ${getLocalizedText(system.topTheater.name, "en")}`,
          ar: `المسرح الأعلى: ${getLocalizedText(system.topTheater.name, "ar")}`
        }
      });
    }

    if (system.topCluster) {
      lines.push({
        type: "cluster",
        priority: system.level,
        text: {
          en: `Top strategic file: ${getLocalizedText(system.topCluster.name, "en")}`,
          ar: `الملف الاستراتيجي الأعلى: ${getLocalizedText(system.topCluster.name, "ar")}`
        }
      });
    }

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

    lines.push({
      type: "system",
      priority: system.level,
      text: {
        en: `Signal pressure: ${system.signalPressure}`,
        ar: `ضغط الإشارات: ${system.signalPressure}`
      }
    });

    lines.push({
      type: "system",
      priority: system.level,
      text: {
        en: `Strategic file pressure: ${system.clusterPressure.pressure}`,
        ar: `ضغط الملفات الاستراتيجية: ${system.clusterPressure.pressure}`
      }
    });

    lines.push({
      type: "system",
      priority: system.level,
      text: {
        en: `Theater pressure: ${system.theaterPressure.pressure}`,
        ar: `ضغط المسرح: ${system.theaterPressure.pressure}`
      }
    });

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
    const theaterName = system.topTheater
      ? getLocalizedText(system.topTheater.name, lang)
      : (lang === "ar" ? "النظام" : "System");

    return lang === "ar"
      ? `تقرير سيادي تلقائي — ${theaterName}`
      : `Auto Sovereign Report — ${theaterName}`;
  }

  function buildReportBody(system, lang = "en") {
    const topTheater = system.topTheater
      ? getLocalizedText(system.topTheater.name, lang)
      : (lang === "ar" ? "غير محدد" : "Undefined");

    const topCluster = system.topCluster
      ? getLocalizedText(system.topCluster.name, lang)
      : (lang === "ar" ? "غير محدد" : "Undefined");

    const topSignal = system.topSignal
      ? getLocalizedText(system.topSignal.title, lang)
      : (lang === "ar" ? "غير محدد" : "Undefined");

    const level = lang === "ar"
      ? (system.level === "HIGH" ? "مرتفع" : system.level === "MEDIUM" ? "متوسط" : "منخفض")
      : system.level;

    const decision = lang === "ar"
      ? (
          system.decision === "ACT" ? "تحرك" :
          system.decision === "PRD" ? "استعداد" :
          system.decision === "WATCH+" ? "مراقبة معززة" :
          "مراقبة"
        )
      : system.decision;

    if (lang === "ar") {
      return {
        summary: `رصد المحرك ضغطًا مركبًا بقيمة ${system.systemPressure} ضمن مستوى ${level} مع قرار ${decision}.`,
        body:
          `المسرح الأعلى حاليًا هو ${topTheater}. ` +
          `الملف الاستراتيجي الأعلى هو ${topCluster}. ` +
          `أما الإشارة الأعلى فهي ${topSignal}. ` +
          `تم حساب الضغط النهائي اعتمادًا على ضغط الإشارات، ضغط الملفات الاستراتيجية، ضغط المسرح، والضغط الخبري الحي. ` +
          `محرك السيناريو يوزّع الاحتمالات على النحو التالي: ` +
          `أ ${system.scenarios[0]?.value || 0}%، ` +
          `ب ${system.scenarios[1]?.value || 0}%، ` +
          `ج ${system.scenarios[2]?.value || 0}%.`,
        recommendation:
          system.level === "HIGH"
            ? "يوصى برفع الجاهزية التشغيلية وتكثيف المراقبة على مستوى المسرح والملف الأعلى."
            : system.level === "MEDIUM"
              ? "يوصى بالحفاظ على وضعية التحضير ومراقبة تحولات الملف الاستراتيجي الأعلى."
              : "يوصى باستمرار المراقبة وتحديث التقدير دون تصعيد إضافي."
      };
    }

    return {
      summary: `The engine detected composite pressure at ${system.systemPressure} under ${level} conditions with decision mode ${decision}.`,
      body:
        `The top theater is ${topTheater}. ` +
        `The leading strategic file is ${topCluster}. ` +
        `The dominant signal is ${topSignal}. ` +
        `Final system pressure was calculated from signal pressure, strategic file pressure, theater pressure, and live news pressure. ` +
        `Scenario distribution currently stands at ` +
        `A ${system.scenarios[0]?.value || 0}%, ` +
        `B ${system.scenarios[1]?.value || 0}%, ` +
        `C ${system.scenarios[2]?.value || 0}%.`,
      recommendation:
        system.level === "HIGH"
          ? "Raise operational readiness and intensify monitoring at both theater and strategic-file levels."
          : system.level === "MEDIUM"
            ? "Maintain preparation posture and watch transitions in the leading strategic file."
            : "Continue monitoring and refresh assessment without further escalation."
    };
  }

  function shouldGenerateReport(system) {
    const last = STATE.reports[STATE.reports.length - 1];
    if (!last) return true;
    if (last.level !== system.level) return true;
    if (last.topSignalId !== (system.topSignal?.id || null)) return true;
    if (last.topClusterId !== (system.topCluster?.id || null)) return true;
    if (last.topTheaterId !== (system.topTheater?.id || null)) return true;
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
      topClusterId: system.topCluster?.id || null,
      topTheaterId: system.topTheater?.id || null,
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
      topClusterId: system.topCluster?.id || null,
      topTheaterId: system.topTheater?.id || null
    });

    if (STATE.archive.length > CONFIG.archiveLimit) {
      STATE.archive.shift();
    }
  }

  function updateHistory(system) {
    STATE.history.push({
      updatedAt: system.updatedAt,
      systemPressure: system.systemPressure,
      signalPressure: system.signalPressure,
      level: system.level,
      decision: system.decision,
      topSignalId: system.topSignal?.id || null,
      topClusterId: system.topCluster?.id || null,
      topTheaterId: system.topTheater?.id || null,
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
      .slice()
      .sort((a, b) => new Date(b.publishedAt || b.timestamp || 0) - new Date(a.publishedAt || a.timestamp || 0))
      .slice(0, 3);

    return {
      topTheater: system?.topTheater || null,
      topCluster: system?.topCluster || null,
      topSignal: system?.topSignal || null,
      topCountry,
      latestStudy,
      latestNews
    };
  }

  function computeSystemState() {
    if (window.IBSS_NEWS_UTILS?.autoRefreshIfNeeded) {
      window.IBSS_NEWS_UTILS.autoRefreshIfNeeded();
    }

    refreshAnalysisLayer();

    const rankedSignals = buildRankedSignals();
    const topSignal = rankedSignals[0] || null;

    const clusterState = refreshClusterLayer(rankedSignals);
    const clusters = asArray(clusterState?.clusters);
    const theaters = asArray(clusterState?.theaters);

    const topCluster = clusters[0] || null;
    const topTheater = theaters[0] || null;

    const newsItems = getNews();

    const signalPressure = buildSignalPressure(rankedSignals);
    const newsPressure = buildNewsPressure(newsItems);
    const clusterPressure = buildClusterPressure(clusters);
    const theaterPressure = buildTheaterPressure(theaters);

    const confidenceScore = buildConfidenceScore(
      newsPressure,
      clusterPressure,
      theaterPressure,
      rankedSignals
    );

    let systemPressure = Math.round(
      (signalPressure * 0.36) +
      (clusterPressure.pressure * 0.24) +
      (theaterPressure.pressure * 0.22) +
      (newsPressure.pressure * 0.18)
    );

    const theaterPriority = safeText(topTheater?.priority).toUpperCase();
    const clusterEsc = safeText(topCluster?.escalationLevel).toUpperCase();

    if (theaterPriority === "CORE") systemPressure += 4;
    if (clusterEsc === "SEVERE") systemPressure += 5;
    else if (clusterEsc === "HIGH") systemPressure += 2;

    systemPressure = clamp(systemPressure, 0, 100);

    const level = riskLevelFromScore(systemPressure);
    const decisionState = decisionFromLevel(level, systemPressure, confidenceScore);

    const liveSignals = rankedSignals.filter(signal => signal.live);
    const scenarios = buildScenarios(level, signalPressure, clusterPressure, theaterPressure);
    const countryRiskFeed = buildCountryRiskFeed(rankedSignals);

    const system = {
      source: "engine",
      updatedAt: nowIso(),
      ssi: systemPressure,
      systemPressure,
      signalPressure,
      confidenceScore,
      level,
      decision: decisionState.decision,
      mode: decisionState.mode,
      topTheater,
      theaters,
      theaterPressure,
      topCluster,
      clusters,
      clusterPressure,
      topSignal,
      dominantSignal: topSignal,
      rankedSignals,
      liveSignals,
      liveSignalsCount: liveSignals.length,
      scenarios,
      countryRiskFeed,
      newsPressure,
      feed: [],
      contentStats: getContentStats(),
      publishedContent: getPublishedContent(),
      publishedNewsContent: getPublishedNewsContent(),
      liveNews: newsItems,
      snapshot: null
    };

    system.feed = buildFeed(system);
    system.snapshot = getHomeSnapshot(system);

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

  function getStaticSystemFallback() {
    refreshAnalysisLayer();

    const rankedSignals = buildRankedSignals();
    const topSignal = rankedSignals[0] || null;

    const clusterState = buildFallbackClusterState(rankedSignals);
    const clusters = asArray(clusterState?.clusters);
    const theaters = asArray(clusterState?.theaters);

    const topCluster = clusters[0] || null;
    const topTheater = theaters[0] || null;

    const newsItems = getNews();

    const signalPressure = buildSignalPressure(rankedSignals);
    const newsPressure = buildNewsPressure(newsItems);
    const clusterPressure = buildClusterPressure(clusters);
    const theaterPressure = buildTheaterPressure(theaters);

    const confidenceScore = buildConfidenceScore(
      newsPressure,
      clusterPressure,
      theaterPressure,
      rankedSignals
    );

    let systemPressure = Math.round(
      (signalPressure * 0.36) +
      (clusterPressure.pressure * 0.24) +
      (theaterPressure.pressure * 0.22) +
      (newsPressure.pressure * 0.18)
    );

    const theaterPriority = safeText(topTheater?.priority).toUpperCase();
    const clusterEsc = safeText(topCluster?.escalationLevel).toUpperCase();

    if (theaterPriority === "CORE") systemPressure += 4;
    if (clusterEsc === "SEVERE") systemPressure += 5;
    else if (clusterEsc === "HIGH") systemPressure += 2;

    systemPressure = clamp(systemPressure, 0, 100);

    const level = riskLevelFromScore(systemPressure);
    const decisionState = decisionFromLevel(level, systemPressure, confidenceScore);
    const countryRiskFeed = buildCountryRiskFeed(rankedSignals);

    const system = {
      source: "fallback",
      updatedAt: nowIso(),
      ssi: systemPressure,
      systemPressure,
      signalPressure,
      confidenceScore,
      level,
      decision: decisionState.decision,
      mode: decisionState.mode,
      topTheater,
      theaters,
      theaterPressure,
      topCluster,
      clusters,
      clusterPressure,
      topSignal,
      dominantSignal: topSignal,
      rankedSignals,
      liveSignals: rankedSignals.filter(signal => signal.live),
      liveSignalsCount: rankedSignals.filter(signal => signal.live).length,
      scenarios: buildScenarios(level, signalPressure, clusterPressure, theaterPressure),
      countryRiskFeed,
      newsPressure,
      feed: [],
      contentStats: getContentStats(),
      publishedContent: getPublishedContent(),
      publishedNewsContent: getPublishedNewsContent(),
      liveNews: newsItems,
      snapshot: null
    };

    system.feed = buildFeed(system);
    system.snapshot = getHomeSnapshot(system);

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
