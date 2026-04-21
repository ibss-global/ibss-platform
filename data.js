window.IBSS_DATA = (function () {
  "use strict";

  /* =========================
     CONFIG
  ========================= */

  const CONFIG = {
    version: "v3.0-clean",
    generatedAt: new Date().toISOString()
  };

  /* =========================
     UTILITIES
  ========================= */

  function safeText(v, fallback = "") {
    return typeof v === "string" && v.trim() ? v.trim() : fallback;
  }

  function normalizePriority(p) {
    const val = String(p || "LOW").toUpperCase();
    if (val === "HIGH") return "HIGH";
    if (val === "MEDIUM") return "MEDIUM";
    return "LOW";
  }

  function buildLocalized(textEn, textAr) {
    return {
      en: safeText(textEn, "-"),
      ar: safeText(textAr, textEn || "-")
    };
  }

  function nowIso(offsetMin = 0) {
    return new Date(Date.now() - offsetMin * 60000).toISOString();
  }

  /* =========================
     SIGNALS (Fallback Layer)
  ========================= */

  const signals = [
    {
      id: "SIG-GAZA-ESC-001",

      title: buildLocalized(
        "Escalation Pressure in Gaza Theater",
        "تصاعد الضغط في مسرح غزة"
      ),

      description: buildLocalized(
        "Rising military and political pressure suggesting structured escalation trajectory.",
        "تصاعد الضغط العسكري والسياسي بما يشير إلى مسار تصعيدي منظم."
      ),

      region: "gaza",
      country: "gaza",
      domain: "geo-security",

      priority: "HIGH",
      signalType: "escalation",

      score: 92,
      balancedScore100: 92,

      layer: "L9",
      sourceUnit: "SSU",

      decisionMode: "Escalation Preparation",

      timestamp: nowIso(5)
    },

    {
      id: "SIG-REDSEA-TRADE-002",

      title: buildLocalized(
        "Red Sea Trade Disruption Signal",
        "اضطراب التجارة في البحر الأحمر"
      ),

      description: buildLocalized(
        "Shipping instability impacting global supply routes.",
        "اضطراب الملاحة يؤثر على سلاسل الإمداد العالمية."
      ),

      region: "redsea",
      country: "redsea",
      domain: "geo-economics",

      priority: "MEDIUM",
      signalType: "disruption",

      score: 61,
      balancedScore100: 61,

      layer: "L5",
      sourceUnit: "CRU",

      decisionMode: "Monitoring",

      timestamp: nowIso(15)
    },

    {
      id: "SIG-IRAN-NUCLEAR-003",

      title: buildLocalized(
        "Iran Nuclear Posture Shift",
        "تغير في الموقف النووي الإيراني"
      ),

      description: buildLocalized(
        "Strategic signals indicate recalibration of nuclear posture.",
        "إشارات استراتيجية تدل على إعادة ضبط الموقف النووي."
      ),

      region: "iran",
      country: "iran",
      domain: "geo-security",

      priority: "HIGH",
      signalType: "strategic",

      score: 88,
      balancedScore100: 88,

      layer: "L8",
      sourceUnit: "SSU",

      decisionMode: "Strategic Watch",

      timestamp: nowIso(25)
    },

    {
      id: "SIG-LEB-POL-004",

      title: buildLocalized(
        "Lebanon Internal Political Friction",
        "احتكاك سياسي داخلي في لبنان"
      ),

      description: buildLocalized(
        "Internal fragmentation affecting governance stability.",
        "انقسام داخلي يؤثر على استقرار الحكم."
      ),

      region: "lebanon",
      country: "lebanon",
      domain: "geo-political",

      priority: "LOW",
      signalType: "political",

      score: 34,
      balancedScore100: 34,

      layer: "L3",
      sourceUnit: "CRU",

      decisionMode: "Background Monitoring",

      timestamp: nowIso(40)
    }
  ];

  /* =========================
     NEWS / FEED (Fallback)
  ========================= */

  const newsFeed = [
    {
      id: "NEWS-1",
      text: buildLocalized(
        "Negotiations show signs of breakdown in Gaza track.",
        "مؤشرات على تعثر مسار التفاوض في غزة."
      ),
      priority: "HIGH",
      timestamp: nowIso(3)
    },

    {
      id: "NEWS-2",
      text: buildLocalized(
        "Shipping delays reported across Red Sea corridor.",
        "تأخيرات في الشحن عبر ممر البحر الأحمر."
      ),
      priority: "MEDIUM",
      timestamp: nowIso(10)
    },

    {
      id: "NEWS-3",
      text: buildLocalized(
        "Regional diplomatic activity intensifies.",
        "تصاعد النشاط الدبلوماسي الإقليمي."
      ),
      priority: "LOW",
      timestamp: nowIso(20)
    }
  ];

  /* =========================
     COUNTRY BASELINES (CRU Seed)
  ========================= */

  const countries = [
    {
      id: "CTR-GAZA",
      name: buildLocalized("Gaza", "غزة"),
      region: "gaza",
      riskScore: 93
    },
    {
      id: "CTR-IRN",
      name: buildLocalized("Iran", "إيران"),
      region: "iran",
      riskScore: 87
    },
    {
      id: "CTR-RS",
      name: buildLocalized("Red Sea", "البحر الأحمر"),
      region: "redsea",
      riskScore: 66
    },
    {
      id: "CTR-LEB",
      name: buildLocalized("Lebanon", "لبنان"),
      region: "lebanon",
      riskScore: 38
    }
  ];

  /* =========================
     EXPORT
  ========================= */

  return {
    CONFIG,

    signals,
    newsFeed,
    countries
  };
})();
