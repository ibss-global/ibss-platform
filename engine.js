/**
 * IBSS SOVEREIGN ENGINE - v2.0 (Σ-9X Architecture)
 * المطور: Naeem Dahalan & AI Partner
 * الوظيفة: تحويل التدفق الخبري إلى نبضات قرار سيادي
 */

window.IBSS_ENGINE = (function() {
    "use strict";

    // إعدادات النظام الأساسية
    const CONFIG = {
        refreshMs: 5000,
        baselineSystemStress: 45, // نقطة التعادل للنظام
        thresholds: { high: 75, medium: 40, low: 0 }
    };

    let state = {
        systemPressure: 0,
        liveSignalsCount: 0,
        rankedSignals: [],
        topTheater: null,
        updatedAt: new Date()
    };

    // 1. آلية تفكيك الدلالات (Semantic Deconstruction)
    function deconstructSignal(rawNews) {
        // هنا يتم تطبيق "تفكيك المصطلحات" التي طلبتموها
        let weight = 10; 
        let domain = "General";

        if (rawNews.text.includes("تصعيد") || rawNews.text.includes("هجوم")) {
            weight += 40;
            domain = "Security/Military";
        }
        if (rawNews.text.includes("مفاوضات") || rawNews.text.includes("هدنة")) {
            weight += 25;
            domain = "Strategic Negotiation";
        }
        
        return {
            id: 'sig-' + Math.random().toString(36).substr(2, 9),
            title: rawNews.title || "إشارة استراتيجية جديدة",
            description: rawNews.text,
            score100: Math.min(weight + (Math.random() * 20), 100),
            priority: weight > 40 ? "HIGH" : "MEDIUM",
            region: rawNews.region || "MENA",
            signalType: domain,
            timestamp: new Date()
        };
    }

    // 2. حساب ضغط النظام (System Stress Calculation)
    function calculateSystemState(signals) {
        const totalScore = signals.reduce((acc, sig) => acc + sig.score100, 0);
        const avgPressure = signals.length > 0 ? totalScore / signals.length : 0;
        
        return {
            systemPressure: Math.round(avgPressure + (signals.length * 2)), // الضغط يتزايد بكثافة الإشارات
            liveSignalsCount: signals.length,
            rankedSignals: signals.sort((a, b) => b.score100 - a.score100),
            updatedAt: new Date()
        };
    }

    return {
        CONFIG,
        // وظيفة التحديث التي ستستدعيها الواجهة
        getSystemState: function() {
            // جلب البيانات من news.js (سنقوم بتجهيزه لاحقاً)
            const rawData = window.IBSS_NEWS?.getLatest() || [];
            const processedSignals = rawData.map(deconstructSignal);
            
            state = calculateSystemState(processedSignals);
            return state;
        },
        // منطق تصنيف الحزم (Bands)
        classifyBand: function(score) {
            if (score >= CONFIG.thresholds.high) return { en: "CRITICAL", ar: "حرج جداً" };
            if (score >= CONFIG.thresholds.medium) return { en: "ACTIVE WATCH", ar: "مراقبة نشطة" };
            return { en: "STABLE", ar: "مستقر" };
        }
    };
})();
