// IBSS CONTENT REGISTRY — Foundation Layer
// Version: v1.0

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
      body: {
        ar: "هذا المحتوى يمثل تقريرًا أساسيًا ضمن ملف غزة، ويُستخدم كمغذٍ مباشر للإشارة البنيوية الخاصة بها داخل النظام.",
        en: "This content acts as a foundational report within the Gaza file and serves as a direct feeder for its structural signal inside the system."
      },
      type: "report", // report | study | brief | news | policy_paper | analysis
      domain: "geo-security", // economic | security | military | geopolitical | geo-security | geo-military
      countryId: "CTR-GAZA",
      signalIds: ["SIG-GAZA-001"],
      priority: "HIGH",
      status: "published", // published | pending | archived
      sourcePlatform: "facebook",
      sourceUrl: "",
      publishedAt: "2026-04-13T09:00:00Z",
      tags: ["غزة", "ضغط بنيوي", "حرب", "حوكمة", "إنساني"],
      author: "IBSS",
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
      body: {
        ar: "هذا المحتوى يُسجل ضمن ملف لبنان ويغذي الإشارة العسكرية/الهجينة الخاصة بالجبهة الشمالية.",
        en: "This content is registered under the Lebanon file and feeds the military-hybrid signal related to the northern front."
      },
      type: "report",
      domain: "military",
      countryId: "CTR-LEB",
      signalIds: ["SIG-LEB-001"],
      priority: "HIGH",
      status: "published",
      sourcePlatform: "facebook",
      sourceUrl: "",
      publishedAt: "2026-04-13T11:00:00Z",
      tags: ["لبنان", "الجبهة الشمالية", "عسكري", "هجين"],
      author: "IBSS",
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
      body: {
        ar: "هذا المحتوى يُسجل ضمن ملف إيران ويغذي الإشارة الدبلوماسية الخاصة بالمفاوضات والتوازنات الإقليمية.",
        en: "This content is registered under the Iran file and feeds the diplomatic signal tied to negotiations and regional balances."
      },
      type: "brief",
      domain: "geopolitical",
      countryId: "CTR-IRN",
      signalIds: ["SIG-IRN-001"],
      priority: "MEDIUM",
      status: "published",
      sourcePlatform: "facebook",
      sourceUrl: "",
      publishedAt: "2026-04-13T12:30:00Z",
      tags: ["إيران", "مفاوضات", "دبلوماسي", "جيوسياسي"],
      author: "IBSS",
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
      body: {
        ar: "هذا المحتوى يُصنف كورقة سياسات أولية ضمن ملف البحر الأحمر ويغذي الإشارة البحرية في النظام.",
        en: "This content is classified as an initial policy paper under the Red Sea file and feeds the maritime signal in the system."
      },
      type: "policy_paper",
      domain: "geo-military",
      countryId: "CTR-RS",
      signalIds: ["SIG-RS-001"],
      priority: "LOW",
      status: "pending",
      sourcePlatform: "facebook",
      sourceUrl: "",
      publishedAt: "2026-04-13T14:00:00Z",
      tags: ["البحر الأحمر", "بحري", "ردع", "لوجستيات"],
      author: "IBSS",
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
      body: {
        ar: "هذا المحتوى يُسجل كتحليل موجز ضمن ملف الضفة الغربية ويغذي إشارة التصعيد الموضعي.",
        en: "This content is registered as a brief analysis under the West Bank file and feeds the localized escalation signal."
      },
      type: "analysis",
      domain: "security",
      countryId: "CTR-WB",
      signalIds: ["SIG-WB-001"],
      priority: "LOW",
      status: "pending",
      sourcePlatform: "facebook",
      sourceUrl: "",
      publishedAt: "2026-04-13T15:30:00Z",
      tags: ["الضفة الغربية", "أمني", "تصعيد", "مراقبة"],
      author: "IBSS",
      engagement: {
        reactions: 0,
        comments: 0,
        shares: 0
      }
    }
  ];

  function buildIndex(list) {
    return list.reduce((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {});
  }

  globalThis.IBSS_CONTENT = IBSS_CONTENT;
  globalThis.IBSS_CONTENT_INDEX = buildIndex(IBSS_CONTENT);
})();
