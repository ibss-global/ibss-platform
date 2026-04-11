const IBSS_SIGNALS = [
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
    region: "Levant",
    weight: "HIGH",
    live: true,
    link: "signal-lebanon.html",
    metrics: {
      weight: 0.90,
      volatility: 0.80,
      impact: 0.90
    }
  },
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
    region: "Gaza",
    weight: "HIGH",
    live: true,
    link: "signal-gaza.html",
    metrics: {
      weight: 0.88,
      volatility: 0.85,
      impact: 0.86
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
    region: "Diplomatic",
    weight: "MEDIUM",
    live: true,
    link: "signal-iran.html",
    metrics: {
      weight: 0.64,
      volatility: 0.58,
      impact: 0.62
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

function getSignalScore(signal) {
  return (
    signal.metrics.weight * 0.5 +
    signal.metrics.volatility * 0.3 +
    signal.metrics.impact * 0.2
  );
}

function getLiveSignals() {
  return IBSS_SIGNALS.filter(signal => signal.live);
}

function getRankedSignals() {
  return [...IBSS_SIGNALS].sort((a, b) => getSignalScore(b) - getSignalScore(a));
}

function getDominantSignal() {
  return getRankedSignals()[0];
}

function getSystemState() {
  const liveSignals = getLiveSignals();
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
