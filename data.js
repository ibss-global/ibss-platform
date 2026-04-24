// IBSS DATA CORE — Clean Compatibility Build
// Version: v4.1 Sovereign Living Dataset

window.IBSS_DATA = (function () {
  "use strict";

  const CONFIG = {
    version: "v4.1-sovereign-living-dataset",
    generatedAt: new Date().toISOString(),
    schema: "IBSS_EXPANDED_DATA_SCHEMA_V1"
  };

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

  function localize(en, ar) {
    return {
      en: safeText(en, "-"),
      ar: safeText(ar, en || "-")
    };
  }

  function nowIso(offsetMinutes = 0) {
    return new Date(Date.now() - offsetMinutes * 60 * 1000).toISOString();
  }

  function buildMetrics(input = {}) {
    return {
      weight: clamp(safeNumber(input.weight, 0.5), 0, 1),
      volatility: clamp(safeNumber(input.volatility, 0.5), 0, 1),
      impact: clamp(safeNumber(input.impact, 0.5), 0, 1),
      confidence: clamp(safeNumber(input.confidence, 0.65), 0, 1),
      urgency: clamp(safeNumber(input.urgency, 0.5), 0, 1)
    };
  }

  const countries = [
    {
      id: "CTR-GAZA",
      name: localize("Gaza", "غزة"),
      nameLocalized: localize("Gaza", "غزة"),
      region: "gaza",
      theater: "levant",
      riskScore: 74,
      riskLevel: "HIGH",
      trend: "rising",
      governanceStress: 88,
      infrastructureStress: 91,
      operationalDensity: 93,
      primaryDrivers: {
        en: ["Escalation architecture", "Governance fragmentation", "Negotiation instability", "Humanitarian strain"],
        ar: ["هندسة التصعيد", "تفكك الحوكمة", "عدم استقرار التفاوض", "الضغط الإنساني"]
      }
    },
    {
      id: "CTR-WB",
      name: localize("West Bank", "الضفة الغربية"),
      nameLocalized: localize("West Bank", "الضفة الغربية"),
      region: "westbank",
      theater: "levant",
      riskScore: 57,
      riskLevel: "MEDIUM",
      trend: "watch",
      governanceStress: 63,
      infrastructureStress: 49,
      operationalDensity: 55,
      primaryDrivers: {
        en: ["Administrative pressure", "Localized friction", "Institutional ambiguity"],
        ar: ["ضغط إداري", "احتكاك موضعي", "غموض مؤسسي"]
      }
    },
    {
      id: "CTR-LEB",
      name: localize("Lebanon", "لبنان"),
      nameLocalized: localize("Lebanon", "لبنان"),
      region: "lebanon",
      theater: "levant",
      riskScore: 52,
      riskLevel: "MEDIUM",
      trend: "stable-pressure",
      governanceStress: 79,
      infrastructureStress: 58,
      operationalDensity: 46,
      primaryDrivers: {
        en: ["Internal fragmentation", "Border pressure", "Institutional weakness"],
        ar: ["تفكك داخلي", "ضغط حدودي", "هشاشة مؤسسية"]
      }
    },
    {
      id: "CTR-IRN",
      name: localize("Iran", "إيران"),
      nameLocalized: localize("Iran", "إيران"),
      region: "iran",
      theater: "gulf",
      riskScore: 69,
      riskLevel: "MEDIUM",
      trend: "rising-watch",
      governanceStress: 51,
      infrastructureStress: 43,
      operationalDensity: 77,
      primaryDrivers: {
        en: ["Strategic deterrence posture", "Regional projection", "Nuclear signaling"],
        ar: ["وضعية ردع استراتيجية", "إسقاط إقليمي", "إشارات نووية"]
      }
    },
    {
      id: "CTR-RS",
      name: localize("Red Sea", "البحر الأحمر"),
      nameLocalized: localize("Red Sea", "البحر الأحمر"),
      region: "redsea",
      theater: "maritime",
      riskScore: 61,
      riskLevel: "MEDIUM",
      trend: "persistent",
      governanceStress: 34,
      infrastructureStress: 67,
      operationalDensity: 72,
      primaryDrivers: {
        en: ["Shipping disruption", "Trade insecurity", "Maritime pressure"],
        ar: ["تعطل الشحن", "هشاشة التجارة", "ضغط بحري"]
      }
    }
  ];

  const signals = [
    {
      id: "SIG-GAZA-NEG-001",
      title: localize("Negotiation Track Shows Signs of Breakdown", "مسار التفاوض يُظهر علامات انهيار"),
      description: localize(
        "Negotiation behavior is being read less as diplomacy failure and more as a structured preparatory environment for escalatory legitimacy.",
        "يُقرأ سلوك التفاوض أقل كفشل دبلوماسي وأكثر كبيئة تمهيدية منظمة لشرعنة التصعيد."
      ),
      summary: localize(
        "The negotiation layer is shifting from mediation space to pressure-conditioning architecture.",
        "طبقة التفاوض تتحول من مساحة وساطة إلى هندسة تكييف للضغط."
      ),
      region: "gaza",
      country: "gaza",
      countryId: "CTR-GAZA",
      theater: "levant",
      domain: "geo-security",
      signalType: localize("Escalation Architecture", "هندسة تصعيد"),
      decisionMode: localize("Monitoring", "مراقبة"),
      influenceBand: localize("Narrative Conditioning", "تكييف سردي"),
      layer: "L9",
      sourceUnit: "SSU",
      source: "IBSS_SEED",
      priority: "HIGH",
      live: true,
      metrics: buildMetrics({ weight: 0.9, volatility: 0.71, impact: 0.94, confidence: 0.84, urgency: 0.72 }),
      score100: 70,
      balancedScore100: 70,
      reliabilityScore: 86,
      freshnessScore: 0.94,
      timestamp: nowIso(8),
      clusterKey: "gaza::geo-security",
      theaterKey: "levant"
    },
    {
      id: "SIG-GAZA-GOV-002",
      title: localize("Administrative Re-Centering Around Deir al-Balah", "إعادة تمركز إداري حول دير البلح"),
      description: localize(
        "Emerging administrative concentration suggests possible experimental compartmentalization of governance functions rather than unified territorial administration.",
        "التمركز الإداري الناشئ يوحي بإمكانية تجزئة تجريبية لوظائف الحوكمة بدل الإدارة الإقليمية الموحدة."
      ),
      summary: localize(
        "Administrative concentration may be a staging mechanism for fragmented governance architecture.",
        "قد يكون التمركز الإداري آلية تمهيد لحوكمة مجزأة."
      ),
      region: "gaza",
      country: "gaza",
      countryId: "CTR-GAZA",
      theater: "levant",
      domain: "geo-governance",
      signalType: localize("Governance Fragmentation", "تفكك الحوكمة"),
      decisionMode: localize("Heightened Monitoring", "مراقبة مرتفعة"),
      influenceBand: localize("Administrative Pressure", "ضغط إداري"),
      layer: "L8",
      sourceUnit: "SSU",
      source: "IBSS_SEED",
      priority: "HIGH",
      live: true,
      metrics: buildMetrics({ weight: 0.84, volatility: 0.63, impact: 0.88, confidence: 0.78, urgency: 0.69 }),
      score100: 68,
      balancedScore100: 68,
      reliabilityScore: 81,
      freshnessScore: 0.88,
      timestamp: nowIso(16),
      clusterKey: "gaza::geo-governance",
      theaterKey: "levant"
    },
    {
      id: "SIG-GAZA-HUM-003",
      title: localize("Humanitarian Compression Across Civil Space", "انضغاط إنساني عبر الحيز المدني"),
      description: localize(
        "Civilian space is narrowing under layered stress, reinforcing pressure transfer from humanitarian conditions into political and operational reading.",
        "الحيز المدني يضيق تحت ضغط متعدد الطبقات، بما يعزز انتقال الضغط من الشروط الإنسانية إلى القراءة السياسية والتشغيلية."
      ),
      summary: localize(
        "Humanitarian pressure is no longer isolated from strategic interpretation.",
        "الضغط الإنساني لم يعد معزولًا عن التفسير الاستراتيجي."
      ),
      region: "gaza",
      country: "gaza",
      countryId: "CTR-GAZA",
      theater: "levant",
      domain: "human-security",
      signalType: localize("Humanitarian Compression", "انضغاط إنساني"),
      decisionMode: localize("Monitoring", "مراقبة"),
      influenceBand: localize("Civilian Stress", "ضغط مدني"),
      layer: "L6",
      sourceUnit: "CRU",
      source: "IBSS_SEED",
      priority: "MEDIUM",
      live: true,
      metrics: buildMetrics({ weight: 0.72, volatility: 0.58, impact: 0.81, confidence: 0.76, urgency: 0.75 }),
      score100: 59,
      balancedScore100: 59,
      reliabilityScore: 79,
      freshnessScore: 0.82,
      timestamp: nowIso(24),
      clusterKey: "gaza::human-security",
      theaterKey: "levant"
    },
    {
      id: "SIG-RS-TRADE-004",
      title: localize("Shipping Delays Continue Across Red Sea Corridor", "استمرار تأخيرات الشحن عبر ممر البحر الأحمر"),
      description: localize(
        "Maritime pressure is maintaining friction on commercial routes, with supply-chain effects extending beyond immediate security incidents.",
        "الضغط البحري يحافظ على الاحتكاك في المسارات التجارية مع آثار تمتد لما بعد الحوادث الأمنية المباشرة."
      ),
      summary: localize(
        "Trade insecurity in the Red Sea remains active and structurally relevant.",
        "انعدام الأمان التجاري في البحر الأحمر ما يزال نشطًا وذا صلة بنيوية."
      ),
      region: "redsea",
      country: "redsea",
      countryId: "CTR-RS",
      theater: "maritime",
      domain: "geo-economics",
      signalType: localize("Trade Disruption", "اضطراب تجاري"),
      decisionMode: localize("Monitoring", "مراقبة"),
      influenceBand: localize("Supply Chain Pressure", "ضغط سلاسل الإمداد"),
      layer: "L5",
      sourceUnit: "CRU",
      source: "IBSS_SEED",
      priority: "MEDIUM",
      live: true,
      metrics: buildMetrics({ weight: 0.69, volatility: 0.52, impact: 0.74, confidence: 0.77, urgency: 0.6 }),
      score100: 56,
      balancedScore100: 56,
      reliabilityScore: 80,
      freshnessScore: 0.79,
      timestamp: nowIso(30),
      clusterKey: "redsea::geo-economics",
      theaterKey: "maritime"
    },
    {
      id: "SIG-IRAN-POSTURE-005",
      title: localize("Iran Strategic Posture Remains Deliberately Signaled", "الوضعية الاستراتيجية الإيرانية ما تزال تُرسل بإشارات مقصودة"),
      description: localize(
        "Strategic signaling remains calibrated, suggesting disciplined posture projection rather than uncontrolled regional drift.",
        "الإشارات الاستراتيجية ما تزال مضبوطة بما يوحي بإسقاط وضعي منضبط لا بانجراف إقليمي غير مضبوط."
      ),
      summary: localize(
        "Iranian signaling remains measured but operationally relevant.",
        "الإشارات الإيرانية ما تزال محسوبة لكنها ذات صلة تشغيلية."
      ),
      region: "iran",
      country: "iran",
      countryId: "CTR-IRN",
      theater: "gulf",
      domain: "geo-security",
      signalType: localize("Strategic Posture", "وضعية استراتيجية"),
      decisionMode: localize("Strategic Watch", "مراقبة استراتيجية"),
      influenceBand: localize("Deterrence Signaling", "إشارات ردع"),
      layer: "L7",
      sourceUnit: "SSU",
      source: "IBSS_SEED",
      priority: "MEDIUM",
      live: true,
      metrics: buildMetrics({ weight: 0.73, volatility: 0.47, impact: 0.79, confidence: 0.82, urgency: 0.51 }),
      score100: 58,
      balancedScore100: 58,
      reliabilityScore: 84,
      freshnessScore: 0.74,
      timestamp: nowIso(40),
      clusterKey: "iran::geo-security",
      theaterKey: "gulf"
    },
    {
      id: "SIG-LEB-FRAG-006",
      title: localize("Lebanon Internal Fragmentation Remains Active", "التفكك الداخلي في لبنان ما يزال نشطًا"),
      description: localize(
        "Internal political and institutional friction remains present but has not yet crossed into dominant theater pressure.",
        "الاحتكاك السياسي والمؤسسي الداخلي ما يزال حاضرًا لكنه لم يتحول بعد إلى ضغط مسرحي مهيمن."
      ),
      summary: localize(
        "Lebanon remains structurally fragile without becoming the primary driver.",
        "يبقى لبنان هشًا بنيويًا دون أن يتحول إلى المحرك الأول."
      ),
      region: "lebanon",
      country: "lebanon",
      countryId: "CTR-LEB",
      theater: "levant",
      domain: "geo-political",
      signalType: localize("Political Fragmentation", "تفكك سياسي"),
      decisionMode: localize("Background Monitoring", "مراقبة خلفية"),
      influenceBand: localize("Institutional Weakness", "ضعف مؤسسي"),
      layer: "L4",
      sourceUnit: "CRU",
      source: "IBSS_SEED",
      priority: "LOW",
      live: false,
      metrics: buildMetrics({ weight: 0.49, volatility: 0.44, impact: 0.51, confidence: 0.73, urgency: 0.38 }),
      score100: 37,
      balancedScore100: 37,
      reliabilityScore: 76,
      freshnessScore: 0.67,
      timestamp: nowIso(52),
      clusterKey: "lebanon::geo-political",
      theaterKey: "levant"
    }
  ];

  const newsFeed = [
    {
      id: "NEWS-GAZA-001",
      title: localize("Negotiation channel appears increasingly unstable", "قناة التفاوض تبدو أكثر هشاشة"),
      summary: localize("Track behavior suggests more than routine mediation fatigue.", "سلوك المسار يوحي بما يتجاوز إرهاق الوساطة التقليدي."),
      text: localize("Negotiation channel appears increasingly unstable.", "قناة التفاوض تبدو أكثر هشاشة."),
      region: "gaza",
      country: "gaza",
      domain: "geo-security",
      priority: "HIGH",
      publishedAt: nowIso(6),
      source: "IBSS_NEWS"
    },
    {
      id: "NEWS-GAZA-002",
      title: localize("Administrative concentration debates intensify around Deir al-Balah", "تصاعد النقاش حول التمركز الإداري في دير البلح"),
      summary: localize("Questions are growing about fragmented governance pathways.", "تتزايد الأسئلة حول مسارات الحوكمة المجزأة."),
      text: localize("Administrative concentration debates intensify around Deir al-Balah.", "تصاعد النقاش حول التمركز الإداري في دير البلح."),
      region: "gaza",
      country: "gaza",
      domain: "geo-governance",
      priority: "HIGH",
      publishedAt: nowIso(14),
      source: "IBSS_NEWS"
    },
    {
      id: "NEWS-RS-003",
      title: localize("Shipping friction persists in the Red Sea corridor", "استمرار الاحتكاك الملاحي في ممر البحر الأحمر"),
      summary: localize("Commercial movement remains exposed to sustained disruption risk.", "الحركة التجارية ما تزال مكشوفة لخطر التعطيل المستدام."),
      text: localize("Shipping friction persists in the Red Sea corridor.", "استمرار الاحتكاك الملاحي في ممر البحر الأحمر."),
      region: "redsea",
      country: "redsea",
      domain: "geo-economics",
      priority: "MEDIUM",
      publishedAt: nowIso(19),
      source: "IBSS_NEWS"
    },
    {
      id: "NEWS-IRAN-004",
      title: localize("Regional observers note continuity in Iran strategic signaling", "مراقبون إقليميون يلاحظون استمرارية في الإشارات الاستراتيجية الإيرانية"),
      summary: localize("The signal remains measured rather than abrupt.", "الإشارة ما تزال محسوبة وليست مفاجئة."),
      text: localize("Regional observers note continuity in Iran strategic signaling.", "مراقبون إقليميون يلاحظون استمرارية في الإشارات الاستراتيجية الإيرانية."),
      region: "iran",
      country: "iran",
      domain: "geo-security",
      priority: "MEDIUM",
      publishedAt: nowIso(28),
      source: "IBSS_NEWS"
    }
  ];

  const content = [
    {
      id: "PUB-L9-GAZA-001",
      type: "study",
      classification: "L9 Blueprint Deconstruction",
      edition: "L9-SOV Blueprint Deconstruction Edition",
      layer: "L9",
      mode: "Blueprint Deconstruction",
      title: localize(
        "Gaza — Blueprint Deconstruction: When Narrative Becomes Part of Operational War Architecture",
        "غزة — تفكيك المخطط البنيوي: حين تصبح السردية جزءًا من عمارة الحرب التشغيلية"
      ),
      summary: localize(
        "An L9-layer study reading negotiation failure and controlled narrative as part of a pre-operational war architecture.",
        "دراسة من طبقة L9 تقرأ فشل التفاوض والسردية المضبوطة كجزء من عمارة حرب ما قبل التشغيل."
      ),
      body: localize(
        "The visible event should not be read as a sequence of isolated headlines. The core question is structural: what architecture makes war appear as failed diplomacy rather than a pre-arranged decision? This study argues that narrative is not an explanation after the fact. It is part of the environment-building process that legitimizes escalation.",
        "لا ينبغي قراءة الحدث الظاهر كسلسلة من العناوين المنفصلة. السؤال الجوهري هو بنيوي: ما العمارة التي تجعل الحرب تبدو كفشل دبلوماسي بدل أن تكون قرارًا مُعدًا مسبقًا؟ تجادل هذه الدراسة بأن السردية ليست تفسيرًا لاحقًا، بل جزءًا من عملية بناء البيئة التي تمنح التصعيد شرعيته."
      ),
      unit: "SSU",
      status: "published",
      priority: "HIGH",
      domain: "geo-security",
      region: "gaza",
      country: "gaza",
      countryId: "CTR-GAZA",
      signalIds: ["SIG-GAZA-NEG-001"],
      clusterKeys: ["gaza::geo-security"],
      theaterKeys: ["levant"],
      author: "Naeem Dahalan",
      authors: ["Naeem Dahalan"],
      sourcePlatform: "internal",
      sourceUrl: "",
      tags: ["gaza", "L9", "blueprint deconstruction", "war architecture", "narrative"],
      metrics: {
        policyRisk: 86,
        implementationDifficulty: 72,
        regionalSensitivity: 91,
        strategicWeight: 94
      },
      meta: { featured: true, pinned: true, canonical: true },
      publishedAt: nowIso(60),
      createdAt: nowIso(60),
      updatedAt: nowIso(60)
    },
    {
      id: "PUB-GAZA-GOV-002",
      type: "analysis",
      classification: "Fragmented Governance Reading",
      edition: "Administrative Fragmentation Note",
      layer: "L8",
      mode: "Governance Mapping",
      title: localize("Gaza: From Administrative Concentration to Fragmented Governance", "غزة: من التمركز الإداري إلى الحوكمة المجزأة"),
      summary: localize(
        "A short reading on whether selective administrative concentration may signal territorial compartmentalization rather than unified governance restoration.",
        "قراءة قصيرة حول ما إذا كان التمركز الإداري الانتقائي يشير إلى تجزئة إقليمية بدل استعادة الحوكمة الموحدة."
      ),
      body: localize(
        "When administrative functions begin clustering in one location under unstable war conditions, the question is not only practical but structural. The issue becomes whether governance is being restored or redesigned in fragments. The paper argues that concentration around one node can operate as a pilot zone for differentiated governance logic.",
        "عندما تبدأ الوظائف الإدارية بالتجمع في مكان واحد تحت شروط حرب غير مستقرة، لا يعود السؤال عمليًا فقط بل بنيويًا. فالقضية تصبح: هل تُستعاد الحوكمة أم يُعاد تصميمها على شكل شظايا؟ وتجادل الورقة بأن التمركز حول عقدة واحدة قد يعمل كمنطقة تجريبية لمنطق حوكمة متمايزة."
      ),
      unit: "SSU",
      status: "published",
      priority: "HIGH",
      domain: "geo-governance",
      region: "gaza",
      country: "gaza",
      countryId: "CTR-GAZA",
      signalIds: ["SIG-GAZA-GOV-002"],
      clusterKeys: ["gaza::geo-governance"],
      theaterKeys: ["levant"],
      author: "Naeem Dahalan",
      authors: ["Naeem Dahalan"],
      sourcePlatform: "internal",
      sourceUrl: "",
      tags: ["gaza", "governance", "deir al-balah", "fragmentation", "administrative concentration"],
      metrics: {
        policyRisk: 82,
        implementationDifficulty: 66,
        regionalSensitivity: 88,
        strategicWeight: 89
      },
      meta: { featured: false, pinned: true, canonical: false },
      publishedAt: nowIso(75),
      createdAt: nowIso(75),
      updatedAt: nowIso(75)
    },
    {
      id: "PUB-RS-TRADE-003",
      type: "brief",
      classification: "Maritime Trade Pressure",
      edition: "Red Sea Supply Brief",
      layer: "L5",
      mode: "Trade Corridor Reading",
      title: localize("Red Sea Corridor: Persistent Friction Beyond Immediate Events", "ممر البحر الأحمر: احتكاك مستمر يتجاوز الحدث المباشر"),
      summary: localize(
        "A brief on how maritime disruption acquires structural importance through repeated commercial friction.",
        "إيجاز حول كيف يكتسب الاضطراب البحري أهمية بنيوية عبر تكرار الاحتكاك التجاري."
      ),
      body: localize(
        "The strategic significance of Red Sea disruption lies not only in singular incidents, but in repetition. Repeated friction changes route psychology, insurance behavior, and trade planning, making insecurity economically structural even before full closure scenarios emerge.",
        "تكمن الأهمية الاستراتيجية لاضطراب البحر الأحمر ليس فقط في الحوادث المفردة بل في التكرار. فالاحتكاك المتكرر يغير نفسية المسار وسلوك التأمين وتخطيط التجارة، ما يجعل انعدام الأمان اقتصاديًا بنيويًا حتى قبل ظهور سيناريوهات الإغلاق الكامل."
      ),
      unit: "CRU",
      status: "published",
      priority: "MEDIUM",
      domain: "geo-economics",
      region: "redsea",
      country: "redsea",
      countryId: "CTR-RS",
      signalIds: ["SIG-RS-TRADE-004"],
      clusterKeys: ["redsea::geo-economics"],
      theaterKeys: ["maritime"],
      author: "IBSS Unit",
      authors: ["IBSS Unit"],
      sourcePlatform: "internal",
      sourceUrl: "",
      tags: ["red sea", "shipping", "trade", "maritime risk"],
      metrics: {
        policyRisk: 61,
        implementationDifficulty: 48,
        regionalSensitivity: 67,
        strategicWeight: 73
      },
      meta: { featured: false, pinned: false, canonical: false },
      publishedAt: nowIso(96),
      createdAt: nowIso(96),
      updatedAt: nowIso(96)
    },
    {
      id: "PUB-NEWS-GAZA-004",
      type: "news",
      classification: "Live News Update",
      edition: "Signal News Note",
      layer: "L3",
      mode: "Live Intake",
      title: localize("Administrative concentration debates intensify around Deir al-Balah", "تصاعد النقاش حول التمركز الإداري في دير البلح"),
      summary: localize(
        "Live update reflecting expanding debate over selective administrative relocation and governance implications.",
        "تحديث حي يعكس اتساع النقاش حول إعادة التموضع الإداري الانتقائي ودلالاته الحوكمية."
      ),
      body: localize(
        "The issue is no longer being framed merely as logistics. It is increasingly interpreted as a governance question tied to who administers, where administration is centered, and whether territorial logic is being redistributed.",
        "لم يعد الموضوع يُصاغ على أنه مسألة لوجستية فقط، بل يُفسر أكثر فأكثر كسؤال حوكمي يتعلق بمن يدير، وأين يتمركز هذا الإدار، وما إذا كان المنطق الإقليمي يعاد توزيعه."
      ),
      unit: "NEWS",
      status: "published",
      priority: "HIGH",
      domain: "geo-governance",
      region: "gaza",
      country: "gaza",
      countryId: "CTR-GAZA",
      signalIds: ["SIG-GAZA-GOV-002"],
      clusterKeys: ["gaza::geo-governance"],
      theaterKeys: ["levant"],
      author: "IBSS Live Desk",
      authors: ["IBSS Live Desk"],
      sourcePlatform: "internal",
      sourceUrl: "",
      tags: ["gaza", "deir al-balah", "governance", "news"],
      metrics: {
        policyRisk: 58,
        implementationDifficulty: 31,
        regionalSensitivity: 74,
        strategicWeight: 57
      },
      meta: { featured: false, pinned: false, canonical: false },
      publishedAt: nowIso(10),
      createdAt: nowIso(10),
      updatedAt: nowIso(10)
    }
  ];

  const signalIndex = signals.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});

  const countryIndex = countries.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});

  const contentIndex = content.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});

  const publications = content;
  const studies = content.filter(item => item.type === "study" || item.type === "analysis");
  const feeds = newsFeed;

  window.IBSS_SIGNALS = signals;
  window.IBSS_COUNTRIES = countries;
  window.IBSS_CONTENT = content;
  window.IBSS_PUBLICATIONS = publications;
  window.IBSS_STUDIES = studies;
  window.IBSS_NEWS = newsFeed;
  window.IBSS_FEEDS = feeds;

  window.IBSS_SIGNAL_INDEX = signalIndex;
  window.IBSS_COUNTRY_INDEX = countryIndex;
  window.IBSS_CONTENT_INDEX = contentIndex;

  return {
    CONFIG,
    signals,
    newsFeed,
    countries,
    content,
    publications,
    studies,
    feeds,
    signalIndex,
    countryIndex,
    contentIndex,
    utils: {
      safeText,
      safeNumber,
      clamp,
      localize,
      nowIso,
      buildMetrics
    }
  };
})();
