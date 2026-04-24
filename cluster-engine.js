// IBSS CLUSTER ENGINE — Stable Strategic File Layer
// Version: v3.0

window.IBSS_CLUSTER_ENGINE = (function () {
  "use strict";

  const CONFIG = {
    version: "v3.0-stable-cluster-layer",
    minLiveScore: 40
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

  function titleCase(text) {
    return safeText(text)
      .split(" ")
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  function localize(en, ar) {
    return { en, ar };
  }

  function getLocalizedText(value, lang = "en") {
    if (!value) return "-";
    if (typeof value === "string" || typeof value === "number") return String(value);

    return String(
      value?.[lang] ||
      value?.en ||
      value?.ar ||
      value?.name ||
      value?.title ||
      value?.label ||
      value?.text ||
      "-"
    );
  }

  function riskLevelFromScore(score) {
    const value = safeNumber(score, 0);

    if (window.IBSS_METRICS?.classifyBand) {
      const band = window.IBSS_METRICS.classifyBand(value)?.code || "LOW";
      if (band === "CRITICAL" || band === "HIGH") return "HIGH";
      if (band === "PRESSURE" || band === "WATCH") return "MEDIUM";
      return "LOW";
    }

    if (value >= 70) return "HIGH";
    if (value >= 35) return "MEDIUM";
    return "LOW";
  }

  function buildClusterName(region, domain) {
    const regionName = region === "global" ? "Global" : titleCase(region.replace(/-/g, " "));
    const domainName = domain === "general" ? "Strategic File" : titleCase(domain.replace(/-/g, " "));

    return {
      en: `${regionName} ${domainName}`,
      ar: `${domainName} ${regionName}`
    };
  }

  function buildTheaterName(region) {
    if (region === "global") {
      return localize("Global Theater", "المسرح العالمي");
    }

    return localize(
      `${titleCase(region.replace(/-/g, " "))} Theater`,
      `مسرح ${titleCase(region.replace(/-/g, " "))}`
    );
  }

  function normalizeSignal(signal, index = 0) {
    const score = clamp(
      safeNumber(signal?.balancedScore100 ?? signal?.score100 ?? signal?.riskScore ?? signal?.score, 0),
      0,
      100
    );

    return {
      id: safeText(signal?.id, `SIG-${index + 1}`),
      title: signal?.title || localize("Untitled Signal", "إشارة غير معنونة"),
      region: normalizeText(signal?.region || signal?.country || "global") || "global",
      country: normalizeText(signal?.country || signal?.region || "global") || "global",
      domain: normalizeText(signal?.domain || "general") || "general",
      priority: safeText(signal?.priority, riskLevelFromScore(score)),
      score100: score,
      balancedScore100: score,
      reliabilityScore: clamp(safeNumber(signal?.reliabilityScore, 60), 0, 100),
      live: signal?.live !== false && score >= CONFIG.minLiveScore,
      raw: signal
    };
  }

  function buildClusters(signals = []) {
    const normalized = asArray(signals).map(normalizeSignal);
    const liveSignals = normalized.filter(signal => signal.live);

    if (!liveSignals.length) return [];

    const groupMap = new Map();

    liveSignals.forEach(signal => {
      const key = `${signal.region}::${signal.domain}`;

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          key,
          region: signal.region,
          domain: signal.domain,
          signals: [],
          totalRisk: 0,
          maxRisk: 0,
          reliabilitySum: 0
        });
      }

      const bucket = groupMap.get(key);
      const risk = safeNumber(signal.balancedScore100, 0);

      bucket.signals.push(signal);
      bucket.totalRisk += risk;
      bucket.maxRisk = Math.max(bucket.maxRisk, risk);
      bucket.reliabilitySum += safeNumber(signal.reliabilityScore, 60);
    });

    return [...groupMap.values()]
      .map((group, index) => {
        const count = group.signals.length || 1;
        const avgRisk = Math.round(group.totalRisk / count);
        const densityBonus = Math.min(count * 2, 8);
        const peakBonus = Math.round(group.maxRisk * 0.08);
        const calibratedRisk = clamp(Math.round((avgRisk * 0.78) + peakBonus + densityBonus), 0, 100);

        return {
          id: `CL-${index + 1}`,
          key: group.key,
          name: buildClusterName(group.region, group.domain),
          region: group.region,
          domain: group.domain,
          avgRisk: calibratedRisk,
          maxRisk: group.maxRisk,
          signalCount: count,
          avgReliability: Math.round(group.reliabilitySum / count),
          escalationLevel: riskLevelFromScore(calibratedRisk),
          priority: calibratedRisk >= 78 ? "CORE" : calibratedRisk >= 55 ? "SUPPORT" : "WATCH",
          trend: "STABLE",
          theaterId: `TH-${group.region}`,
          signals: group.signals
        };
      })
      .sort((a, b) => b.avgRisk - a.avgRisk);
  }

  function buildTheaters(clusters = []) {
    const list = asArray(clusters);
    if (!list.length) return [];

    const theaterMap = new Map();

    list.forEach(cluster => {
      const region = normalizeText(cluster.region || "global") || "global";

      if (!theaterMap.has(region)) {
        theaterMap.set(region, {
          id: `TH-${region}`,
          region,
          name: buildTheaterName(region),
          clusters: [],
          totalRisk: 0,
          maxRisk: 0,
          reliabilitySum: 0
        });
      }

      const theater = theaterMap.get(region);

      theater.clusters.push(cluster);
      theater.totalRisk += safeNumber(cluster.avgRisk, 0);
      theater.maxRisk = Math.max(theater.maxRisk, safeNumber(cluster.maxRisk, 0));
      theater.reliabilitySum += safeNumber(cluster.avgReliability, 60);
    });

    return [...theaterMap.values()]
      .map(item => {
        const count = item.clusters.length || 1;
        const avgRisk = Math.round(item.totalRisk / count);
        const densityBonus = Math.min(count * 2, 6);
        const peakBonus = Math.round(item.maxRisk * 0.06);
        const calibratedRisk = clamp(Math.round((avgRisk * 0.82) + peakBonus + densityBonus), 0, 100);

        return {
          id: item.id,
          region: item.region,
          name: item.name,
          avgRisk: calibratedRisk,
          maxRisk: item.maxRisk,
          clusterCount: count,
          avgReliability: Math.round(item.reliabilitySum / count),
          escalationLevel: riskLevelFromScore(calibratedRisk),
          priority: calibratedRisk >= 80 ? "CORE" : calibratedRisk >= 58 ? "SUPPORT" : "WATCH",
          trend: "STABLE",
          clusters: item.clusters
        };
      })
      .sort((a, b) => b.avgRisk - a.avgRisk);
  }

  function buildClusterState(signals = []) {
    const clusters = buildClusters(signals);
    const theaters = buildTheaters(clusters);

    return {
      clusters,
      theaters,
      topCluster: clusters[0] || null,
      topTheater: theaters[0] || null,
      generatedAt: new Date().toISOString()
    };
  }

  function getFromEngine() {
    try {
      const system =
        window.IBSS_ENGINE?.getLastSystemState?.() ||
        window.IBSS_ENGINE?.getSystemState?.();

      if (!system) return null;

      return {
        clusters: asArray(system.clusters),
        theaters: asArray(system.theaters),
        topCluster: system.topCluster || asArray(system.clusters)[0] || null,
        topTheater: system.topTheater || asArray(system.theaters)[0] || null,
        generatedAt: system.updatedAt || new Date().toISOString(),
        source: "engine"
      };
    } catch (error) {
      console.error("IBSS_CLUSTER_ENGINE getFromEngine error:", error);
      return null;
    }
  }

  function getClusterState() {
    const fromEngine = getFromEngine();

    if (fromEngine && (fromEngine.clusters.length || fromEngine.theaters.length)) {
      return fromEngine;
    }

    const signals =
      window.IBSS_ENGINE?.buildUnifiedSignals?.() ||
      window.IBSS_SIGNALS ||
      window.IBSS_DATA?.signals ||
      [];

    return {
      ...buildClusterState(signals),
      source: "cluster-engine"
    };
  }

  function getTopCluster() {
    return getClusterState().topCluster || null;
  }

  function getTopTheater() {
    return getClusterState().topTheater || null;
  }

  function getClusters() {
    return getClusterState().clusters || [];
  }

  function getTheaters() {
    return getClusterState().theaters || [];
  }

  window.IBSS_CLUSTERS = {
    getClusterState,
    getTopCluster,
    getTopTheater,
    getClusters,
    getTheaters
  };

  return {
    CONFIG,
    normalizeSignal,
    buildClusters,
    buildTheaters,
    buildClusterState,
    getClusterState,
    getTopCluster,
    getTopTheater,
    getClusters,
    getTheaters,
    getLocalizedText
  };
})();
