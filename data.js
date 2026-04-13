(function () {
  "use strict";

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
        en: "Gaza has transitioned from a battlefield into a structured pressure system where multiple layers intersect.",
        ar: "انتقلت غزة من ساحة قتال إلى نظام ضغط بنيوي تتقاطع فيه عدة طبقات."
      },
      region: "Gaza",
      priority: "HIGH",
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
        en: "Northern front pressure remains active with hybrid escalation patterns.",
        ar: "ضغط الجبهة الشمالية مستمر بأنماط تصعيد هجينة."
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
        en: "Escalation is entering controlled instability phase.",
        ar: "التصعيد يدخل مرحلة عدم الاستقرار المضبوط."
      },
      region: "Levant",
      priority: "HIGH",
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
        en: "Diplomatic engagement continues under pressure.",
        ar: "الانخراط الدبلوماسي مستمر تحت الضغط."
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
        en: "Negotiations remain under pressure with unclear outcomes.",
        ar: "المفاوضات ما تزال تحت الضغط مع غموض النتائج."
      },
      region: "Diplomatic",
      priority: "MEDIUM",
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
        en: "Maritime pressure affecting logistics and deterrence.",
        ar: "ضغط بحري يؤثر على اللوجستيات والردع."
      },
      layer: {
        en: "Maritime",
        ar: "بحري"
      },
      decisionMode: {
        en: "WATCH",
        ar: "مراقبة"
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
        en: "Below disruption threshold but requires monitoring.",
        ar: "دون العتبة لكنه يحتاج مراقبة."
      },
      region: "Maritime",
      priority: "LOW",
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
        en: "Localized pressure with broader spillover potential.",
        ar: "ضغط موضعي مع إمكانية تأثير أوسع."
      },
      layer: {
        en: "Internal / Security",
        ar: "داخلي / أمني"
      },
      decisionMode: {
        en: "WATCH",
        ar: "مراقبة"
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
        en: "Fragmented indicators but worth monitoring.",
        ar: "مؤشرات متفرقة لكنها تستحق المراقبة."
      },
      region: "West Bank",
      priority: "LOW",
      live: false,
      link: "#",
      metrics: {
        weight: 0.29,
        volatility: 0.24,
        impact: 0.28
      }
    }
  ];

  // 🔥 Freeze for safety (prevents accidental mutation)
  Object.freeze(IBSS_SIGNALS);

  // 🔥 Global expose
  globalThis.IBSS_SIGNALS = IBSS_SIGNALS;

})();
