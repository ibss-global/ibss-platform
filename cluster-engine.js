window.IBSS_CLUSTER = (function () {
  "use strict";

  const CONFIG = {
    maxClusters: 40,
    minSignalsPerCluster: 1,
    highRiskThreshold: 75,
    elevatedRiskThreshold: 55,
    severeDensityThreshold: 4,
    historyLookback: 12,
    maxTheaters: 12
  };

  const STATE = {
    clusters: [],
    theaters: [],
    history: [],
    lastUpdate: null
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

    if (localized && typeof localized === "object") {
      return getLocalizedText(localized, lang);
    }

    return "-";
  }

  function localize(en, ar) {
    return { en, ar };
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function titleCase(text) {
    return safeText(text)
      .split(" ")
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  function detectPriority(score) {
    if (score >= 75) return "HIGH";
    if (score >= 55) return "MEDIUM";
    return "LOW";
  }

  function detectTrend(currentAvg, previousAvg) {
    if (previousAvg == null) return "STABLE";
    if (currentAvg > previousAvg + 4) return "RISING";
    if (currentAvg < previousAvg - 4) return "FALLING";
    return "STABLE";
  }

  function detectEscalationLevel(maxScore, density, trend) {
    let score = 0;

    if (maxScore >= 85) score += 4;
    else if (maxScore >= 70) score += 3;
    else if (maxScore >= 55) score += 2;
    else score += 1;

    if (density >= 5) score += 3;
    else if (density >= 3) score += 2;
    else if (density >= 2) score += 1;

    if (trend === "RISING") score += 2;
    else if (trend === "STABLE") score += 1;

    if (score >= 8) return "SEVERE";
    if (score >= 6) return "HIGH";
    if (score >= 4) return "ELEVATED";
    return "LOW";
  }

  function detectDecision(escalationLevel, avgRisk) {
    if (escalationLevel === "SEVERE" || avgRisk >= 85) return "ACTIVE RESPONSE";
    if (escalationLevel === "HIGH" || avgRisk >= 70) return "PREPARATION";
    if (escalationLevel === "ELEVATED" || avgRisk >= 50) return "HEIGHTENED MONITORING";
    return "MONITORING";
  }

  function readSignals() {
    try {
      if (window.IBSS_ANALYSIS && typeof window.IBSS_ANALYSIS.getSignals === "function") {
        return asArray(window.IBSS_ANALYSIS.getSignals());
      }
    } catch (error) {
      console.error("IBSS_CLUSTER readSignals error:", error);
    }

    return [];
  }

  function detectTheaterLayer(signal) {
    const country = normalizeText(signal?.country);
    const region = normalizeText(signal?.region);
    const domain = normalizeText(signal?.domain || signal?.signalType?.en || signal?.signalType);

    if (
      country === "gaza" ||
      country === "lebanon" ||
      country === "iran" ||
      country === "redsea" ||
      country === "westbank" ||
      region === "levant" ||
      region === "gaza" ||
      region === "palestine" ||
      region === "regional" ||
      domain === "military" ||
      domain === "security" ||
      domain === "maritime" ||
      domain === "geopolitical" ||
      domain === "diplomatic"
    ) {
      return {
        id: "middle-east-core",
        code: "MECT",
        name: localize("Middle East Core Theater", "المسرح السيادي للشرق الأوسط"),
        priority: "CORE"
      };
    }

    return {
      id: "outer-system-periphery",
      code: "OSP",
      name: localize("Outer System Periphery", "الأطراف الخارجية للنظام"),
      priority: "PERIPHERY"
    };
  }

  function detectStrategicFile(signal) {
    const country = normalizeText(signal?.country);
    const region = normalizeText(signal?.region);
    const domain = normalizeText(signal?.domain || signal?.signalType?.en || signal?.signalType);

    if (country === "gaza") {
      return {
        id: "gaza-strategic-file",
        code: "GSF",
        name: localize("Gaza Strategic File", "ملف غزة الاستراتيجي")
      };
    }

    if (country === "lebanon" || region === "levant") {
      return {
        id: "northern-front-file",
        code: "NFF",
        name: localize("Northern Front File", "ملف الجبهة الشمالية")
      };
    }

    if (country === "iran") {
      return {
        id: "iran-pressure-file",
        code: "IPF",
        name: localize("Iran Pressure File", "ملف الضغط على إيران")
      };
    }

    if (country === "redsea" || domain === "maritime") {
      return {
        id: "red-sea-maritime-file",
        code: "RSMF",
        name: localize("Red Sea Maritime File", "ملف البحر الأحمر البحري")
      };
    }

    if (country === "westbank") {
      return {
        id: "west-bank-security-file",
        code: "WBSF",
        name: localize("West Bank Security File", "ملف الضفة الغربية الأمني")
      };
    }

    return {
      id: `${country || region || domain || "general"}-strategic-file`,
      code: "GEN",
      name: localize(
        `${titleCase(country || region || domain || "General")} Strategic File`,
        `ملف ${country || region || domain || "عام"} الاستراتيجي`
      )
    };
  }

  function buildClusterKey(signal) {
    const theater = detectTheaterLayer(signal);
    const file = detectStrategicFile(signal);
    const domain = normalizeText(signal?.domain || signal?.signalType?.en || signal?.signalType || "general");

    return [
      theater.id,
      file.id,
      domain
    ].join("|");
  }

  function collectSources(items) {
    return [...new Set(
      asArray(items)
        .map(item => safeText(item?.source))
        .filter(Boolean)
    )];
  }

  function summarizeDrivers(items) {
    const buckets = new Map();

    asArray(items).forEach(item => {
      const keys = [
        getLocalizedText(item?.signalType, "en"),
        getLocalizedText(item?.domain, "en"),
        getLocalizedText(item?.decisionMode, "en"),
        ...asArray(item?.tags).slice(0, 2).map(tag => String(tag))
      ];

      keys.forEach(key => {
        const clean = safeText(key);
        if (!clean || clean === "-") return;
        buckets.set(clean, (buckets.get(clean) || 0) + 1);
      });
    });

    return [...buckets.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(entry => entry[0]);
  }

  function getPreviousClusterAvg(clusterId) {
    const history = STATE.history.slice(-CONFIG.historyLookback).reverse();

    for (const snapshot of history) {
      const found = asArray(snapshot.clusters).find(c => c.id === clusterId);
      if (found) return safeNumber(found.avgRisk, null);
    }

    return null;
  }

  function getPreviousTheaterAvg(theaterId) {
    const history = STATE.history.slice(-CONFIG.historyLookback).reverse();

    for (const snapshot of history) {
      const found = asArray(snapshot.theaters).find(t => t.id === theaterId);
      if (found) return safeNumber(found.avgRisk, null);
    }

    return null;
  }

  function buildCluster(itemList, key) {
    const items = asArray(itemList).sort(
      (a, b) => safeNumber(b.balancedScore100, 0) - safeNumber(a.balancedScore100, 0)
    );

    const seed = items[0] || null;
    if (!seed) return null;

    const theater = detectTheaterLayer(seed);
    const file = detectStrategicFile(seed);
    const count = items.length;
    const totalRisk = items.reduce((sum, item) => sum + safeNumber(item.balancedScore100, 0), 0);
    const avgRisk = count ? Math.round(totalRisk / count) : 0;
    const maxRisk = safeNumber(items[0]?.balancedScore100, 0);
    const liveCount = items.filter(item => item.live).length;
    const structuralCount = items.filter(item => item.structural).length;
    const sources = collectSources(items);
    const previousAvg = getPreviousClusterAvg(file.id);
    const trend = detectTrend(avgRisk, previousAvg);
    const escalationLevel = detectEscalationLevel(maxRisk, count, trend);
    const decision = detectDecision(escalationLevel, avgRisk);

    return {
      id: file.id,
      key,
      code: file.code,
      name: file.name,
      theater,
      country: safeText(seed?.country, "global"),
      region: safeText(seed?.region, "global"),
      domain: safeText(seed?.domain, "general"),
      count,
      liveCount,
      structuralCount,
      avgRisk,
      maxRisk,
      priority: detectPriority(maxRisk),
      trend,
      escalationLevel,
      decision,
      sources,
      sourceCount: sources.length,
      primaryDrivers: summarizeDrivers(items),
      topSignal: items[0],
      items,
      updatedAt: nowIso()
    };
  }

  function buildClustersFromSignals(signals) {
    const map = new Map();

    asArray(signals).forEach(signal => {
      const key = buildClusterKey(signal);
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key).push(signal);
    });

    return [...map.entries()]
      .map(([key, items]) => buildCluster(items, key))
      .filter(cluster => cluster && cluster.count >= CONFIG.minSignalsPerCluster)
      .sort((a, b) => {
        if (b.maxRisk !== a.maxRisk) return b.maxRisk - a.maxRisk;
        return b.count - a.count;
      })
      .slice(0, CONFIG.maxClusters);
  }

  function buildTheaters(clusters) {
    const map = new Map();

    asArray(clusters).forEach(cluster => {
      const theater = cluster?.theater;
      if (!theater) return;

      if (!map.has(theater.id)) {
        map.set(theater.id, {
          id: theater.id,
          code: theater.code,
          name: theater.name,
          priority: theater.priority,
          clusters: [],
          count: 0,
          avgRisk: 0,
          maxRisk: 0,
          liveCount: 0,
          structuralCount: 0,
          sourceCount: 0,
          trend: "STABLE",
          escalationLevel: "LOW",
          decision: "MONITORING",
          primaryDrivers: [],
          updatedAt: nowIso()
        });
      }

      const row = map.get(theater.id);
      row.clusters.push(cluster);
      row.count += cluster.count;
      row.liveCount += cluster.liveCount;
      row.structuralCount += cluster.structuralCount;
      row.maxRisk = Math.max(row.maxRisk, safeNumber(cluster.maxRisk, 0));
    });

    const theaters = [...map.values()].map(theater => {
      const avgRisk = theater.clusters.length
        ? Math.round(
            theater.clusters.reduce((sum, cluster) => sum + safeNumber(cluster.avgRisk, 0), 0) /
            theater.clusters.length
          )
        : 0;

      const allSources = [...new Set(
        theater.clusters.flatMap(cluster => asArray(cluster.sources))
      )];

      const allDrivers = [...new Set(
        theater.clusters.flatMap(cluster => asArray(cluster.primaryDrivers))
      )].slice(0, 6);

      const previousAvg = getPreviousTheaterAvg(theater.id);
      const trend = detectTrend(avgRisk, previousAvg);
      const escalationLevel = detectEscalationLevel(theater.maxRisk, theater.clusters.length, trend);
      const decision = detectDecision(escalationLevel, avgRisk);

      return {
        ...theater,
        avgRisk,
        sourceCount: allSources.length,
        sources: allSources,
        primaryDrivers: allDrivers,
        trend,
        escalationLevel,
        decision,
        topCluster: theater.clusters
          .slice()
          .sort((a, b) => safeNumber(b.maxRisk, 0) - safeNumber(a.maxRisk, 0))[0] || null
      };
    });

    return theaters
      .sort((a, b) => {
        if (b.maxRisk !== a.maxRisk) return b.maxRisk - a.maxRisk;
        return b.count - a.count;
      })
      .slice(0, CONFIG.maxTheaters);
  }

  function updateHistory(clusters, theaters) {
    STATE.history.push({
      createdAt: nowIso(),
      clusters: clusters.map(cluster => ({
        id: cluster.id,
        avgRisk: cluster.avgRisk,
        maxRisk: cluster.maxRisk,
        trend: cluster.trend,
        count: cluster.count
      })),
      theaters: theaters.map(theater => ({
        id: theater.id,
        avgRisk: theater.avgRisk,
        maxRisk: theater.maxRisk,
        trend: theater.trend,
        count: theater.count
      }))
    });

    if (STATE.history.length > 50) {
      STATE.history.shift();
    }
  }

  function compute() {
    const signals = readSignals();
    const clusters = buildClustersFromSignals(signals);
    const theaters = buildTheaters(clusters);

    STATE.clusters = clusters;
    STATE.theaters = theaters;
    STATE.lastUpdate = nowIso();
    updateHistory(clusters, theaters);

    return {
      clusters,
      theaters,
      lastUpdate: STATE.lastUpdate
    };
  }

  function getClusters() {
    return [...STATE.clusters];
  }

  function getTopClusters(limit = 6) {
    return getClusters().slice(0, Math.max(1, Number(limit) || 6));
  }

  function getClusterById(id) {
    return getClusters().find(cluster => cluster.id === id) || null;
  }

  function getClustersByPriority(priority) {
    const target = normalizeText(priority).toUpperCase();
    return getClusters().filter(cluster => normalizeText(cluster.priority).toUpperCase() === target);
  }

  function getTheaters() {
    return [...STATE.theaters];
  }

  function getTopTheaters(limit = 4) {
    return getTheaters().slice(0, Math.max(1, Number(limit) || 4));
  }

  function getTheaterById(id) {
    return getTheaters().find(theater => theater.id === id) || null;
  }

  function getClusterState() {
    return {
      clusterCount: STATE.clusters.length,
      theaterCount: STATE.theaters.length,
      lastUpdate: STATE.lastUpdate
    };
  }

  return {
    CONFIG,
    compute,
    getClusters,
    getTopClusters,
    getClusterById,
    getClustersByPriority,
    getTheaters,
    getTopTheaters,
    getTheaterById,
    getClusterState
  };
})();
