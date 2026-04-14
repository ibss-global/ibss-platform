// IBSS DATA CORE — Unified Sovereign Structure
// Version: v1.0 Foundation Layer

(function () {
  "use strict";

  const IBSS_CONTENT = [
    {
      id: "CNT-001",
      title: {
        ar: "غزة: من ساحة قتال إلى بنية ضغط",
        en: "Gaza: From Battlefield to Pressure Structure"
      },
      summary: {
        ar: "قراءة سيادية تعتبر غزة نظام ضغط بنيوي تتقاطع فيه القوة العسكرية والهشاشة الحوكمية والضغط الإنساني والتنافس السردي.",
        en: "A sovereign reading that frames Gaza as a structural pressure system where military force, governance fragility, humanitarian stress, and narrative competition intersect."
      },
      type: "report",
      domain: "geo-security",
      country: "gaza",
      region: "levant",
      priority: "HIGH",
      status: "published",
      sourcePlatform: "facebook",
      publishedAt: "2026-04-13T09:00:00Z",
      linkedSignalIds: ["SIG-GAZA-001"],
      tags: ["غزة", "ضغط بنيوي", "حرب", "حوكمة", "إنساني"],
      engagement: {
        reactions: 0,
        comments: 0,
        shares: 0
      }
    },
    {
      id: "CNT-002",
      title: {
        ar: "لبنان: ضغط الجبهة الشمالية",
        en: "Lebanon: Northern Front Pressure"
      },
      summary: {
        ar: "تحليل يرصد استمرار الضغط على الجبهة الشمالية ضمن نمط هجين يجمع بين العسكري والسياسي.",
        en: "An analysis tracking sustained pressure on the northern front within a hybrid military-political pattern."
      },
      type: "report",
      domain: "military",
      country: "lebanon",
      region: "levant",
      priority: "HIGH",
      status: "published",
      sourcePlatform: "facebook",
      publishedAt: "2026-04-13T11:00:00Z",
      linkedSignalIds: ["SIG-LEB-001"],
      tags: ["لبنان", "الجبهة الشمالية", "عسكري", "هجين"],
      engagement: {
        reactions: 0,
        comments: 0,
        shares: 0
      }
    },
    {
      id: "CNT-003",
      title: {
        ar: "إيران: مفاوضات تحت الضغط",
        en: "Iran: Negotiations Under Pressure"
      },
      summary: {
        ar: "قراءة جيوسياسية للمفاوضات الإيرانية بوصفها مسارًا دبلوماسيًا غير مستقر تحت ضغط إقليمي ودولي.",
        en: "A geopolitical reading of Iran negotiations as an unstable diplomatic process under regional and international pressure."
      },
      type: "brief",
      domain: "geopolitical",
      country: "iran",
      region: "regional",
      priority: "MEDIUM",
      status: "published",
      sourcePlatform: "facebook",
      publishedAt: "2026-04-13T12:30:00Z",
      linkedSignalIds: ["SIG-IRN-001"],
      tags: ["إيران", "مفاوضات", "دبلوماسي", "جيوسياسي"],
      engagement: {
        reactions: 0,
        comments: 0,
        shares: 0
      }
    },
    {
      id: "CNT-004",
      title: {
        ar: "البحر الأحمر: توتر دون التعطيل الكامل",
        en: "Red Sea: Tension Below Full Disruption"
      },
      summary: {
        ar: "تقدير يعتبر أن مؤشرات البحر الأحمر ما تزال دون مستوى التعطيل الاستراتيجي الكامل لكنها تتطلب مراقبة.",
        en: "An estimate that Red Sea indicators remain below full strategic disruption, but still require monitoring."
      },
      type: "policy_paper",
      domain: "geo-military",
      country: "redsea",
      region: "maritime",
      priority: "LOW",
      status: "pending",
      sourcePlatform: "facebook",
      publishedAt: "2026-04-13T14:00:00Z",
      linkedSignalIds: ["SIG-RS-001"],
      tags: ["البحر الأحمر", "بحري", "ردع", "لوجستيات"],
      engagement: {
        reactions: 0,
        comments: 0,
        shares: 0
      }
    },
    {
      id: "CNT-005",
      title: {
        ar: "الضفة الغربية: مؤشرات تصعيد موضعي",
        en: "West Bank: Localized Escalation Indicators"
      },
      summary: {
        ar: "تحليل أمني يرى أن الضفة الغربية ما تزال في مستوى مراقبة مع قابلية للتوسع ضمن بيئة ضغط متقطعة.",
        en: "A security analysis assessing the West Bank as remaining at a watch level, with potential for expansion under intermittent pressure."
      },
      type: "brief",
      domain: "security",
      country: "westbank",
      region: "palestine",
      priority: "LOW",
      status: "pending",
      sourcePlatform: "facebook",
      publishedAt: "2026-04-13T15:30:00Z",
      linkedSignalIds: ["SIG-WB-001"],
      tags: ["الضفة الغربية", "أمني", "تصعيد", "مراقبة"],
      engagement: {
        reactions: 0,
        comments: 0,
        shares: 0
      }
    }
  ];

  const IBSS_SIGNALS = [
    {
      id: "SIG-GAZA-001",
      title: {
        ar: "بنية غزة",
        en: "Gaza Structure"
      },
      description: {
        ar: "حيز صراع بنيوي مضغوط تتقاطع فيه الطبقات العسكرية والحوكمية والإنسانية والسردية.",
        en: "A compressed structural conflict space where military, governance, humanitarian, and narrative layers intersect."
      },
      layer: {
        ar: "بنيوي",
        en: "Structural"
      },
      signalType: {
        ar: "بنيوي",
        en: "STRUCTURAL"
      },
      decisionMode: {
        ar: "مراقبة / استعداد",
        en: "WATCH / PRD"
      },
      influenceBand: {
        ar: "محوري",
        en: "CORE"
      },
      countryId: "CTR-GAZA",
      linkedContentIds: ["CNT-001"],
      reportMeta: {
        code: "SDR-002",
        type: "SDR",
        priority: "HIGH",
        status: {
          ar: "منشور",
          en: "Published"
        }
      },
      report: {
        ar: "انتقلت غزة من ساحة قتال إلى نظام ضغط بنيوي تتقاطع فيه القوة العسكرية وهشاشة الحوكمة والضغط الإنساني والتنافس السردي.",
        en: "Gaza has transitioned from a battlefield into a structured pressure system where military force, governance fragility, humanitarian stress, and narrative competition intersect."
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
      id: "SIG-LEB-001",
      title: {
        ar: "الضغط على لبنان",
        en: "Lebanon Pressure"
      },
      description: {
        ar: "ضغط الجبهة الشمالية ما يزال نشطًا ضمن أنماط تصعيد هجينة عسكرية وسياسية.",
        en: "Northern front pressure remains active with hybrid escalation patterns across military and political channels."
      },
      layer: {
        ar: "عسكري / هجين",
        en: "Military / Hybrid"
      },
      signalType: {
        ar: "عسكري",
        en: "MILITARY"
      },
      decisionMode: {
        ar: "مراقبة / تحرك",
        en: "WATCH / ACT"
      },
      influenceBand: {
        ar: "محوري",
        en: "CORE"
      },
      countryId: "CTR-LEB",
      linkedContentIds: ["CNT-002"],
      reportMeta: {
        code: "SDR-001",
        type: "SDR",
        priority: "HIGH",
        status: {
          ar: "منشور",
          en: "Published"
        }
      },
      report: {
        ar: "الجبهة الشمالية تدخل مرحلة من عدم الاستقرار المضبوط مع ضغط ممتد وحاجة إلى استجابة سريعة.",
        en: "Northern front escalation is entering a controlled instability phase with prolonged pressure and rapid-response requirements."
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
      id: "SIG-IRN-001",
      title: {
        ar: "المفاوضات الإيرانية",
        en: "Iran Negotiations"
      },
      description: {
        ar: "الانخراط الدبلوماسي مستمر تحت الضغط مع نفوذ متقلب وحدود تصعيد متنازع عليها.",
        en: "Diplomatic engagement continues under pressure with unstable leverage and contested escalation boundaries."
      },
      layer: {
        ar: "دبلوماسي",
        en: "Diplomatic"
      },
      signalType: {
        ar: "دبلوماسي",
        en: "DIPLOMATIC"
      },
      decisionMode: {
        ar: "استعداد",
        en: "PRD"
      },
      influenceBand: {
        ar: "مساند",
        en: "SUPPORT"
      },
      countryId: "CTR-IRN",
      linkedContentIds: ["CNT-003"],
      reportMeta: {
        code: "SDB-001",
        type: "SDB",
        priority: "MEDIUM",
        status: {
          ar: "منشور",
          en: "Published"
        }
      },
      report: {
        ar: "المفاوضات الدبلوماسية ما تزال تحت الضغط مع غموض في آليات التنفيذ وآفاق تفاوض ممتدة.",
        en: "Diplomatic negotiation remains under pressure with unclear enforcement mechanisms and extended bargaining horizons."
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
      id: "SIG-RS-001",
      title: {
        ar: "توتر البحر الأحمر",
        en: "Red Sea Tension"
      },
      description: {
        ar: "مؤشرات ضغط بحري تؤثر على الردع والثقة اللوجستية والإشارات الإقليمية.",
        en: "Maritime pressure indicators affecting deterrence credibility, logistics confidence, and regional signaling."
      },
      layer: {
        ar: "بحري",
        en: "Maritime"
      },
      signalType: {
        ar: "بحري",
        en: "MARITIME"
      },
      decisionMode: {
        ar: "قيد الإعداد",
        en: "Pending"
      },
      influenceBand: {
        ar: "مراقبة",
        en: "WATCH"
      },
      countryId: "CTR-RS",
      linkedContentIds: ["CNT-004"],
      reportMeta: {
        code: "PP-002",
        type: "PP",
        priority: "LOW",
        status: {
          ar: "قيد الإعداد",
          en: "Pending"
        }
      },
      report: {
        ar: "الضغط البحري ما يزال دون عتبة التعطيل الاستراتيجي الكامل، لكنه يستحق المراقبة.",
        en: "Maritime pressure remains below the threshold of full strategic disruption, but still warrants monitoring."
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
      id: "SIG-WB-001",
      title: {
        ar: "تصعيد الضفة الغربية",
        en: "West Bank Escalation"
      },
      description: {
        ar: "أنماط ضغط موضعية قادرة على تعديل الحسابات الأوسع للصراع ومنطق السيطرة الداخلي.",
        en: "Localized pressure patterns with the capacity to alter broader conflict calculations and internal control logic."
      },
      layer: {
        ar: "داخلي / أمني",
        en: "Internal / Security"
      },
      signalType: {
        ar: "أمني",
        en: "SECURITY"
      },
      decisionMode: {
        ar: "قيد الإعداد",
        en: "Pending"
      },
      influenceBand: {
        ar: "مراقبة",
        en: "WATCH"
      },
      countryId: "CTR-WB",
      linkedContentIds: ["CNT-005"],
      reportMeta: {
        code: "PP-003",
        type: "PP",
        priority: "LOW",
        status: {
          ar: "قيد الإعداد",
          en: "Pending"
        }
      },
      report: {
        ar: "مؤشرات التصعيد الموضعية ما تزال متفرقة، لكن الملف يستحق المراقبة بسبب قدرته على التأثير الأوسع.",
        en: "Localized escalation indicators remain fragmented, yet the file deserves monitoring due to broader spillover potential."
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

  const IBSS_COUNTRIES = [
    {
      id: "CTR-GAZA",
      slug: "gaza",
      name: {
        ar: "غزة",
        en: "Gaza"
      },
      region: "Palestine",
      riskScore: 91,
      riskLevel: "HIGH",
      trend: "RISING",
      primaryDrivers: {
        ar: [
          "الضغط العسكري",
          "الهشاشة الحوكمية",
          "الضغط الإنساني",
          "التنافس السردي"
        ],
        en: [
          "military pressure",
          "governance fragility",
          "humanitarian stress",
          "narrative competition"
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
      linkedContentIds: ["CNT-001"],
      lastUpdated: "2026-04-13T09:00:00Z",
      status: "active"
    },
    {
      id: "CTR-LEB",
      slug: "lebanon",
      name: {
        ar: "لبنان",
        en: "Lebanon"
      },
      region: "Levant",
      riskScore: 83,
      riskLevel: "HIGH",
      trend: "RISING",
      primaryDrivers: {
        ar: [
          "ضغط الجبهة الشمالية",
          "عدم الاستقرار الهجين",
          "الحاجة لاستجابة سريعة"
        ],
        en: [
          "northern front pressure",
          "hybrid instability",
          "rapid-response requirement"
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
      linkedContentIds: ["CNT-002"],
      lastUpdated: "2026-04-13T11:00:00Z",
      status: "active"
    },
    {
      id: "CTR-IRN",
      slug: "iran",
      name: {
        ar: "إيران",
        en: "Iran"
      },
      region: "Regional",
      riskScore: 58,
      riskLevel: "MEDIUM",
      trend: "STABLE",
      primaryDrivers: {
        ar: [
          "الضغط التفاوضي",
          "غموض التنفيذ",
          "تذبذب النفوذ"
        ],
        en: [
          "negotiation pressure",
          "enforcement ambiguity",
          "unstable leverage"
        ]
      },
      categories: {
        political: 62,
        security: 53,
        military: 48,
        economic: 57,
        diplomatic: 72
      },
      linkedSignalIds: ["SIG-IRN-001"],
      linkedContentIds: ["CNT-003"],
      lastUpdated: "2026-04-13T12:30:00Z",
      status: "active"
    },
    {
      id: "CTR-RS",
      slug: "red-sea",
      name: {
        ar: "البحر الأحمر",
        en: "Red Sea"
      },
      region: "Maritime",
      riskScore: 34,
      riskLevel: "LOW",
      trend: "STABLE",
      primaryDrivers: {
        ar: [
          "ضغط بحري محدود",
          "مخاطر لوجستية",
          "إشارات ردع"
        ],
        en: [
          "limited maritime pressure",
          "logistics risk",
          "deterrence signaling"
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
      linkedContentIds: ["CNT-004"],
      lastUpdated: "2026-04-13T14:00:00Z",
      status: "watch"
    },
    {
      id: "CTR-WB",
      slug: "west-bank",
      name: {
        ar: "الضفة الغربية",
        en: "West Bank"
      },
      region: "Palestine",
      riskScore: 29,
      riskLevel: "LOW",
      trend: "STABLE",
      primaryDrivers: {
        ar: [
          "ضغط موضعي",
          "قابلية التوسع",
          "توتر أمني متقطع"
        ],
        en: [
          "localized pressure",
          "spillover potential",
          "intermittent security tension"
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
      linkedContentIds: ["CNT-005"],
      lastUpdated: "2026-04-13T15:30:00Z",
      status: "watch"
    }
  ];

  function buildIndex(list) {
    return list.reduce((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {});
  }

  globalThis.IBSS_CONTENT = IBSS_CONTENT;
  globalThis.IBSS_SIGNALS = IBSS_SIGNALS;
  globalThis.IBSS_COUNTRIES = IBSS_COUNTRIES;

  globalThis.IBSS_INDEX = {
    contentById: buildIndex(IBSS_CONTENT),
    signalsById: buildIndex(IBSS_SIGNALS),
    countriesById: buildIndex(IBSS_COUNTRIES)
  };

  globalThis.IBSS_UTILS = {
    getPublishedContent() {
      return IBSS_CONTENT.filter(item => item.status === "published");
    },

    getLatestPublishedContent() {
      return [...IBSS_CONTENT]
        .filter(item => item.status === "published")
        .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    },

    getLatestStudy() {
      return [...IBSS_CONTENT]
        .filter(item =>
          item.type === "study" ||
          item.type === "policy_paper" ||
          item.type === "report"
        )
        .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))[0] || null;
    },

    getLatestNews(limit = 3) {
      return [...IBSS_CONTENT]
        .filter(item =>
          item.type === "news" ||
          item.type === "brief" ||
          item.type === "report"
        )
        .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
        .slice(0, limit);
    },

    getLiveSignals() {
      return IBSS_SIGNALS.filter(signal => signal.live === true);
    },

    getTopSignal() {
      return [...IBSS_SIGNALS]
        .sort((a, b) => (b.metrics?.impact || 0) - (a.metrics?.impact || 0))[0] || null;
    },

    getTopCountry() {
      return [...IBSS_COUNTRIES]
        .sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0))[0] || null;
    },

    getHighRiskCountries(limit = 5) {
      return [...IBSS_COUNTRIES]
        .sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0))
        .slice(0, limit);
    },

    getContentByType(type, limit = null) {
      const results = IBSS_CONTENT.filter(item => item.type === type)
        .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

      return limit ? results.slice(0, limit) : results;
    },

    getSignalsByWeight(weight) {
      return IBSS_SIGNALS.filter(signal => signal.weight === weight);
    },

    getSignalsByCountry(countryId) {
      return IBSS_SIGNALS.filter(signal => signal.countryId === countryId);
    },

    getCountryBySlug(slug) {
      return IBSS_COUNTRIES.find(country => country.slug === slug) || null;
    },

    getHomeSnapshot() {
      return {
        topSignal: this.getTopSignal(),
        topCountry: this.getTopCountry(),
        latestStudy: this.getLatestStudy(),
        latestNews: this.getLatestNews(3),
        liveSignalsCount: this.getLiveSignals().length,
        highRiskCountries: this.getHighRiskCountries(5)
      };
    }
  };
})();
