/**
 * IBSS NEWS INTAKE - PRODUCTION BUILD (GitHub Pages Compatible)
 * وظيفة الملف: جلب أخبار حقيقية وتغذية المحرك السيادي
 */

window.IBSS_NEWS = (function() {
    "use strict";

    // دالة لجلب الأخبار من مصدر حقيقي (استخدام Feed عابر للحدود كمثال)
    async function fetchLiveIntelligence() {
        try {
            // استخدام خدمية تحويل RSS إلى JSON لجلب أخبار حقيقية (مثل رويترز أو الجزيرة)
            const response = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https://www.aljazeera.net/aljazeerarss/a7c186BE-B98B-4406-9644-77C3986DEE27.xml');
            const data = await response.json();
            
            return data.items.map(item => ({
                title: item.title,
                text: item.description || item.content,
                region: "MENA / Middle East",
                source: "Live RSS Feed"
            }));
        } catch (error) {
            console.error("News Fetch Error:", error);
            return null; // سيقوم المحرك بالعودة للبيانات الاحتياطية
        }
    }

    // بيانات احتياطية (Sovereign Fallback) في حال انقطاع الإنترنت أو الـ API
    const fallbackIntelligence = [
        { title: "تحليل الضغط الميداني", text: "استمرار عمليات إعادة التموضع في المحاور الحاكمة تزامناً مع تصريحات سيادية.", region: "Gaza/Frontier" },
        { title: "رصد مناورة سياسية", text: "استخدام مصطلحات غامضة في مسودة الاتفاق بهدف كسب الوقت وتفكيك الضغط الدولي.", region: "Regional" }
    ];

    let cachedNews = fallbackIntelligence;

    // محاولة تحديث البيانات فور تشغيل الملف
    fetchLiveIntelligence().then(news => {
        if (news && news.length > 0) cachedNews = news;
    });

    return {
        getLatest: function() {
            return cachedNews;
        },
        refresh: async function() {
            const news = await fetchLiveIntelligence();
            if (news) cachedNews = news;
            return cachedNews;
        }
    };
})();
        
