// IBSS ENGINE CORE — Adaptive Living Presence Full Rebuild
// Version: v3.2 Execution-Controlled Adaptive Living Engine

window.IBSS_ENGINE = (function () {
  "use strict";

  const CONFIG = {
    refreshMs: 4000,
    historyLimit: 180,
    reportLimit: 80,
    archiveLimit: 120,
    storageKey: "ibss_engine_state_v32_execution_controlled",
    minLiveSignalScore: 40,
    scenarioHighThreshold: 85,
    scenarioPrepThreshold: 70,
    maxFeedItems: 14,
    maxCountryRiskItems: 5,
    maxDrivers: 5,
    memoryWindow: 8,
    pressureJumpThreshold: 6,
    pressureDropThreshold: 6,
    strainPersistenceThreshold: 4
  };

  const EXECUTION = {
    lastSignalsAt: 0,
    lastClustersAt: 0,
    lastContentAt: 0,
    lastFullAt: 0,

    signalIntervalMs: 4000,
    clusterIntervalMs: 8000,
    contentIntervalMs: 15000,

    signalCache: null,
    clusterCache: null,
    contentCache: null
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

  function clone(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      console.error("IBSS_ENGINE clone error:", error);
      return null;
    }
  }

  function getLocalizedText(value, lang = "en") {
    if (!value) return "-";
    if (typeof value === "string" || typeof value === "number") return String(value);

    return String(
      value?.[lang] ??
      value?.en ??
      value?.ar ??
      value?.name ??
      value?.title ??
      value?.label ??
      value?.text ??
      "-"
    );
  }

  function average(list, selector) {
    const arr = asArray(list);
    if (!arr.length) return 0;
    return arr.reduce((sum, item) => sum + safeNumber(selector(item), 0), 0) / arr.length;
  }

  function dedupeBy(list, keyBuilder) {
    const map = new Map();
    asArray(list).forEach((item, index) => {
      const key = keyBuilder(item, index);
      if (!map.has(key)) map.set(key, item);
    });
    return [...map.values()];
  }

  function buildId(prefix) {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  }

  function normalizePriority(value) {
    const p = String(value || "LOW").toUpperCase().trim();
    if (p === "HIGH") return "HIGH";
    if (p === "MEDIUM") return "MEDIUM";
    return "LOW";
  }

  function priorityWeight(priority) {
    const p = normalizePriority(priority);
    if (p === "HIGH") return 3;
    if (p === "MEDIUM") return 2;
    return 1;
  }

  function inferPriorityFromScore(score) {
    if (score >= 78) return "HIGH";
    if (score >= 52) return "MEDIUM";
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

  function getDataRoot() {
    return window.IBSS_DATA || {};
  }

  function getContent() {
    if (window.IBSS_CONTENT) return asArray(window.IBSS_CONTENT);
    return asArray(getDataRoot().content);
  }

  function getCountries() {
    if (window.IBSS_COUNTRIES) return asArray(window.IBSS_COUNTRIES);
    return asArray(getDataRoot().countries);
  }

  function getSeedSignals() {
    if (window.IBSS_SIGNALS) return asArray(window.IBSS_SIGNALS);
    return asArray(getDataRoot().signals);
  }

  function getNewsSeed() {
    if (window.IBSS_NEWS) return asArray(window.IBSS_NEWS);
    return asArray(getDataRoot().newsFeed);
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
      published: content.filter(item => item?.status === "published").length,
      pending: content.filter(item => item?.status === "pending" || item?.status === "draft").length,
      archived: content.filter(item => item?.status === "archived").length,
      reports: content.filter(item => item?.type === "report").length,
      studies: content.filter(item => item?.type === "study").length,
      briefs: content.filter(item => item?.type === "brief").length,
      news: content.filter(item => item?.type === "news").length,
      policyPapers: content.filter(item => item?.type === "policy_paper").length,
      analyses: content.filter(item => item?.type === "analysis").length,
      models: content.filter(item => item?.type === "model").length
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

  function getContentAPI() {
    return window.IBSS_CONTENT_API || window.IBSS_CONTENT_UTILS || null;
  }

  function getSafeContentImpact(item) {
    const api = getContentAPI();

    if (api?.computeContentImpact) {
      try {
        return api.computeContentImpact(item) || {};
      } catch (error) {
        console.error("IBSS_ENGINE computeContentImpact error:", error);
      }
    }

    const strategicWeight = clamp(safeNumber(item?.metrics?.strategicWeight, 0), 0, 100);

    return {
      signalBoost: Math.round((strategicWeight * 0.08) + (item?.meta?.featured ? 3 : 0)),
      clusterBoost: Math.round((strategicWeight * 0.06) + (item?.meta?.canonical ? 3 : 0)),
      countryBoost: Math.round((strategicWeight * 0.07) + (item?.meta?.pinned ? 2 : 0)),
      confidenceBoost: Math.round((strategicWeight * 0.04) + (item?.meta?.featured ? 3 : 0) + (item?.meta?.canonical ? 3 : 0))
    };
  }

  function getEngineEligibleContent() {
    const api = getContentAPI();

    if (api?.getEngineEligibleContent) {
      try {
        return asArray(api.getEngineEligibleContent());
      } catch (error) {
        console.error("IBSS_ENGINE getEngineEligibleContent error:", error);
      }
    }

    return getPublishedContent().filter(item =>
      ["study", "report", "analysis", "brief", "policy_paper", "model"].includes(item?.type)
    );
  }

  function getContentCountryAliases(countryIdOrName) {
    if (window.IBSS_UTILS?.getCountryAliases) {
      try {
        return asArray(window.IBSS_UTILS.getCountryAliases(countryIdOrName));
      } catch (error) {
        console.error("IBSS_ENGINE getCountryAliases error:", error);
      }
    }

    const raw = normalizeText(countryIdOrName);
    if (!raw) return [];

    const aliases = new Set([raw]);

    const map = {
      "ctr-gaza": ["gaza", "levant", "palestine"],
      gaza: ["ctr-gaza", "levant", "palestine"],
      "ctr-wb": ["westbank", "west bank", "wb", "palestine"],
      westbank: ["ctr-wb", "west bank", "wb", "palestine"],
      "west bank": ["ctr-wb", "westbank", "wb", "palestine"],
      "ctr-leb": ["lebanon", "leb", "levant"],
      lebanon: ["ctr-leb", "leb", "levant"],
      "ctr-irn": ["iran", "irn", "regional", "gulf"],
      iran: ["ctr-irn", "irn", "regional", "gulf"],
      "ctr-rs": ["redsea", "red sea", "rs", "maritime"],
      redsea: ["ctr-rs", "red sea", "rs", "maritime"],
      "red sea": ["ctr-rs", "redsea", "rs", "maritime"]
    };

    asArray(map[raw]).forEach(alias => aliases.add(alias));
    return [...aliases];
  }

  function getContentControlCache() {
    const now = Date.now();

    if (
      EXECUTION.contentCache &&
      now - EXECUTION.lastContentAt < EXECUTION.contentIntervalMs
    ) {
      return EXECUTION.contentCache;
    }

    const api = getContentAPI();
    const eligible = getEngineEligibleContent();

    const cache = {
      api,
      eligible,
      confidenceBoost: clamp(
        eligible.reduce((sum, item) => {
          const impact = getSafeContentImpact(item);
          return sum + safeNumber(impact.confidenceBoost, 0);
        }, 0),
        0,
        18
      )
    };

    EXECUTION.contentCache = cache;
    EXECUTION.lastContentAt = now;

    return cache;
  }

  function getSignalContentBoost(signal) {
    const cache = getContentControlCache();
    const api = cache.api;

    if (!api || !signal?.id) return 0;

    try {
      const linked = asArray(api.getContentLinkedToSignal?.(signal.id));
      return clamp(
        linked.reduce((sum, item) => sum + safeNumber(getSafeContentImpact(item).signalBoost, 0), 0),
        0,
        25
      );
    } catch (error) {
      console.error("IBSS_ENGINE signal content boost error:", error);
      return 0;
    }
  }

  function getClusterContentBoost(region, domain) {
    const cache = getContentControlCache();
    const api = cache.api;

    if (!api) return 0;

    const clusterKey = `${normalizeText(region || "global")}::${normalizeText(domain || "general")}`;

    try {
      const linked = asArray(api.getContentLinkedToCluster?.(clusterKey));
      return clamp(
        linked.reduce((sum, item) => sum + safeNumber(getSafeContentImpact(item).clusterBoost, 0), 0),
        0,
        20
      );
    } catch (error) {
      console.error("IBSS_ENGINE cluster content boost error:", error);
      return 0;
    }
  }

  function getCountryContentBoost(countryIdOrName) {
    const cache = getContentControlCache();
    const api = cache.api;

    if (!api || !countryIdOrName) return 0;

    try {
      const aliases = getContentCountryAliases(countryIdOrName);

      const total = aliases.reduce((max, alias) => {
        const linked = asArray(api.getContentLinkedToCountry?.(alias));
        const localBoost = linked.reduce((sum, item) => {
          return sum + safeNumber(getSafeContentImpact(item).countryBoost, 0);
        }, 0);

        return Math.max(max, localBoost);
      }, 0);

      return clamp(total, 0, 24);
    } catch (error) {
      console.error("IBSS_ENGINE country content boost error:", error);
      return 0;
    }
  }

  function getSystemContentConfidenceBoost() {
    return safeNumber(getContentControlCache().confidenceBoost, 0);
  }

  function getLatestFeaturedContent() {
    const api = getContentAPI();

    try {
      if (api?.getLatestFeaturedContent) {
        const featured = api.getLatestFeaturedContent();
        if (featured) return featured;
      }
    } catch (error) {
      console.error("IBSS_ENGINE latest featured content error:", error);
    }

    const published = getPublishedContent().slice().sort((a, b) =>
      new Date(b?.publishedAt || 0) - new Date(a?.publishedAt || 0)
    );

    return (
      published.find(item => item?.meta?.featured) ||
      published.find(item => ["study", "report", "analysis", "brief", "policy_paper", "model"].includes(item?.type)) ||
      published[0] ||
      null
    );
  }

  function getSignalsFromSeedData() {
    return getSeedSignals().map((item, index) => {
      const directScore = safeNumber(item?.score100, NaN);
      const directBalanced = safeNumber(item?.balancedScore100, NaN);

      const derivedScore = clamp(
        Math.round(
          (safeNumber(item?.metrics?.weight, 0.5) * 35) +
          (safeNumber(item?.metrics?.volatility, 0.5) * 25) +
          (safeNumber(item?.metrics?.impact, 0.5) * 40)
        ),
        0,
        100
      );

      const finalScore = Number.isFinite(directBalanced)
        ? directBalanced
        : Number.isFinite(directScore)
          ? directScore
          : derivedScore;

      return {
        id: safeText(item?.id, `SEED-${index + 1}`),
        title: item?.title || localize("Untitled Signal", "إشارة غير معنونة"),
        summary: item?.summary || item?.report || item?.description || localize("No summary available.", "لا يوجد ملخص."),
        description: item?.description || item?.report || localize("No description available.", "لا يوجد وصف."),
        country: normalizeText(item?.country || item?.countryId || item?.region || "global"),
        region: normalizeText(item?.region || item?.country || "global"),
        domain: normalizeText(item?.domain || getLocalizedText(item?.signalType, "en") || "geopolitical"),
        priority: normalizePriority(item?.priority || item?.weight || inferPriorityFromScore(finalScore)),
        score100: finalScore,
        balancedScore100: finalScore,
        reliabilityScore: clamp(safeNumber(item?.reliabilityScore, 72), 0, 100),
        freshnessScore: clamp(safeNumber(item?.freshnessScore, item?.live ? 0.9 : 0.55), 0, 1),
        timestamp: item?.timestamp || nowIso(),
        source: safeText(item?.source, "IBSS_SEED"),
        sourceUnit: safeText(item?.sourceUnit, ""),
        signalType: item?.signalType || null,
        decisionMode: item?.decisionMode || item?.mode || null,
        layer: item?.layer || null,
        influenceBand: item?.influenceBand || null,
        raw: item
      };
    });
  }

  function getFallbackSignalsFromNews() {
    return getNewsSeed().map((item, index) => ({
      id: safeText(item?.id, `NEWS-${index + 1}`),
      title: item?.title || localize("Untitled News Signal", "إشارة خبرية غير معنونة"),
      summary: item?.summary || item?.text || item?.description || localize("No summary available.", "لا يوجد ملخص."),
      description: item?.summary || item?.text || item?.description || localize("No description available.", "لا يوجد وصف."),
      country: normalizeText(item?.country || item?.region || "global"),
      region: normalizeText(item?.region || item?.country || "global"),
      domain: normalizeText(item?.domain || item?.category || "geopolitical"),
      priority: normalizePriority(item?.priority || item?.severity),
      score100: clamp(safeNumber(item?.score100, 50), 0, 100),
      balancedScore100: clamp(safeNumber(item?.balancedScore100, item?.score100 ?? 50), 0, 100),
      reliabilityScore: clamp(safeNumber(item?.reliabilityScore, 60), 0, 100),
      freshnessScore: clamp(safeNumber(item?.freshnessScore, 0.5), 0, 1),
      timestamp: item?.publishedAt || item?.timestamp || nowIso(),
      source: item?.source || item?.sourceName || "NEWS",
      sourceUnit: safeText(item?.sourceUnit, ""),
      signalType: item?.signalType || "news",
      decisionMode: item?.decisionMode || item?.mode || null,
      layer: item?.layer || null,
      influenceBand: item?.influenceBand || null,
      raw: item
    }));
  }

  function priorityBonus(priority) {
    const p = normalizePriority(priority);
    if (p === "HIGH") return 10;
    if (p === "MEDIUM") return 5;
    return 1;
  }

  function domainBonus(domain) {
    const d = normalizeText(domain);
    if (d.includes("military")) return 6;
    if (d.includes("security")) return 5;
    if (d.includes("geo-security")) return 5;
    if (d.includes("geopolitical")) return 4;
    if (d.includes("governance")) return 4;
    if (d.includes("maritime")) return 3;
    if (d.includes("energy")) return 3;
    if (d.includes("economic")) return 2;
    if (d.includes("diplomatic")) return 2;
    return 3;
  }

  function freshnessBonus(item) {
    const direct = safeNumber(item?.freshnessScore, NaN);

    if (Number.isFinite(direct)) {
      return Math.round(clamp(direct, 0, 1) * 8);
    }

    const ts = new Date(item?.timestamp || 0).getTime();
    if (!ts) return 2;

    const ageHours = (Date.now() - ts) / (1000 * 60 * 60);
    if (ageHours <= 6) return 8;
    if (ageHours <= 18) return 6;
    if (ageHours <= 36) return 4;
    return 2;
  }

  function reliabilityBonus(item) {
    const r = safeNumber(item?.reliabilityScore || item?.sourceProfile?.reliabilityScore, 55);
    if (r >= 85) return 8;
    if (r >= 75) return 6;
    if (r >= 65) return 4;
    if (r >= 55) return 2;
    return 0;
  }

  function normalizeRawSignal(signal, index = 0) {
    const country = normalizeText(signal?.country || "global");
    const region = normalizeText(signal?.region || signal?.country || "global");
    const domain = normalizeText(signal?.domain || "geopolitical");
    const reliabilityScore = clamp(safeNumber(signal?.reliabilityScore, 60), 0, 100);
    const freshnessScore = clamp(safeNumber(signal?.freshnessScore, 0.5), 0, 1);
    const baseScore = clamp(safeNumber(signal?.score100, signal?.balancedScore100 ?? 50), 0, 100);

    const preliminaryScore = clamp(
      Math.round(
        (baseScore * 0.72) +
        priorityBonus(signal?.priority) +
        domainBonus(domain) +
        freshnessBonus({ freshnessScore, timestamp: signal?.timestamp }) +
        reliabilityBonus({ reliabilityScore })
      ),
      0,
      100
    );

    return {
      id: safeText(signal?.id, `SIG-${index + 1}`),
      title: signal?.title || localize("Untitled Signal", "إشارة غير معنونة"),
      summary: signal?.summary || signal?.description || localize("No summary available.", "لا يوجد ملخص."),
      description: signal?.description || signal?.summary || localize("No description available.", "لا يوجد وصف."),
      country,
      region,
      domain,
      priority: normalizePriority(signal?.priority || inferPriorityFromScore(preliminaryScore)),
      score: preliminaryScore / 100,
      score100: preliminaryScore,
      balancedScore100: preliminaryScore,
      reliabilityScore,
      freshnessScore,
      timestamp: signal?.timestamp || nowIso(),
      source: safeText(signal?.source, "INTAKE"),
      sourceUnit: safeText(signal?.sourceUnit, ""),
      signalType: signal?.signalType || null,
      decisionMode: signal?.decisionMode || signal?.mode || null,
      layer: signal?.layer || null,
      influenceBand: signal?.influenceBand || null,
      live: preliminaryScore >= CONFIG.minLiveSignalScore,
      active: preliminaryScore >= CONFIG.minLiveSignalScore,
      raw: signal
    };
  }

  function buildRankedSignals(force = false) {
    const now = Date.now();

    if (
      !force &&
      EXECUTION.signalCache &&
      now - EXECUTION.lastSignalsAt < EXECUTION.signalIntervalMs
    ) {
      return clone(EXECUTION.signalCache) || [];
    }

    const ingestionSignals = getSignalsFromIngestion();
    const seedSignals = ingestionSignals.length ? [] : getSignalsFromSeedData();
    const fallbackSignals = ingestionSignals.length || seedSignals.length ? [] : getFallbackSignalsFromNews();

    const rawSignals = ingestionSignals.length
      ? ingestionSignals
      : seedSignals.length
        ? seedSignals
        : fallbackSignals;

    const normalized = rawSignals
      .map(normalizeRawSignal)
      .map(signal => {
        const contentBoost = getSignalContentBoost(signal);
        const finalScore = clamp(safeNumber(signal.score100, 0) + contentBoost, 0, 100);

        return {
          ...signal,
          contentBoost,
          priority: normalizePriority(signal.priority || inferPriorityFromScore(finalScore)),
          score: finalScore / 100,
          score100: finalScore,
          balancedScore100: finalScore,
          live: finalScore >= CONFIG.minLiveSignalScore,
          active: finalScore >= CONFIG.minLiveSignalScore
        };
      })
      .sort((a, b) => safeNumber(b.balancedScore100, 0) - safeNumber(a.balancedScore100, 0));

    const ranked = dedupeBy(normalized, item => [
      normalizeText(getLocalizedText(item.title, "en")),
      normalizeText(item.country),
      normalizeText(item.domain)
    ].join("|"));

    EXECUTION.signalCache = clone(ranked);
    EXECUTION.lastSignalsAt = now;

    return ranked;
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
    if (region === "global") return localize("Global Theater", "المسرح العالمي");

    return localize(
      `${titleCase(region.replace(/-/g, " "))} Theater`,
      `مسرح ${titleCase(region.replace(/-/g, " "))}`
    );
  }

  function buildClusterStateFresh(rankedSignals) {
    const liveSignals = rankedSignals.filter(signal => signal.live);

    if (!liveSignals.length) {
      return { clusters: [], theaters: [], lastUpdate: nowIso() };
    }

    const groupMap = new Map();

    liveSignals.forEach(signal => {
      const region = normalizeText(signal.region || signal.country || "global") || "global";
      const domain = normalizeText(signal.domain || "general") || "general";
      const key = `${region}::${domain}`;

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          key,
          region,
          domain,
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
      bucket.reliabilitySum += safeNumber(signal.reliabilityScore, 55);
    });

    const clusters = [...groupMap.values()]
      .map((group, index) => {
        const count = group.signals.length || 1;
        const avgRisk = Math.round(group.totalRisk / count);
        const avgReliability = Math.round(group.reliabilitySum / count);
        const densityBonus = Math.min(count * 2, 8);
        const peakBonus = Math.round(group.maxRisk * 0.08);
        const contentBoost = getClusterContentBoost(group.region, group.domain);

        const calibratedRisk = clamp(
          Math.round((avgRisk * 0.78) + peakBonus + densityBonus + contentBoost),
          0,
          100
        );

        return {
          id: `CL-${index + 1}`,
          key: group.key,
          name: buildClusterName(group.region, group.domain),
          avgRisk: calibratedRisk,
          maxRisk: clamp(group.maxRisk + contentBoost, 0, 100),
          escalationLevel: riskLevelFromScore(calibratedRisk),
          priority: calibratedRisk >= 78 ? "CORE" : calibratedRisk >= 55 ? "SUPPORT" : "WATCH",
          trend: "STABLE",
          theaterId: `TH-${group.region}`,
          region: group.region,
          domain: group.domain,
          avgReliability,
          contentBoost,
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
          name: buildTheaterName(region),
          clusters: [],
          avgSum: 0,
          maxRisk: 0,
          reliabilitySum: 0
        });
      }

      const theater = theaterMap.get(region);
      theater.clusters.push(cluster);
      theater.avgSum += safeNumber(cluster.avgRisk, 0);
      theater.maxRisk = Math.max(theater.maxRisk, safeNumber(cluster.maxRisk, 0));
      theater.reliabilitySum += safeNumber(cluster.avgReliability, 55);
    });

    const theaters = [...theaterMap.values()]
      .map(item => {
        const count = item.clusters.length || 1;
        const avgRisk = Math.round(item.avgSum / count);
        const avgReliability = Math.round(item.reliabilitySum / count);
        const densityBonus = Math.min(count * 2, 6);
        const peakBonus = Math.round(item.maxRisk * 0.06);

        const calibratedRisk = clamp(
          Math.round((avgRisk * 0.82) + peakBonus + densityBonus),
          0,
          100
        );

        return {
          id: item.id,
          name: item.name,
          avgRisk: calibratedRisk,
          maxRisk: item.maxRisk,
          escalationLevel: riskLevelFromScore(calibratedRisk),
          priority: calibratedRisk >= 80 ? "CORE" : calibratedRisk >= 58 ? "SUPPORT" : "WATCH",
          trend: "STABLE",
          avgReliability,
          clusters: item.clusters
        };
      })
      .sort((a, b) => b.avgRisk - a.avgRisk);

    return { clusters, theaters, lastUpdate: nowIso() };
  }

  function buildClusterState(rankedSignals, force = false) {
    const now = Date.now();

    if (
      !force &&
      EXECUTION.clusterCache &&
      now - EXECUTION.lastClustersAt < EXECUTION.clusterIntervalMs
    ) {
      return clone(EXECUTION.clusterCache) || { clusters: [], theaters: [], lastUpdate: nowIso() };
    }

    const state = buildClusterStateFresh(rankedSignals);
    EXECUTION.clusterCache = clone(state);
    EXECUTION.lastClustersAt = now;

    return state;
  }

  function buildSignalPressure(rankedSignals) {
    const list = asArray(rankedSignals);
    if (!list.length) return 0;

    const avgScore = Math.round(average(list, item => item.balancedScore100));
    const maxScore = safeNumber(list[0]?.balancedScore100, 0);
    const liveCount = list.filter(signal => signal.live).length;

    return clamp(Math.round((avgScore * 0.68) + (maxScore * 0.18) + Math.min(liveCount, 10)), 0, 100);
  }

  function buildClusterPressure(clusters) {
    const list = asArray(clusters);
    if (!list.length) return { count: 0, topCluster: null, pressure: 0 };

    const topCluster = list[0];
    const avgRisk = Math.round(average(list, cluster => cluster.avgRisk));

    return {
      count: list.length,
      topCluster,
      pressure: clamp(
        Math.round((avgRisk * 0.72) + (safeNumber(topCluster?.maxRisk, 0) * 0.12) + Math.min(list.length * 2, 8)),
        0,
        100
      )
    };
  }

  function buildTheaterPressure(theaters) {
    const list = asArray(theaters);
    if (!list.length) return { count: 0, topTheater: null, pressure: 0 };

    const topTheater = list[0];
    const avgRisk = Math.round(average(list, theater => theater.avgRisk));

    return {
      count: list.length,
      topTheater,
      pressure: clamp(
        Math.round((avgRisk * 0.74) + (safeNumber(topTheater?.maxRisk, 0) * 0.10) + Math.min(list.length * 2, 6)),
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

    return {
      count: list.length,
      highCount,
      mediumCount,
      lowCount,
      pressure: clamp((highCount * 16) + (mediumCount * 9) + (lowCount * 4), 0, 100)
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

  function matchesCountry(country, text) {
    const target = normalizeText(text);
    const aliases = getContentCountryAliases(country.id || getLocalizedText(country.name, "en"));
    return aliases.some(alias => target.includes(alias));
  }

  function buildCountryRiskFeed(rankedSignals, clusters, theaters, newsPressure) {
    const countries = getCountries();

    if (!countries.length) {
      return rankedSignals.slice(0, CONFIG.maxCountryRiskItems).map(signal => {
        const name = getLocalizedText(signal.title, "en");
        const riskScore = clamp(Math.round(safeNumber(signal.balancedScore100, 0) * 0.92), 0, 100);

        return {
          id: signal.id,
          name,
          nameLocalized: { en: name, ar: getLocalizedText(signal.title, "ar") },
          riskScore,
          riskLevel: riskLevelFromScore(riskScore),
          trend: "STABLE",
          band: normalizeBandCode(riskScore),
          contentBoost: 0,
          primaryDrivers: [name, signal.domain, signal.priority]
        };
      });
    }

    return countries
      .map(country => {
        const countryName = getLocalizedText(country.name, "en");

        const relatedSignals = rankedSignals.filter(signal =>
          matchesCountry(country, signal.country) ||
          matchesCountry(country, signal.region) ||
          matchesCountry(country, getLocalizedText(signal.title, "en"))
        );

        const relatedClusters = clusters.filter(cluster =>
          matchesCountry(country, cluster.region) ||
          matchesCountry(country, getLocalizedText(cluster.name, "en"))
        );

        const relatedTheater = theaters.find(theater =>
          matchesCountry(country, getLocalizedText(theater.name, "en"))
        ) || null;

        let baseScore = safeNumber(country.riskScore, 0);

        if (relatedSignals.length) {
          baseScore = Math.round((baseScore * 0.50) + (average(relatedSignals, signal => signal.balancedScore100) * 0.50));
        }

        if (relatedClusters.length) {
          baseScore = Math.round((baseScore * 0.72) + (average(relatedClusters, cluster => cluster.avgRisk) * 0.28));
        }

        if (relatedTheater) {
          baseScore = Math.round((baseScore * 0.84) + (safeNumber(relatedTheater.avgRisk, 0) * 0.16));
        }

        if (safeNumber(newsPressure?.pressure, 0) >= 70) baseScore += 1;

        const contentBoost = getCountryContentBoost(country.id || country.countryId || countryName);
        const riskScore = clamp(baseScore + contentBoost, 0, 100);
        const previous = findPreviousCountryRisk(countryName);

        return {
          id: country.id || normalizeText(countryName),
          name: countryName,
          nameLocalized: country.nameLocalized || country.name,
          riskScore,
          riskLevel: riskLevelFromScore(riskScore),
          trend: detectTrend(riskScore, previous),
          band: normalizeBandCode(riskScore),
          contentBoost,
          primaryDrivers: asArray(country.primaryDrivers?.en || country.primaryDrivers || [])
        };
      })
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, CONFIG.maxCountryRiskItems);
  }

  function buildUnifiedRisk(topCountry, liveSignalsCount) {
    if (!topCountry) {
      return {
        unit: "Unified Risk Unit",
        topCountry: null,
        riskScore: 0,
        trend: "STABLE",
        riskLevel: "LOW",
        band: "LOW",
        liveSignals: safeNumber(liveSignalsCount, 0),
        drivers: []
      };
    }

    return {
      unit: "Unified Risk Unit",
      topCountry: topCountry.name,
      riskScore: safeNumber(topCountry.riskScore, 0),
      trend: safeText(topCountry.trend, "STABLE"),
      riskLevel: safeText(topCountry.riskLevel, "LOW"),
      band: safeText(topCountry.band, normalizeBandCode(topCountry.riskScore)),
      liveSignals: safeNumber(liveSignalsCount, 0),
      drivers: asArray(topCountry.primaryDrivers).slice(0, 5)
    };
  }

  function buildConfidenceScore(rankedSignals, clusters, theaters) {
    const signalReliability = rankedSignals.length ? average(rankedSignals, signal => signal.reliabilityScore) : 0;
    const clusterReliability = clusters.length ? average(clusters, cluster => cluster.avgReliability) : 0;
    const theaterReliability = theaters.length ? average(theaters, theater => theater.avgReliability) : 0;

    const densityBoost =
      Math.min(rankedSignals.length, 12) +
      Math.min(clusters.length, 6) * 1.5 +
      Math.min(theaters.length, 4) * 2;

    const reliabilityComposite =
      (signalReliability * 0.50) +
      (clusterReliability * 0.30) +
      (theaterReliability * 0.20);

    return clamp(Math.round(reliabilityComposite + densityBoost + getSystemContentConfidenceBoost()), 0, 100);
  }

  function buildSystemDrivers(rankedSignals, clusters, theaters, countryRiskFeed) {
    const drivers = [];

    rankedSignals.slice(0, 2).forEach(signal => {
      drivers.push({
        id: `DRV-SIG-${signal.id}`,
        type: "signal",
        priority: normalizePriority(signal.priority),
        score: safeNumber(signal.balancedScore100, 0),
        label: {
          en: `${getLocalizedText(signal.title, "en")} pressure`,
          ar: `ضغط ${getLocalizedText(signal.title, "ar")}`
        },
        explanation: {
          en: `Signal score ${safeNumber(signal.balancedScore100, 0)} contributed directly to system pressure.`,
          ar: `درجة الإشارة ${safeNumber(signal.balancedScore100, 0)} ساهمت مباشرة في ضغط النظام.`
        }
      });
    });

    if (clusters[0]) {
      drivers.push({
        id: `DRV-CL-${clusters[0].id}`,
        type: "cluster",
        priority: clusters[0].priority === "CORE" ? "HIGH" : "MEDIUM",
        score: safeNumber(clusters[0].avgRisk, 0),
        label: {
          en: `${getLocalizedText(clusters[0].name, "en")} file pressure`,
          ar: `ضغط ملف ${getLocalizedText(clusters[0].name, "ar")}`
        },
        explanation: {
          en: "The top strategic file raised structured pressure through file concentration.",
          ar: "الملف الاستراتيجي الأعلى رفع الضغط البنيوي عبر تركز الملف."
        }
      });
    }

    if (theaters[0]) {
      drivers.push({
        id: `DRV-TH-${theaters[0].id}`,
        type: "theater",
        priority: theaters[0].priority === "CORE" ? "HIGH" : "MEDIUM",
        score: safeNumber(theaters[0].avgRisk, 0),
        label: {
          en: `${getLocalizedText(theaters[0].name, "en")} theater pressure`,
          ar: `ضغط مسرح ${getLocalizedText(theaters[0].name, "ar")}`
        },
        explanation: {
          en: "The dominant theater concentrated operational pressure across multiple files.",
          ar: "المسرح المهيمن ركز الضغط التشغيلي عبر عدة ملفات."
        }
      });
    }

    if (countryRiskFeed[0]) {
      drivers.push({
        id: `DRV-CTR-${countryRiskFeed[0].id}`,
        type: "country",
        priority: countryRiskFeed[0].riskLevel === "HIGH" ? "HIGH" : "MEDIUM",
        score: safeNumber(countryRiskFeed[0].riskScore, 0),
        label: {
          en: `${safeText(countryRiskFeed[0].name)} risk concentration`,
          ar: `تركز المخاطر في ${safeText(countryRiskFeed[0].name)}`
        },
        explanation: {
          en: "Top country risk reinforced the unified pressure profile.",
          ar: "أعلى خطر دولي عزز ملف الضغط الموحد."
        }
      });
    }

    return drivers
      .sort((a, b) => safeNumber(b.score, 0) - safeNumber(a.score, 0))
      .slice(0, CONFIG.maxDrivers);
  }

  function getRecentHistory(limit = CONFIG.memoryWindow) {
    return STATE.history.slice(-Math.max(1, limit));
  }

  function computePressureDrift(currentPressure) {
    const recent = getRecentHistory();

    if (!recent.length) {
      return { direction: "STABLE", delta: 0, persistence: 0, volatility: 0 };
    }

    const last = recent[recent.length - 1];
    const previousPressure = safeNumber(last?.systemPressure, currentPressure);
    const delta = currentPressure - previousPressure;

    let direction = "STABLE";
    if (delta >= CONFIG.pressureJumpThreshold) direction = "RISING_FAST";
    else if (delta > 1) direction = "RISING";
    else if (delta <= -CONFIG.pressureDropThreshold) direction = "FALLING_FAST";
    else if (delta < -1) direction = "FALLING";

    let persistence = 0;
    for (let i = recent.length - 1; i >= 0; i -= 1) {
      const value = safeNumber(recent[i]?.systemPressure, 0);
      if (value >= 78) persistence += 1;
      else break;
    }

    let volatility = 0;
    for (let i = 1; i < recent.length; i += 1) {
      volatility += Math.abs(
        safeNumber(recent[i]?.systemPressure, 0) -
        safeNumber(recent[i - 1]?.systemPressure, 0)
      );
    }

    volatility = recent.length > 1 ? Math.round(volatility / (recent.length - 1)) : 0;

    return { direction, delta, persistence, volatility };
  }

  function buildPresenceState(systemPressure, confidenceScore, drift) {
    let state = "monitoring";
    let intensity = "contained";
    let urgency = "low";

    if (systemPressure >= 90 && confidenceScore >= 75) {
      state = "active_response";
      intensity = "critical";
      urgency = "immediate";
    } else if (systemPressure >= 82) {
      state = "preparation";
      intensity = "high";
      urgency = "high";
    } else if (systemPressure >= 60) {
      state = "elevated_watch";
      intensity = "elevated";
      urgency = "medium";
    }

    if (drift.persistence >= CONFIG.strainPersistenceThreshold && systemPressure >= 70) {
      state = "strategic_strain";
      intensity = "strained";
      urgency = "high";
    }

    return { state, intensity, urgency, drift: drift.direction };
  }

  function formatDriverNames(driverNames, lang = "en") {
    const arr = asArray(driverNames).filter(Boolean);
    if (!arr.length) return lang === "ar" ? "لا شيء" : "none";
    if (arr.length === 1) return arr[0];
    if (arr.length === 2) return lang === "ar" ? `${arr[0]} و ${arr[1]}` : `${arr[0]} and ${arr[1]}`;

    const head = arr.slice(0, -1).join(lang === "ar" ? "، " : ", ");
    const tail = arr[arr.length - 1];

    return lang === "ar" ? `${head}، و ${tail}` : `${head}, and ${tail}`;
  }

  function buildVoice(system) {
    const topSignal = system?.topSignal || null;
    const topTheater = system?.topTheater || null;
    const topCluster = system?.topCluster || null;
    const presence = system?.presence || {};
    const drivers = asArray(system?.drivers || []);
    const pressure = safeNumber(system?.systemPressure, 0);
    const confidence = safeNumber(system?.confidenceScore, 0);

    const signalNameEn = topSignal ? getLocalizedText(topSignal.title, "en") : "the current signal layer";
    const signalNameAr = topSignal ? getLocalizedText(topSignal.title, "ar") : "طبقة الإشارات الحالية";
    const theaterNameEn = topTheater ? getLocalizedText(topTheater.name, "en") : "the active theater";
    const theaterNameAr = topTheater ? getLocalizedText(topTheater.name, "ar") : "المسرح النشط";
    const clusterNameEn = topCluster ? getLocalizedText(topCluster.name, "en") : "the strategic file";
    const clusterNameAr = topCluster ? getLocalizedText(topCluster.name, "ar") : "الملف الاستراتيجي";

    const driverNamesEn = drivers.slice(0, 3).map(item => getLocalizedText(item.label, "en"));
    const driverNamesAr = drivers.slice(0, 3).map(item => getLocalizedText(item.label, "ar"));

    let postureEn = "Monitoring posture";
    let postureAr = "وضعية مراقبة";
    let summaryEn = "The platform is observing controlled movement across the signal layer.";
    let summaryAr = "المنصة ترصد حركة مضبوطة داخل طبقة الإشارات.";
    let explanationEn = "No single pressure axis is forcing a hard directional shift yet.";
    let explanationAr = "لا يوجد محور ضغط منفرد يفرض تحولاً اتجاهياً حاداً حتى الآن.";
    let advisoryEn = "Maintain observation, preserve linkage quality, and avoid premature escalation logic.";
    let advisoryAr = "استمر في المراقبة، وحافظ على جودة الربط، وتجنب منطق التصعيد المبكر.";
    let intentEn = "Observe and stabilize.";
    let intentAr = "راقب وثبّت.";

    if (presence.state === "elevated_watch") {
      postureEn = "Elevated watch posture";
      postureAr = "وضعية مراقبة مرتفعة";
      summaryEn = `The platform is no longer reading isolated signals, but converging pressure around ${theaterNameEn}.`;
      summaryAr = `المنصة لم تعد تقرأ إشارات معزولة، بل ضغطاً متقارباً حول ${theaterNameAr}.`;
      explanationEn = `${clusterNameEn} is emerging as a structured pressure file with directional significance.`;
      explanationAr = `${clusterNameAr} يبرز كملف ضغط بنيوي ذي دلالة اتجاهية.`;
      advisoryEn = "Tighten monitoring, preserve causal linkage, and prepare for pressure transfer across files.";
      advisoryAr = "شدّد المراقبة، وحافظ على الربط السببي، واستعد لانتقال الضغط بين الملفات.";
      intentEn = "Stabilize and prepare.";
      intentAr = "ثبّت واستعد.";
    }

    if (presence.state === "preparation") {
      postureEn = "Preparation posture";
      postureAr = "وضعية تحضير";
      summaryEn = `System posture is tightening around ${signalNameEn} inside ${theaterNameEn}.`;
      summaryAr = `وضعية النظام تزداد إحكاماً حول ${signalNameAr} داخل ${theaterNameAr}.`;
      explanationEn = `The system detects structured pressure with active contribution from ${formatDriverNames(driverNamesEn)}.`;
      explanationAr = `النظام يرصد ضغطاً بنيوياً مع مساهمة نشطة من ${formatDriverNames(driverNamesAr, "ar")}.`;
      advisoryEn = "Raise readiness, reduce interpretive lag, and align live signals with publication context.";
      advisoryAr = "ارفع الجاهزية، وقلل فجوة التفسير، ونسّق بين الإشارات الحية وسياق المنشورات.";
      intentEn = "Prepare and align.";
      intentAr = "تحضّر ونسّق.";
    }

    if (presence.state === "active_response") {
      postureEn = "Active response posture";
      postureAr = "وضعية استجابة نشطة";
      summaryEn = `The platform reads ${signalNameEn} as part of an active pressure architecture rather than a transient spike.`;
      summaryAr = `المنصة تقرأ ${signalNameAr} كجزء من بنية ضغط نشطة لا مجرد قفزة عابرة.`;
      explanationEn = `Pressure ${pressure} with confidence ${confidence} indicates that convergence has moved beyond observation and into operational significance.`;
      explanationAr = `الضغط ${pressure} مع ثقة ${confidence} يشير إلى أن التقارب تجاوز المراقبة ودخل في دلالة تشغيلية.`;
      advisoryEn = "Maintain response discipline, protect narrative coherence, and prioritize dominant pressure channels.";
      advisoryAr = "حافظ على انضباط الاستجابة، واحمِ تماسك السردية، وامنح الأولوية لقنوات الضغط المهيمنة.";
      intentEn = "Contain, respond, and direct.";
      intentAr = "احتوِ واستجب ووجّه.";
    }

    if (presence.state === "strategic_strain") {
      postureEn = "Strategic strain posture";
      postureAr = "وضعية إجهاد استراتيجي";
      summaryEn = "The platform is carrying sustained pressure, not just elevated pressure.";
      summaryAr = "المنصة تحمل ضغطاً مستداماً، لا مجرد ضغط مرتفع.";
      explanationEn = `Persistence across recent cycles suggests strain accumulation around ${clusterNameEn} and ${theaterNameEn}.`;
      explanationAr = `الاستمرار عبر الدورات الأخيرة يشير إلى تراكم إجهاد حول ${clusterNameAr} و${theaterNameAr}.`;
      advisoryEn = "Avoid reactive overcorrection, prioritize continuity, and watch for pressure migration into secondary theaters.";
      advisoryAr = "تجنب التصحيح الانفعالي الزائد، وأعطِ الأولوية للاستمرارية، وراقب انتقال الضغط إلى مسارح ثانوية.";
      intentEn = "Absorb, contain, and preserve coherence.";
      intentAr = "امتصّ واحتوِ وحافظ على التماسك.";
    }

    return {
      posture: { en: postureEn, ar: postureAr },
      summary: { en: summaryEn, ar: summaryAr },
      explanation: { en: explanationEn, ar: explanationAr },
      advisory: { en: advisoryEn, ar: advisoryAr },
      intent: { en: intentEn, ar: intentAr }
    };
  }

  function buildScenarios(systemPressure, confidenceScore) {
    if (systemPressure >= 90) return [{ key: "A", value: 62 }, { key: "B", value: 24 }, { key: "C", value: 14 }];
    if (systemPressure >= CONFIG.scenarioHighThreshold) return [{ key: "A", value: 49 }, { key: "B", value: 31 }, { key: "C", value: 20 }];
    if (systemPressure >= CONFIG.scenarioPrepThreshold) return [{ key: "A", value: 41 }, { key: "B", value: 35 }, { key: "C", value: 24 }];
    if (confidenceScore >= 70) return [{ key: "A", value: 29 }, { key: "B", value: 35 }, { key: "C", value: 36 }];
    return [{ key: "A", value: 24 }, { key: "B", value: 33 }, { key: "C", value: 43 }];
  }

  function makeFeedItem(type, priority, en, ar, source = "") {
    return {
      id: buildId("FEED"),
      type: safeText(type, "system"),
      priority: normalizePriority(priority),
      source: safeText(source, ""),
      text: { en: safeText(en, "-"), ar: safeText(ar, "-") },
      createdAt: nowIso()
    };
  }

  function rankedToFeed(rankedSignals) {
    return rankedSignals.slice(0, 2).map(item =>
      makeFeedItem(
        "signal_summary",
        item.priority,
        getLocalizedText(item.description, "en"),
        getLocalizedText(item.description, "ar"),
        safeText(item?.source, "ENGINE")
      )
    );
  }

  function getLatestStudy() {
    return getLatestFeaturedContent();
  }

  function getHomeSnapshot(system) {
    const topCountry = asArray(system?.countryRiskFeed)[0] || null;

    return {
      topTheater: system?.topTheater || null,
      topCluster: system?.topCluster || null,
      topSignal: system?.topSignal || null,
      topCountry,
      latestStudy: getLatestStudy(),
      latestNews: system?.rankedSignals?.slice(0, 3) || [],
      unifiedRisk: system?.unifiedRisk || null,
      drivers: system?.drivers || [],
      voice: system?.voice || null,
      presence: system?.presence || null
    };
  }

  function buildFeed(system) {
    const lines = [];

    rankedToFeed(system.rankedSignals).forEach(item => lines.push(item));

    if (system.topSignal) {
      lines.push(makeFeedItem("top_signal", system.topSignal.priority || system.level, `Top signal: ${getLocalizedText(system.topSignal.title, "en")}`, `الإشارة الأعلى: ${getLocalizedText(system.topSignal.title, "ar")}`, "ENGINE"));
    }

    if (system.topCluster) {
      lines.push(makeFeedItem("top_cluster", system.level, `Top strategic file: ${getLocalizedText(system.topCluster.name, "en")}`, `الملف الاستراتيجي الأعلى: ${getLocalizedText(system.topCluster.name, "ar")}`, "ENGINE"));
    }

    if (system.topTheater) {
      lines.push(makeFeedItem("top_theater", system.level, `Top theater: ${getLocalizedText(system.topTheater.name, "en")}`, `المسرح الأعلى: ${getLocalizedText(system.topTheater.name, "ar")}`, "ENGINE"));
    }

    if (system.featuredPublication) {
      lines.push(makeFeedItem("featured_publication", system.featuredPublication.priority || system.level, `Featured publication: ${getLocalizedText(system.featuredPublication.title, "en")}`, `المنشور المميز: ${getLocalizedText(system.featuredPublication.title, "ar")}`, "ENGINE"));
    }

    lines.push(makeFeedItem("voice_summary", system.level, getLocalizedText(system.voice?.summary, "en"), getLocalizedText(system.voice?.summary, "ar"), "ENGINE"));
    lines.push(makeFeedItem("system_pressure", system.level, `System pressure: ${system.systemPressure}`, `ضغط النظام: ${system.systemPressure}`, "ENGINE"));
    lines.push(makeFeedItem("signal_pressure", system.level, `Signal pressure: ${system.signalPressure}`, `ضغط الإشارات: ${system.signalPressure}`, "ENGINE"));
    lines.push(makeFeedItem("cluster_pressure", system.level, `Strategic file pressure: ${system.clusterPressure.pressure}`, `ضغط الملفات الاستراتيجية: ${system.clusterPressure.pressure}`, "ENGINE"));
    lines.push(makeFeedItem("theater_pressure", system.level, `Theater pressure: ${system.theaterPressure.pressure}`, `ضغط المسرح: ${system.theaterPressure.pressure}`, "ENGINE"));

    if (system.unifiedRisk?.topCountry) {
      lines.push(makeFeedItem("risk_unit", system.unifiedRisk.riskLevel, `Unified risk unit tracks ${system.unifiedRisk.topCountry} at score ${system.unifiedRisk.riskScore}`, `وحدة المخاطر الموحدة ترصد ${system.unifiedRisk.topCountry} عند درجة ${system.unifiedRisk.riskScore}`, "ENGINE"));
    }

    asArray(system.drivers).slice(0, 3).forEach(driver => {
      lines.push(makeFeedItem("driver", driver.priority, `Driver: ${getLocalizedText(driver.label, "en")} (${driver.score})`, `المحرّك: ${getLocalizedText(driver.label, "ar")} (${driver.score})`, "ENGINE"));
    });

    return dedupeBy(lines, item => `${item.type}|${normalizePriority(item.priority)}|${normalizeText(getLocalizedText(item.text, "en"))}`)
      .sort((a, b) => priorityWeight(b.priority) - priorityWeight(a.priority))
      .slice(0, CONFIG.maxFeedItems);
  }

  function buildReportTitle(system, lang = "en") {
    const theaterName = system.topTheater
      ? getLocalizedText(system.topTheater.name, lang)
      : lang === "ar" ? "النظام" : "System";

    return lang === "ar"
      ? `تقرير سيادي تلقائي — ${theaterName}`
      : `Auto Sovereign Report — ${theaterName}`;
  }

  function buildReportBody(system, lang = "en") {
    const topTheater = system.topTheater ? getLocalizedText(system.topTheater.name, lang) : lang === "ar" ? "غير محدد" : "Undefined";
    const topCluster = system.topCluster ? getLocalizedText(system.topCluster.name, lang) : lang === "ar" ? "غير محدد" : "Undefined";
    const topSignal = system.topSignal ? getLocalizedText(system.topSignal.title, lang) : lang === "ar" ? "غير محدد" : "Undefined";
    const latestStudy = system.snapshot?.latestStudy ? getLocalizedText(system.snapshot.latestStudy.title, lang) : lang === "ar" ? "لا يوجد" : "None";

    const driverText = asArray(system.drivers)
      .slice(0, 3)
      .map(driver => getLocalizedText(driver.label, lang))
      .join(lang === "ar" ? "، " : ", ");

    const presenceText = getLocalizedText(system.voice?.summary, lang);

    if (lang === "ar") {
      return {
        summary: `رصد المحرك ضغطًا مركبًا بقيمة ${system.systemPressure} مع ثقة ${system.confidenceScore}.`,
        body: `المسرح الأعلى هو ${topTheater}. الملف الاستراتيجي الأعلى هو ${topCluster}. الإشارة الأعلى هي ${topSignal}. أحدث دراسة مرتبطة بالمشهد هي ${latestStudy}. المحرّكات الأساسية: ${driverText || "لا يوجد"}. الحضور التشغيلي: ${presenceText || "لا يوجد"}.`,
        recommendation: system.systemPressure >= 78
          ? "يوصى بالتحضير ورفع الجاهزية على مستوى المسرح الأعلى وتعزيز الربط بين الإشارات والدراسات والمنشورات."
          : "يوصى باستمرار المراقبة وتعزيز جمع الإشارات وتنظيف مسارات الربط مع الإنتاج التحليلي."
      };
    }

    return {
      summary: `The engine detected composite pressure at ${system.systemPressure} with confidence ${system.confidenceScore}.`,
      body: `Top theater: ${topTheater}. Top strategic file: ${topCluster}. Top signal: ${topSignal}. Latest institutional publication: ${latestStudy}. Primary drivers: ${driverText || "none"}. Operational presence: ${presenceText || "none"}.`,
      recommendation: system.systemPressure >= 78
        ? "Maintain preparation posture, raise readiness on the dominant theater, and reinforce linkage between signals, publications, and strategic files."
        : "Continue monitoring, improve signal collection, and clean linkage between live signals and published analytical content."
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
    if (STATE.reports.length > CONFIG.reportLimit) STATE.reports.shift();

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
      topTheaterId: system.topTheater?.id || null,
      presenceState: system.presence?.state || null
    });

    if (STATE.archive.length > CONFIG.archiveLimit) STATE.archive.shift();
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
      presenceState: system.presence?.state || null,
      countryRiskFeed: system.countryRiskFeed
    });

    if (STATE.history.length > CONFIG.historyLimit) STATE.history.shift();
  }

  function saveState() {
    try {
      localStorage.setItem(CONFIG.storageKey, JSON.stringify({
        history: STATE.history,
        reports: STATE.reports,
        archive: STATE.archive,
        lastSystem: STATE.lastSystem
      }));
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

  function computeSystemState(options = {}) {
    const force = !!options.force;

    const rankedSignals = buildRankedSignals(force);
    const topSignal = rankedSignals[0] || null;

    const clusterState = buildClusterState(rankedSignals, force);
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
    if (safeText(topCluster?.priority).toUpperCase() === "CORE") systemPressure += 2;

    systemPressure = clamp(systemPressure, 0, 100);

    const level = riskLevelFromScore(systemPressure);
    const decisionState = decisionFromSystem(systemPressure, confidenceScore);
    const liveSignals = rankedSignals.filter(signal => signal.live);
    const scenarios = buildScenarios(systemPressure, confidenceScore);
    const countryRiskFeed = buildCountryRiskFeed(rankedSignals, clusters, theaters, newsPressure);
    const topCountry = countryRiskFeed[0] || null;
    const unifiedRisk = buildUnifiedRisk(topCountry, liveSignals.length);
    const featuredPublication = getLatestFeaturedContent();
    const drivers = buildSystemDrivers(rankedSignals, clusters, theaters, countryRiskFeed);
    const drift = computePressureDrift(systemPressure);
    const presence = buildPresenceState(systemPressure, confidenceScore, drift);

    const system = {
      source: rankedSignals.length ? "engine" : "fallback",
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
      clustersState: clusterState,
      clusterPressure,

      topSignal,
      dominantSignal: topSignal,
      rankedSignals,
      liveSignals,
      liveSignalsCount: liveSignals.length,

      scenarios,
      countryRiskFeed,
      topCountry,
      unifiedRisk,

      newsPressure,
      drivers,
      presence,
      drift,
      voice: null,

      feed: [],
      contentStats: getContentStats(),
      publishedContent: getPublishedContent(),
      publishedNewsContent: getPublishedNewsContent(),
      liveNews: rankedSignals,
      featuredPublication,
      snapshot: null,
      metricsReference: "IBSS_METRICS_V3_ADAPTIVE",
      execution: {
        signalCacheAgeMs: Date.now() - EXECUTION.lastSignalsAt,
        clusterCacheAgeMs: Date.now() - EXECUTION.lastClustersAt,
        contentCacheAgeMs: Date.now() - EXECUTION.lastContentAt,
        controlled: true
      }
    };

    system.voice = buildVoice(system);
    system.snapshot = getHomeSnapshot(system);
    system.feed = buildFeed(system);

    if (shouldGenerateReport(system)) {
      const report = generateAutoReport(system);

      system.feed.unshift(
        makeFeedItem(
          "report",
          system.level,
          `Auto report generated: ${report.title.en}`,
          `تم توليد تقرير تلقائي: ${report.title.ar}`,
          "ENGINE"
        )
      );

      system.feed = dedupeBy(system.feed, item =>
        `${item.type}|${normalizeText(getLocalizedText(item.text, "en"))}`
      ).slice(0, CONFIG.maxFeedItems);
    }

    updateHistory(system);
    archiveSnapshot(system);

    STATE.lastSystem = system;
    EXECUTION.lastFullAt = Date.now();

    saveState();

    return system;
  }

  function getSystemState() {
    return computeSystemState();
  }

  function getStaticSystemFallback() {
    return computeSystemState({ force: true });
  }

  function getLastSystemState() {
    return STATE.lastSystem;
  }

  function getCountryRiskFeed() {
    const system = STATE.lastSystem || computeSystemState();
    return clone(system.countryRiskFeed) || [];
  }

  function getUnifiedRiskUnit() {
    const system = STATE.lastSystem || computeSystemState();
    return clone(system.unifiedRisk) || null;
  }

  function getReports() {
    return clone([...STATE.reports].reverse()) || [];
  }

  function getLatestReport() {
    return clone(STATE.reports[STATE.reports.length - 1] || null);
  }

  function getHistory() {
    return clone(STATE.history) || [];
  }

  function getArchive() {
    return clone(STATE.archive) || [];
  }

  function clearExecutionCache() {
    EXECUTION.signalCache = null;
    EXECUTION.clusterCache = null;
    EXECUTION.contentCache = null;
    EXECUTION.lastSignalsAt = 0;
    EXECUTION.lastClustersAt = 0;
    EXECUTION.lastContentAt = 0;
    return true;
  }

  loadState();

  const api = {
    CONFIG,
    EXECUTION,

    getSystemState,
    getStaticSystemFallback,
    getLastSystemState,
    getCountryRiskFeed,
    getUnifiedRiskUnit,
    getReports,
    getLatestReport,
    getHistory,
    getArchive,
    getContentStats,
    getPublishedContent,
    getPublishedNewsContent,

    getHomeSnapshot: function () {
      const system = STATE.lastSystem || computeSystemState();
      return clone(system.snapshot || getHomeSnapshot(system));
    },

    riskLevelFromScore,
    buildUnifiedSignals: buildRankedSignals,
    buildNewsPressure,
    clearExecutionCache
  };

  window.IBSS_UTILS = {
    ...(window.IBSS_UTILS || {}),
    getHomeSnapshot: api.getHomeSnapshot,
    getCountryAliases: getContentCountryAliases
  };

  return api;
})();
