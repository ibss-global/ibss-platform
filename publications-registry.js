window.IBSS_PUBLICATIONS = (function () {
  "use strict";

  const Factory = window.IBSS_PUBLICATIONS_FACTORY;

  if (!Factory) {
    console.error("IBSS_PUBLICATIONS requires IBSS_PUBLICATIONS_FACTORY to be loaded first.");
    return {
      getAll: function () { return []; },
      getPublished: function () { return []; },
      getDrafts: function () { return []; },
      getById: function () { return null; },
      getBySlug: function () { return null; },
      getLatest: function () { return null; },
      getByType: function () { return []; },
      getByCountry: function () { return []; },
      getByRegion: function () { return []; },
      getByDomain: function () { return []; },
      getFeatured: function () { return []; },
      getPinned: function () { return []; },
      getCanonical: function () { return []; },
      getRegistryState: function () {
        return {
          total: 0,
          published: 0,
          drafts: 0,
          invalid: 0,
          invalidItems: []
        };
      },
      debugPrintRegistryState: function () {
        return {
          total: 0,
          published: 0,
          drafts: 0,
          invalid: 0,
          invalidItems: []
        };
      }
    };
  }

  const {
    createPublication,
    createPolicyPaper,
    createStudy,
    createReport,
    createBrief,
    validatePublication
  } = Factory;

  /* =========================================
     Utilities
  ========================================= */

  function safeText(value, fallback = "") {
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function normalizeText(value) {
    return safeText(String(value || ""))
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function getLocalizedText(value, lang = "en") {
    if (!value) return "";
    if (typeof value === "string" || typeof value === "number") return String(value);

    return (
      value?.[lang] ||
      value?.en ||
      value?.ar ||
      value?.name ||
      value?.title ||
      value?.label ||
      value?.text ||
      ""
    );
  }

  function clone(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      console.error("IBSS_PUBLICATIONS clone error:", error);
      return null;
    }
  }

  function sortRegistry(list) {
    return asArray(list).slice().sort((a, b) => {
      const aPinned = a?.meta?.pinned ? 1 : 0;
      const bPinned = b?.meta?.pinned ? 1 : 0;
      if (bPinned !== aPinned) return bPinned - aPinned;

      const aFeatured = a?.meta?.featured ? 1 : 0;
      const bFeatured = b?.meta?.featured ? 1 : 0;
      if (bFeatured !== aFeatured) return bFeatured - aFeatured;

      const aCanonical = a?.meta?.canonical ? 1 : 0;
      const bCanonical = b?.meta?.canonical ? 1 : 0;
      if (bCanonical !== aCanonical) return bCanonical - aCanonical;

      const aTime = new Date(a?.publishedAt || a?.updatedAt || 0).getTime();
      const bTime = new Date(b?.publishedAt || b?.updatedAt || 0).getTime();
      return bTime - aTime;
    });
  }

  function buildDedupKey(item) {
    return [
      normalizeText(item?.id || ""),
      normalizeText(item?.slug || ""),
      normalizeText(getLocalizedText(item?.title, "en")),
      normalizeText(item?.region || ""),
      normalizeText(item?.country || ""),
      normalizeText(item?.type || "")
    ].join("|");
  }

  function mergeRegistries(staticItems, intakeItems) {
    const map = new Map();

    sortRegistry([...asArray(staticItems), ...asArray(intakeItems)]).forEach(item => {
      const primaryKey = safeText(item?.id, "");
      const secondaryKey = buildDedupKey(item);

      if (primaryKey && !map.has(primaryKey)) {
        map.set(primaryKey, item);
        return;
      }

      if (!primaryKey && !map.has(secondaryKey)) {
        map.set(secondaryKey, item);
        return;
      }

      if (primaryKey && map.has(primaryKey)) {
        const existing = map.get(primaryKey);
        const existingTime = new Date(existing?.updatedAt || existing?.publishedAt || 0).getTime();
        const incomingTime = new Date(item?.updatedAt || item?.publishedAt || 0).getTime();

        if (incomingTime >= existingTime) {
          map.set(primaryKey, item);
        }
        return;
      }

      if (map.has(secondaryKey)) {
        const existing = map.get(secondaryKey);
        const existingTime = new Date(existing?.updatedAt || existing?.publishedAt || 0).getTime();
        const incomingTime = new Date(item?.updatedAt || item?.publishedAt || 0).getTime();

        if (incomingTime >= existingTime) {
          map.set(secondaryKey, item);
        }
        return;
      }

      map.set(secondaryKey, item);
    });

    return sortRegistry([...map.values()]);
  }

  /* =========================================
     Static Registry
  ========================================= */

  const STATIC_REGISTRY = [
    createPolicyPaper({
      id: "pp-gaza-monopoly-of-force-2026-04",
      slug: "gaza-after-war-monopoly-of-force-day-after",
      status: "published",
      title: {
        en: "Gaza After the War: Who Will Monopoly the Use of Force in the Day After?",
        ar: "غزة بعد الحرب: من يحتكر القوة في اليوم التالي؟"
      },
      summary: {
        en: "A decision-grade policy paper examining the struggle over monopoly of force in post-war Gaza, including disarmament and integration pathways, Egypt’s role, mediation architecture, and transitional governance options.",
        ar: "ورقة سياسات بدرجة قرار تبحث الصراع على احتكار القوة في غزة بعد الحرب، بما يشمل مسارات نزع ودمج السلاح، دور مصر، بنية الوساطة، وخيارات الحكم الانتقالي."
      },
      body: {
        en: "Arabic master edition available in this publication entry.",
        ar: `━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 IBSS — POLICY PAPER
غزة بعد الحرب: من يحتكر القوة في اليوم التالي؟
ورقة سياسات شاملة حول نزع/دمج السلاح، دور مصر والوسطاء، واليوم التالي في غزة
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

الجهة: IBSS — International Bureau of Sovereign Studies
النموذج: Σ-9X Sovereign Intelligence Protocol
التصنيف: Policy Paper
الحالة: Executive Policy Edition
المسار: Gaza Governance-Security Track
التاريخ: أبريل 2026

1) الملخص التنفيذي

أصبحت قضية السلاح في غزة العقدة المركزية في مفاوضات القاهرة والوساطات الإقليمية والدولية. المعطيات المتاحة تشير إلى أن الحركة ترفض نزع السلاح غير المشروط، وتربط أي نقاش جدي بضمانات واضحة تتعلق بالانسحاب الإسرائيلي الكامل، وإعادة الإعمار، وترتيبات الحكم، وعدم تحويل ملف المساعدات إلى أداة ابتزاز سياسي. في المقابل، تضغط ترتيبات مدعومة أمريكيًا وإسرائيليًا باتجاه فصل إدارة غزة عن القوة المسلحة المستقلة، أو على الأقل تقليص استقلالها العملياتي. هذا يجعل السؤال الحقيقي ليس: “هل سيُسلَّم السلاح؟” بل: من سيحتكر حق استخدام القوة في غزة بعد الحرب، وتحت أي شرعية، وبأي ضمانات؟

الورقة تخلص إلى أن سيناريو التسليم الفوري الكامل ضعيف، وأن الأكثر واقعية هو أحد نمطين: إما تجميد مرحلي للسلاح مع بقاء بنية القوة، أو إعادة هيكلته داخل إطار فلسطيني/انتقالي جديد إذا توافرت ضمانات سياسية وأمنية معتبرة. كما ترى أن مصر تظل اللاعب الأكثر أهمية في هندسة الترتيب الأمني، لا بسبب الوساطة فقط، بل لأنها تمسك بمفصل الجوار، والحدود، والشرعية الإجرائية لأي بنية حكم ناشئة.

2) خلفية المشكلة

بعد أشهر من الهدنة الهشة والاشتباكات المتقطعة، عاد ملف “اليوم التالي” في غزة ليرتبط مباشرة بثلاث قضايا مترابطة: استمرار وقف النار، شكل الإدارة المدنية المقبلة، ووضع السلاح. رويترز أفادت بأن الحركة تريد ضمانات بانسحاب إسرائيلي قبل الدخول في محادثات نزع السلاح، كما نقلت أن جناحها العسكري رفض علنًا نداءات نزع السلاح “تحت أي ظرف”، وهو ما يجعل أي صيغة انتقالية غير قابلة للحياة إذا بُنيت على فرضية تسليم فوري وغير مشروط.

في الوقت نفسه، ظهرت مقترحات لإدارة فلسطينية جديدة مدعومة أمريكيًا، مع مطالب من الحركة بإدماج نحو 10,000 من شرطتها في أي هيكل إداري/أمني جديد، وهو مؤشر مهم: الحركة لا تناقش فقط مصير السلاح، بل مصير البنية الحاكمة التي تحرس المجتمع اليومي. هذا يربط ملف السلاح مباشرة بملف الشرعية والإدارة، لا بالبعد العسكري وحده.

3) الإشكالية المركزية

الإشكالية ليست تقنية. ليست سؤالًا عن عدد البنادق أو الصواريخ أو عناصر الشرطة. الإشكالية في جوهرها هي:

«هل سيعاد بناء غزة على أساس سلطة مدنية تحتكر القوة رسميًا، أم على أساس تعدد مراكز القوة مع ترتيبات مؤقتة؟»

هذا السؤال يتفرع عنه أربعة أسئلة فرعية:

1. هل يمكن إنتاج شرعية حكم جديدة من دون حل مسألة السلاح؟
2. هل يمكن حل مسألة السلاح من دون اتفاق على الانسحاب وإعادة الإعمار؟
3. هل تريد إسرائيل والولايات المتحدة “إدارة غزة” أم “نزع قابلية غزة على إنتاج قوة مستقلة”؟
4. هل تستطيع مصر هندسة تسوية أمنية تحافظ على الاستقرار من دون انفجار فلسطيني داخلي؟

4) تحليل الأطراف الفاعلة

أ) الحركة في غزة

موقف الحركة كما يظهر في المعطيات الحالية يقوم على ثلاث ركائز: رفض نزع السلاح غير المشروط، المطالبة بضمانات انسحاب إسرائيلي، ومحاولة الحفاظ على دور أمني/شرطي داخل أي إدارة جديدة. هذا يعني أن الحركة لا تتصرف بوصفها قوة عسكرية فقط، بل بوصفها فاعل حكم يريد ضمان بقاء وظيفي حتى لو تغير شكل السلطة.

ب) إسرائيل

الضغوط الإسرائيلية والأمريكية المدعومة بخطط “اليوم التالي” تربط مراحل الانسحاب وتثبيت التهدئة بتنازلات تتعلق بالسلاح. في الوقت نفسه، تواصل إسرائيل عمليات عسكرية متقطعة داخل غزة، ما يخلق تناقضًا بنيويًا: المطالبة بالتجريد من السلاح مع استمرار بيئة التهديد. هذا يجعل مقاربة “الأمن أولًا” بالنسبة للطرف الفلسطيني ضعيفة الجاذبية، بل تزيد تمسكه بعناصر القوة الذاتية.

ج) مصر

مصر ليست مجرد وسيط ناقل رسائل. هي الدولة التي تملك البوابة الجنوبية لغزة، والعلاقة اليومية مع ملف المعابر، والقدرة على ربط الأمن الحدودي بالترتيبات السياسية. كما أن اتصالاتها المكثفة مع المبعوث الأمريكي ومع عواصم إقليمية تعكس أنها تعمل على تثبيت مسار يخفف الانفجار الإقليمي، لكنه في الوقت نفسه يحاول إنتاج صيغة حكم قابلة للإدارة من دون انهيار أمني على حدودها.

د) الوسطاء الآخرون

قطر وتركيا وباكستان وغيرهم يوسعون هامش التفاوض، لكنهم لا يملكون ما تملكه مصر من وزن جغرافي وإجرائي في ملف غزة. كما أن وجود “Board of Peace” والدور المساند للبنك الدولي في الإعمار يوضح أن البعد الدولي يحاول بناء إطار تمويلي/إداري لليوم التالي، لكنه ما يزال معلقًا على القضايا السيادية الصلبة: السلاح، الانسحاب، والإشراف على المساعدات.

5) السيناريوهات السياسية الواقعية

السيناريو الأول: نزع سلاح كامل وفوري

هذا هو السيناريو الأقل واقعية حاليًا. يعوقه الرفض المعلن من الجناح العسكري، واشتراطات الحركة المتعلقة بالانسحاب، وانعدام الثقة الناتج عن استمرار العنف بعد الهدنة. أي محاولة لفرض هذا السيناريو سريعًا قد تنتج انهيارًا للمسار كله أو انفجارًا داخليًا.

السيناريو الثاني: تجميد مرحلي للسلاح مع رقابة على الاستخدام

هنا لا يسلَّم السلاح فورًا، بل يجمَّد استخدامه ويُربط تدريجيًا بمسار سياسي/أمني أوسع: انسحاب، إعادة إعمار، ترتيبات معابر، وربما دمج جزئي لقوى الشرطة المحلية. هذا السيناريو أكثر قابلية للحياة لأنه يشتري الوقت ويخفف منطق “الاستسلام مقابل الوعود”. لكنه يحمل خطر التحول إلى هدنة غامضة إذا غابت آلية تنفيذ قوية.

السيناريو الثالث: إعادة هيكلة القوة داخل مظلة فلسطينية انتقالية

هذا هو السيناريو الأكثر توازنًا على الورق: دمج الشرطة والأمن الداخلي تدريجيًا في بنية فلسطينية جديدة، مع فصل نسبي بين السلاح الثقيل والإدارة اليومية، وإيجاد رقابة عربية/دولية على التنفيذ. نجاحه يتوقف على ثلاثة شروط: قبول مصري-فلسطيني واسع، ضمانات انسحاب، وآلية تمويل/إعمار لا تستخدم للضغط السياسي وحده.

السيناريو الرابع: فشل المسار كله والعودة إلى إدارة الأزمة

إذا تعذر الاتفاق على من يحتكر القوة، قد يعود الجميع إلى الصيغة الأسوأ: هدنة هشة، قصف متقطع، مساعدات مشروطة، وحكم مشوش متعدد العقد. هذا السيناريو ليس فشلًا تفاوضيًا فقط؛ بل يعني أن غزة ستبقى بين “سلطة بلا احتكار للقوة” و”قوة بلا شرعية حكم مستقرة”.

6) تقييم السياسات: ما الخيار الأجدى؟

الورقة ترى أن المقاربة الأكثر واقعية ليست نزع السلاح الفوري، بل إعادة هيكلة احتكار القوة تدريجيًا. أي مقاربة تقوم على “سلم سياسي-أمني” بدل القفز المباشر. ويشمل ذلك:

- وقفًا متماسكًا للنار مع آلية تحقق.
- ربط أي بحث في السلاح بانسحاب إسرائيلي محدد زمنيًا.
- إنشاء إطار أمني فلسطيني انتقالي يضم الشرطة والخدمات المدنية أولًا.
- تأجيل حسم ملف السلاح الثقيل إلى مرحلة لاحقة مرتبطة بضمانات سيادية وإعمارية.
- منع تحويل المساعدات إلى أداة حكم منفردة من دون بنية شرعية واضحة.

7) توصيات سياسات

لمصر:
ينبغي على القاهرة أن تدفع نحو صيغة فصل مرحلي بين احتكار الإدارة واحتكار السلاح بدل دمجهما دفعة واحدة.

للفلسطينيين:
الحاجة ملحة إلى صياغة مبدأ فلسطيني جامع لاحتكار القوة، حتى لو جاء تدريجيًا.

للوسطاء الدوليين:
ينبغي عدم ربط الإعمار بالكامل بإنجاز فوري في ملف السلاح.

لإسرائيل:
إذا كان الهدف الواقعي هو الاستقرار لا مجرد الإضعاف المؤقت، فإن الاستمرار في القتل والقصف خلال الهدنة ينسف أي قابلية لنجاح مسار نزع/دمج السلاح.

8) الخلاصة النهائية

قضية “هل تسلِّم الحركة سلاح غزة؟” هي صياغة ناقصة للسؤال.

السؤال الكامل هو:

«من سيملك حق احتكار القوة في غزة بعد الحرب، وكيف سيُبنى ذلك الحق سياسيًا وأمنيًا وماليًا؟»

الجواب الأقرب للواقع الحالي: لا تسليم شامل وفوري، بل صراع تفاوضي على إعادة تعريف القوة داخل غزة. من يظن أن المسألة مجرد نزع سلاح، يفوته أن جوهرها هو إعادة هندسة السلطة نفسها. ومصر، أكثر من أي وسيط آخر، تقف اليوم في مركز هذه الهندسة.

📡 IBSS — Sovereign Systems Analysis
Σ-9X Sovereign Intelligence Protocol
Policy Paper Edition`
      },
      region: "gaza",
      country: "gaza",
      domain: "governance-security",
      priority: "HIGH",
      tags: ["Gaza", "Post-War", "Force Monopoly", "Egypt", "Governance", "Disarmament"],
      authors: ["IBSS"],
      publishedAt: "2026-04-17T18:00:00Z",
      metrics: {
        policyRisk: 84,
        implementationDifficulty: 88,
        regionalSensitivity: 86,
        strategicWeight: 89
      },
      meta: {
        featured: true,
        pinned: true,
        canonical: true
      }
    })
  ];

  /* =========================================
     Intake Registry
  ========================================= */

  function getIntakePublications() {
    try {
      if (window.IBSS_PUBLICATION_INTAKE?.getAll) {
        return asArray(window.IBSS_PUBLICATION_INTAKE.getAll())
          .map(item => createPublication(item));
      }
    } catch (error) {
      console.error("IBSS_PUBLICATIONS intake read error:", error);
    }

    return [];
  }

  function getMergedRegistry() {
    return mergeRegistries(STATIC_REGISTRY, getIntakePublications());
  }

  /* =========================================
     Public Readers
  ========================================= */

  function getAll() {
    return clone(getMergedRegistry()) || [];
  }

  function getPublished() {
    return getAll().filter(item => item.status === "published");
  }

  function getDrafts() {
    return getAll().filter(item => item.status === "draft" || item.status === "pending");
  }

  function getById(id) {
    return getAll().find(item => item.id === id) || null;
  }

  function getBySlug(slug) {
    const target = normalizeText(slug);
    return getAll().find(item => normalizeText(item.slug) === target) || null;
  }

  function getLatest() {
    return getPublished()[0] || null;
  }

  function getByType(type) {
    const target = normalizeText(type);
    return getPublished().filter(item => normalizeText(item.type) === target);
  }

  function getByCountry(country) {
    const target = normalizeText(country);
    return getPublished().filter(item => normalizeText(item.country) === target);
  }

  function getByRegion(region) {
    const target = normalizeText(region);
    return getPublished().filter(item => normalizeText(item.region) === target);
  }

  function getByDomain(domain) {
    const target = normalizeText(domain);
    return getPublished().filter(item => normalizeText(item.domain) === target);
  }

  function getFeatured() {
    return getPublished().filter(item => !!item?.meta?.featured);
  }

  function getPinned() {
    return getPublished().filter(item => !!item?.meta?.pinned);
  }

  function getCanonical() {
    return getPublished().filter(item => !!item?.meta?.canonical);
  }

  function getRegistryState() {
    const all = getAll();
    const published = getPublished();
    const drafts = getDrafts();

    const invalidItems = all
      .map(item => ({
        id: item?.id || "unknown",
        validation: validatePublication(item)
      }))
      .filter(entry => !entry.validation.valid);

    return {
      total: all.length,
      published: published.length,
      drafts: drafts.length,
      invalid: invalidItems.length,
      invalidItems
    };
  }

  function debugPrintRegistryState() {
    const state = getRegistryState();
    console.log("IBSS_PUBLICATIONS Registry State:", state);
    return state;
  }

  /* =========================================
     Live Sync Hook
  ========================================= */

  window.addEventListener("ibss:publication-intake-updated", function () {
    try {
      if (window.IBSS_CONTENT_API?.reloadFromIntake) {
        window.IBSS_CONTENT_API.reloadFromIntake();
      }
    } catch (error) {
      console.error("IBSS_PUBLICATIONS live sync error:", error);
    }
  });

  return {
    getAll,
    getPublished,
    getDrafts,
    getById,
    getBySlug,
    getLatest,
    getByType,
    getByCountry,
    getByRegion,
    getByDomain,
    getFeatured,
    getPinned,
    getCanonical,
    getRegistryState,
    debugPrintRegistryState
  };
})();
