/* * IBSS SOVEREIGN ENGINE - FULL INTEGRATED EDITION V14.5
 * Engineered by: IBSS Sovereign Systems Architecture
 * Status: Ratified & Activated
 */

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
    // نقطة جلب البيانات الحية (تغذية خارجية)
    externalSignalsUrl: "./signals.json" 
  };

  const STATE = {
    history: [],
    reports: [],
    archive: [],
    lastSystem: null,
    externalSignals: [] // مخزن الإشارات الحية من المحرك الخارجي
  };

  /* =========================================
     Utilities (أدوات النظام الأساسية)
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
     Classification & Decision Logic (المنطق السيادي)
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
    return (band === "CRITICAL" || band === "HIGH") ? "HIGH" : ((band === "PRESSURE" || band === "WATCH") ? "MEDIUM" : "LOW");
  }

  function decisionFromSystem(systemPressure, confidenceScore) {
    if (systemPressure >= 90 && confidenceScore >= 78) return { decision: "ACT", mode: "ACTIVE RESPONSE" };
    if (systemPressure >= 78) return { decision: "PRD", mode: "PREPARATION" };
    if (systemPressure >= 55) return { decision: "WATCH+", mode: "HEIGHTENED MONITORING" };
    return { decision: "WATCH", mode: "MONITORING" };
  }

  /* =========================================
     External Sync Engine (محرك المزامنة الحية)
  ========================================= */
  async function syncExternalSignals() {
    try {
      const response = await fetch(CONFIG.externalSignalsUrl + '?t=' + Date.now());
      if (response.ok) {
        const data = await response.json();
        STATE.externalSignals = asArray(data).map((item, index) => ({
          id: `LIVE-${index}`,
          title: item.title,
          description: item.description || item.summary,
          country: normalizeText(item.theater || "global"),
          region: normalizeText(item.theater || "global"),
          domain: "geopolitical",
          priority: item.pressure >= 8 ? "HIGH" : (item.pressure >= 5 ? "MEDIUM" : "LOW"),
          score100: clamp((item.pressure || 5) * 10, 0, 100),
          timestamp: item.timestamp || nowIso(),
          source: "LIVE_FEED_PYTHON"
        }));
      }
    } catch (e) {
      console.warn("IBSS_ENGINE: Live signals not found or CORS restriction. Using static data.");
    }
  }

  /* =========================================
     Data Aggregation (تجميع وتصنيف البيانات)
  ========================================= */
  function getSeeds() { return asArray(window.IBSS_SIGNALS); }
  function getIngestion() { return window.IBSS_INGESTION?.getAllNormalized ? asArray(window.IBSS_INGESTION.getAllNormalized()) : []; }

  function buildRankedSignals() {
    const ingestion = getIngestion();
    const seeds = ingestion.length ? [] : getSeeds().map((s, i) => ({
        id: s.id || `SEED-${i}`,
        title: s.title,
        score100: clamp(safeNumber(s.metrics?.weight, 0.5) * 100, 0, 100),
        priority: normalizePriority(s.priority),
        country: normalizeText(s.country),
        source: "IBSS_SEED"
    }));

    // دمج الإشارات: المخزنة + القادمة من الـ Ingestion + الحية من Python
    const combined = [...ingestion, ...seeds, ...STATE.externalSignals];
    
    return dedupeBy(combined.map(s => {
      const base = clamp(safeNumber(s.score100, 50), 0, 100);
      return {
        ...s,
        balancedScore100: base,
        live: base >= CONFIG.minLiveSignalScore
      };
    }), item => `${normalizeText(getLocalizedText(item.title))}|${item.country}`)
    .sort((a, b) => b.balancedScore100 - a.balancedScore100);
  }

  /* =========================================
     Sovereign Calculation Engines (محركات الحساب)
  ========================================= */
  function buildClusterState(rankedSignals) {
    const live = rankedSignals.filter(s => s.live);
    const groups = new Map();

    live.forEach(s => {
      const region = normalizeText(s.region || s.country || "global");
      if (!groups.has(region)) groups.set(region, { name: region, total: 0, count: 0, signals: [] });
      const g = groups.get(region);
      g.total += s.balancedScore100;
      g.count++;
      g.signals.push(s);
    });

    const clusters = [...groups.values()].map((g, i) => ({
      id: `CL-${i}`,
      name: { en: `${titleCase(g.name)} Strategic File`, ar: `ملف استراتيجي: ${titleCase(g.name)}` },
      avgRisk: Math.round(g.total / g.count),
      region: g.name,
      signals: g.signals
    })).sort((a, b) => b.avgRisk - a.avgRisk);

    const theaters = clusters.map(c => ({
      id: `TH-${c.region}`,
      name: { en: `${titleCase(c.region)} Theater`, ar: `مسرح ${titleCase(c.region)}` },
      avgRisk: c.avgRisk,
      clusters: [c]
    }));

    return { clusters, theaters };
  }

  /* =========================================
     Main Execution Cycle (الدورة التشغيلية)
  ========================================= */
  async function computeSystemState() {
    // 1. المزامنة الحية أولاً
    await syncExternalSignals();

    // 2. معالجة الإشارات
    const rankedSignals = buildRankedSignals();
    const { clusters, theaters } = buildClusterState(rankedSignals);
    
    // 3. حساب ضغط النظام (SSI)
    const avgSignal = average(rankedSignals, s => s.balancedScore100);
    const topClusterRisk = clusters[0]?.avgRisk || 0;
    const systemPressure = clamp(Math.round((avgSignal * 0.6) + (topClusterRisk * 0.4)), 0, 100);
    
    const confidenceScore = clamp(70 + (rankedSignals.length * 2), 0, 100);
    const decisionState = decisionFromSystem(systemPressure, confidenceScore);

    const system = {
      updatedAt: nowIso(),
      ssi: systemPressure,
      systemPressure,
      level: riskLevelFromScore(systemPressure),
      decision: decisionState.decision,
      mode: decisionState.mode,
      confidenceScore,
      topSignal: rankedSignals[0] || null,
      topCluster: clusters[0] || null,
      topTheater: theaters[0] || null,
      rankedSignals,
      clusters,
      theaters,
      feed: []
    };

    // بناء التغذية الإخبارية (Feed)
    system.feed = [
      makeFeedItem("system_state", system.level, `System SSI: ${system.ssi}`, `ضغط النظام السيادي: ${system.ssi}`, "ENGINE"),
      ...rankedSignals.slice(0, 5).map(s => makeFeedItem("signal", s.priority, getLocalizedText(s.title, "en"), getLocalizedText(s.title, "ar"), s.source))
    ];

    STATE.lastSystem = system;
    saveState();
    return system;
  }

  function saveState() {
    try { localStorage.setItem(CONFIG.storageKey, JSON.stringify({ history: STATE.history, reports: STATE.reports })); } catch(e) {}
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(CONFIG.storageKey);
      if (raw) { const parsed = JSON.parse(raw); STATE.history = parsed.history || []; STATE.reports = parsed.reports || []; }
    } catch(e) {}
  }

  loadState();

  // الواجهة العامة للتحكم
  return {
    getSystemState: computeSystemState,
    getLastSystemState: () => STATE.lastSystem,
    getHistory: () => [...STATE.history],
    getReports: () => [...STATE.reports],
    sync: syncExternalSignals,
    CONFIG
  };

})();
