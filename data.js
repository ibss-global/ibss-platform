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
      en: "Gaza has transitioned from a battlefield into a structured pressure system where military force, governance fragility, humanitarian stress, and narrative competition intersect.",
      ar: "انتقلت غزة من ساحة قتال إلى نظام ضغط بنيوي تتقاطع فيه القوة العسكرية وهشاشة الحوكمة والضغط الإنساني والتنافس السردي."
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
      en: "Northern front escalation is entering a controlled instability phase with prolonged pressure and rapid-response requirements.",
      ar: "الجبهة الشمالية تدخل مرحلة من عدم الاستقرار المضبوط مع ضغط ممتد وحاجة إلى استجابة سريعة."
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
      en: "Diplomatic negotiation remains under pressure with unclear enforcement mechanisms and extended bargaining horizons.",
      ar: "المفاوضات الدبلوماسية ما تزال تحت الضغط مع غموض في آليات التنفيذ وآفاق تفاوض ممتدة."
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
      en: "Maritime pressure remains below the threshold of full strategic disruption, but still warrants monitoring.",
      ar: "الضغط البحري ما يزال دون عتبة التعطيل الاستراتيجي الكامل، لكنه يستحق المراقبة."
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
      en: "Localized escalation indicators remain fragmented, yet the file deserves monitoring due to broader spillover potential.",
      ar: "مؤشرات التصعيد الموضعية ما تزال متفرقة، لكن الملف يستحق المراقبة بسبب قدرته على التأثير الأوسع."
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

globalThis.IBSS_SIGNALS = IBSS_SIGNALS;
