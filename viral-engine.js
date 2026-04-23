// IBSS Viral Engine v1.0
// يعتمد على system state من IBSS_ENGINE / IBSS_PUBLISHER

(function () {
  "use strict";

  const VIRAL = {
    // قوالب Hooks حسب الشدة
    hooks: {
      high: [
        "ما الذي يحدث فعليًا في {region} الآن؟",
        "لماذا يتصاعد الوضع في {region} بهذه السرعة؟",
        "هل نحن أمام تحول حقيقي في {region}؟"
      ],
      medium: [
        "مؤشرات جديدة من {region} تثير التساؤلات.",
        "تطورات لافتة في {region}… ماذا تعني؟",
        "هل هذه مجرد حالة عابرة أم بداية مسار جديد في {region}؟"
      ],
      low: [
        "متابعة هادئة للتطورات في {region}.",
        "قراءة سريعة للوضع الحالي في {region}.",
        "ماذا نرى في {region} اليوم؟"
      ]
    },

    questions: [
      "برأيك، ما السبب الحقيقي؟",
      "هل تعتقد أن هذا مؤقت أم بداية تصعيد؟",
      "كيف تقرأ هذه الإشارات؟"
    ],

    ctas: [
      "شارك لتصل الصورة كاملة.",
      "انشر إذا تعتقد أن هذه المعلومة يجب أن تصل.",
      "تابع وشارك للمزيد من التحليلات."
    ],

    hashtags: [
      "#IBSS",
      "#تحليل_استراتيجي",
      "#Geopolitics",
      "#Signal",
      "#GlobalWatch"
    ]
  };

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function bandLevel(score) {
    const n = Number(score) || 0;
    if (n >= 70) return "high";
    if (n >= 35) return "medium";
    return "low";
  }

  function safe(v, d = "-") {
    return (typeof v === "string" && v.trim()) ? v.trim() : d;
  }

  function getText(v, lang) {
    if (!v) return "-";
    if (typeof v === "string") return v;
    return v[lang] || v.en || v.ar || v.title || v.name || "-";
  }

  function buildCore(system, lang) {
    const signal = system?.topSignal || system?.dominantSignal || {};
    const region = safe(signal.country || signal.region || "the field");
    const score = Number(signal?.balancedScore100 || signal?.score100 || 0);

    const level = bandLevel(score);
    const hook = pick(VIRAL.hooks[level]).replace("{region}", region);

    const context = getText(signal.description || signal.summary, lang);

    const insight =
      level === "high"
        ? "المؤشرات تتجاوز الضوضاء المعتادة وتشير إلى ضغط مركب."
        : level === "medium"
        ? "الحركة الحالية منظمة لكن تحمل إشارات انتقال محتملة."
        : "المشهد مستقر نسبيًا مع متابعة مستمرة.";

    const question = pick(VIRAL.questions);
    const cta = pick(VIRAL.ctas);

    return { hook, context, insight, question, cta, region, score };
  }

  function buildPost(system, lang = "ar") {
    const core = buildCore(system, lang);

    const text_ar = [
      core.hook,
      "",
      core.context,
      "",
      core.insight,
      "",
      core.question,
      "",
      core.cta,
      "",
      VIRAL.hashtags.join(" ")
    ].join("\n");

    const text_en = [
      core.hook,
      "",
      core.context,
      "",
      "Current movement suggests structured pressure beyond routine noise.",
      "",
      "What do you think is the real cause?",
      "",
      "Share to spread the full picture.",
      "",
      VIRAL.hashtags.join(" ")
    ].join("\n");

    return {
      type: "viral_post",
      createdAt: new Date().toISOString(),
      payload: {
        text_ar,
        text_en,
        meta: {
          region: core.region,
          score: core.score
        }
      }
    };
  }

  function buildVariants(system, lang = "ar", count = 3) {
    const variants = [];
    for (let i = 0; i < count; i++) {
      variants.push(buildPost(system, lang));
    }
    return variants;
  }

  // Public API
  window.IBSS_VIRAL = {
    generate: function (system, lang) {
      return buildPost(system, lang);
    },
    generateVariants: function (system, lang, count) {
      return buildVariants(system, lang, count);
    }
  };
})();
