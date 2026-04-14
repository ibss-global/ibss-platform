const translations = {
  en: {
    nav_home: "Home",
    nav_dashboard: "Dashboard",
    nav_signals: "Signals",
    nav_reports: "Reports",
    nav_countries: "Countries",
    nav_models: "Models",
    nav_about: "About",

    system_active: "System Active — Monitoring Global Signals"
  },

  ar: {
    nav_home: "الرئيسية",
    nav_dashboard: "لوحة التحكم",
    nav_signals: "الإشارات",
    nav_reports: "التقارير",
    nav_models: "النماذج",
    nav_about: "حول",

    system_active: "النظام فعال — يراقب الإشارات العالمية"
  }
};

function applyLanguage(lang){
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";

  document.querySelectorAll("[data-i18n]").forEach(el=>{
    const key = el.getAttribute("data-i18n");
    if(translations[lang][key]){
      el.textContent = translations[lang][key];
    }
  });
}

const savedLang = localStorage.getItem("ibss_lang") || "en";
applyLanguage(savedLang);
