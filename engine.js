window.IBSS_ENGINE = (function () {
  "use strict";

  const CONFIG = {
    refreshMs: 4000,
    storageKey: "ibss_engine_state_v11",
    historyLimit: 180,
    reportLimit: 80,
    archiveLimit: 120
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

  function getLocalizedText(value, lang = "en") {
    if (!value) return "-";
    if (typeof value === "string" || typeof value === "number") return String(value);

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

    return "-";
  }

  function localize(en, ar) {
    return { en, ar };
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

  function normalizeBandCode(score) {
    if (window.IBSS_METRICS?.classifyBand) {
      return window.IBSS_METRICS.classifyBand(score)?.code || "LOW";
    }

    if (score >= 85) return "CRITICAL";
    if (score >= 70) return "HIGH";
    if (score >= 55) return "PRESSURE";
    if (score >= 35) return "WATCH";
    return "LOW";
  }

  function riskLevelFromScore(score) {
    const band = normalizeBandCode(score);
    if (band === "CRITICAL" || band === "HIGH") return "HIGH";
    if (band === "PRESSURE" || band === "WATCH") return "MEDIUM";
    return "LOW";
  }

  function decisionFromSystem(systemPressure, confidenceScore) {
    if (systemPressure >= 90 && confidenceScore >= 78) {
      return { decision: "ACT", mode: "ACTIVE RESPONSE" };
    }
    if (systemPressure >= 78) {
      return { decision: "PRD", mode: "PREPARATION" };
    }
    if (systemPressure >= 55) {
      return { decision: "WATCH+", mode: "HEIGHTENED MONITORING" };
    }
    return { decision: "WATCH", mode: "MONITORING" };
  }

  function getContent() {
    return asArray(window.IBSS_CONTENT);
  }

  function getCountries() {
    return asArray(window.IBSS_COUNTRIES);
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

  function getSignalsFromIngestion() {
    try {
      if (window.IBSS_INGESTION?.getAllNormalized) {
        return asArray(window.IBSS_INGESTION.getAllNormalized());
      }
    } catch (error) {
      console.error("IBSS_ENGINE ingestion read error:", error);
    }
    return [];
  }

  function domainWeight(domain) {
    const d = normalizeText(domain);
    if (d.includes("military")) return 1.15;
    if (d.includes("security")) return 1.10;
    if (d.includes("geopolitical")) return 1.05;
    if (d.includes("maritime")) return 1.00;
    if (d.includes("energy")) return 1.00;
    if (d.includes("diplomatic")) return 0.96;
    if (d.includes("economic")) return 0.94;
    return 1.00;
  }

  function priorityWeight(priority) {
    const p = normalizePriority(priority);
    if (p === "HIGH") return 1.15;
    if (p === "MEDIUM") return 1.00;
    return 0.82;
  }

  function freshnessWeight(item) {
    const freshness = safeNumber(item?.freshnessScore, NaN);
    if (Number.isFinite(freshness)) {
      return clamp(0.70 + (freshness * 0.50), 0.70, 1.20);
    }

    const ts = new Date(item?.timestamp || 0).getTime();
    if (!ts) return 0.90;

    const ageHours = (Date.now() - ts) / (1000 * 60 * 60);
    if (ageHours <= 6) return 1.15;
    if (ageHours <= 18) return 1.05;
    if (ageHours <= 36) return 0.95;
    return 0.85;
  }

  function reliabilityWeight(item) {
    const r = safeNumber(item?.reliabilityScore || item?.sourceProfile?.reliabilityScore, 55);
    return clamp(0.70 + (r / 200), 0.70, 1.20);
  }

  function buildRankedSignals() {
    const ingestionSignals = getSignalsFromIngestion();

    return ingestionSignals
      .map((signal, index) => {
        const base = safeNumber(signal?.score100, 0);
        const pWeight = priorityWeight(signal?.priority);
        const dWeight = domainWeight(signal?.domain);
        const fWeight = freshnessWeight(signal);
        const rWeight = reliabilityWeight(signal);

        const weightedScore = clamp(
          Math.round(base * pWeight * dWeight * fWeight * rWeight),
          0,
          100
        );

        return {
          id: safeText(signal?.id, `SIG-${index + 1}`),
          title: signal?.title || localize("Untitled Signal", "إشارة غير معنونة"),
          description: signal?.summary || localize("No summary.", "لا يوجد ملخص."),
          region: safeText(signal?.region, "global"),
          country: safeText(signal?.country, "global"),
          domain: safeText(signal?.domain, "geopolitical"),
          priority: normalizePriority(signal?.priority || inferPriorityFromScore(weightedScore)),
          score: weightedScore / 100,
          score100: weightedScore,
          balancedScore100: weightedScore,
          reliabilityScore: safeNumber(signal?.reliabilityScore, 55),
          freshnessScore: safeNumber(signal?.freshnessScore, 0.5),
          live: true,
          active: true,
          raw: signal
        };
      })
      .sort((a, b) => safeNumber(b.balancedScore100, 0) - safeNumber(a.balancedScore100, 0));
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
      const domain = normalizeText(signal.domain || "general") || "general";
      const key = `${region}::${domain}`;

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          region,
          domain,
          signals: [],
          totalRisk: 0,
          maxRisk: 0,
          avgReliability: 0
        });
      }

      const bucket = groups.get(key);
      const risk = safeNumber(signal.balancedScore100, signal.score100);

      bucket.signals.push(signal);
      bucket.totalRisk += risk;
      bucket.maxRisk = Math.max(bucket.maxRisk, risk);
      bucket.avgReliability += safeNumber(signal.reliabilityScore, 55);
    });

    const clusters = [...groups.values()]
      .map((group, index) => {
        const avgRisk = group.signals.length ? Math.round(group.totalRisk / group.signals.length) : 0;
        const avgReliability = group.signals.length ? Math.round(group.avgReliability / group.signals.length) : 55;

        const domainNameEn = group.domain === "general" ? "Strategic File" : group.domain.replace(/\b\w/g, c => c.toUpperCase());
        const regionNameEn = group.region === "global" ? "Global" : group.region.replace(/\b\w/g, c => c.toUpperCase());

        return {
          id: `CL-${index + 1}`,
          name: {
            en: `${regionNameEn} ${domainNameEn}`,
            ar: `${domainNameEn} ${regionNameEn}`
          },
          avgRisk,
          maxRisk: group.maxRisk,
          escalationLevel: riskLevelFromScore(avgRisk),
          priority: avgRisk >= 75 ? "CORE" : avgRisk >= 50 ? "SUPPORT" : "WATCH",
          trend: "STABLE",
          theaterId: `TH-${group.region}`,
          region: group.region,
          domain: group.domain,
          avgReliability,
          signals: group.signals
        };
      })
      .sort((a, b) => b.avgRisk - a.avgRisk);

    const theaterMap = new Map();

    clusters.forEach(cluster => {
      const region = normalizeText(cluster.region || "global") || "global";

      if (!theaterMap.has(region)) {
        theaterMap.set(region, {
          id: `TH-${region}`,
          region,
          name: region === "global"
            ? localize("Global Theater", "المسرح العالمي")
            : localize(`${region.replace(/\b\w/g, c => c.toUpperCase())} Theater`, `مسرح ${region.replace(/\b\w/g, c => c.toUpperCase())}`),
          clusters: [],
          avgSum: 0,
          maxRisk: 0,
          avgReliability: 0
        });
      }

      const theater = theaterMap.get(region);
      theater.clusters.push(cluster);
      theater.avgSum += safeNumber(cluster.avgRisk, 0);
      theater.maxRisk = Math.max(theater.maxRisk, safeNumber(cluster.maxRisk, 0));
      theater.avgReliability += safeNumber(cluster.avgReliability, 55);
    });

    const theaters = [...theaterMap.values()]
      .map(item => {
        const avgRisk = item.clusters.length ? Math.round(item.avgSum / item.clusters.length) : 0;
        const avgReliability = item.clusters.length ? Math.round(item.avgReliability / item.clusters.length) : 55;

        return {
          id: item.id,
          name: item.name,
          avgRisk,
          maxRisk: item.maxRisk,
          escalationLevel: riskLevelFromScore(avgRisk),
          priority: avgRisk >= 75 ? "CORE" : avgRisk >= 50 ? "SUPPORT" : "WATCH",
          trend: "STABLE",
          avgReliability,
          clusters: item.clusters
        };
      })
      .sort((a, b) => b.avgRisk - a.avgRisk);

    return {
      clusters,
      theaters,
      lastUpdate: nowIso()
    };
  }

  function buildSignalPressure(rankedSignals) {
    const list = asArray(rankedSignals);
    if (!list.length) return 0;

    const avgScore = Math.round(
      list.reduce((sum, signal) => sum + safeNumber(signal.balancedScore100, 0), 0) / list.length
    );

    const maxScore = safeNumber(list[0]?.balancedScore100, 0);
    const liveCount = list.filter(signal => signal.live).length;

    return clamp(
      Math.round((avgScore * 0.55) + (maxScore * 0.30) + (Math.min(liveCount, 12) * 1.25)),
      0,
      100
    );
  }

  function buildClusterPressure(clusters) {
    const list = asArray(clusters);
    if (!list.length) {
      return { count: 0, topCluster: null, pressure: 0 };
    }

    const topCluster = list[0];
    const avgRisk = Math.round(list.reduce((sum, cluster) => sum + safeNumber(cluster.avgRisk, 0), 0) / list.length);

    return {
      count: list.length,
      topCluster,
      pressure: clamp(
        Math.round((avgRisk * 0.65) + (safeNumber(topCluster?.maxRisk, 0) * 0.20) + (Math.min(list.length, 8) * 2)),
        0,
        100
      )
    };
  }

  function buildTheaterPressure(theaters) {
    const list = asArray(theaters);
    if (!list.length) {
      return { count: 0, topTheater: null, pressure: 0 };
    }

    const topTheater = list[0];
    const avgRisk = Math.round(list.reduce((sum, theater) => sum + safeNumber(theater.avgRisk, 0), 0) / list.length);

    return {
      count: list.length,
      topTheater,
      pressure: clamp(
        Math.round((avgRisk * 0.70) + (safeNumber(topTheater?.maxRisk, 0) * 0.20) + (Math.min(list.length, 5) * 2)),
        0,
        100
      )
    };
  }

  function buildNewsPressure(rankedSignals) {
    const list = asArray(rankedSignals);
    const highCount = list.filter(item => normalizePriority(item.priority) === "HIGH").length;
    const mediumCount = list.filter(item => normalizePriority(item.priority) === "MEDIUM").length;
    const lowCount = list.filter(item => normalizePriority(item.priority) === "LOW").length;

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

  function findPreviousCountryRisk(name) {
    for (let i = STATE.history.length - 1; i >= 0; i -= 1) {
      const row = STATE.history[i];
      const found = row.countryRiskFeed?.find(item => item.name === name);
      if (found) return found.riskScore;
    }
    return null;
  }

  function buildCountryRiskFeed(rankedSignals, clusters, theaters, newsPressure) {
    const countries = getCountries();

    if (countries.length) {
      return [...countries]
        .map(country => {
          const countryName = getLocalizedText(country.name, "en");
          const normalizedCountry = normalizeText(countryName);

          const relatedSignals = rankedSignals.filter(signal =>
            normalizeText(signal.country) === normalizedCountry ||
            normalizeText(signal.region) === normalizedCountry ||
            normalizeText(getLocalizedText(signal.title, "en")).includes(normalizedCountry)
          );

          const relatedClusters = clusters.filter(cluster =>
            normalizeText(cluster.region).includes(normalizedCountry) ||
            normalizeText(getLocalizedText(cluster.name, "en")).includes(normalizedCountry)
          );

          const relatedTheater = theaters.find(theater =>
            normalizeText(getLocalizedText(theater.name, "en")).includes(normalizedCountry)
          ) || null;

          let baseScore = safeNumber(country.riskScore, 0);

          if (relatedSignals.length) {
            const avgSignal = Math.round(
              relatedSignals.reduce((sum, signal) => sum + safeNumber(signal.balancedScore100, 0), 0) / relatedSignals.length
            );
            baseScore = Math.round((baseScore * 0.35) + (avgSignal * 0.65));
          }

          if (relatedClusters.length) {
            const avgCluster = Math.round(
              relatedClusters.reduce((sum, cluster) => sum + safeNumber(cluster.avgRisk, 0), 0) / relatedClusters.length
            );
            baseScore = Math.round((baseScore * 0.70) + (avgCluster * 0.30));
          }

          if (relatedTheater) {
            baseScore = Math.round((baseScore * 0.80) + (safeNumber(relatedTheater.avgRisk, 0) * 0.20));
          }

          if (safeNumber(newsPressure?.pressure, 0) >= 70) {
            baseScore += 2;
          }

          baseScore = clamp(baseScore, 0, 100);

          const previous = findPreviousCountryRisk(countryName);
          const trend = detectTrend(baseScore, previous);

          return {
            id: country.id || normalizedCountry,
            name: countryName,
            nameLocalized: country.name,
            riskScore: baseScore,
            riskLevel: riskLevelFromScore(baseScore),
            trend,
            primaryDrivers: asArray(country.primaryDrivers?.en || country.primaryDrivers || [])
          };
        })
        .sort((a, b) => b.riskScore - a.riskScore)
        .slice(0, 5);
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
          safeText(signal.domain, "geopolitical"),
          signal.priority
        ]
      };
    });
  }

  function buildConfidenceScore(rankedSignals, clusters, theaters) {
    const signalReliability = rankedSignals.length
      ? rankedSignals.reduce((sum, signal) => sum + safeNumber(signal.reliabilityScore, 55), 0) / rankedSignals.length
      : 0;

    const clusterReliability = clusters.length
      ? clusters.reduce((sum, cluster) => sum + safeNumber(cluster.avgReliability, 55), 0) / clusters.length
      : 0;

    const theaterReliability = theaters.length
      ? theaters.reduce((sum, theater) => sum + safeNumber(theater.avgReliability, 55), 0) / theaters.length
      : 0;

    const densityBoost =
      Math.min(rankedSignals.length, 12) * 1.2 +
      Math.min(clusters.length, 6) * 2 +
      Math.min(theaters.length, 4) * 3;

    const reliabilityComposite = (signalReliability * 0.45) + (clusterReliability * 0.30) + (theaterReliability * 0.25);

    return clamp(Math.round(reliabilityComposite + densityBoost), 0, 100);
  }

  function buildFeed(system) {
    const lines = [];

    rankedToFeed(system.rankedSignals).forEach(item => lines.push(item));

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

    lines.push({
      type: "newsPressure",
      priority: system.level,
      text: {
        en: `Live news pressure: ${system.newsPressure.count} items`,
        ar: `الضغط الخبري الحي: ${system.newsPressure.count} عناصر`
      }
    });

    return lines;
  }

  function rankedToFeed(rankedSignals) {
    return rankedSignals.slice(0, 2).map(item => ({
      type: "news",
      priority: item.priority,
      source: safeText(item?.raw?.source || item?.raw?.sourceName || item?.raw?.source || "INTAKE", "INTAKE"),
      text: {
        en: getLocalizedText(item.description, "en"),
        ar: getLocalizedText(item.description, "ar")
      }
    }));
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
    const topTheater = system.topTheater ? getLocalizedText(system.topTheater.name, lang) : (lang === "ar" ? "غير محدد" : "Undefined");
    const topCluster = system.topCluster ? getLocalizedText(system.topCluster.name, lang) : (lang === "ar" ? "غير محدد" : "Undefined");
    const topSignal = system.topSignal ? getLocalizedText(system.topSignal.title, lang) : (lang === "ar" ? "غير محدد" : "Undefined");

    if (lang === "ar") {
      return {
        summary: `رصد المحرك ضغطًا مركبًا بقيمة ${system.systemPressure} مع ثقة ${system.confidenceScore}.`,
        body: `المسرح الأعلى هو ${topTheater}. الملف الاستراتيجي الأعلى هو ${topCluster}. الإشارة الأعلى هي ${topSignal}.`,
        recommendation: system.systemPressure >= 78
          ? "يوصى بالتحضير ورفع الجاهزية على مستوى المسرح الأعلى."
          : "يوصى باستمرار المراقبة وتعزيز جمع الإشارات."
      };
    }

    return {
      summary: `The engine detected composite pressure at ${system.systemPressure} with confidence ${system.confidenceScore}.`,
      body: `Top theater: ${topTheater}. Top strategic file: ${topCluster}. Top signal: ${topSignal}.`,
      recommendation: system.systemPressure >= 78
        ? "Maintain preparation posture and raise readiness on the dominant theater."
        : "Continue monitoring and increase signal collection."
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
      summary: { en: en.summary, ar: ar.summary },
      body: { en: en.body, ar: ar.body },
      recommendation: { en: en.recommendation, ar: ar.recommendation }
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
      console.error("IBSS_ENGINE saveState error:", error);
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
      console.error("IBSS_ENGINE loadState error:", error);
    }
  }

  function getLatestStudy() {
    const published = getPublishedContent()
      .filter(item =>
        item &&
        (item.type === "study" ||
          item.type === "report" ||
          item.type === "analysis" ||
          item.type === "brief" ||
          item.type === "policy_paper")
      )
      .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));

    return published[0] || null;
  }

  function getHomeSnapshot(system) {
    const topCountry = asArray(system?.countryRiskFeed)[0] || null;
    const latestStudy = getLatestStudy();

    return {
      topTheater: system?.topTheater || null,
      topCluster: system?.topCluster || null,
      topSignal: system?.topSignal || null,
      topCountry,
      latestStudy,
      latestNews: system?.rankedSignals?.slice(0, 3) || []
    };
  }

  function computeSystemState() {
    const rankedSignals = buildRankedSignals();
    const topSignal = rankedSignals[0] || null;

    const clusterState = buildFallbackClusterState(rankedSignals);
    const clusters = asArray(clusterState.clusters);
    const theaters = asArray(clusterState.theaters);

    const topCluster = clusters[0] || null;
    const topTheater = theaters[0] || null;

    const signalPressure = buildSignalPressure(rankedSignals);
    const clusterPressure = buildClusterPressure(clusters);
    const theaterPressure = buildTheaterPressure(theaters);
    const newsPressure = buildNewsPressure(rankedSignals);
    const confidenceScore = buildConfidenceScore(rankedSignals, clusters, theaters);

    let systemPressure = Math.round(
      (signalPressure * 0.36) +
      (clusterPressure.pressure * 0.24) +
      (theaterPressure.pressure * 0.22) +
      (newsPressure.pressure * 0.18)
    );

    if (safeText(topTheater?.priority).toUpperCase() === "CORE") systemPressure += 4;
    if (safeText(topCluster?.escalationLevel).toUpperCase() === "HIGH") systemPressure += 2;

    systemPressure = clamp(systemPressure, 0, 100);

    const level = riskLevelFromScore(systemPressure);
    const decisionState = decisionFromSystem(systemPressure, confidenceScore);
    const liveSignals = rankedSignals.filter(signal => signal.live);

    const scenarios = systemPressure >= 85
      ? [{ key: "A", value: 57 }, { key: "B", value: 28 }, { key: "C", value: 15 }]
      : systemPressure >= 70
        ? [{ key: "A", value: 43 }, { key: "B", value: 34 }, { key: "C", value: 23 }]
        : [{ key: "A", value: 24 }, { key: "B", value: 33 }, { key: "C", value: 43 }];

    const countryRiskFeed = buildCountryRiskFeed(rankedSignals, clusters, theaters, newsPressure);

    const system = {
      source: rankedSignals.length ? "orchestrated" : "fallback",
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
      liveNews: rankedSignals,
      snapshot: null,
      metricsReference: "IBSS_METRICS_V1"
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

  function getSystemState() {
    return computeSystemState();
  }

  function getLastSystemState() {
    return STATE.lastSystem;
  }

  function getStaticSystemFallback() {
    return computeSystemState();
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
    riskLevelFromScore,
    buildUnifiedSignals: buildRankedSignals,
    buildNewsPressure
  };

  window.IBSS_UTILS = {
    getHomeSnapshot: api.getHomeSnapshot
  };

  return api;
})();
