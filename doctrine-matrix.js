// IBSS DOCTRINE MATRIX — Σ-9X Sovereign Analytical Matrix
// Version: v1.0-black-doctrine-integrated

window.IBSS_DOCTRINE_MATRIX = (function () {
  "use strict";

  const SERIES = {
    BLACK_BOX: {
      id: "BLACK_BOX",
      layer: "BLACK_DOCTRINE",
      name: { en: "Black Box", ar: "الصندوق الأسود" },
      question: {
        en: "Who inserted the decision into the system?",
        ar: "من أدخل القرار إلى النظام؟"
      },
      keywords: [
        "decision", "unknown source", "unexplained", "hidden actor",
        "قرار", "مصدر مجهول", "غير مفسر", "فاعل غير ظاهر"
      ]
    },

    INVISIBLE_INK: {
      id: "INVISIBLE_INK",
      layer: "BLACK_DOCTRINE",
      name: { en: "Invisible Ink", ar: "الحبر السري" },
      question: {
        en: "What is written but not read?",
        ar: "ماذا كُتب… لكن لم يُقرأ؟"
      },
      keywords: [
        "statement", "speech", "message", "acceptable", "unacceptable", "nuclear", "victory",
        "تصريح", "قال", "رسالة", "غير مقبول", "نووي", "نصر", "فشل"
      ]
    },

    SHOCK_ARCHITECTURE: {
      id: "SHOCK_ARCHITECTURE",
      layer: "BLACK_DOCTRINE",
      name: { en: "Shock Architecture", ar: "الصدمة" },
      question: {
        en: "Is the shock a result or a tool?",
        ar: "هل الصدمة نتيجة… أم أداة؟"
      },
      keywords: [
        "attack", "explosion", "massacre", "assassination", "killed", "urgent",
        "هجوم", "انفجار", "اغتيال", "قتل", "عاجل", "صدمة"
      ]
    },

    BEHIND_CURTAIN: {
      id: "BEHIND_CURTAIN",
      layer: "BLACK_DOCTRINE",
      name: { en: "Behind the Curtain", ar: "ما وراء الستار" },
      question: {
        en: "Who wants this information to be known now?",
        ar: "من يريدك أن تعرف هذا الآن؟"
      },
      keywords: [
        "channel", "source", "officials", "senior official", "according to", "leak",
        "القناة", "مصدر", "مسؤولون", "مسؤول رفيع", "بحسب", "تسريب", "أكسيوس", "كان", "العبرية"
      ]
    },

    BEYOND_WALL: {
      id: "BEYOND_WALL",
      layer: "BLACK_DOCTRINE",
      name: { en: "Beyond the Wall", ar: "خلف الجدار" },
      question: {
        en: "What is structurally forming before it appears?",
        ar: "ماذا يتشكل… قبل أن يظهر؟"
      },
      keywords: [
        "scenario", "trajectory", "future", "structural", "trend", "forecast",
        "سيناريو", "مسار", "استشراف", "بنيوي", "اتجاه", "توقع"
      ]
    },

    BLACK_GATE: {
      id: "BLACK_GATE",
      layer: "BLACK_DOCTRINE",
      name: { en: "Black Gate", ar: "البوابة السوداء" },
      question: {
        en: "Is the system transitioning from deterrence to action?",
        ar: "هل بدأت البوابة تُفتح؟"
      },
      keywords: [
        "deployment", "troops", "missiles", "dark eagle", "centcom", "readiness", "military movement",
        "نشر", "قوات", "صواريخ", "دارك إيغل", "سنتكوم", "جاهزية", "تحشيد", "ألوية"
      ]
    },

    TEMPORAL_WARFARE: {
      id: "TEMPORAL_WARFARE",
      layer: "CONFLICT_SYSTEMS",
      name: { en: "Temporal Warfare", ar: "الحرب الزمنية" },
      question: {
        en: "Who gains time and who is consumed by it?",
        ar: "من يربح الوقت… ومن يُستهلك به؟"
      },
      keywords: ["ceasefire", "delay", "phase", "30 days", "gradual", "وقف إطلاق", "تأجيل", "مرحلة", "تدريجي"]
    },

    WAAD: {
      id: "WAAD",
      layer: "CONFLICT_SYSTEMS",
      name: { en: "War Acceptance Architecture", ar: "هندسة قبول الحرب" },
      question: {
        en: "Is war being prepared, or are people being prepared for it?",
        ar: "هل يتم تحضير الحرب… أم تحضير الناس لها؟"
      },
      keywords: ["prepare public", "war time", "public opinion", "تهيئة", "زمن حرب", "الجمهور", "الرأي العام"]
    },

    INFORMATION_WARFARE: {
      id: "INFORMATION_WARFARE",
      layer: "CONFLICT_SYSTEMS",
      name: { en: "Information Warfare", ar: "الحرب المعلوماتية" },
      question: {
        en: "Who owns the narrative?",
        ar: "من يملك الرواية؟"
      },
      keywords: ["narrative", "media", "image", "claim", "رواية", "إعلام", "صورة", "ادعاء", "سردية"]
    },

    STRATEGIC_REFRAMING: {
      id: "STRATEGIC_REFRAMING",
      layer: "CONFLICT_SYSTEMS",
      name: { en: "Strategic Reframing", ar: "إعادة تعريف النصر" },
      question: {
        en: "Did the goal of war change during the war?",
        ar: "هل تغيّر هدف الحرب أثناء الحرب؟"
      },
      keywords: ["victory", "failure", "objective", "end goal", "نصر", "فشل", "هدف", "نهاية الحرب"]
    },

    IRAN_NUCLEAR_THRESHOLD: {
      id: "IRAN_NUCLEAR_THRESHOLD",
      layer: "REGIONAL_ENGINES",
      name: { en: "Iran Nuclear Threshold", ar: "إيران — العتبة النووية" },
      question: {
        en: "Is this deterrence or existential prevention?",
        ar: "هل نحن أمام ردع… أم منع وجودي؟"
      },
      keywords: ["iran", "nuclear", "uranium", "enrichment", "إيران", "نووي", "يورانيوم", "تخصيب"]
    },

    GAZA_RESTRUCTURING: {
      id: "GAZA_RESTRUCTURING",
      layer: "REGIONAL_ENGINES",
      name: { en: "Gaza Restructuring", ar: "غزة — إعادة التشكيل" },
      question: {
        en: "Who will own Gaza after the war?",
        ar: "من سيملك غزة بعد الحرب؟"
      },
      keywords: ["gaza", "yellow line", "civil military", "kiryat gat", "غزة", "الخط الأصفر", "كريات غات", "اليوم التالي"]
    },

    NORTHERN_PRESSURE: {
      id: "NORTHERN_PRESSURE",
      layer: "REGIONAL_ENGINES",
      name: { en: "Northern Pressure", ar: "الجبهة الشمالية" },
      question: {
        en: "Is the pressure controlled or escaping control?",
        ar: "هل الضغط مضبوط… أم يتصاعد؟"
      },
      keywords: ["lebanon", "hezbollah", "drone", "north", "لبنان", "حزب الله", "مسيّرة", "الشمال"]
    },

    REGIONAL_RECONSTRUCTION: {
      id: "REGIONAL_RECONSTRUCTION",
      layer: "REGIONAL_ENGINES",
      name: { en: "Regional Order Reconstruction", ar: "إعادة هندسة المنطقة" },
      question: {
        en: "Is the region being managed or redesigned?",
        ar: "هل المنطقة تُدار… أم يُعاد تصميمها؟"
      },
      keywords: ["uae", "centcom", "regional security", "gulf", "الإمارات", "سنتكوم", "الأمن الإقليمي", "الخليج"]
    }
  };

  function asText(input) {
    if (!input) return "";
    if (typeof input === "string") return input;
    return [
      input.title?.en, input.title?.ar, input.title,
      input.summary?.en, input.summary?.ar, input.summary,
      input.description?.en, input.description?.ar, input.description,
      input.text?.en, input.text?.ar, input.text,
      input.country, input.region, input.domain, input.source
    ].filter(Boolean).join(" ");
  }

  function normalize(value) {
    return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
  }

  function scoreSeries(text, series) {
    const t = normalize(text);
    return series.keywords.reduce((score, keyword) => {
      return t.includes(normalize(keyword)) ? score + 1 : score;
    }, 0);
  }

  function classifySignal(signal) {
    const text = asText(signal);
    const scored = Object.values(SERIES)
      .map(series => ({ series, score: scoreSeries(text, series) }))
      .sort((a, b) => b.score - a.score);

    const primary = scored[0]?.score > 0 ? scored[0].series : SERIES.BEYOND_WALL;
    const secondary = scored
      .filter(item => item.score > 0 && item.series.id !== primary.id)
      .slice(0, 3)
      .map(item => item.series);

    const regional = secondary.find(item => item.layer === "REGIONAL_ENGINES") ||
      (primary.layer === "REGIONAL_ENGINES" ? primary : null);

    const alertScore = Math.min(100, (scored[0]?.score || 1) * 18 + secondary.length * 7);

    return {
      primary,
      secondary,
      regional,
      alertScore,
      alertLevel: alertScore >= 70 ? "HIGH" : alertScore >= 40 ? "MEDIUM" : "LOW",
      question: primary.question,
      interpretation: {
        en: `Signal classified under ${primary.name.en}. ${primary.question.en}`,
        ar: `تم تصنيف الإشارة ضمن ${primary.name.ar}. ${primary.question.ar}`
      }
    };
  }

  function classifySignals(signals) {
    return Array.isArray(signals)
      ? signals.map(signal => ({
          ...signal,
          doctrine: classifySignal(signal)
        }))
      : [];
  }

  function summarizeDoctrine(signals) {
    const map = new Map();

    (signals || []).forEach(signal => {
      const id = signal?.doctrine?.primary?.id || "BEYOND_WALL";
      const current = map.get(id) || {
        series: signal?.doctrine?.primary || SERIES.BEYOND_WALL,
        count: 0,
        maxAlert: 0
      };

      current.count += 1;
      current.maxAlert = Math.max(current.maxAlert, signal?.doctrine?.alertScore || 0);
      map.set(id, current);
    });

    const ranked = [...map.values()].sort((a, b) => {
      if (b.maxAlert !== a.maxAlert) return b.maxAlert - a.maxAlert;
      return b.count - a.count;
    });

    return {
      activeSeries: ranked,
      topSeries: ranked[0] || null,
      count: ranked.length
    };
  }

  return {
    VERSION: "v1.0-black-doctrine-integrated",
    SERIES,
    classifySignal,
    classifySignals,
    summarizeDoctrine
  };
})();
