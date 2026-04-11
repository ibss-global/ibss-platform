const IBSS_SIGNALS = [
  {
    id: "gaza",
    title: {
      en: "Gaza Structure",
      ar: "بنية غزة"
    },
    description: {
      en: "A compressed structural conflict space where military, governance, humanitarian, and narrative layers intersect.",
      ar: "حيز صراع بنيوي مضغوط تتقاطع فيه الطبقات العسكرية والحوكمية والإنسانية والسردية."
    },
    layer: {
      en: "Structural",
      ar: "بنيوي"
    },
    decisionMode: {
      en: "WATCH / PRD",
      ar: "مراقبة / استعداد"
    },
    signalType: {
      en: "STRUCTURAL",
      ar: "بنيوي"
    },
    influenceBand: {
      en: "CORE",
      ar: "محوري"
    },
    reportMeta: {
      code: "SDR-002",
      type: "SDR",
      priority: "HIGH",
      status: {
        en: "Active",
        ar: "نشط"
      }
    },
    report: {
      en: "Gaza has transitioned from a battlefield into a structured pressure system where military force, governance fragility, humanitarian stress, and narrative competition intersect. Decision Bias: Maintain WATCH / PRD posture and monitor structural shifts rather than isolated events.",
      ar: "انتقلت غزة من ساحة قتال إلى نظام ضغط بنيوي تتقاطع فيه القوة العسكرية وهشاشة الحوكمة والضغط الإنساني والتنافس السردي. انحياز القرار: الحفاظ على وضعية مراقبة / استعداد ومتابعة التحولات البنيوية بدلًا من الأحداث المعزولة."
    },
    region: "Gaza",
    weight: "HIGH",
    live: true,
    link: "signal-gaza.html",
    metrics: {
      weight: 0.95,
      volatility: 0.90,
      impact: 0.94
    }
  },
  {
    id: "lebanon",
    title: {
      en: "Lebanon Pressure",
      ar: "الضغط على لبنان"
    },
    description: {
      en: "Northern front pressure remains active with hybrid escalation patterns across military and political channels.",
      ar: "ضغط الجبهة الشمالية ما يزال نشطًا ضمن أنماط تصعيد هجينة عسكرية وسياسية."
    },
    layer: {
      en: "Military / Hybrid",
      ar: "عسكري / هجين"
    },
    decisionMode: {
      en: "WATCH / ACT",
      ar: "مراقبة / تحرك"
    },
    signalType: {
      en: "MILITARY",
      ar: "عسكري"
    },
    influenceBand: {
      en: "CORE",
      ar: "محوري"
    },
    reportMeta: {
      code: "SDR-001",
      type: "SDR",
      priority: "HIGH",
      status: {
        en: "Active",
        ar: "نشط"
      }
    },
    report: {
      en: "Northern front escalation is entering a controlled instability phase. The probability distribution suggests prolonged pressure without full war breakout. Decision Bias: Maintain WATCH posture while preparing rapid escalation response.",
      ar: "الجبهة الشمالية تدخل مرحلة من عدم الاستقرار المضبوط. توزيع الاحتمالات يشير إلى ضغط ممتد دون انفجار حرب شاملة. انحياز القرار: الحفاظ على وضعية المراقبة مع التحضير لاستجابة تصعيدية سريعة."
    },
    region: "Levant",
    weight: "HIGH",
    live: true,
    link: "signal-lebanon.html",
    metrics: {
      weight: 0.82,
      volatility: 0.77,
      impact: 0.84
    }
  },
  {
    id: "iran",
    title: {
      en: "Iran Negotiations",
      ar: "المفاوضات الإيرانية"
    },
    description: {
      en: "Diplomatic engagement continues under pressure with unstable leverage and contested escalation boundaries.",
      ar: "الانخراط الدبلوماسي مستمر تحت الضغط مع نفوذ متقلب وحدود تصعيد متنازع عليها."
    },
    layer: {
      en: "Diplomatic",
      ar: "دبلوماسي"
    },
    decisionMode: {
      en: "PRD",
      ar: "استعداد"
    },
    signalType: {
      en: "DIPLOMATIC",
      ar: "دبلوماسي"
    },
    influenceBand: {
      en: "SUPPORT",
      ar: "مساند"
    },
    reportMeta: {
      code: "SDB-001",
      type: "SDB",
      priority: "MEDIUM",
      status: {
        en: "Final",
        ar: "نهائي"
      }
    },
    report: {
      en: "Diplomatic negotiation remains under pressure with unclear enforcement mechanisms. The likely outcome is prolonged negotiation rather than decisive breakthrough.",
      ar: "المفاوضات الدبلوماسية ما تزال تحت الضغط مع غموض في آليات الفرض والتنفيذ. النتيجة الأرجح هي إطالة التفاوض بدلًا من اختراق حاسم."
    },
    region: "Diplomatic",
    weight: "MEDIUM",
    live: true,
    link: "signal-iran.html",
    metrics: {
      weight: 0.56,
      volatility: 0.52,
      impact: 0.58
    }
  },
  {
    id: "redsea",
    title: {
      en: "Red Sea Tension",
      ar: "توتر البحر الأحمر"
    },
    description: {
      en: "Maritime pressure indicators affecting deterrence credibility, logistics confidence, and regional signaling.",
      ar: "مؤشرات ضغط بحري تؤثر على الردع والثقة اللوجستية والإشارات الإقليمية."
    },
    layer: {
      en: "Maritime",
      ar: "بحري"
    },
    decisionMode: {
      en: "Pending",
      ar: "قيد الإعداد"
    },
    signalType: {
      en: "MARITIME",
      ar: "بحري"
    },
    influenceBand: {
      en: "WATCH",
      ar: "مراقبة"
    },
    reportMeta: {
      code: "PP-002",
      type: "PP",
      priority: "LOW",
      status: {
        en: "Pending",
        ar: "قيد الإعداد"
      }
    },
    report: {
      en: "Maritime pressure remains below the threshold of full strategic disruption, but the signal indicates a growing need for route-risk monitoring and deterrence reassessment.",
      ar: "الضغط البحري ما يزال دون عتبة التعطيل الاستراتيجي الكامل، لكن الإشارة تدل على تصاعد الحاجة إلى مراقبة مخاطر المسارات وإعادة تقييم الردع."
    },
    region: "Maritime",
    weight: "LOW",
    live: false,
    link: "#",
    metrics: {
      weight: 0.34,
      volatility: 0.29,
      impact: 0.31
    }
  },
  {
    id: "westbank",
    title: {
      en: "West Bank Escalation",
      ar: "تصعيد الضفة الغربية"
    },
    description: {
      en: "Localized pressure patterns with the capacity to alter broader conflict calculations and internal control logic.",
      ar: "أنماط ضغط موضعية قادرة على تعديل الحسابات الأوسع للصراع ومنطق السيطرة الداخلي."
    },
    layer: {
      en: "Internal / Security",
      ar: "داخلي / أمني"
    },
    decisionMode: {
      en: "Pending",
      ar: "قيد الإعداد"
    },
    signalType: {
      en: "SECURITY",
      ar: "أمني"
    },
    influenceBand: {
      en: "WATCH",
      ar: "مراقبة"
    },
    reportMeta: {
      code: "PP-003",
      type: "PP",
      priority: "LOW",
      status: {
        en: "Pending",
        ar: "قيد الإعداد"
      }
    },
    report: {
      en: "Localized escalation indicators remain fragmented, yet the file deserves monitoring due to its potential to alter wider conflict assumptions.",
      ar: "مؤشرات التصعيد الموضعية ما تزال متفرقة، لكن الملف يستحق المراقبة بسبب قدرته على تعديل افتراضات الصراع الأوسع."
    },
    region: "West Bank",
    weight: "LOW",
    live: false,
    link: "#",
    metrics: {
      weight: 0.29,
      volatility: 0.24,
      impact: 0.28
    }
  }
];

