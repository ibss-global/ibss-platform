window.IBSS_NEWS = (function() {
    const mockIntake = [
        { title: "تحرك عسكري مفاجئ", text: "رصد تحركات آليات ثقيلة على المحور الشمالي تزامناً مع فشل جولة المفاوضات الأخيرة.", region: "Gaza/Frontier" },
        { title: "تصريح سيادي", text: "مصدر رسمي: الخيارات الميدانية هي الأداة الوحيدة لفرض الشروط السياسية.", region: "Regional" },
        { title: "تفكيك خيار التفاوض", text: "استخدام مصطلح 'المرونة' كأداة للمناورة وإغلاق الخيارات أمام الوسيط.", region: "International" }
    ];

    return {
        getLatest: function() {
            // هنا المحرك يضيف "ضجيجاً" واقعياً للأخبار لتبدو الحسابات ديناميكية
            return mockIntake;
        }
    };
})();
