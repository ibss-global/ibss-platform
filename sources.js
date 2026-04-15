window.IBSS_SOURCES = (function () {
  "use strict";

  const SOURCE_TYPES = {
    WIRE: "wire",
    NETWORK: "network",
    GOVERNMENT: "government",
    THINK_TANK: "think_tank",
    RESEARCH: "research",
    REGIONAL: "regional",
    LOCAL: "local",
    SOCIAL_MONITOR: "social_monitor",
    FINANCIAL: "financial",
    INTERNAL: "internal"
  };

  const DOMAINS = {
    GEOSECURITY: "geo-security",
    GEOPOLITICAL: "geopolitical",
    MILITARY: "military",
    ECONOMIC: "economic",
    ENERGY: "energy",
    MARITIME: "maritime",
    DIPLOMATIC: "diplomatic",
    INTERNAL: "internal"
  };

  const REGIONS = {
    GLOBAL: "global",
    LEVANT: "levant",
    GULF: "gulf",
    REDSEA: "redsea",
    NORTHAFRICA: "northafrica",
    EUROPE: "europe",
    USA: "usa",
    ASIA: "asia"
  };

  const SOURCES = [
    {
      id: "SRC-REUTERS",
      name: "Reuters",
      type: SOURCE_TYPES.WIRE,
      region: REGIONS.GLOBAL,
      domains: [DOMAINS.GEOSECURITY, DOMAINS.GEOPOLITICAL, DOMAINS.ECONOMIC, DOMAINS.ENERGY],
      credibility: 0.94,
      speed: 0.90,
      noise: 0.16,
      biasRisk: 0.18,
      languageSupport: ["en"],
      active: true,
      priorityWeight: 1.00,
      tags: ["global", "wire", "fast"]
    },
    {
      id: "SRC-AP",
      name: "AP",
      type: SOURCE_TYPES.WIRE,
      region: REGIONS.GLOBAL,
      domains: [DOMAINS.GEOSECURITY, DOMAINS.GEOPOLITICAL],
      credibility: 0.92,
      speed: 0.88,
      noise: 0.18,
      biasRisk: 0.18,
      languageSupport: ["en"],
      active: true,
      priorityWeight: 0.97,
      tags: ["global", "wire"]
    },
    {
      id: "SRC-AFP",
      name: "AFP",
      type: SOURCE_TYPES.WIRE,
      region: REGIONS.GLOBAL,
      domains: [DOMAINS.GEOPOLITICAL, DOMAINS.DIPLOMATIC, DOMAINS.GEOSECURITY],
      credibility: 0.90,
      speed: 0.86,
      noise: 0.20,
      biasRisk: 0.18,
      languageSupport: ["en", "fr", "ar"],
      active: true,
      priorityWeight: 0.95,
      tags: ["wire", "global"]
    },
    {
      id: "SRC-AJ",
      name: "Al Jazeera",
      type: SOURCE_TYPES.NETWORK,
      region: REGIONS.LEVANT,
      domains: [DOMAINS.GEOSECURITY, DOMAINS.GEOPOLITICAL, DOMAINS.DIPLOMATIC],
      credibility: 0.82,
      speed: 0.91,
      noise: 0.28,
      biasRisk: 0.38,
      languageSupport: ["ar", "en"],
      active: true,
      priorityWeight: 0.90,
      tags: ["regional", "tv", "middle-east"]
    },
    {
      id: "SRC-BLOOMBERG",
      name: "Bloomberg",
      type: SOURCE_TYPES.FINANCIAL,
      region: REGIONS.GLOBAL,
      domains: [DOMAINS.ECONOMIC, DOMAINS.ENERGY, DOMAINS.MARITIME],
      credibility: 0.90,
      speed: 0.84,
      noise: 0.20,
      biasRisk: 0.20,
      languageSupport: ["en"],
      active: true,
      priorityWeight: 0.92,
      tags: ["financial", "markets", "energy"]
    },
    {
      id: "SRC-FT",
      name: "Financial Times",
      type: SOURCE_TYPES.FINANCIAL,
      region: REGIONS.GLOBAL,
      domains: [DOMAINS.ECONOMIC, DOMAINS.ENERGY, DOMAINS.GEOPOLITICAL],
      credibility: 0.89,
      speed: 0.78,
      noise: 0.16,
      biasRisk: 0.22,
      languageSupport: ["en"],
      active: true,
      priorityWeight: 0.88,
      tags: ["financial", "strategic"]
    },
    {
      id: "SRC-ISW",
      name: "Institute for the Study of War",
      type: SOURCE_TYPES.THINK_TANK,
      region: REGIONS.GLOBAL,
      domains: [DOMAINS.MILITARY, DOMAINS.GEOSECURITY],
      credibility: 0.84,
      speed: 0.70,
      noise: 0.22,
      biasRisk: 0.34,
      languageSupport: ["en"],
      active: true,
      priorityWeight: 0.83,
      tags: ["think-tank", "military"]
    },
    {
      id: "SRC-IISS",
      name: "IISS",
      type: SOURCE_TYPES.RESEARCH,
      region: REGIONS.GLOBAL,
      domains: [DOMAINS.MILITARY, DOMAINS.GEOPOLITICAL],
      credibility: 0.91,
      speed: 0.60,
      noise: 0.10,
      biasRisk: 0.15,
      languageSupport: ["en"],
      active: true,
      priorityWeight: 0.86,
      tags: ["research", "strategic"]
    },
    {
      id: "SRC-MEI",
      name: "Middle East Institute",
      type: SOURCE_TYPES.THINK_TANK,
      region: REGIONS.LEVANT,
      domains: [DOMAINS.GEOPOLITICAL, DOMAINS.DIPLOMATIC, DOMAINS.ENERGY],
      credibility: 0.80,
      speed: 0.62,
      noise: 0.20,
      biasRisk: 0.26,
      languageSupport: ["en"],
      active: true,
      priorityWeight: 0.76,
      tags: ["middle-east", "analysis"]
    },
    {
      id: "SRC-LOCAL-MONITOR",
      name: "Local Monitor",
      type: SOURCE_TYPES.LOCAL,
      region: REGIONS.LEVANT,
      domains: [DOMAINS.GEOSECURITY, DOMAINS.MILITARY],
      credibility: 0.63,
      speed: 0.93,
      noise: 0.42,
      biasRisk: 0.41,
      languageSupport: ["ar"],
      active: true,
      priorityWeight: 0.60,
      tags: ["local", "fast", "volatile"]
    },
    {
      id: "SRC-IBSS-INTERNAL",
      name: "IBSS Internal Desk",
      type: SOURCE_TYPES.INTERNAL,
      region: REGIONS.GLOBAL,
      domains: [
        DOMAINS.GEOSECURITY,
        DOMAINS.GEOPOLITICAL,
        DOMAINS.MILITARY,
        DOMAINS.ECONOMIC,
        DOMAINS.DIPLOMATIC,
        DOMAINS.INTERNAL
      ],
      credibility: 0.95,
      speed: 0.95,
      noise: 0.05,
      biasRisk: 0.08,
      languageSupport: ["ar", "en"],
      active: true,
      priorityWeight: 1.10,
      tags: ["internal", "ibss", "core"]
    }
  ];

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

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function getAllSources() {
    return clone(SOURCES);
  }

  function getActiveSources() {
    return getAllSources().filter(source => source.active !== false);
  }

  function getSourceById(id) {
    const target = normalizeText(id);
    return getActiveSources().find(source => normalizeText(source.id) === target) || null;
  }

  function getSourceByName(name) {
    const target = normalizeText(name);
    return getActiveSources().find(source => normalizeText(source.name) === target) || null;
  }

  function getSourcesByType(type) {
    const target = normalizeText(type);
    return getActiveSources().filter(source => normalizeText(source.type) === target);
  }

  function getSourcesByDomain(domain) {
    const target = normalizeText(domain);
    return getActiveSources().filter(source =>
      asArray(source.domains).some(item => normalizeText(item) === target)
    );
  }

  function getSourcesByRegion(region) {
    const target = normalizeText(region);
    return getActiveSources().filter(source => normalizeText(source.region) === target);
  }

  function scoreSourceReliability(source) {
    if (!source) return 0;

    const credibility = Number(source.credibility || 0);
    const speed = Number(source.speed || 0);
    const noise = Number(source.noise || 0);
    const biasRisk = Number(source.biasRisk || 0);
    const priorityWeight = Number(source.priorityWeight || 1);

    const base =
      (credibility * 0.52) +
      (speed * 0.18) +
      ((1 - noise) * 0.18) +
      ((1 - biasRisk) * 0.12);

    return Math.max(0, Math.min(100, Math.round(base * priorityWeight * 100)));
  }

  function classifySourceStrength(source) {
    const score = scoreSourceReliability(source);

    if (score >= 85) return "CORE";
    if (score >= 70) return "STRONG";
    if (score >= 55) return "USABLE";
    return "VOLATILE";
  }

  function buildSourceProfile(sourceRef) {
    const source =
      typeof sourceRef === "string"
        ? (getSourceById(sourceRef) || getSourceByName(sourceRef))
        : sourceRef;

    if (!source) return null;

    return {
      ...clone(source),
      reliabilityScore: scoreSourceReliability(source),
      strength: classifySourceStrength(source)
    };
  }

  function resolveSource(sourceRef) {
    return buildSourceProfile(sourceRef);
  }

  function getSourceMap() {
    const map = {};
    getActiveSources().forEach(source => {
      map[source.id] = buildSourceProfile(source);
    });
    return map;
  }

  return {
    SOURCE_TYPES,
    DOMAINS,
    REGIONS,
    getAllSources,
    getActiveSources,
    getSourceById,
    getSourceByName,
    getSourcesByType,
    getSourcesByDomain,
    getSourcesByRegion,
    scoreSourceReliability,
    classifySourceStrength,
    buildSourceProfile,
    resolveSource,
    getSourceMap
  };
})();
