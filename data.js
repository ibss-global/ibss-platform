// IBSS DATA CORE — Full Living Presence Seed
// Version: v4.0 Living Presence Data Foundation

window.IBSS_DATA = (function () {
  "use strict";

  /* =========================
     CONFIG
  ========================= */

  const CONFIG = {
    version: "v4.0-living-presence",
    generatedAt: new Date().toISOString(),
    source: "IBSS_DATA_CORE"
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

  function localized(en, ar) {
    return {
      en: safeText(en, "-"),
      ar: safeText(ar, en || "-")
    };
  }

  function nowIso(offsetMinutes = 0) {
    return new Date(Date.now() - (offsetMinutes * 60 * 1000)).toISOString();
  }

  function buildSignalScore(weight, volatility, impact) {
    return clamp(
      Math.round(
        (safeNumber(weight, 0.5) * 35) +
        (safeNumber(volatility, 0.5) * 25) +
        (safeNumber(impact, 0.5) * 40)
      ),
      0,
      100
    );
  }

  /* =========================
     LIVING PRESENCE SEED
  ========================= */

  const presenceSeed = {
    identity: {
      name: "IBSS Living Sovereign Presence",
      codename: "LIVING PRESENCE CORE",
      version: "LP-1.0"
    },

    baselineVoice: {
      posture: localized("MONITORING POSTURE", "وضعية مراقبة"),
      summary: localized(
        "The system remains active and continuously interprets incoming pressure.",
        "يبقى النظام نشطاً ويواصل تفسير الضغط الوارد بصورة مستمرة."
      ),
      explanation: localized(
        "The platform does not behave as a static dashboard. It listens, condenses, prioritizes, and projects structured meaning.",
        "المنصة لا تتصرف كلوحة جامدة، بل تستمع وتكثف وتُرتب الأولويات وتُسقط المعنى البنيوي."
      ),
      intent: localized(
        "Maintain sovereign continuity across signal intake, risk concentration, and decision support.",
        "الحفاظ على الاستمرارية السيادية عبر استقبال الإشارات وتركيز المخاطر ودعم القرار."
      ),
      advisory: localized(
        "Keep the dominant theater under continuous structured observation.",
        "أبقِ المسرح المهيمن تحت المراقبة البنيوية المستمرة."
      )
    },

    pressureModes: {
      low: {
        posture: localized("MONITORING POSTURE", "وضعية مراقبة"),
        urgency: localized("low", "منخفض"),
        summary: localized(
          "The system is stable under controlled monitoring conditions.",
          "النظام مستقر ضمن ظروف مراقبة مضبوطة."
        ),
        explanation: localized(
          "No immediate escalation posture is required, but structured listening remains active.",
          "لا توجد حاجة إلى وضعية تصعيد فورية، لكن الاستماع البنيوي يبقى فعالاً."
        ),
        intent: localized(
          "Continue observation, absorb signals, and refine long-range interpretation.",
          "الاستمرار في الرصد وامتصاص الإشارات وصقل التفسير بعيد المدى."
        ),
        advisory: localized(
          "Do not force escalation assumptions while signal density remains low.",
          "لا تفرض افتراضات تصعيدية ما دام كثافة الإشارات منخفضة."
        )
      },

      medium: {
        posture: localized("HEIGHTENED WATCH", "مراقبة مشددة"),
        urgency: localized("elevated", "مرتفع نسبياً"),
        summary: localized(
          "The system is operating under structured pressure with elevated sensitivity.",
          "يعمل النظام تحت ضغط بنيوي مع حساسية تشغيلية مرتفعة."
        ),
        explanation: localized(
          "Signals are beginning to cluster in ways that may shift the operational picture.",
          "بدأت الإشارات تتجمع بطريقة قد تغيّر المشهد التشغيلي."
        ),
        intent: localized(
          "Maintain live observation, tighten interpretation loops, and prepare escalation routing if pressure deepens.",
          "الحفاظ على الرصد الحي وتشديد حلقات التفسير والاستعداد لتمرير التصعيد إذا تعمق الضغط."
        ),
        advisory: localized(
          "Track the dominant file closely and preserve continuity between signal and publication layers.",
          "تابع الملف المهيمن عن قرب وحافظ على الاستمرارية بين طبقة الإشارات وطبقة المنشورات."
        )
      },

      high: {
        posture: localized("ACTIVE POSTURE", "وضعية نشطة"),
        urgency: localized("high", "مرتفع"),
        summary: localized(
          "The system is operating in a live active posture under concentrated strategic pressure.",
          "يعمل النظام ضمن وضعية نشطة حية تحت ضغط استراتيجي مركز."
        ),
        explanation: localized(
          "The dominant theater, top file, and high-grade signals now form a coherent escalation structure.",
          "يشكل المسرح المهيمن والملف الأعلى والإشارات عالية الكثافة بنية تصعيد متماسكة."
        ),
        intent: localized(
          "Sustain readiness, maintain continuity of live interpretation, and support decision-grade transition if escalation intensifies.",
          "الحفاظ على الجاهزية واستمرارية التفسير الحي ودعم الانتقال إلى درجة قرار إذا اشتد التصعيد."
        ),
        advisory: localized(
          "Preserve direct visibility over the leading theater and avoid fragmentation of risk interpretation.",
          "حافظ على الرؤية المباشرة للمسرح المتقدم وتجنب تفكك تفسير المخاطر."
        )
      },

      critical: {
        posture: localized("ACTIVE RESPONSE POSTURE", "وضعية استجابة نشطة"),
        urgency: localized("critical", "حرج"),
        summary: localized(
          "The system has entered a critical concentration band and is maintaining active response posture.",
          "دخل النظام إلى حزمة تركز حرجة ويحافظ على وضعية استجابة نشطة."
        ),
        explanation: localized(
          "Signals, pressure bands, and theater dominance now indicate that the system must behave as a live operational intelligence presence.",
          "تشير الإشارات وحزم الضغط وهيمنة المسرح إلى أن النظام يجب أن يتصرف كحضور استخباري تشغيلي حي."
        ),
        intent: localized(
          "Support immediate decision continuity, maintain live intake, and keep escalation logic available without delay.",
          "دعم استمرارية القرار الفوري والحفاظ على الاستقبال الحي وإبقاء منطق التصعيد جاهزاً دون تأخير."
        ),
        advisory: localized(
          "Do not dilute attention away from the primary theater while the system remains inside the critical band.",
          "لا تُشتت الانتباه بعيداً عن المسرح الأساسي ما دام النظام داخل الحزمة الحرجة."
        )
      }
    }
  };

  /* =========================
     SIGNALS — FALLBACK / SEED
  ========================= */

  const signals = [
    {
      id: "SIG-GAZA-ESC-001",
      title: localized(
        "Escalation Pressure in Gaza Theater",
        "تصاعد الضغط في مسرح غزة"
      ),
      summary: localized(
        "Rising structured escalation indicators are converging across military and political layers.",
        "تتقارب مؤشرات تصعيد بنيوي متصاعد عبر المستويين العسكري والسياسي."
      ),
      description: localized(
        "Rising military and political pressure suggests a structured escalation trajectory rather than isolated friction.",
        "يشير تصاعد الضغط العسكري والسياسي إلى مسار تصعيدي منظم لا إلى احتكاك معزول."
      ),
      region: "gaza",
      country: "gaza",
      countryId: "CTR-GAZA",
      domain: "geo-security",
      priority: "HIGH",
      signalType: localized("escalation", "تصعيد"),
      layer: "L9",
      sourceUnit: "SSU",
      source: "IBSS_SEED",
      decisionMode: localized("Escalation Preparation", "تحضير للتصعيد"),
      reliabilityScore: 88,
      freshnessScore: 0.96,
      metrics: {
        weight: 0.94,
        volatility: 0.86,
        impact: 0.95
      },
      score100: buildSignalScore(0.94, 0.86, 0.95),
      balancedScore100: buildSignalScore(0.94, 0.86, 0.95),
      timestamp: nowIso(5),
      live: true
    },

    {
      id: "SIG-IRAN-NUCLEAR-002",
      title: localized(
        "Iran Nuclear Posture Shift",
        "تغير في الموقف النووي الإيراني"
      ),
      summary: localized(
        "Strategic posture indicators point to recalibration with regional spillover implications.",
        "تشير مؤشرات التموضع الاستراتيجي إلى إعادة معايرة ذات تداعيات إقليمية ممتدة."
      ),
      description: localized(
        "Strategic signals indicate recalibration of nuclear posture with direct consequences for regional security architecture.",
        "تدل الإشارات الاستراتيجية على إعادة ضبط الموقف النووي بما ينعكس مباشرة على هندسة الأمن الإقليمي."
      ),
      region: "iran",
      country: "iran",
      countryId: "CTR-IRN",
      domain: "geo-security",
      priority: "HIGH",
      signalType: localized("strategic posture", "تموضع استراتيجي"),
      layer: "L8",
      sourceUnit: "SSU",
      source: "IBSS_SEED",
      decisionMode: localized("Strategic Watch", "مراقبة استراتيجية"),
      reliabilityScore: 84,
      freshnessScore: 0.89,
      metrics: {
        weight: 0.89,
        volatility: 0.72,
        impact: 0.91
      },
      score100: buildSignalScore(0.89, 0.72, 0.91),
      balancedScore100: buildSignalScore(0.89, 0.72, 0.91),
      timestamp: nowIso(18),
      live: true
    },

    {
      id: "SIG-REDSEA-TRADE-003",
      title: localized(
        "Red Sea Trade Disruption Signal",
        "إشارة اضطراب التجارة في البحر الأحمر"
      ),
      summary: localized(
        "Shipping instability continues to affect strategic trade corridors.",
        "يستمر اضطراب الملاحة في التأثير على الممرات التجارية الاستراتيجية."
      ),
      description: localized(
        "Shipping instability across the Red Sea corridor is affecting trade flow reliability and pressure mapping.",
        "يؤثر اضطراب الملاحة عبر ممر البحر الأحمر على موثوقية التدفق التجاري وخريطة الضغط."
      ),
      region: "redsea",
      country: "redsea",
      countryId: "CTR-RS",
      domain: "geo-economics",
      priority: "MEDIUM",
      signalType: localized("trade disruption", "اضطراب تجاري"),
      layer: "L5",
      sourceUnit: "CRU",
      source: "IBSS_SEED",
      decisionMode: localized("Monitoring", "مراقبة"),
      reliabilityScore: 76,
      freshnessScore: 0.82,
      metrics: {
        weight: 0.66,
        volatility: 0.61,
        impact: 0.70
      },
      score100: buildSignalScore(0.66, 0.61, 0.70),
      balancedScore100: buildSignalScore(0.66, 0.61, 0.70),
      timestamp: nowIso(28),
      live: true
    },

    {
      id: "SIG-LEB-GOV-004",
      title: localized(
        "Lebanon Internal Political Friction",
        "احتكاك سياسي داخلي في لبنان"
      ),
      summary: localized(
        "Internal fragmentation is weighing on governance continuity.",
        "يؤثر التفتت الداخلي على استمرارية الحكم."
      ),
      description: localized(
        "Internal fragmentation and governance strain are weakening institutional continuity inside Lebanon.",
        "يؤدي الانقسام الداخلي وضغط الحكم إلى إضعاف الاستمرارية المؤسسية داخل لبنان."
      ),
      region: "lebanon",
      country: "lebanon",
      countryId: "CTR-LEB",
      domain: "geo-political",
      priority: "LOW",
      signalType: localized("political friction", "احتكاك سياسي"),
      layer: "L3",
      sourceUnit: "CRU",
      source: "IBSS_SEED",
      decisionMode: localized("Background Monitoring", "مراقبة خلفية"),
      reliabilityScore: 69,
      freshnessScore: 0.64,
      metrics: {
        weight: 0.38,
        volatility: 0.42,
        impact: 0.36
      },
      score100: buildSignalScore(0.38, 0.42, 0.36),
      balancedScore100: buildSignalScore(0.38, 0.42, 0.36),
      timestamp: nowIso(42),
      live: false
    },

    {
      id: "SIG-WB-SEC-005",
      title: localized(
        "West Bank Security Friction Accumulation",
        "تراكم الاحتكاك الأمني في الضفة الغربية"
      ),
      summary: localized(
        "Localized security incidents are accumulating into a broader stress pattern.",
        "تتراكم الحوادث الأمنية الموضعية في صورة نمط ضغط أوسع."
      ),
      description: localized(
        "Localized security pressure is accumulating into a broader field pattern with possible spillover into the wider Palestine file.",
        "يتراكم الضغط الأمني الموضعي ليتحول إلى نمط ميداني أوسع مع احتمال امتداده إلى الملف الفلسطيني الأشمل."
      ),
      region: "westbank",
      country: "westbank",
      countryId: "CTR-WB",
      domain: "geo-security",
      priority: "MEDIUM",
      signalType: localized("security friction", "احتكاك أمني"),
      layer: "L6",
      sourceUnit: "CRU",
      source: "IBSS_SEED",
      decisionMode: localized("Heightened Monitoring", "مراقبة مشددة"),
      reliabilityScore: 78,
      freshnessScore: 0.79,
      metrics: {
        weight: 0.63,
        volatility: 0.69,
        impact: 0.65
      },
      score100: buildSignalScore(0.63, 0.69, 0.65),
      balancedScore100: buildSignalScore(0.63, 0.69, 0.65),
      timestamp: nowIso(16),
      live: true
    }
  ];

  /* =========================
     NEWS FEED — FALLBACK
  ========================= */

  const newsFeed = [
    {
      id: "NEWS-GAZA-001",
      title: localized(
        "Negotiation Track Shows Signs of Breakdown",
        "ظهور مؤشرات تعثر في مسار التفاوض"
      ),
      summary: localized(
        "Negotiation behavior suggests movement toward a harder escalation structure.",
        "يشير سلوك التفاوض إلى حركة باتجاه بنية تصعيد أكثر صلابة."
      ),
      description: localized(
        "Negotiation rhythm and field signals together indicate that diplomatic structure may be shifting toward escalation legitimation.",
        "يشير إيقاع التفاوض مع الإشارات الميدانية إلى أن البنية الدبلوماسية قد تتحول نحو شرعنة التصعيد."
      ),
      region: "gaza",
      country: "gaza",
      domain: "geo-security",
      priority: "HIGH",
      score100: 86,
      reliabilityScore: 81,
      freshnessScore: 0.95,
      source: "IBSS_NEWS_FALLBACK",
      publishedAt: nowIso(3)
    },

    {
      id: "NEWS-REDSEA-002",
      title: localized(
        "Shipping Delays Continue Across Red Sea Corridor",
        "استمرار تأخيرات الشحن عبر ممر البحر الأحمر"
      ),
      summary: localized(
        "Trade corridor reliability remains under sustained operational friction.",
        "تبقى موثوقية الممر التجاري تحت احتكاك تشغيلي مستمر."
      ),
      description: localized(
        "Ongoing disruption across the corridor continues to affect route confidence and commercial timing.",
        "يستمر الاضطراب عبر الممر في التأثير على الثقة بالمسار والتوقيت التجاري."
      ),
      region: "redsea",
      country: "redsea",
      domain: "geo-economics",
      priority: "MEDIUM",
      score100: 62,
      reliabilityScore: 73,
      freshnessScore: 0.83,
      source: "IBSS_NEWS_FALLBACK",
      publishedAt: nowIso(11)
    },

    {
      id: "NEWS-REGIONAL-003",
      title: localized(
        "Regional Diplomatic Movement Intensifies",
        "تصاعد الحركة الدبلوماسية الإقليمية"
      ),
      summary: localized(
        "Diplomatic motion is increasing across several connected files.",
        "تزداد الحركة الدبلوماسية عبر عدة ملفات مترابطة."
      ),
      description: localized(
        "Regional diplomatic signaling is increasing, indicating wider strategic positioning around active theaters.",
        "تزداد الإشارات الدبلوماسية الإقليمية بما يعكس تموضعاً استراتيجياً أوسع حول المسارح النشطة."
      ),
      region: "regional",
      country: "regional",
      domain: "diplomatic",
      priority: "LOW",
      score100: 44,
      reliabilityScore: 67,
      freshnessScore: 0.74,
      source: "IBSS_NEWS_FALLBACK",
      publishedAt: nowIso(22)
    }
  ];

  /* =========================
     COUNTRY BASELINES
  ========================= */

  const countries = [
    {
      id: "CTR-GAZA",
      name: localized("Gaza", "غزة"),
      region: "gaza",
      riskScore: 93,
      primaryDrivers: localized(
        ["Escalation concentration", "Negotiation breakdown risk", "Operational pressure"],
        ["تركز التصعيد", "خطر انهيار التفاوض", "ضغط تشغيلي"]
      )
    },
    {
      id: "CTR-IRN",
      name: localized("Iran", "إيران"),
      region: "iran",
      riskScore: 87,
      primaryDrivers: localized(
        ["Strategic posture shift", "Regional deterrence pressure", "Security architecture"],
        ["تغير التموضع الاستراتيجي", "ضغط الردع الإقليمي", "هندسة الأمن"]
      )
    },
    {
      id: "CTR-RS",
      name: localized("Red Sea", "البحر الأحمر"),
      region: "redsea",
      riskScore: 66,
      primaryDrivers: localized(
        ["Trade route instability", "Maritime friction", "Supply corridor pressure"],
        ["اضطراب المسار التجاري", "احتكاك بحري", "ضغط ممرات الإمداد"]
      )
    },
    {
      id: "CTR-LEB",
      name: localized("Lebanon", "لبنان"),
      region: "lebanon",
      riskScore: 38,
      primaryDrivers: localized(
        ["Governance strain", "Internal fragmentation", "Political friction"],
        ["ضغط الحكم", "تفكك داخلي", "احتكاك سياسي"]
      )
    },
    {
      id: "CTR-WB",
      name: localized("West Bank", "الضفة الغربية"),
      region: "westbank",
      riskScore: 64,
      primaryDrivers: localized(
        ["Security friction", "Localized field stress", "Palestine file spillover"],
        ["احتكاك أمني", "ضغط ميداني موضعي", "امتداد الملف الفلسطيني"]
      )
    }
  ];

  /* =========================
     CONTENT — BASE FALLBACK
  ========================= */

  const content = [
    {
      id: "PUB-GAZA-L9-001",
      type: "study",
      classification: "L9 Blueprint Deconstruction",
      edition: "L9-SOV Blueprint Deconstruction Edition",
      layer: "L9",
      mode: "Blueprint Deconstruction",
      title: localized(
        "Gaza — Blueprint Deconstruction: When Narrative Becomes Part of Operational War Architecture",
        "غزة — تفكيك المخطط البنيوي: حين تتحول السردية إلى جزء من البنية القتالية"
      ),
      summary: localized(
        "An L9-layer study reading negotiation failure and controlled narrative as part of a pre-operational war architecture.",
        "دراسة من طبقة L9 تقرأ فشل التفاوض والسردية المضبوطة كجزء من بنية تمهيدية للحرب."
      ),
      body: localized(
        "The visible event should not be read as a sequence of isolated headlines. The core question is structural: what architecture makes war appear as failed diplomacy rather than a pre-arranged decision? This study argues that narrative is not an explanation after the fact. It is part of the environment-building process that legitimizes escalation.",
        "لا ينبغي قراءة الحدث الظاهر كسلسلة عناوين منفصلة. السؤال المركزي هنا بنيوي: ما هي الهندسة التي تجعل الحرب تبدو كأنها نتيجة لفشل دبلوماسي لا قراراً معداً مسبقاً؟ تجادل هذه الدراسة بأن السردية ليست شرحاً لاحقاً، بل جزء من عملية بناء البيئة التي تمنح التصعيد شرعيته."
      ),
      unit: "SSU",
      status: "published",
      priority: "HIGH",
      domain: "geo-security",
      region: "gaza",
      country: "gaza",
      countryId: "CTR-GAZA",
      signalIds: ["SIG-GAZA-ESC-001"],
      clusterKeys: ["gaza::geo-security"],
      theaterKeys: ["gaza"],
      author: "Naeem Dahalan",
      authors: ["Naeem Dahalan"],
      sourcePlatform: "internal",
      sourceUrl: "",
      publishedAt: nowIso(60),
      tags: ["gaza", "L9", "WAAD", "blueprint deconstruction", "escalation"],
      metrics: {
        policyRisk: 86,
        implementationDifficulty: 72,
        regionalSensitivity: 91,
        strategicWeight: 94
      },
      meta: {
        featured: true,
        pinned: true,
        canonical: true
      }
    },

    {
      id: "PUB-IRAN-STRAT-002",
      type: "analysis",
      classification: "Strategic Position Assessment",
      edition: "Strategic Monitoring Edition",
      layer: "L8",
      mode: "Strategic Watch",
      title: localized(
        "Iran — Strategic Recalibration and Regional Security Echo",
        "إيران — إعادة المعايرة الاستراتيجية وصداها الأمني الإقليمي"
      ),
      summary: localized(
        "Assessment of Iranian posture shifts and their effect on regional security patterning.",
        "تقييم لتحولات التموضع الإيراني وتأثيرها على نمط الأمن الإقليمي."
      ),
      body: localized(
        "The significance of the Iranian signal does not lie only in nuclear posture itself, but in how surrounding systems reinterpret it. The signal matters because it changes deterrence reading, posture calibration, and regional expectation mapping.",
        "لا تكمن أهمية الإشارة الإيرانية في التموضع النووي نفسه فقط، بل في كيفية إعادة تفسير الأنظمة المحيطة له. تكتسب الإشارة أهميتها لأنها تغيّر قراءة الردع ومعايرة التموضع وخريطة التوقع الإقليمي."
      ),
      unit: "SSU",
      status: "published",
      priority: "HIGH",
      domain: "geo-security",
      region: "iran",
      country: "iran",
      countryId: "CTR-IRN",
      signalIds: ["SIG-IRAN-NUCLEAR-002"],
      clusterKeys: ["iran::geo-security"],
      theaterKeys: ["iran"],
      author: "Naeem Dahalan",
      authors: ["Naeem Dahalan"],
      sourcePlatform: "internal",
      sourceUrl: "",
      publishedAt: nowIso(140),
      tags: ["iran", "nuclear posture", "regional security", "strategic recalibration"],
      metrics: {
        policyRisk: 82,
        implementationDifficulty: 68,
        regionalSensitivity: 88,
        strategicWeight: 89
      },
      meta: {
        featured: false,
        pinned: true,
        canonical: false
      }
    },

    {
      id: "PUB-REDSEA-ECON-003",
      type: "brief",
      classification: "Strategic Trade Brief",
      edition: "Maritime Stability Brief",
      layer: "L5",
      mode: "Trade Corridor Monitoring",
      title: localized(
        "Red Sea — Corridor Disruption and Supply Confidence Stress",
        "البحر الأحمر — اضطراب الممر وضغط الثقة في الإمداد"
      ),
      summary: localized(
        "Brief mapping maritime disruption into strategic trade pressure.",
        "موجز يربط الاضطراب البحري بضغط التجارة الاستراتيجية."
      ),
      body: localized(
        "The Red Sea file should not be treated only as shipping news. It is a strategic pressure file because route confidence affects timing, insurance, supply continuity, and broader risk perception.",
        "لا ينبغي التعامل مع ملف البحر الأحمر كأخبار شحن فقط. إنه ملف ضغط استراتيجي لأن الثقة بالمسار تؤثر في التوقيت والتأمين واستمرارية الإمداد والإدراك الأوسع للمخاطر."
      ),
      unit: "SSU",
      status: "published",
      priority: "MEDIUM",
      domain: "geo-economics",
      region: "redsea",
      country: "redsea",
      countryId: "CTR-RS",
      signalIds: ["SIG-REDSEA-TRADE-003"],
      clusterKeys: ["redsea::geo-economics"],
      theaterKeys: ["redsea"],
      author: "IBSS",
      authors: ["IBSS"],
      sourcePlatform: "internal",
      sourceUrl: "",
      publishedAt: nowIso(220),
      tags: ["red sea", "trade", "shipping", "corridor risk"],
      metrics: {
        policyRisk: 61,
        implementationDifficulty: 43,
        regionalSensitivity: 67,
        strategicWeight: 73
      },
      meta: {
        featured: false,
        pinned: false,
        canonical: false
      }
    }
  ];

  /* =========================
     EXPORT
  ========================= */

  return {
    CONFIG,
    presenceSeed,
    signals,
    newsFeed,
    countries,
    content
  };
})();
