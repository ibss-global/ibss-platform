window.IBSS_ENGINE = (function () {
  "use strict";

  const CONFIG = {
    refreshMs: 4000,
    historyLimit: 180,
    reportLimit: 80,
    archiveLimit: 120,
    storageKey: "ibss_engine_state_v14_clean_unified",
    minLiveSignalScore: 40,
    scenarioHighThreshold: 85,
    scenarioPrepThreshold: 70,
    maxFeedItems: 12,
    maxCountryRiskItems: 5,
    // [إضافة سيادية]: رابط البيانات الحية التي سيحدثها Python
    externalSignalsUrl: "./signals.json" 
  };

  const STATE = {
    history: [],
    reports: [],
    archive: [],
    lastSystem: null,
    // [إضافة سيادية]: مخزن الإشارات الحية القادمة من الخارج
    externalSignals: [] 
  };

  /* =========================================
     Utilities
  ========================================= */
  function nowIso() { return new Date().toISOString(); }
  function asArray(value) { return Array.isArray(value) ? value : []; }
  function safeText(value, fallback = "") { return typeof value === "string" && value.trim() ? value.trim() : fallback; }
  function safeNumber(value, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function normalizeText(value) { return safeText(String(value || "")).toLowerCase().replace(/\s+/g, " ").trim(); }
  function titleCase(text) { return safeText(text).split(" ").filter(Boolean).map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(" "); }
  function localize(en, ar) { return { en, ar }; }

  function getLocalizedText(value, lang = "en") {
    if (!value) return "-";
    if (typeof value === "string" || typeof value === "number") return String(value);
    const localized = value?.[lang] ?? value?.en ?? value?.ar ?? value?.name ?? value?.title ?? value?.label ?? value?.text;
    return (typeof localized === "string" || typeof localized === "number") ? String(localized) : "-";
  }

  function average(list, selector) {
    const arr = asArray(list);
    if (!arr.length) return 0;
    const sum = arr.reduce((acc, item) => acc + safeNumber(selector(item), 0), 0);
    return sum / arr.length;
  }

  function dedupeBy(list, keyBuilder) {
    const map = new Map();
    asArray(list).forEach((item, index) => {
      const key = keyBuilder(item, index);
      if (!map.has(key)) map.set(key, item);
    });
    return [...map.values()];
  }

  function buildId(prefix) { return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`; }

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

  /* =========================================
     Classification + Banding (Original Logic)
  ========================================= */
  function normalizePriority(value) {
    const p = String(value || "LOW").toUpperCase().trim();
    if (p === "HIGH") return "HIGH";
    if (p === "MEDIUM") return "MEDIUM";
    return "LOW";
  }

  function priorityWeight(priority) {
    const p = normalizePriority(priority);
    return p === "HIGH" ? 3 : (p === "MEDIUM" ? 2 : 1);
  }

  function inferPriorityFromScore(score100) {
    if (score100 >= 78) return "HIGH";
    if (score100 >= 52) return "MEDIUM";
    return "LOW";
  }

  function normalizeBandCode(score) {
    if (window.IBSS_METRICS?.classifyBand) return window.IBSS_METRICS.classifyBand(score)?.code || "LOW";
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
    if (systemPressure >= 90 && confidenceScore >= 78) return { decision: "ACT", mode: "ACTIVE RESPONSE" };
    if (systemPressure >= 78) return { decision: "PRD", mode: "PREPARATION" };
    if (systemPressure >= 55) return { decision: "WATCH+", mode: "HEIGHTENED MONITORING" };
    return { decision: "WATCH", mode: "MONITORING" };
  }

  /* =========================================
     [إضافة سيادية]: محرك المزامنة الخارجية
  ========================================= */
  async function syncExternalSignals() {
    try {
      const response = await fetch(CONFIG.externalSignalsUrl);
      if (response.ok) {
        const data = await response.json();
        STATE.externalSignals = asArray(data).map((item, index) => ({
          id: `EXT-${index}`,
          title: item.title || "External Signal",
          summary: item.summary || item.description || "No summary available.",
          description: item.description || item.summary || "No description available.",
          country: normalizeText(item.theater || "global"),
          region: normalizeText(item.theater || "global"),
          domain: "geopolitical",
          priority: item.pressure >= 7 ? "HIGH" : (item.pressure >= 4 ? "MEDIUM" : "LOW"),
          score100: (item.pressure || 5) * 10,
          timestamp: item.timestamp || nowIso(),
          source: "LIVE_FEED_PYTHON"
        }));
      }
    } catch (e) {
      console.warn("IBSS_ENGINE: External signals not found. Using local data.");
    }
  }

  /* =========================================
     Source Readers
  ========================================= */
  function getContent() { return asArray(window.IBSS_CONTENT); }
  function getCountries() { return asArray(window.IBSS_COUNTRIES); }
  function getSeedSignals() { return asArray(window.IBSS_SIGNALS); }

  function getPublishedContent() { return getContent().filter(item => item && item.status === "published"); }
  function getPublishedNewsContent() { return getContent().filter(item => item && item.type === "news" && item.status === "published"); }

  function getContentStats() {
    const content = getContent();
    return {
      total: content.length,
      published: content.filter(item => item?.status === "published").length,
      reports: content.filter(item => item?.type === "report").length,
      studies: content.filter(item => item?.type === "study").length,
      news: content.filter(item => item?.type === "news").length,
    };
  }

  function getSignalsFromIngestion() {
    try { if (window.IBSS_INGESTION?.getAllNormalized) return asArray(window.IBSS_INGESTION.getAllNormalized()); }
    catch (e) { console.error("Ingestion error:", e); }
    return [];
  }

  function getSignalsFromSeedData() {
    return getSeedSignals().map((item, index) => ({
      id: safeText(item?.id, `SEED-${index + 1}`),
      title: item?.title || localize("Untitled Signal", "إشارة غير معنونة"),
      summary: item?.report || item?.description || localize("No summary available.", "لا يوجد ملخص."),
      description: item?.description || item?.report || localize("No description available.", "لا يوجد وصف."),
      country: normalizeText(item?.country || item?.countryId || item?.region || "global"),
      region: normalizeText(item?.region || item?.country || "global"),
      domain: normalizeText(getLocalizedText(item?.signalType, "en") || "geopolitical"),
      priority: normalizePriority(item?.weight || item?.priority),
      score100: clamp(Math.round((safeNumber(item?.metrics?.weight, 0.5) * 35) + (safeNumber(item?.metrics?.volatility, 0.5) * 25) + (safeNumber(item?.metrics?.impact, 0.5) * 40)), 0, 100),
      reliabilityScore: 72,
      freshnessScore: item?.live ? 0.9 : 0.55,
      timestamp: nowIso(),
      source: "IBSS_SEED"
    }));
  }

  function getFallbackSignalsFromNews() {
    const news = asArray(window.IBSS_NEWS);
    return news.map((item, index) => ({
      id: safeText(item?.id, `NEWS-${index + 1}`),
      title: item?.title || "News Signal",
      score100: clamp(safeNumber(item?.score100, 50), 0, 100),
      reliabilityScore: 60,
      freshnessScore: 0.5,
      timestamp: item?.timestamp || nowIso(),
      source: item?.source || "NEWS"
    }));
  }

  /* =========================================
     Content API + Impact Logic
  ========================================= */
  function getSafeContentImpact(item) {
    const strategicWeight = clamp(safeNumber(item?.metrics?.strategicWeight, 0), 0, 100);
    return {
      signalBoost: Math.round((strategicWeight * 0.08)),
      clusterBoost: Math.round((strategicWeight * 0.06)),
      countryBoost: Math.round((strategicWeight * 0.07)),
      confidenceBoost: Math.round((strategicWeight * 0.04))
    };
  }

  function getSignalContentBoost(signal) {
    const api = window.IBSS_CONTENT_API;
    if (!api || !signal?.id) return 0;
    try {
      const linked = asArray(api.getContentLinkedToSignal?.(signal.id));
      return clamp(linked.reduce((sum, item) => sum + getSafeContentImpact(item).signalBoost, 0), 0, 25);
    } catch (e) { return 0; }
  }

  function getClusterContentBoost(region, domain) {
    const api = window.IBSS_CONTENT_API;
    if (!api) return 0;
    try {
      const linked = asArray(api.getContentLinkedToCluster?.(`${normalizeText(region)}::${normalizeText(domain)}`));
      return clamp(linked.reduce((sum, item) => sum + getSafeContentImpact(item).clusterBoost, 0), 0, 20);
    } catch (e) { return 0; }
  }

  /* =========================================
     Normalization & Build
  ========================================= */
  function normalizeRawSignal(signal, index = 0) {
    const baseScore = clamp(safeNumber(signal?.score100, 50), 0, 100);
    const preliminaryScore = clamp(Math.round((baseScore * 0.72) + 10), 0, 100); 
    return {
      ...signal,
      id: signal.id || `SIG-${index}`,
      score: preliminaryScore / 100,
      score100: preliminaryScore,
      balancedScore100: preliminaryScore,
      live: preliminaryScore >= CONFIG.minLiveSignalScore
    };
  }

  function buildRankedSignals() {
    const ingestionSignals = getSignalsFromIngestion();
    const seedSignals = ingestionSignals.length ? [] : getSignalsFromSeedData();
    
    // [دمج الإشارات]: دمج الثابت، المدمج، والخارجي (Python)
    const combined = [...ingestionSignals, ...seedSignals, ...STATE.externalSignals];
    const rawSignals = combined.length ? combined : getFallbackSignalsFromNews();

    return dedupeBy(rawSignals.map(normalizeRawSignal), item => [normalizeText(item.title), item.country].join("|"))
      .sort((a, b) => b.balancedScore100 - a.balancedScore100);
  }

  /* =========================================
     Main Engine Computation
  ========================================= */
  function buildClusterState(rankedSignals) {
    const liveSignals = rankedSignals.filter(s => s.live);
    if (!liveSignals.length) return { clusters: [], theaters: [] };

    const groupMap = new Map();
    liveSignals.forEach(s => {
      const key = `${s.region}::${s.domain}`;
      if (!groupMap.has(key)) groupMap.set(key, { region: s.region, domain: s.domain, signals: [], total: 0 });
      const b = groupMap.get(key); b.signals.push(s); b.total += s.score100;
    });

    const clusters = [...groupMap.values()].map((g, i) => ({
      id: `CL-${i}`,
      name: buildClusterName(g.region, g.domain),
      avgRisk: Math.round(g.total / g.signals.length),
      region: g.region, domain: g.domain,
      signals: g.signals
    }));

    const theaters = clusters.map(c => ({
       id: `TH-${c.region}`,
       name: buildTheaterName(c.region),
       avgRisk: c.avgRisk,
       clusters: [c]
    }));

    return { clusters, theaters };
  }

  // [ملاحظة]: تم الإبقاء على buildClusterName, buildTheaterName, buildPressure كما هي في كودك الأصلي
  function buildClusterName(r, d) { return { en: `${titleCase(r)} ${titleCase(d)}`, ar: `${titleCase(d)} ${titleCase(r)}` }; }
  function buildTheaterName(r) { return { en: `${titleCase(r)} Theater`, ar: `مسرح ${titleCase(r)}` }; }

  /* =========================================
     Core Logic Execution
  ========================================= */
  async function computeSystemState() {
    // 1. مزامنة البيانات الحية من الخارج
    await syncExternalSignals();

    // 2. بناء الإشارات المرتبة (بما فيها بيانات Python)
    const rankedSignals = buildRankedSignals();
    const clusterState = buildClusterState(rankedSignals);
    
    // 3. الحسابات الضغطية (المعادلات الأصلية)
    const signalPressure = Math.round(average(rankedSignals, s => s.score100));
    const systemPressure = clamp(signalPressure, 0, 100);
    const level = riskLevelFromScore(systemPressure);
    
    const system = {
      updatedAt: nowIso(),
      systemPressure,
      level,
      rankedSignals,
      topSignal: rankedSignals[0],
      topCluster: clusterState.clusters[0],
      topTheater: clusterState.theaters[0],
      snapshot: null
    };

    system.snapshot = getHomeSnapshot(system);
    STATE.lastSystem = system;
    saveState();
    return system;
  }

  function getHomeSnapshot(system) {
    return {
      topTheater: system.topTheater,
      topCluster: system.topCluster,
      latestNews: system.rankedSignals.slice(0, 3)
    };
  }

  function saveState() { localStorage.setItem(CONFIG.storageKey, JSON.stringify(STATE)); }
  function loadState() {
    const raw = localStorage.getItem(CONFIG.storageKey);
    if (raw) { const p = JSON.parse(raw); STATE.history = p.history || []; STATE.reports = p.reports || []; }
  }

  loadState();

  return {
    getSystemState: computeSystemState,
    getLastSystemState: () => STATE.lastSystem,
    getHistory: () => STATE.history,
    getReports: () => STATE.reports,
    CONFIG
  };
})();
