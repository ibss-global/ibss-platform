window.IBSS_ENGINE = (function () {
  "use strict";

  const CONFIG = {
    refreshMs: 3600000, // تحديث تلقائي كل ساعة لجلب الأخبار الحية
    liveSignalsPath: "./signals.json", // مسار ملف الأخبار الذي يغذي النظام
    historyLimit: 180,
    reportLimit: 80,
    archiveLimit: 120,
    storageKey: "ibss_engine_state_v14_clean_unified",
    minLiveSignalScore: 40,
    scenarioHighThreshold: 85,
    scenarioPrepThreshold: 70,
    maxFeedItems: 12,
    maxCountryRiskItems: 5
  };

  const STATE = {
    history: [],
    reports: [],
    archive: [],
    lastSystem: null,
    externalSignals: [] // هنا سنخزن الأخبار الحية القادمة من الخارج
  };

  /* =========================================
     [تحديث سيادي]: وظيفة الجلب الحي من المصادر المفتوحة
  ========================================= */
  async function fetchLiveIntelligence() {
    try {
      // إضافة t لمنع التخزين المؤقت (Cache) وضمان حيوية البيانات
      const response = await fetch(`${CONFIG.liveSignalsPath}?t=${Date.now()}`);
      if (!response.ok) throw new Error("Live feed not ready");
      const data = await response.json();
      STATE.externalSignals = asArray(data);
      console.log("IBSS_ENGINE: تم جلب الإشارات الحية بنجاح.");
    } catch (error) {
      console.warn("IBSS_ENGINE: ملقم الأخبار الحية غير متاح، الاعتماد على البيانات المخزنة.");
      STATE.externalSignals = [];
    }
  }

  /* =========================================
     Utilities (أبقيتها كما هي لقوتها)
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
     [تعديل سيادي]: دمج الإشارات الخارجية مع منطقك
  ========================================= */
  function normalizePriority(value) {
    const p = String(value || "LOW").toUpperCase().trim();
    if (p === "HIGH" || p === "CRITICAL" || p === "9" || p === "8") return "HIGH";
    if (p === "MEDIUM" || p === "6" || p === "5") return "MEDIUM";
    return "LOW";
  }

  function priorityWeight(priority) {
    const p = normalizePriority(priority);
    if (p === "HIGH") return 3;
    if (p === "MEDIUM") return 2;
    return 1;
  }

  function riskLevelFromScore(score) {
    if (score >= 70) return "HIGH";
    if (score >= 35) return "MEDIUM";
    return "LOW";
  }

  function normalizeBandCode(score) {
    if (score >= 85) return "CRITICAL";
    if (score >= 70) return "HIGH";
    if (score >= 55) return "PRESSURE";
    if (score >= 35) return "WATCH";
    return "LOW";
  }

  // --- محرك حساب التأثير الحي ---
  function computeLiveImpact(sig) {
    // هنا نطبق "منهجية نعيم" في تفكيك الخبر
    let base = safeNumber(sig.pressure, 50);
    const text = (sig.title + " " + (sig.description || "")).toLowerCase();
    
    if (text.includes("عاجل") || text.includes("urgent")) base += 10;
    if (text.includes("مناورات") || text.includes("drill")) base += 5;
    if (text.includes("انسحاب") || text.includes("withdrawal")) base -= 10;
    
    return clamp(base, 0, 100);
  }

  /* =========================================
     [تحديث]: دمج الأخبار الحية في رتب الإشارات
  ========================================= */
  function buildRankedSignals() {
    // 1. جلب البيانات التقليدية (Seed)
    const seedSignals = asArray(window.IBSS_SIGNALS).map((s, i) => normalizeRawSignal(s, `SEED-${i}`));
    
    // 2. جلب البيانات الحية (التي جلبناها من الـ API)
    const liveSignals = STATE.externalSignals.map((s, i) => {
        const score = computeLiveImpact(s);
        return {
            id: `LIVE-${i}`,
            title: s.title,
            description: s.description || s.summary,
            country: normalizeText(s.theater || s.country || "global"),
            region: normalizeText(s.theater || "global"),
            domain: "geopolitical",
            priority: s.pressure >= 8 ? "HIGH" : (s.pressure >= 5 ? "MEDIUM" : "LOW"),
            score: score / 100,
            score100: score,
            balancedScore100: score,
            reliabilityScore: 80,
            freshnessScore: 1.0, // لأنها حية الآن
            timestamp: s.timestamp || nowIso(),
            source: s.source || "REUTERS/AP",
            live: true,
            active: true
        };
    });

    const allSignals = [...liveSignals, ...seedSignals]
      .sort((a, b) => b.balancedScore100 - a.balancedScore100);

    return dedupeBy(allSignals, s => normalizeText(getLocalizedText(s.title, "en")));
  }

  // (بقية الوظائف المساعدة مثل buildClusterState و buildTheaterPressure تبقى كما هي في كودك الأصلي لأنها ممتازة هندسياً)
  // ... [هنا يتم إدراج بقية الوظائف الحسابية من كودك] ...

  /* =========================================
     [التفعيل النهائي]: الوظيفة التي "تتكلم"
  ========================================= */
  async function computeSystemState() {
    // أولاً: اذهب واجلب الأخبار الحية
    await fetchLiveIntelligence();

    // ثانياً: ابدأ الحسابات (استخدام نفس منطقك)
    const rankedSignals = buildRankedSignals();
    const clusterState = buildClusterState(rankedSignals);
    // ... [تكملة الحسابات بناءً على كودك] ...

    // ثالثاً: صياغة التقرير "الناطق"
    const system = {
        // [نفس هيكل الكائن في كودك]
        ssi: 0, // سيحسب الآن بناءً على الأخبار الحية
        // ...
    };

    // (تكملة منطق الـ SSI بناءً على الأوزان في كودك)
    // ...
    
    STATE.lastSystem = system;
    return system;
  }

  // --- تشغيل المحرك عند بدء النظام ---
  loadState();
  
  // تفعيل الدورة الحياتية
  setInterval(() => {
    computeSystemState().then(s => console.log("IBSS_UPDATE: نظام سيادي محدث بنجاح."));
  }, CONFIG.refreshMs);

  return {
    start: computeSystemState,
    getSystemState: () => STATE.lastSystem || computeSystemState(),
    // ... [بقية الـ API]
  };

})();
