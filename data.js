// IBSS DATA CORE — Living Presence Structured Base
// Version: v4.0 Living Presence Data Layer

window.IBSS_DATA = (function () {
  "use strict";

  /* =========================
     CONFIG
  ========================= */

  const CONFIG = {
    version: "v4.0-living-presence",
    generatedAt: new Date().toISOString(),
    layer: "IBSS_DATA_CORE"
  };

  /* =========================
     UTILITIES
  ========================= */

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

  function normalizePriority(priority) {
    const p = String(priority || "LOW").toUpperCase().trim();
    if (p === "HIGH") return "HIGH";
    if (p === "MEDIUM") return "MEDIUM";
    return "LOW";
  }

  function localize(en, ar) {
    return {
      en: safeText(en, "-"),
      ar: safeText(ar, en || "-")
    };
  }

  function isoMinutesAgo(minutes = 0) {
    return new Date(Date.now() - (safeNumber(minutes, 0) * 60000)).toISOString();
  }

  function buildContentMetrics({
    policyRisk = 0,
    implementationDifficulty = 0,
    regionalSensitivity = 0,
    strategicWeight = 0
  } = {}) {
    return {
      policyRisk: clamp(policyRisk),
      implementationDifficulty: clamp(implementationDifficulty),
      regionalSensitivity: clamp(regionalSensitivity),
      strategicWeight: clamp(strategicWeight)
    };
  }

  function buildEngagement({
    reactions = 0,
    comments = 0,
    shares = 0
  } = {}) {
    return {
      reactions: safeNumber(reactions, 0),
      comments: safeNumber(comments, 0),
      shares: safeNumber(shares, 0)
    };
  }

  /* =========================
     CONTENT
  ========================= */

  const content = [
    {
      id: "CNT-GAZA-001",
      title: localize(
        "Gaza: From Battlefield to Pressure Structure",
        "غزة: من ساحة قتال إلى بنية ضغط"
      ),
      summary: localize(
        "A sovereign reading that frames Gaza as a structural pressure system where military force, governance fragility, humanitarian stress, and narrative competition intersect.",
        "قراءة سيادية تعتبر غزة نظام ضغط بنيوي تتقاطع فيه القوة العسكرية والهشاشة الحوكمية والضغط الإنساني والتنافس السردي."
      ),
      body: localize(
        "Gaza is no longer read merely as an isolated battlefield. It is assessed as a pressure structure combining military escalation, governance depletion, humanitarian overload, and narrative confrontation. The significance of the file lies in how these layers reinforce each other and raise the probability of wider regional spillover.",
        "لم تعد غزة تُقرأ كساحة قتال منفصلة فقط، بل كبنية ضغط مركبة تجمع بين التصعيد العسكري، واستنزاف الحوكمة، والضغط الإنساني، والصراع السردي. وتكمن أهمية الملف في أن هذه الطبقات باتت تعزز بعضها بعضًا، وترفع احتمال الامتداد الإقليمي الأوسع."
      ),
      type: "report",
      classification: "Sovereign Structural Reading",
      edition: "Gaza Pressure Structure Edition",
      layer: "L8",
      mode: "Structural Analysis",
      unit: "SSU",
      status: "published",
      domain: "geo-security",
      region: "gaza",
      country: "gaza",
      countryId: "CTR-GAZA",
      priority: "HIGH",
      author: "Naeem Dahalan",
      authors: ["Naeem Dahalan"],
      sourcePlatform: "internal",
      sourceUrl: "",
      publishedAt: "2026-04-13T09:00:00Z",
      signalIds: ["SIG-GAZA-001"],
      clusterKeys: ["gaza::geo-security"],
      theaterKeys: ["gaza"],
      tags: ["غزة", "ضغط بنيوي", "حرب", "حوكمة", "إنساني"],
      metrics: buildContentMetrics({
        policyRisk: 88,
        implementationDifficulty: 72,
        regionalSensitivity: 95,
        strategicWeight: 94
      }),
      engagement: buildEngagement(),
      links: [],
      meta: {
        featured: true,
        pinned: true,
        canonical: true
      }
    },

    {
      id: "CNT-LEB-001",
      title: localize(
        "Lebanon: Northern Front Pressure",
        "لبنان: ضغط الجبهة الشمالية"
      ),
      summary: localize(
        "An analysis tracking sustained pressure on the northern front within a hybrid military-political pattern.",
        "تحليل يرصد استمرار الضغط على الجبهة الشمالية ضمن نمط هجين يجمع بين العسكري والسياسي."
      ),
      body: localize(
        "The Lebanon file is assessed through the interaction of border tension, deterrence signaling, political fragility, and the controlled instability logic governing the northern front. The pressure is not constant in form, but persistent in strategic effect.",
        "يُقرأ ملف لبنان من خلال تفاعل توتر الحدود، وإشارات الردع، والهشاشة السياسية، ومنطق عدم الاستقرار المضبوط الذي يحكم الجبهة الشمالية. فالضغط ليس ثابتًا في شكله، لكنه مستمر في أثره الاستراتيجي."
      ),
      type: "report",
      classification: "Northern Front Strategic Reading",
      edition: "Northern Front Pressure Edition",
      layer: "L7",
      mode: "Hybrid Pressure Analysis",
      unit: "SSU",
      status: "published",
      domain: "military",
      region: "levant",
      country: "lebanon",
      countryId: "CTR-LEB",
      priority: "HIGH",
      author: "Naeem Dahalan",
      authors: ["Naeem Dahalan"],
      sourcePlatform: "internal",
      sourceUrl: "",
      publishedAt: "2026-04-13T11:00:00Z",
      signalIds: ["SIG-LEB-001"],
      clusterKeys: ["levant::military"],
      theaterKeys: ["levant"],
      tags: ["لبنان", "الجبهة الشمالية", "عسكري", "هجين"],
      metrics: buildContentMetrics({
        policyRisk: 80,
        implementationDifficulty: 66,
        regionalSensitivity: 84,
        strategicWeight: 86
      }),
      engagement: buildEngagement(),
      links: [],
      meta: {
        featured: false,
        pinned: false,
        canonical: false
      }
    },

    {
      id: "CNT-IRN-001",
      title: localize(
        "Iran: Negotiations Under Pressure",
        "إيران: مفاوضات تحت الضغط"
      ),
      summary: localize(
        "A geopolitical reading of Iran negotiations as an unstable diplomatic process under regional and international pressure.",
        "قراءة جيوسياسية للمفاوضات الإيرانية بوصفها مسارًا دبلوماسيًا غير مستقر تحت ضغط إقليمي ودولي."
      ),
      body: localize(
        "The visible negotiation track is assessed as constrained by regional pressure, enforcement ambiguity, and the possibility that diplomacy is being used as a temporal management layer rather than a settlement mechanism.",
        "يُقرأ المسار التفاوضي الظاهر باعتباره مقيدًا بالضغط الإقليمي، وغموض آليات التنفيذ، وإمكانية استخدام الدبلوماسية كطبقة لإدارة الوقت أكثر من كونها آلية تسوية حقيقية."
      ),
      type: "brief",
      classification: "Diplomatic Pressure Brief",
      edition: "Iran Negotiation Pressure Brief",
      layer: "L6",
      mode: "Diplomatic Monitoring",
      unit: "SSU",
      status: "published",
      domain: "geopolitical",
      region: "regional",
      country: "iran",
      countryId: "CTR-IRN",
      priority: "MEDIUM",
      author: "Naeem Dahalan",
      authors: ["Naeem Dahalan"],
      sourcePlatform: "internal",
      sourceUrl: "",
      publishedAt: "2026-04-13T12:30:00Z",
      signalIds: ["SIG-IRN-001"],
      clusterKeys: ["regional::geopolitical"],
      theaterKeys: ["regional"],
      tags: ["إيران", "مفاوضات", "دبلوماسي", "جيوسياسي"],
      metrics: buildContentMetrics({
        policyRisk: 71,
        implementationDifficulty: 58,
        regionalSensitivity: 78,
        strategicWeight: 75
      }),
      engagement: buildEngagement(),
      links: [],
      meta: {
        featured: false,
        pinned: false,
        canonical: false
      }
    },

    {
      id: "CNT-RS-001",
      title: localize(
        "Red Sea: Tension Below Full Disruption",
        "البحر الأحمر: توتر دون التعطيل الكامل"
      ),
      summary: localize(
        "An estimate that Red Sea indicators remain below full strategic disruption, but still require monitoring.",
        "تقدير يعتبر أن مؤشرات البحر الأحمر ما تزال دون مستوى التعطيل الاستراتيجي الكامل لكنها تتطلب مراقبة."
      ),
      body: localize(
        "The Red Sea file shows maritime stress that affects deterrence credibility, commercial confidence, and logistics continuity. It has not yet crossed the threshold of total strategic paralysis, but it continues to matter as a cumulative disruption vector.",
        "يُظهر ملف البحر الأحمر ضغطًا بحريًا يمس مصداقية الردع والثقة التجارية واستمرارية اللوجستيات. ولم يعبر بعد عتبة الشلل الاستراتيجي الكامل، لكنه ما يزال مهمًا كمسار تعطيل تراكمي."
      ),
      type: "policy_paper",
      classification: "Maritime Pressure Estimate",
      edition: "Red Sea Monitoring Paper",
      layer: "L5",
      mode: "Maritime Observation",
      unit: "SSU",
      status: "pending",
      domain: "geo-military",
      region: "maritime",
      country: "redsea",
      countryId: "CTR-RS",
      priority: "LOW",
      author: "Naeem Dahalan",
      authors: ["Naeem Dahalan"],
      sourcePlatform: "internal",
      sourceUrl: "",
      publishedAt: "2026-04-13T14:00:00Z",
      signalIds: ["SIG-RS-001"],
      clusterKeys: ["maritime::geo-military"],
      theaterKeys: ["maritime"],
      tags: ["البحر الأحمر", "بحري", "ردع", "لوجستيات"],
      metrics: buildContentMetrics({
        policyRisk: 42,
        implementationDifficulty: 34,
        regionalSensitivity: 52,
        strategicWeight: 48
      }),
      engagement: buildEngagement(),
      links: [],
      meta: {
        featured: false,
        pinned: false,
        canonical: false
      }
    },

    {
      id: "CNT-WB-001",
      title: localize(
        "West Bank: Localized Escalation Indicators",
        "الضفة الغربية: مؤشرات تصعيد موضعي"
      ),
      summary: localize(
        "A security analysis assessing the West Bank as remaining at a watch level, with potential for expansion under intermittent pressure.",
        "تحليل أمني يرى أن الضفة الغربية ما تزال في مستوى مراقبة مع قابلية للتوسع ضمن بيئة ضغط متقطعة."
      ),
      body: localize(
        "The West Bank file remains below dominant theater status, yet its importance lies in escalation spillover potential and its capacity to modify broader control calculations if local triggers align with regional pressure.",
        "ما يزال ملف الضفة الغربية دون مرتبة المسرح المهيمن، إلا أن أهميته تكمن في قابلية انتقال التصعيد وقدرته على تعديل حسابات السيطرة الأوسع إذا تلاقت المحفزات المحلية مع الضغط الإقليمي."
      ),
      type: "brief",
      classification: "Localized Escalation Brief",
      edition: "West Bank Monitoring Brief",
      layer: "L5",
      mode: "Security Observation",
      unit: "SSU",
      status: "pending",
      domain: "security",
      region: "palestine",
      country: "westbank",
      countryId: "CTR-WB",
      priority: "LOW",
      author: "Naeem Dahalan",
      authors: ["Naeem Dahalan"],
      sourcePlatform: "internal",
      sourceUrl: "",
      publishedAt: "2026-04-13T15:30:00Z",
      signalIds: ["SIG-WB-001"],
      clusterKeys: ["palestine::security"],
      theaterKeys: ["palestine"],
      tags: ["الضفة الغربية", "أمني", "تصعيد", "مراقبة"],
      metrics: buildContentMetrics({
        policyRisk: 36,
        implementationDifficulty: 28,
        regionalSensitivity: 39,
        strategicWeight: 34
      }),
      engagement: buildEngagement(),
      links: [],
      meta: {
        featured: false,
        pinned: false,
        canonical: false
      }
    },

    {
      id: "CNT-IRN-002",
      title: localize(
        "Iran: The Second Russian Warning Within a U.S. Negotiation Masking Environment",
        "إيران: التحذير الروسي الثاني داخل بيئة تفاوض أمريكية تمويهية"
      ),
      summary: localize(
        "A sovereign study assessing that the U.S. negotiation track is not a stable settlement path, but a temporal masking process for preparing a wider escalation environment against Iran.",
        "دراسة سيادية تعتبر أن مسار التفاوض الأمريكي ليس مسار تسوية مستقرة، بل غطاء زمني لإعداد بيئة تصعيد أوسع ضد إيران."
      ),
      body: localize(
        "The second Russian warning is assessed not as a passing diplomatic signal but as an indicator of eroding confidence in the visible negotiation channel. The study frames the diplomatic scene as a masking environment that may be enabling a deeper transition from compound pressure to wider confrontation logic.",
        "لا يُقرأ التحذير الروسي الثاني كإشارة دبلوماسية عابرة، بل كمؤشر على تآكل الثقة في القناة التفاوضية الظاهرة. وتؤطر الدراسة المشهد الدبلوماسي بوصفه بيئة تمويه قد تُمكّن انتقالًا أعمق من الضغط المركب إلى منطق مواجهة أوسع."
      ),
      type: "study",
      classification: "Sovereign Warning Study",
      edition: "Second Russian Warning Edition",
      layer: "L9",
      mode: "Blueprint Deconstruction",
      unit: "SSU",
      status: "published",
      domain: "geo-security",
      region: "regional",
      country: "iran",
      countryId: "CTR-IRN",
      priority: "HIGH",
      author: "Naeem Dahalan",
      authors: ["Naeem Dahalan"],
      sourcePlatform: "internal",
      sourceUrl: "",
      publishedAt: "2026-04-19T10:30:00Z",
      signalIds: ["SIG-IRN-002"],
      clusterKeys: ["regional::geo-security"],
      theaterKeys: ["regional"],
      tags: [
        "إيران",
        "روسيا",
        "التحذير الروسي الثاني",
        "تمويه تفاوضي",
        "تصعيد",
        "اجتياح بري",
        "بنتاغون",
        "جيوأمني"
      ],
      metrics: buildContentMetrics({
        policyRisk: 91,
        implementationDifficulty: 75,
        regionalSensitivity: 93,
        strategicWeight: 96
      }),
      engagement: buildEngagement(),
      links: [],
      meta: {
        featured: true,
        pinned: true,
        canonical: true
      }
    }
  ];

  /* =========================
     SIGNALS
  ========================= */

  const signals = [
    {
      id: "SIG-GAZA-001",
      title: localize("Gaza Structure", "بنية غزة"),
      description: localize(
        "A compressed structural conflict space where military, governance, humanitarian, and narrative layers intersect.",
        "حيز صراع بنيوي مضغوط تتقاطع فيه الطبقات العسكرية والحوكمية والإنسانية والسردية."
      ),
      summary: localize(
        "Gaza is assessed as a structural pressure core.",
        "تُقرأ غزة كقلب ضغط بنيوي."
      ),
      region: "gaza",
      country: "gaza",
      domain: "geo-security",
      priority: "HIGH",
      signalType: localize("STRUCTURAL", "بنيوي"),
      influenceBand: localize("CORE", "محوري"),
      layer: "L8",
      sourceUnit: "SSU",
      decisionMode: localize("WATCH / PREPARE", "مراقبة / استعداد"),
      reliabilityScore: 87,
      freshnessScore: 0.94,
      score100: 92,
      balancedScore100: 92,
      live: true,
      source: "IBSS_SEED",
      timestamp: isoMinutesAgo(7),
      metrics: {
        weight: 0.95,
        volatility: 0.90,
        impact: 0.94
      }
    },

    {
      id: "SIG-LEB-001",
      title: localize("Lebanon Pressure", "الضغط على لبنان"),
      description: localize(
        "Northern front pressure remains active with hybrid escalation patterns across military and political channels.",
        "ضغط الجبهة الشمالية ما يزال نشطًا ضمن أنماط تصعيد هجينة عسكرية وسياسية."
      ),
      summary: localize(
        "Lebanon remains inside a hybrid northern-front pressure frame.",
        "ما يزال لبنان داخل إطار ضغط هجين على الجبهة الشمالية."
      ),
      region: "levant",
      country: "lebanon",
      domain: "military",
      priority: "HIGH",
      signalType: localize("MILITARY", "عسكري"),
      influenceBand: localize("CORE", "محوري"),
      layer: "L7",
      sourceUnit: "SSU",
      decisionMode: localize("WATCH / ACT", "مراقبة / تحرك"),
      reliabilityScore: 81,
      freshnessScore: 0.88,
      score100: 84,
      balancedScore100: 84,
      live: true,
      source: "IBSS_SEED",
      timestamp: isoMinutesAgo(18),
      metrics: {
        weight: 0.82,
        volatility: 0.77,
        impact: 0.84
      }
    },

    {
      id: "SIG-IRN-001",
      title: localize("Iran Negotiations", "المفاوضات الإيرانية"),
      description: localize(
        "Diplomatic engagement continues under pressure with unstable leverage and contested escalation boundaries.",
        "الانخراط الدبلوماسي مستمر تحت الضغط مع نفوذ متقلب وحدود تصعيد متنازع عليها."
      ),
      summary: localize(
        "The negotiation file remains unstable but active.",
        "يبقى الملف التفاوضي نشطًا لكنه غير مستقر."
      ),
      region: "regional",
      country: "iran",
      domain: "geopolitical",
      priority: "MEDIUM",
      signalType: localize("DIPLOMATIC", "دبلوماسي"),
      influenceBand: localize("SUPPORT", "مساند"),
      layer: "L6",
      sourceUnit: "SSU",
      decisionMode: localize("PREPARATION", "استعداد"),
      reliabilityScore: 74,
      freshnessScore: 0.80,
      score100: 58,
      balancedScore100: 58,
      live: true,
      source: "IBSS_SEED",
      timestamp: isoMinutesAgo(24),
      metrics: {
        weight: 0.56,
        volatility: 0.52,
        impact: 0.58
      }
    },

    {
      id: "SIG-IRN-002",
      title: localize("Iran: Second Russian Warning", "إيران: التحذير الروسي الثاني"),
      description: localize(
        "A high-level sovereign signal assessing that the U.S. negotiation track functions as a temporal masking environment while broader military pressure forms in the background.",
        "إشارة سيادية عالية تعتبر أن المسار التفاوضي الأمريكي يعمل كبيئة تمويه زمني بينما تتشكل في الخلفية بنية ضغط عسكري أوسع."
      ),
      summary: localize(
        "The diplomatic channel may be masking escalation preparation.",
        "قد تكون القناة الدبلوماسية غطاءً لتحضير تصعيد أوسع."
      ),
      region: "regional",
      country: "iran",
      domain: "geo-security",
      priority: "HIGH",
      signalType: localize("SOVEREIGN WARNING", "إنذار سيادي"),
      influenceBand: localize("CORE", "محوري"),
      layer: "L9",
      sourceUnit: "SSU",
      decisionMode: localize("WATCH / PREPARE / ESCALATION READINESS", "مراقبة / استعداد / تهيؤ تصعيد"),
      reliabilityScore: 89,
      freshnessScore: 0.93,
      score100: 91,
      balancedScore100: 91,
      live: true,
      source: "IBSS_SEED",
      timestamp: isoMinutesAgo(11),
      metrics: {
        weight: 0.91,
        volatility: 0.86,
        impact: 0.92
      }
    },

    {
      id: "SIG-RS-001",
      title: localize("Red Sea Tension", "توتر البحر الأحمر"),
      description: localize(
        "Maritime pressure indicators affecting deterrence credibility, logistics confidence, and regional signaling.",
        "مؤشرات ضغط بحري تؤثر على الردع والثقة اللوجستية والإشارات الإقليمية."
      ),
      summary: localize(
        "Red Sea pressure remains relevant but below full disruption.",
        "يبقى ضغط البحر الأحمر مهمًا لكنه دون التعطيل الكامل."
      ),
      region: "maritime",
      country: "redsea",
      domain: "geo-military",
      priority: "LOW",
      signalType: localize("MARITIME", "بحري"),
      influenceBand: localize("WATCH", "مراقبة"),
      layer: "L5",
      sourceUnit: "CRU",
      decisionMode: localize("PENDING", "قيد الإعداد"),
      reliabilityScore: 68,
      freshnessScore: 0.67,
      score100: 31,
      balancedScore100: 31,
      live: false,
      source: "IBSS_SEED",
      timestamp: isoMinutesAgo(44),
      metrics: {
        weight: 0.34,
        volatility: 0.29,
        impact: 0.31
      }
    },

    {
      id: "SIG-WB-001",
      title: localize("West Bank Escalation", "تصعيد الضفة الغربية"),
      description: localize(
        "Localized pressure patterns with the capacity to alter broader conflict calculations and internal control logic.",
        "أنماط ضغط موضعية قادرة على تعديل الحسابات الأوسع للصراع ومنطق السيطرة الداخلي."
      ),
      summary: localize(
        "The West Bank remains in watch status with spillover potential.",
        "تبقى الضفة الغربية في حالة مراقبة مع قابلية للامتداد."
      ),
      region: "palestine",
      country: "westbank",
      domain: "security",
      priority: "LOW",
      signalType: localize("SECURITY", "أمني"),
      influenceBand: localize("WATCH", "مراقبة"),
      layer: "L5",
      sourceUnit: "CRU",
      decisionMode: localize("PENDING", "قيد الإعداد"),
      reliabilityScore: 64,
      freshnessScore: 0.60,
      score100: 28,
      balancedScore100: 28,
      live: false,
      source: "IBSS_SEED",
      timestamp: isoMinutesAgo(52),
      metrics: {
        weight: 0.29,
        volatility: 0.24,
        impact: 0.28
      }
    }
  ];

  /* =========================
     NEWS FEED
  ========================= */

  const newsFeed = [
    {
      id: "NEWS-GAZA-001",
      title: localize(
        "Gaza pressure remains structurally elevated",
        "يبقى ضغط غزة مرتفعًا بنيويًا"
      ),
      summary: localize(
        "Indicators continue to point toward a layered conflict environment rather than isolated tactical friction.",
        "تستمر المؤشرات في الإشارة إلى بيئة صراع طبقية لا إلى احتكاك تكتيكي معزول."
      ),
      priority: "HIGH",
      severity: "HIGH",
      region: "gaza",
      country: "gaza",
      domain: "geo-security",
      sourceName: "IBSS Live Desk",
      timestamp: isoMinutesAgo(4),
      publishedAt: isoMinutesAgo(4)
    },

    {
      id: "NEWS-IRN-001",
      title: localize(
        "Iran file shows widening pressure window",
        "ملف إيران يُظهر اتساع نافذة الضغط"
      ),
      summary: localize(
        "The diplomatic scene remains active, but background indicators suggest broader strategic preparation.",
        "يبقى المشهد الدبلوماسي نشطًا، لكن المؤشرات الخلفية توحي بتحضير استراتيجي أوسع."
      ),
      priority: "HIGH",
      severity: "HIGH",
      region: "regional",
      country: "iran",
      domain: "geo-security",
      sourceName: "IBSS Live Desk",
      timestamp: isoMinutesAgo(9),
      publishedAt: isoMinutesAgo(9)
    },

    {
      id: "NEWS-RS-001",
      title: localize(
        "Maritime pressure persists in the Red Sea corridor",
        "يستمر الضغط البحري في ممر البحر الأحمر"
      ),
      summary: localize(
        "Disruption remains below full strategic paralysis but continues to affect logistics confidence.",
        "يبقى التعطيل دون مستوى الشلل الاستراتيجي الكامل لكنه يواصل التأثير في الثقة اللوجستية."
      ),
      priority: "MEDIUM",
      severity: "MEDIUM",
      region: "maritime",
      country: "redsea",
      domain: "geo-military",
      sourceName: "IBSS Maritime Desk",
      timestamp: isoMinutesAgo(16),
      publishedAt: isoMinutesAgo(16)
    },

    {
      id: "NEWS-LEB-001",
      title: localize(
        "Northern front friction remains active",
        "تبقى احتكاكات الجبهة الشمالية نشطة"
      ),
      summary: localize(
        "The Lebanon theater continues to operate inside a hybrid pressure band.",
        "يواصل مسرح لبنان العمل داخل حزمة ضغط هجينة."
      ),
      priority: "MEDIUM",
      severity: "MEDIUM",
      region: "levant",
      country: "lebanon",
      domain: "military",
      sourceName: "IBSS Field Monitor",
      timestamp: isoMinutesAgo(23),
      publishedAt: isoMinutesAgo(23)
    }
  ];

  /* =========================
     COUNTRIES
  ========================= */

  const countries = [
    {
      id: "CTR-GAZA",
      slug: "gaza",
      name: localize("Gaza", "غزة"),
      region: "Palestine",
      riskScore: 91,
      riskLevel: "HIGH",
      trend: "RISING",
      primaryDrivers: {
        en: [
          "military pressure",
          "governance fragility",
          "humanitarian stress",
          "narrative competition"
        ],
        ar: [
          "الضغط العسكري",
          "الهشاشة الحوكمية",
          "الضغط الإنساني",
          "التنافس السردي"
        ]
      },
      categories: {
        political: 78,
        security: 88,
        military: 94,
        economic: 61,
        humanitarian: 96
      },
      linkedSignalIds: ["SIG-GAZA-001"],
      linkedContentIds: ["CNT-GAZA-001"],
      lastUpdated: "2026-04-13T09:00:00Z",
      status: "active"
    },

    {
      id: "CTR-LEB",
      slug: "lebanon",
      name: localize("Lebanon", "لبنان"),
      region: "Levant",
      riskScore: 83,
      riskLevel: "HIGH",
      trend: "RISING",
      primaryDrivers: {
        en: [
          "northern front pressure",
          "hybrid instability",
          "rapid-response requirement"
        ],
        ar: [
          "ضغط الجبهة الشمالية",
          "عدم الاستقرار الهجين",
          "الحاجة لاستجابة سريعة"
        ]
      },
      categories: {
        political: 71,
        security: 82,
        military: 87,
        economic: 49,
        diplomatic: 58
      },
      linkedSignalIds: ["SIG-LEB-001"],
      linkedContentIds: ["CNT-LEB-001"],
      lastUpdated: "2026-04-13T11:00:00Z",
      status: "active"
    },

    {
      id: "CTR-IRN",
      slug: "iran",
      name: localize("Iran", "إيران"),
      region: "Regional",
      riskScore: 84,
      riskLevel: "HIGH",
      trend: "RISING",
      primaryDrivers: {
        en: [
          "negotiation shifting into a masking environment",
          "compound military pressure escalation",
          "second Russian warning",
          "rising probability of broader confrontation"
        ],
        ar: [
          "تحول التفاوض إلى بيئة تمويه",
          "تصاعد الضغط العسكري المركب",
          "التحذير الروسي الثاني",
          "ارتفاع احتمالات المواجهة الأوسع"
        ]
      },
      categories: {
        political: 79,
        security: 84,
        military: 81,
        economic: 63,
        diplomatic: 76
      },
      linkedSignalIds: ["SIG-IRN-001", "SIG-IRN-002"],
      linkedContentIds: ["CNT-IRN-001", "CNT-IRN-002"],
      lastUpdated: "2026-04-19T10:30:00Z",
      status: "active"
    },

    {
      id: "CTR-RS",
      slug: "red-sea",
      name: localize("Red Sea", "البحر الأحمر"),
      region: "Maritime",
      riskScore: 34,
      riskLevel: "LOW",
      trend: "STABLE",
      primaryDrivers: {
        en: [
          "limited maritime pressure",
          "logistics risk",
          "deterrence signaling"
        ],
        ar: [
          "ضغط بحري محدود",
          "مخاطر لوجستية",
          "إشارات ردع"
        ]
      },
      categories: {
        political: 22,
        security: 35,
        military: 38,
        economic: 41,
        maritime: 47
      },
      linkedSignalIds: ["SIG-RS-001"],
      linkedContentIds: ["CNT-RS-001"],
      lastUpdated: "2026-04-13T14:00:00Z",
      status: "watch"
    },

    {
      id: "CTR-WB",
      slug: "west-bank",
      name: localize("West Bank", "الضفة الغربية"),
      region: "Palestine",
      riskScore: 29,
      riskLevel: "LOW",
      trend: "STABLE",
      primaryDrivers: {
        en: [
          "localized pressure",
          "spillover potential",
          "intermittent security tension"
        ],
        ar: [
          "ضغط موضعي",
          "قابلية التوسع",
          "توتر أمني متقطع"
        ]
      },
      categories: {
        political: 31,
        security: 39,
        military: 18,
        economic: 27,
        social: 34
      },
      linkedSignalIds: ["SIG-WB-001"],
      linkedContentIds: ["CNT-WB-001"],
      lastUpdated: "2026-04-13T15:30:00Z",
      status: "watch"
    }
  ];

  /* =========================
     VOICE PRESETS
  ========================= */

  const voiceProfiles = {
    monitoring: {
      posture: localize("MONITORING", "مراقبة"),
      tone: localize("Calm", "هادئ"),
      tempo: localize("Measured", "متزن")
    },
    heightened: {
      posture: localize("HEIGHTENED MONITORING", "مراقبة معززة"),
      tone: localize("Focused", "مركّز"),
      tempo: localize("Alert", "منتبه")
    },
    preparation: {
      posture: localize("PREPARATION", "تحضير"),
      tone: localize("Directive", "توجيهي"),
      tempo: localize("Accelerated", "متسارع")
    },
    active: {
      posture: localize("ACTIVE RESPONSE", "استجابة نشطة"),
      tone: localize("Commanding", "حازم"),
      tempo: localize("Immediate", "فوري")
    }
  };

  /* =========================
     EXPORT
  ========================= */

  return {
    CONFIG,
    content,
    signals,
    newsFeed,
    countries,
    voiceProfiles
  };
})();

window.IBSS_CONTENT = window.IBSS_DATA.content;
window.IBSS_SIGNALS = window.IBSS_DATA.signals;
window.IBSS_COUNTRIES = window.IBSS_DATA.countries;
window.IBSS_NEWS = window.IBSS_DATA.newsFeed;
