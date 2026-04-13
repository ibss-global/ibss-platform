(function () {
  "use strict";

  const STORAGE_KEY = "ibss_live_system";

  /* =========================
     Utils
  ========================= */

  function isObject(v){
    return v !== null && typeof v === "object" && !Array.isArray(v);
  }

  function toNumber(v, fallback = 0){
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  function clamp(v, min, max){
    return Math.min(Math.max(v, min), max);
  }

  /* =========================
     Signals
  ========================= */

  function getSignals(){
    return Array.isArray(globalThis.IBSS_SIGNALS) ? globalThis.IBSS_SIGNALS : [];
  }

  function normalizeSignal(signal, i = 0){
    const s = isObject(signal) ? signal : {};
    const m = isObject(s.metrics) ? s.metrics : {};

    return {
      id: s.id || `signal_${i+1}`,
      title: isObject(s.title)
        ? s.title
        : {
            en: typeof s.title === "string" ? s.title : `Signal ${i+1}`,
            ar: typeof s.title === "string" ? s.title : `إشارة ${i+1}`
          },
      metrics: {
        weight: clamp(toNumber(m.weight), 0, 1),
        volatility: clamp(toNumber(m.volatility), 0, 1),
        impact: clamp(toNumber(m.impact), 0, 1)
      },
      live: s.live === true || s.active === true,
      active: s.active === true || s.live === true,
      raw: s
    };
  }

  function getNormalizedSignals(){
    return getSignals().map(normalizeSignal);
  }

  /* =========================
     Core Calculations
  ========================= */

  function getSignalScore(s){
    if (!s || !s.metrics) return 0;

    return clamp(
      (s.metrics.weight * 0.5) +
      (s.metrics.volatility * 0.3) +
      (s.metrics.impact * 0.2),
      0, 1
    );
  }

  function getDominantSignalData(){
    const signals = getNormalizedSignals();
    if (!signals.length) return null;

    return signals.sort((a,b)=>getSignalScore(b)-getSignalScore(a))[0];
  }

  function computeSSI(signals){
    if (!signals.length) return 0;

    const avg = signals.reduce((sum,s)=>sum+getSignalScore(s),0)/signals.length;
    return Math.round(clamp(avg * 100, 0, 100));
  }

  function getLevel(ssi){
    if (ssi >= 75) return "HIGH";
    if (ssi >= 50) return "MEDIUM";
    return "LOW";
  }

  function getDecision(level){
    if (level === "HIGH") return "ACT";
    if (level === "MEDIUM") return "PRD";
    return "WATCH";
  }

  function getActiveSignalsCount(){
    const s = getNormalizedSignals();
    return s.filter(x=>x.active).length || s.length || 0;
  }

  /* =========================
     System Builder
  ========================= */

  function buildSystem(){
    const signals = getNormalizedSignals();
    const dominant = getDominantSignalData();
    const ssi = computeSSI(signals);
    const level = getLevel(ssi);
    const decision = getDecision(level);

    return {
      ssi,
      level,
      decision,
      dominantSignalId: dominant?.id || null,
      dominantSignal: dominant || null,
      activeSignals: getActiveSignalsCount(),
      rankedSignals: signals.sort((a,b)=>getSignalScore(b)-getSignalScore(a)),
      updatedAt: new Date().toISOString(),
      source: "engine"
    };
  }

  /* =========================
     Storage
  ========================= */

  function save(state){
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }catch(e){}
  }

  function read(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return null;
      return JSON.parse(raw);
    }catch(e){
      return null;
    }
  }

  function clear(){
    try{
      localStorage.removeItem(STORAGE_KEY);
    }catch(e){}
  }

  /* =========================
     MAIN TICK (🔥 FIX)
  ========================= */

  function tick(){
    try{
      const system = buildSystem();
      save(system);
      return system;
    }catch(error){
      console.error("IBSS tick error:", error);

      const fallback = read();
      if (fallback) return fallback;

      return {
        ssi: 0,
        level: "LOW",
        decision: "WATCH",
        dominantSignal: null,
        rankedSignals: [],
        activeSignals: 0,
        source: "fallback"
      };
    }
  }

  /* =========================
     EXPORT
  ========================= */

  globalThis.IBSS_ENGINE = {
    version: "3.0.0",

    tick, // 🔥 أهم نقطة

    getSignals,
    getNormalizedSignals,
    getSignalScore,
    getDominantSignalData,
    getActiveSignalsCount,

    buildSystem,
    read,
    save,
    clear
  };

})();