/* =========================
   Core Score Functions
========================= */

function getSignalScore(signal) {
  return (
    signal.metrics.weight * 0.5 +
    signal.metrics.volatility * 0.3 +
    signal.metrics.impact * 0.2
  );
}

function getSignalScore100(signal) {
  return Math.round(getSignalScore(signal) * 100);
}

/* =========================
   Signal Collections
========================= */

function getAllSignals() {
  return [...IBSS_SIGNALS];
}

function getLiveSignals() {
  return IBSS_SIGNALS.filter(signal => signal.live);
}

function getPendingSignals() {
  return IBSS_SIGNALS.filter(signal => !signal.live);
}

function getSignalsByWeight(weight) {
  return IBSS_SIGNALS.filter(signal => signal.weight === weight);
}

function getSignalsByType(type) {
  return IBSS_SIGNALS.filter(signal => signal.signalType.en === type);
}

function getSignalsByStatus(status) {
  if (status === "live") return getLiveSignals();
  if (status === "pending") return getPendingSignals();
  return getAllSignals();
}

/* =========================
   Ranking
========================= */

function getRankedSignals() {
  return [...IBSS_SIGNALS].sort((a, b) => getSignalScore(b) - getSignalScore(a));
}

function getRankedLiveSignals() {
  return getLiveSignals().sort((a, b) => getSignalScore(b) - getSignalScore(a));
}

function getDominantSignal() {
  const rankedLive = getRankedLiveSignals();
  return rankedLive.length ? rankedLive[0] : null;
}

/* =========================
   System State
========================= */

function getSystemState() {
  const liveSignals = getLiveSignals();

  if (!liveSignals.length) {
    return {
      ssi: 0,
      level: "LOW",
      decision: "WATCH",
      mode: "MONITORING",
      dominantSignal: null,
      liveSignals: [],
      scenarios: [34, 33, 33]
    };
  }

  const total = liveSignals.reduce((sum, signal) => sum + getSignalScore(signal), 0);
  const avg = total / liveSignals.length;
  const ssi = Math.round(avg * 100);

  let level = "LOW";
  let decision = "WATCH";
  let mode = "MONITORING";

  if (ssi >= 75) {
    level = "HIGH";
    decision = "ACT";
    mode = "ACTIVE RESPONSE";
  } else if (ssi >= 50) {
    level = "MEDIUM";
    decision = "PRD";
    mode = "PREPARATION";
  }

  let scenarios = [22, 33, 45];

  if (level === "HIGH") {
    scenarios = [58, 27, 15];
  } else if (level === "MEDIUM") {
    scenarios = [38, 37, 25];
  }

  return {
    ssi,
    level,
    decision,
    mode,
    dominantSignal: getDominantSignal(),
    liveSignals,
    scenarios
  };
}
