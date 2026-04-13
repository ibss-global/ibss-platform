(function () {
  "use strict";

  const now = new Date().toISOString();

  const signals = [
    {
      id: "gaza_structural_pressure",
      title: {
        en: "Gaza Structure",
        ar: "البنية في غزة"
      },
      description: {
        en: "Escalating structural pressure across military, humanitarian, and political layers.",
        ar: "تصاعد الضغط البنيوي عبر الطبقات العسكرية والإنسانية والسياسية."
      },
      signalType: {
        en: "STRUCTURAL",
        ar: "بنيوي"
      },
      decisionMode: {
        en: "ACT",
        ar: "تحرك"
      },
      layer: {
        en: "Regional",
        ar: "إقليمي"
      },
      region: "gaza",
      category: "structural",
      priority: "HIGH",
      active: true,
      live: true,
      link: "signal-gaza.html",
      metrics: {
        weight: 0.95,
        volatility: 0.86,
        impact: 0.91
      }
    },
    {
      id: "iran_activation_window",
      title: {
        en: "Iran Activation Window",
        ar: "نافذة التفعيل الإيرانية"
      },
      description: {
        en: "Strategic indicators suggest a widening operational window through regional leverage.",
        ar: "المؤشرات الاستراتيجية توحي باتساع نافذة تشغيل عبر أدوات النفوذ الإقليمي."
      },
      signalType: {
        en: "STRATEGIC",
        ar: "استراتيجي"
      },
      decisionMode: {
        en: "ACT",
        ar: "تحرك"
      },
      layer: {
        en: "Strategic",
        ar: "استراتيجي"
      },
      region: "iran",
      category: "strategic",
      priority: "HIGH",
      active: true,
      live: true,
      link: "signal-iran.html",
      metrics: {
        weight: 0.88,
        volatility: 0.72,
        impact: 0.85
      }
    },
    {
      id: "lebanon_border_instability",
      title: {
        en: "Lebanon Border Instability",
        ar: "هشاشة الحدود اللبنانية"
      },
      description: {
        en: "Border friction and tactical signaling indicate elevated escalation risk.",
        ar: "الاحتكاك الحدودي والإشارات التكتيكية يدلان على خطر تصعيد متزايد."
      },
      signalType: {
        en: "TACTICAL",
        ar: "تكتيكي"
      },
      decisionMode: {
        en: "CONTAIN",
        ar: "احتواء"
      },
      layer: {
        en: "Border Layer",
        ar: "طبقة الحدود"
      },
      region: "lebanon",
      category: "border",
      priority: "MEDIUM",
      active: true,
      live: true,
      link: "signal-lebanon.html",
      metrics: {
        weight: 0.71,
        volatility: 0.75,
        impact: 0.67
      }
    },
    {
      id: "global_narrative_shift",
      title: {
        en: "Global Narrative Shift",
        ar: "تحول السرد العالمي"
      },
      description: {
        en: "International discourse patterns indicate normalization of escalation language.",
        ar: "أنماط الخطاب الدولي تشير إلى تطبيع لغة التصعيد."
      },
      signalType: {
        en: "INFORMATION",
        ar: "معلوماتي"
      },
      decisionMode: {
        en: "WATCH",
        ar: "مراقبة"
      },
      layer: {
        en: "Information Sphere",
        ar: "الفضاء المعلوماتي"
      },
      region: "global",
      category: "narrative",
      priority: "MEDIUM",
      active: true,
      live: true,
      link: "signals.html",
      metrics: {
        weight: 0.62,
        volatility: 0.58,
        impact: 0.60
      }
    },
    {
      id: "diplomatic_silent_activity",
      title: {
        en: "Diplomatic Silent Activity",
        ar: "نشاط دبلوماسي صامت"
      },
      description: {
        en: "Quiet diplomatic movements suggest parallel negotiation channels under the surface.",
        ar: "التحركات الدبلوماسية الهادئة توحي بوجود قنوات تفاوض موازية تحت السطح."
      },
      signalType: {
        en: "DIPLOMATIC",
        ar: "دبلوماسي"
      },
      decisionMode: {
        en: "WATCH",
        ar: "مراقبة"
      },
      layer: {
        en: "Diplomatic Layer",
        ar: "الطبقة الدبلوماسية"
      },
      region: "global",
      category: "diplomatic",
      priority: "LOW",
      active: true,
      live: true,
      link: "reports.html",
      metrics: {
        weight: 0.46,
        volatility: 0.42,
        impact: 0.52
      }
    },
    {
      id: "system_reserve_monitor",
      title: {
        en: "System Reserve Monitor",
        ar: "مراقب الاحتياطي النظامي"
      },
      description: {
        en: "Internal reserve indicator used to preserve continuity during temporary signal thinning.",
        ar: "مؤشر احتياطي داخلي يستخدم للحفاظ على الاستمرارية عند تراجع كثافة الإشارات مؤقتًا."
      },
      signalType: {
        en: "SYSTEM",
        ar: "نظام"
      },
      decisionMode: {
        en: "WATCH",
        ar: "مراقبة"
      },
      layer: {
        en: "Core Engine",
        ar: "محرك أساسي"
      },
      region: "internal",
      category: "system",
      priority: "LOW",
      active: false,
      live: false,
      link: "#",
      metrics: {
        weight: 0.20,
        volatility: 0.12,
        impact: 0.18
      }
    }
  ];

  const reports = [
    {
      id: "sdr_001",
      title: {
        en: "SDR-001 | Gaza Structural Compression",
        ar: "SDR-001 | الانضغاط البنيوي في غزة"
      },
      date: now,
      status: {
        en: "Active",
        ar: "نشط"
      },
      link: "reports.html"
    },
    {
      id: "sdr_002",
      title: {
        en: "SDR-002 | Iran Regional Activation Outlook",
        ar: "SDR-002 | تقدير التفعيل الإقليمي الإيراني"
      },
      date: now,
      status: {
        en: "Active",
        ar: "نشط"
      },
      link: "reports.html"
    }
  ];

  const models = [
    {
      id: "sigma_9x",
      name: {
        en: "Σ-9X",
        ar: "Σ-9X"
      },
      title: {
        en: "Signal to Decision Engine",
        ar: "محرك الإشارة إلى القرار"
      }
    },
    {
      id: "waad",
      name: {
        en: "WAAD",
        ar: "WAAD"
      },
      title: {
        en: "War Acceptance Architecture",
        ar: "هندسة قبول الحرب"
      }
    },
    {
      id: "dlm",
      name: {
        en: "DLM",
        ar: "DLM"
      },
      title: {
        en: "Diplomatic Legitimacy Matrix",
        ar: "مصفوفة الشرعية الدبلوماسية"
      }
    }
  ];

  const meta = {
    systemName: "IBSS",
    fullName: {
      en: "International Bureau of Sovereign Studies",
      ar: "المكتب الدولي للدراسات السيادية"
    },
    founder: {
      en: "Founded by Naeem M. Dahalan",
      ar: "تأسيس نعيم م. دهلان"
    },
    statusLine: {
      en: "System Active — Monitoring Global Signals",
      ar: "النظام نشط — يراقب الإشارات العالمية"
    },
    sourceStatus: {
      en: "SOURCE — LIVE",
      ar: "المصدر — مباشر"
    },
    engineStatus: {
      en: "ENGINE — READY",
      ar: "المحرك — جاهز"
    },
    lastUpdate: now
  };

  const live = {
    initializedAt: now,
    source: "internal_dataset",
    version: "1.0.0",
    signalCount: signals.length
  };

  globalThis.IBSS_SIGNALS = signals;
  globalThis.IBSS_REPORTS = reports;
  globalThis.IBSS_MODELS = models;
  globalThis.IBSS_META = meta;
  globalThis.IBSS_LIVE = live;
})();
