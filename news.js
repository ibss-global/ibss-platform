// IBSS NEWS FEED LAYER — Live Sovereign News Registry
// Version: v1.0 Operational News Intake

(function () {
  "use strict";

  const IBSS_NEWS = [
    {
      id: "NEWS-001",
      title: {
        ar: "غزة: الضغط البنيوي ما يزال فوق عتبة الاستعداد",
        en: "Gaza: Structural pressure remains above readiness threshold"
      },
      summary: {
        ar: "المؤشرات التشغيلية المرتبطة بغزة ما تزال تعكس تمركز الضغط في المستوى البنيوي مع استمرار حساسية المشهد.",
        en: "Operational indicators tied to Gaza continue to reflect concentrated structural pressure with sustained scene sensitivity."
      },
      countryId: "CTR-GAZA",
      signalId: "SIG-GAZA-001",
      category: "structural",
      severity: "HIGH",
      status: "live",
      source: "IBSS Live Feed",
      sourceType: "internal",
      publishedAt: "2026-04-14T08:00:00Z",
      tags: ["غزة", "ضغط بنيوي", "استعداد"],
      metrics: {
        impact: 9,
        confidence: 8,
        urgency: 8
      }
    },
    {
      id: "NEWS-002",
      title: {
        ar: "لبنان: الضغط على الجبهة الشمالية يظل نشطًا ضمن سقف مضبوط",
        en: "Lebanon: Northern front pressure remains active under a controlled ceiling"
      },
      summary: {
        ar: "الساحة اللبنانية ما تزال تحت ضغط عسكري-سياسي هجين دون انتقال واضح إلى تفجر كامل.",
        en: "The Lebanese theater remains under hybrid military-political pressure without a clear shift into full rupture."
      },
      countryId: "CTR-LEB",
      signalId: "SIG-LEB-001",
      category: "military",
      severity: "HIGH",
      status: "live",
      source: "IBSS Live Feed",
      sourceType: "internal",
      publishedAt: "2026-04-14T08:20:00Z",
      tags: ["لبنان", "الجبهة الشمالية", "ضغط"],
      metrics: {
        impact: 8,
        confidence: 8,
        urgency: 7
      }
    },
    {
      id: "NEWS-003",
      title: {
        ar: "إيران: المسار التفاوضي مستقر ظاهريًا تحت ضغط متزايد",
        en: "Iran: The negotiation track appears stable under rising pressure"
      },
      summary: {
        ar: "الملف الإيراني لا يزال ضمن بيئة تفاوضية غير مستقرة، مع حساسية متزايدة تجاه الإشارات السياسية والأمنية.",
        en: "The Iranian file remains inside an unstable negotiation environment, with rising sensitivity to political and security signaling."
      },
      countryId: "CTR-IRN",
      signalId: "SIG-IRN-001",
      category: "diplomatic",
      severity: "MEDIUM",
      status: "live",
      source: "IBSS Live Feed",
      sourceType: "internal",
      publishedAt: "2026-04-14T08:40:00Z",
      tags: ["إيران", "مفاوضات", "ضغط"],
      metrics: {
        impact: 6,
        confidence: 7,
        urgency: 6
      }
    },
    {
      id: "NEWS-004",
      title: {
        ar: "البحر الأحمر: التوتر دون مستوى التعطيل الكامل لكنه يستحق المراقبة",
        en: "Red Sea: Tension remains below full disruption but warrants monitoring"
      },
      summary: {
        ar: "التوتر البحري ما يزال محدودًا نسبيًا، لكنه يحمل دلالة لوجستية وردعية تستحق التتبع.",
        en: "Maritime tension remains relatively limited, but still carries logistical and deterrence relevance worth tracking."
      },
      countryId: "CTR-RS",
      signalId: "SIG-RS-001",
      category: "maritime",
      severity: "LOW",
      status: "live",
      source: "IBSS Live Feed",
      sourceType: "internal",
      publishedAt: "2026-04-14T09:00:00Z",
      tags: ["البحر الأحمر", "بحري", "مراقبة"],
      metrics: {
        impact: 4,
        confidence: 6,
        urgency: 4
      }
    },
    {
      id: "NEWS-005",
      title: {
        ar: "الضفة الغربية: تصعيد موضعي قابل للتوسع ضمن بيئة ضغط متقطعة",
        en: "West Bank: Localized escalation remains expandable within an intermittent pressure environment"
      },
      summary: {
        ar: "مؤشرات الضفة الغربية لم تتحول بعد إلى ملف تفجر واسع، لكنها تبقى قابلة للاتساع تحت ظروف ضغط مناسبة.",
        en: "West Bank indicators have not yet shifted into a broad rupture file, but remain expandable under favorable pressure conditions."
      },
      countryId: "CTR-WB",
      signalId: "SIG-WB-001",
      category: "security",
      severity: "LOW",
      status: "watch",
      source: "IBSS Live Feed",
      sourceType: "internal",
      publishedAt: "2026-04-14T09:20:00Z",
      tags: ["الضفة الغربية", "تصعيد", "مراقبة"],
      metrics: {
        impact: 4,
        confidence: 5,
        urgency: 4
      }
    }
  ];

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function safeNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function getLocalizedText(value, lang = "en") {
    if (!value) return "-";
    if (typeof value === "string") return value;
    return value[lang] || value.en || value.ar || "-";
  }

  function buildIndex(list) {
    return list.reduce((acc, item) => {
      if (item?.id) acc[item.id] = item;
      return acc;
    }, {});
  }

  function sortByPublishedDesc(list) {
    return [...asArray(list)].sort((a, b) => {
      return new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0);
    });
  }

  function severityWeight(severity) {
    if (severity === "HIGH") return 3;
    if (severity === "MEDIUM") return 2;
    return 1;
  }

  function getAllNews() {
    return sortByPublishedDesc(IBSS_NEWS);
  }

  function getLiveNews() {
    return sortByPublishedDesc(
      IBSS_NEWS.filter(item => item && (item.status === "live" || item.status === "watch"))
    );
  }

  function getHighPriorityNews(limit = 5) {
    return sortByPublishedDesc(
      IBSS_NEWS
        .filter(item => item && item.severity === "HIGH")
        .slice(0, limit)
    );
  }

  function getTickerNews(limit = 8) {
    return sortByPublishedDesc(
      IBSS_NEWS
        .filter(item => item && (item.status === "live" || item.status === "watch"))
        .sort((a, b) => {
          const severityDelta = severityWeight(b.severity) - severityWeight(a.severity);
          if (severityDelta !== 0) return severityDelta;
          return new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0);
        })
        .slice(0, limit)
    );
  }

  function getLatestNews(limit = 5) {
    return sortByPublishedDesc(IBSS_NEWS).slice(0, limit);
  }

  function getNewsByCountry(countryId, limit = null) {
    const results = sortByPublishedDesc(
      IBSS_NEWS.filter(item => item && item.countryId === countryId)
    );
    return limit ? results.slice(0, limit) : results;
  }

  function getLatestNewsByCountry(countryId) {
    return getNewsByCountry(countryId, 1)[0] || null;
  }

  function getNewsBySignal(signalId, limit = null) {
    const results = sortByPublishedDesc(
      IBSS_NEWS.filter(item => item && item.signalId === signalId)
    );
    return limit ? results.slice(0, limit) : results;
  }

  function getNewsBySeverity(severity, limit = null) {
    const results = sortByPublishedDesc(
      IBSS_NEWS.filter(item => item && item.severity === severity)
    );
    return limit ? results.slice(0, limit) : results;
  }

  function scoreNewsItem(item) {
    const impact = safeNumber(item?.metrics?.impact, 0);
    const confidence = safeNumber(item?.metrics?.confidence, 0);
    const urgency = safeNumber(item?.metrics?.urgency, 0);

    return Math.round(
      (impact * 0.45) +
      (confidence * 0.30) +
      (urgency * 0.25)
    );
  }

  function getScoredNews(limit = 10) {
    return sortByPublishedDesc(
      IBSS_NEWS.map(item => ({
        ...item,
        score: scoreNewsItem(item)
      }))
    ).slice(0, limit);
  }

  function getNewsSnapshot() {
    const live = getLiveNews();
    const latest = getLatestNews(5);
    const ticker = getTickerNews(8);
    const highPriority = getHighPriorityNews(5);

    return {
      total: IBSS_NEWS.length,
      liveCount: live.filter(item => item.status === "live").length,
      watchCount: live.filter(item => item.status === "watch").length,
      topNews: ticker[0] || null,
      latest,
      ticker,
      highPriority
    };
  }

  globalThis.IBSS_NEWS = IBSS_NEWS;
  globalThis.IBSS_NEWS_INDEX = buildIndex(IBSS_NEWS);

  globalThis.IBSS_NEWS_UTILS = {
    getAllNews,
    getLiveNews,
    getHighPriorityNews,
    getTickerNews,
    getLatestNews,
    getNewsByCountry,
    getLatestNewsByCountry,
    getNewsBySignal,
    getNewsBySeverity,
    getScoredNews,
    getNewsSnapshot,
    getLocalizedText
  };
})();
