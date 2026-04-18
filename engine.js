window.IBSS_ENGINE = (function () {
  "use strict";

  const CONFIG = {
    refreshMs: 4000,
    historyLimit: 180,
    reportLimit: 80,
    archiveLimit: 120,
    storageKey: "ibss_engine_state_v13_content_integrated",
    minLiveSignalScore: 40,
    scenarioHighThreshold: 85,
    scenarioPrepThreshold: 70
  };

  const STATE = {
    history: [],
    reports: [],
    archive: [],
    lastSystem: null
  };

  /* =========================================
     Utilities
  ========================================= */

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

    if (typeof value === "string" || typeof value === "number") {
      return String(value);
    }

    const localized =
      value?.[lang] ??
      value?.en ??
      value?.ar ??
      value?.name ??
      value?.title ??
      value?.label ??
      value?.text;

    if (typeof localized === "string" || typeof localized === "number") {
      return String(localized);
    }

    return "-";
  }

  function dedupeBy(list, keyBuilder) {
    const map = new Map();

    asArray(list).forEach((item, index) => {
      const key = keyBuilder(item, index);
      if (!map.has(key)) {
        map.set(key, item);
      }
    });

    return [...map.values()];
  }

  function average(list, selector) {
    const arr = asArray(list);
    if (!arr.length) return 0;

    const sum = arr.reduce((acc, item) => acc + safeNumber(selector(item), 0), 0);
    return sum / arr.length;
  }

  /* =========================================
     Classification + Banding
  ========================================= */

  function normalizePriority(value) {
    const p = String(value || "LOW").toUpperCase().trim();
    if (p === "HIGH") return "HIGH";
    if (p === "MEDIUM") return "MEDIUM";
    return "LOW";
  }

  function inferPriorityFromScore(score100) {
    if (score100 >= 78) return "HIGH";
    if (score100 >= 52) return "MEDIUM";
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

  /* =========================================
     Source Readers
  ========================================= */

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
      published: content.filter(item => item?.status === "published").length,
      pending: content.filter(item => item?.status === "pending").length,
      reports: content.filter(item => item?.type === "report").length,
      studies: content.filter(item => item?.type === "study").length,
      briefs: content.filter(item => item?.type === "brief").length,
      news: content.filter(item => item?.type === "news").length,
      policyPapers: content.filter(item => item?.type === "policy_paper").length,
      analyses: content.filter(item => item?.type === "analysis").length
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

  function getFallbackSignalsFromNews() {
    const news = asArray(window.IBSS_NEWS);

    return news.map((item, index) => ({
      id: safeText(item?.id, `NEWS-${index + 1}`),
      title: item?.title || localize("Untitled News Signal", "إشارة خبرية غير معنونة"),
      summary: item?.summary || item?.description || localize("No summary available.", "لا يوجد ملخص."),
      country: safeText(item?.country, safeText(item?.region, "global")),
      region: safeText(item?.region, safeText(item?.country, "global")),
      domain: safeText(item?.domain, safeText(item?.category, "geopolitical")),
      priority: normalizePriority(item?.priority || item?.severity),
      score100: clamp(safeNumber(item?.score100, 50), 0, 100),
      reliabilityScore: clamp(safeNumber(item?.reliabilityScore, 60), 0, 100),
      freshnessScore: clamp(safeNumber(item?.freshnessScore, 0.5), 0, 1),
      timestamp: item?.publishedAt || item?.timestamp || nowIso(),
      source: item?.source || item?.sourceName || "NEWS",
      raw: item
    }));
  }

  /* =========================================
     Content Engine API Integration
  ========================================= */

  function getContentAPI() {
    return window.IBSS_CONTENT_API || null;
  }

  function getContentCountryAliases(countryIdOrName) {
    const raw = normalizeText(countryIdOrName);
    if (!raw) return [];

    const aliases = new Set([raw]);

    if (raw === "ctr-gaza" || raw === "gaza") {
      aliases.add("ctr-gaza");
      aliases.add("gaza");
    }

    if (raw === "ctr-leb" || raw === "lebanon") {
      aliases.add("ctr-leb");
      aliases.add("lebanon");
      aliases.add("leb");
    }

    if (raw === "ctr-irn" || raw === "iran") {
      aliases.add("ctr-irn");
      aliases.add("iran");
      aliases.add("irn");
    }

    if (raw === "ctr-rs" || raw === "redsea" || raw === "red sea") {
      aliases.add("ctr-rs");
      aliases.add("redsea");
      aliases.add("red sea");
      aliases.add("rs");
    }

    if (raw === "ctr-wb" || raw === "westbank" || raw === "west bank") {
      aliases.add("ctr-wb");
      aliases.add("westbank");
      aliases.add("west bank");
      aliases.add("wb");
    }

    return [...aliases];
  }

  function getSignalContentBoost(signal) {
    const api = getContentAPI();
    if (!api || !signal?.id) return 0;

    try {
      const linked = api.getContentLinkedToSignal(signal.id);
      if (!linked.length) return 0;

      return clamp(
        linked.reduce((sum, item) => {
          const impact = api.computeContentImpact(item);
          return sum + safeNumber(impact.signalBoost, 0);
        }, 0),
        0,
        25
      );
    } catch (error) {
      console.error("IBSS_ENGINE signal content boost error:", error);
      return 0;
    }
  }

  function getClusterContentBoost(region, domain) {
    const api = getContentAPI();
    if (!api) return 0;

    const clusterKey = `${normalizeText(region || "global")}::${normalizeText(domain || "general")}`;

    try {
      const linked = api.getContentLinkedToCluster(clusterKey);
      if (!linked.length) return 0;

      return clamp(
        linked.reduce((sum, item) => {
          const impact = api.computeContentImpact(item);
          return sum + safeNumber(impact.clusterBoost, 0);
        }, 0),
        0,
        20
      );
    } catch (error) {
      console.error("IBSS_ENGINE cluster content boost error:", error);
      return 0;
    }
  }

  function getCountryContentBoost(countryIdOrName) {
    const api = getContentAPI();
    if (!api || !countryIdOrName) return 0;

    try {
      const aliases = getContentCountryAliases(countryIdOrName);

      const total = aliases.reduce((sum, alias) => {
        const linked = api.getContentLinkedToCountry(alias);
        if (!linked.length) return sum;

        const localBoost = linked.reduce((inner, item) => {
          const impact = api.computeContentImpact(item);
          return inner + safeNumber(impact.countryBoost, 0);
        }, 0);

        return Math.max(sum, localBoost);
      }, 0);

      return clamp(total, 0, 24);
    } catch (error) {
      console.error("IBSS_ENGINE country content boost error:", error);
      return 0;
    }
  }

  function getSystemContentConfidenceBoost() {
    const api = getContentAPI();
    if (!api) return 0;

    try {
      const eligible = api.getEngineEligibleContent();
      if (!eligible.length) return 0;

      const total = eligible.reduce((sum, item) => {
        const impact = api.computeContentImpact(item);
        return sum + safeNumber(impact.confidenceBoost, 0);
      }, 0);

      return clamp(total, 0, 18);
    } catch (error) {
      console.error("IBSS_ENGINE system confidence boost error:", error);
      return 0;
    }
  }

  function getLatestFeaturedContent() {
    try {
      const api = getContentAPI();
      if (api?.getLatestFeaturedContent) {
        return api.getLatestFeaturedContent();
      }
    } catch (error) {
      console.error("IBSS_ENGINE latest featured content error:", error);
    }

    return null;
  }

  /* =========================================
     Signal Normalization
  ========================================= */

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
    if (d.includes("geopolitical")) return 4;
    if (d.includes("maritime")) return 3;
    if (d.includes("energy")) return 3;
    if (d.includes("diplomatic")) return 2;
    if (d.includes("economic")) return 2;
    if (d.includes("governance")) return 4;
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
    const title = signal?.title || localize("Untitled Signal", "إشارة غير معنونة");
    const description = signal?.summary || signal?.description || localize("No summary available.", "لا يوجد ملخص.");
    const country = safeText(signal?.country, "global");
    const region = safeText(signal?.region, country || "global");
    const domain = safeText(signal?.domain, "geopolitical");
    const reliabilityScore = clamp(safeNumber(signal?.reliabilityScore, 60), 0, 100);
    const freshnessScore = clamp(safeNumber(signal?.freshnessScore, 0.5), 0, 1);
    const baseScore = clamp(safeNumber(signal?.score100, 50), 0, 100);

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
      title,
      description,
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
      live: preliminaryScore >= CONFIG.minLiveSignalScore,
      active: preliminaryScore >= CONFIG.minLiveSignalScore,
      raw: signal
    };
  }

  function buildRankedSignals() {
    const ingestionSignals = getSignalsFromIngestion();
    const fallbackSignals = ingestionSignals.length ? [] : getFallbackSignalsFromNews();
    const rawSignals = ingestionSignals.length ? ingestionSignals : fallbackSignals;

    const normalized = rawSignals
      .map(normalizeRawSignal)
      .map(signal => {
        const contentBoost = getSignalContentBoost(signal);
        const finalScore = clamp(safeNumber(signal.score100, 0) + contentBoost, 0, 100);
        const priority = normalizePriority(signal.priority || inferPriorityFromScore(finalScore));

        return {
          ...signal,
          priority,
          contentBoost,
          score: finalScore / 100,
          score100: finalScore,
          balancedScore100: finalScore,
          live: finalScore >= CONFIG.minLiveSignalScore,
          active: finalScore >= CONFIG.minLiveSignalScore
        };
      })
      .sort((a, b) => safeNumber(b.balancedScore100, 0) - safeNumber(a.balancedScore100, 0));

    return dedupeBy(normalized, (item) => {
      return [
        normalizeText(getLocalizedText(item.title, "en")),
        normalizeText(item.country),
        normalizeText(item.domain)
      ].join("|");
    });
  }

  /* =========================================
     Cluster + Theater Builders
  ========================================= */

  function buildClusterName(region, domain) {
    const regionNameEn = region === "global" ? "Global" : titleCase(region);
    const domainNameEn = domain === "general" ? "Strategic File" : titleCase(domain);

    return {
      en: `${regionNameEn} ${domainNameEn}`,
      ar: `${domainNameEn} ${regionNameEn}`
    };
  }

  function buildTheaterName(region) {
    if (region === "global") {
      return localize("Global Theater", "المسرح العالمي");
    }

    return localize(`${titleCase(region)} Theater`, `مسرح ${titleCase(region)}`);
  }

  function buildClusterState(rankedSignals) {
    const liveSignals = rankedSignals.filter(signal => signal.live);

    if (!liveSignals.length) {
      return {
        clusters: [],
        theaters: [],
        lastUpdate: nowIso()
      };
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
          avgReliabilitySum: 0
        });
      }

      const bucket = groupMap.get(key);
      const risk = safeNumber(signal.balancedScore100, 0);

      bucket.signals.push(signal);
      bucket.totalRisk += risk;
      bucket.maxRisk = Math.max(bucket.maxRisk, risk);
      bucket.avgReliabilitySum += safeNumber(signal.reliabilityScore, 55);
    });

    const clusters = [...groupMap.values()]
      .map((group, index) => {
        const count = group.signals.length || 1;
        const avgRisk = Math.round(group.totalRisk / count);
        const avgReliability = Math.round(group.avgReliabilitySum / count);
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
          avgReliabilitySum: 0
        });
      }

      const theater = theaterMap.get(region);
      theater.clusters.push(cluster);
      theater.avgSum += safeNumber(cluster.avgRisk, 0);
      theater.maxRisk = Math.max(theater.maxRisk, safeNumber(cluster.maxRisk, 0));
      theater.avgReliabilitySum += safeNumber(cluster.avgReliability, 55);
    });

    const theaters = [...theaterMap.values()]
      .map(item => {
        const count = item.clusters.length || 1;
        const avgRisk = Math.round(item.avgSum / count);
        const avgReliability = Math.round(item.avgReliabilitySum / count);
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

    return {
      clusters,
      theaters,
      lastUpdate: nowIso()
    };
  }

  /* =========================================
     Pressure Engines
  ========================================= */

  function buildSignalPressure(rankedSignals) {
    const list = asArray(rankedSignals);
    if (!list.length) return 0;

    const avgScore = Math.round(average(list, item => item.balancedScore100));
    const maxScore = safeNumber(list[0]?.balancedScore100, 0);
    const liveCount = list.filter(signal => signal.live).length;

    return clamp(
      Math.round((avgScore * 0.68) + (maxScore * 0.18) + Math.min(liveCount, 10)),
      0,
      100
    );
  }

  function buildClusterPressure(clusters) {
    const list = asArray(clusters);
    if (!list.length) {
      return {
        count: 0,
        topCluster: null,
        pressure: 0
      };
    }

    const topCluster = list[0];
    const avgRisk = Math.round(average(list, cluster => cluster.avgRisk));

    const pressure = clamp(
      Math.round((avgRisk * 0.72) + (safeNumber(topCluster?.maxRisk, 0) * 0.12) + Math.min(list.length * 2, 8)),
      0,
      100
    );

    return {
      count: list.length,
      topCluster,
      pressure
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

    const topTheater = list[0];
    const avgRisk = Math.round(average(list, theater => theater.avgRisk));

    const pressure = clamp(
      Math.round((avgRisk * 0.74) + (safeNumber(topTheater?.maxRisk, 0) * 0.10) + Math.min(list.length * 2, 6)),
      0,
      100
    );

    return {
      count: list.length,
      topTheater,
      pressure
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

  /* =========================================
     Country Risk
  ========================================= */

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
            const avgSignal = Math.round(average(relatedSignals, signal => signal.balancedScore100));
            baseScore = Math.round((baseScore * 0.50) + (avgSignal * 0.50));
          }

          if (relatedClusters.length) {
            const avgCluster = Math.round(average(relatedClusters, cluster => cluster.avgRisk));
            baseScore = Math.round((baseScore * 0.72) + (avgCluster * 0.28));
          }

          if (relatedTheater) {
            baseScore = Math.round((baseScore * 0.84) + (safeNumber(relatedTheater.avgRisk, 0) * 0.16));
          }

          if (safeNumber(newsPressure?.pressure, 0) >= 70) {
            baseScore += 1;
          }

          const contentBoost = getCountryContentBoost(country.id || country.countryId || countryName);
          baseScore = clamp(baseScore + contentBoost, 0, 100);

          const previous = findPreviousCountryRisk(countryName);
          const trend = detectTrend(baseScore, previous);

          return {
            id: country.id || normalizedCountry,
            name: countryName,
            nameLocalized: country.name,
            riskScore: baseScore,
            riskLevel: riskLevelFromScore(baseScore),
            trend,
            contentBoost,
            primaryDrivers: asArray(country.primaryDrivers?.en || country.primaryDrivers || [])
          };
        })
        .sort((a, b) => b.riskScore - a.riskScore)
        .slice(0, 5);
    }

    return rankedSignals.slice(0, 5).map(signal => {
      const name = getLocalizedText(signal.title, "en");
      const baseRisk = Math.round(safeNumber(signal.balancedScore100, 0) * 0.92);
      const contentBoost = getCountryContentBoost(signal.country || name);
      const riskScore = clamp(baseRisk + contentBoost, 0, 100);
      const previous = findPreviousCountryRisk(name);
      const trend = detectTrend(riskScore, previous);

      return {
        id: signal.id || name.toLowerCase().replace(/\s+/g, "-"),
        name,
        nameLocalized: { en: name, ar: getLocalizedText(signal.title, "ar") },
        riskScore,
        riskLevel: riskLevelFromScore(riskScore),
        trend,
        contentBoost,
        primaryDrivers: [
          getLocalizedText(signal.title, "en"),
          safeText(signal.domain, "geopolitical"),
          signal.priority
        ]
      };
    });
  }

  /* =========================================
     Confidence
  ========================================= */

  function buildConfidenceScore(rankedSignals, clusters, theaters) {
    const signalReliability = rankedSignals.length
      ? average(rankedSignals, signal => signal.reliabilityScore)
      : 0;

    const clusterReliability = clusters.length
      ? average(clusters, cluster => cluster.avgReliability)
      : 0;

    const theaterReliability = theaters.length
      ? average(theaters, theater => theater.avgReliability)
      : 0;

    const densityBoost =
      Math.min(rankedSignals.length, 12) * 1.0 +
      Math.min(clusters.length, 6) * 1.5 +
      Math.min(theaters.length, 4) * 2.0;

    const reliabilityComposite =
      (signalReliability * 0.50) +
      (clusterReliability * 0.30) +
      (theaterReliability * 0.20);

    let score = reliabilityComposite + densityBoost;
    score += getSystemContentConfidenceBoost();

    return clamp(Math.round(score), 0, 100);
  }

  /* =========================================
     Scenarios
  ========================================= */

  function buildScenarios(systemPressure, confidenceScore) {
    if (systemPressure >= 90) {
      return [
        { key: "A", value: 62 },
        { key: "B", value: 24 },
        { key: "C", value: 14 }
      ];
    }

    if (systemPressure >= CONFIG.scenarioHighThreshold) {
      return [
        { key: "A", value: 49 },
        { key: "B", value: 31 },
        { key: "C", value: 20 }
      ];
    }

    if (systemPressure >= CONFIG.scenarioPrepThreshold) {
      return [
        { key: "A", value: 41 },
        { key: "B", value: 35 },
        { key: "C", value: 24 }
      ];
    }

    if (confidenceScore >= 70) {
      return [
        { key: "A", value: 29 },
        { key: "B", value: 35 },
        { key: "C", value: 36 }
      ];
    }

    return [
      { key: "A", value: 24 },
      { key: "B", value: 33 },
      { key: "C", value: 43 }
    ];
  }

  /* =========================================
     Feed + Snapshot
  ========================================= */

  function rankedToFeed(rankedSignals) {
    return rankedSignals.slice(0, 2).map(item => ({
      type: "news",
      priority: item.priority,
      source: safeText(item?.source, "INTAKE"),
      text: {
        en: getLocalizedText(item.description, "en"),
        ar: getLocalizedText(item.description, "ar")
      }
    }));
  }

  function buildFeed(system) {
    const lines = [];

    rankedToFeed(system.rankedSignals).forEach(item => lines.push(item));

    const featuredContent = getLatestFeaturedContent();
    if (featuredContent) {
      lines.push({
        type: "content",
        priority: normalizePriority(featuredContent.priority),
        source: safeText(featuredContent.author, "IBSS"),
        text: {
          en: `Featured publication: ${getLocalizedText(featuredContent.title, "en")}`,
          ar: `المنشور المميز: ${getLocalizedText(featuredContent.title, "ar")}`
        }
      });
    }

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

    return lines;
  }

  function getLatestStudy() {
    const featured = getLatestFeaturedContent();
    if (featured) return featured;

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

    return {
      topTheater: system?.topTheater || null,
      topCluster: system?.topCluster || null,
      topSignal: system?.topSignal || null,
      topCountry,
      latestStudy,
      latestNews: system?.rankedSignals?.slice(0, 3) || []
    };
  }

  /* =========================================
     Reports
  ========================================= */

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
    const latestStudy = system.snapshot?.latestStudy
      ? getLocalizedText(system.snapshot.latestStudy.title, lang)
      : (lang === "ar" ? "لا يوجد" : "None");

    if (lang === "ar") {
      return {
        summary: `رصد المحرك ضغطًا مركبًا بقيمة ${system.systemPressure} مع ثقة ${system.confidenceScore}.`,
        body:
          `المسرح الأعلى هو ${topTheater}. ` +
          `الملف الاستراتيجي الأعلى هو ${topCluster}. ` +
          `الإشارة الأعلى هي ${topSignal}. ` +
          `أحدث دراسة مؤسسية مرتبطة بالمشهد هي ${latestStudy}.`,
        recommendation: system.systemPressure >= 78
          ? "يوصى بالتحضير ورفع الجاهزية على مستوى المسرح الأعلى وتعزيز ربط الدراسات بالملفات الميدانية."
          : "يوصى باستمرار المراقبة وتعزيز جمع الإشارات وربطها بالإنتاج التحليلي المنشور."
      };
    }

    return {
      summary: `The engine detected composite pressure at ${system.systemPressure} with confidence ${system.confidenceScore}.`,
      body:
        `Top theater: ${topTheater}. ` +
        `Top strategic file: ${topCluster}. ` +
        `Top signal: ${topSignal}. ` +
        `Latest institutional publication in the scene: ${latestStudy}.`,
      recommendation: system.systemPressure >= 78
        ? "Maintain preparation posture, raise readiness on the dominant theater, and reinforce linkage between published analysis and live files."
        : "Continue monitoring, increase signal collection, and strengthen integration with published analytical content."
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

  /* =========================================
     Persistence
  ========================================= */

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

  /* =========================================
     Main Compute
  ========================================= */

  function computeSystemState() {
    const rankedSignals = buildRankedSignals();
    const topSignal = rankedSignals[0] || null;

    const clusterState = buildClusterState(rankedSignals);
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
    const scenarios = buildScenarios(systemPressure, confidenceScore);
    const countryRiskFeed = buildCountryRiskFeed(rankedSignals, clusters, theaters, newsPressure);

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

    system.snapshot = getHomeSnapshot(system);
    system.feed = buildFeed(system);

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

  /* =========================================
     Public API
  ========================================= */

  function getSystemState() {
    return computeSystemState();
  }

  function getStaticSystemFallback() {
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
    getStaticSystemFallback,
    getLastSystemState,
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
