// IBSS NEWS ENGINE — Stable Live News Layer
// Version: v2.0

window.IBSS_NEWS_ENGINE = (function () {
  "use strict";

  const CONFIG = {
    version: "v2.0-stable-live-news-layer",
    maxItems: 40,
    defaultPriority: "LOW"
  };

  function safeText(value, fallback = "") {
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
  }

  function safeNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function clone(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      console.error("IBSS_NEWS_ENGINE clone error:", error);
      return null;
    }
  }

  function normalizePriority(value) {
    const p = String(value || CONFIG.defaultPriority).toUpperCase().trim();
    if (p === "HIGH") return "HIGH";
    if (p === "MEDIUM") return "MEDIUM";
    return "LOW";
  }

  function priorityWeight(priority) {
    const p = normalizePriority(priority);
    if (p === "HIGH") return 3;
    if (p === "MEDIUM") return 2;
    return 1;
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

  function nowIso() {
    return new Date().toISOString();
  }

  function buildId(prefix = "NEWS") {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  }

  function normalizeNewsItem(item, index = 0) {
    const title = item?.title || item?.text || {
      en: "Untitled news item",
      ar: "خبر غير معنُون"
    };

    const summary = item?.summary || item?.description || item?.text || title;

    return {
      id: safeText(item?.id, `NEWS-${index + 1}`),
      type: "news",
      title,
      summary,
      text: item?.text || title,
      region: safeText(item?.region, safeText(item?.country, "global")),
      country: safeText(item?.country, safeText(item?.region, "global")),
      domain: safeText(item?.domain || item?.category, "general"),
      priority: normalizePriority(item?.priority || item?.severity),
      source: safeText(item?.source || item?.sourceName, "IBSS_NEWS"),
      publishedAt: safeText(item?.publishedAt || item?.timestamp || item?.createdAt, nowIso()),
      score100: safeNumber(item?.score100, 0),
      raw: item
    };
  }

  function contentToNewsItem(content, index = 0) {
    return {
      id: safeText(content?.id, `CONTENT-NEWS-${index + 1}`),
      type: "news",
      title: content?.title || {
        en: "Published update",
        ar: "تحديث منشور"
      },
      summary: content?.summary || content?.body || content?.title,
      text: content?.summary || content?.title,
      region: safeText(content?.region, "global"),
      country: safeText(content?.country || content?.countryId, "global"),
      domain: safeText(content?.domain, "general"),
      priority: normalizePriority(content?.priority),
      source: safeText(content?.unit || content?.sourcePlatform, "IBSS_CONTENT"),
      publishedAt: safeText(content?.publishedAt || content?.updatedAt || content?.createdAt, nowIso()),
      score100: safeNumber(content?.metrics?.strategicWeight, 0),
      raw: content
    };
  }

  function getSeedNews() {
    return asArray(window.IBSS_NEWS || window.IBSS_DATA?.newsFeed);
  }

  function getContentNews() {
    return asArray(window.IBSS_CONTENT || window.IBSS_DATA?.content)
      .filter(item => item?.status === "published" && item?.type === "news");
  }

  function getAllNews() {
    const seed = getSeedNews().map(normalizeNewsItem);
    const contentNews = getContentNews().map(contentToNewsItem);

    const merged = [...seed, ...contentNews];

    const deduped = [];
    const seen = new Set();

    merged.forEach(item => {
      const key = [
        normalizeText(getLocalizedText(item.title, "en")),
        normalizeText(item.region),
        normalizeText(item.domain)
      ].join("|");

      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(item);
      }
    });

    return deduped
      .sort((a, b) => {
        const p = priorityWeight(b.priority) - priorityWeight(a.priority);
        if (p !== 0) return p;

        return new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime();
      })
      .slice(0, CONFIG.maxItems);
  }

  function getLatest(limit = 10) {
    return getAllNews().slice(0, Math.max(1, safeNumber(limit, 10)));
  }

  function getByRegion(region, limit = 10) {
    const target = normalizeText(region);

    return getAllNews()
      .filter(item => normalizeText(item.region) === target || normalizeText(item.country) === target)
      .slice(0, Math.max(1, safeNumber(limit, 10)));
  }

  function getHighPriority(limit = 10) {
    return getAllNews()
      .filter(item => normalizePriority(item.priority) === "HIGH")
      .slice(0, Math.max(1, safeNumber(limit, 10)));
  }

  function addLocalNews(item) {
    if (!window.IBSS_NEWS) window.IBSS_NEWS = [];

    const normalized = normalizeNewsItem({
      ...item,
      id: item?.id || buildId("NEWS-LOCAL"),
      publishedAt: item?.publishedAt || nowIso(),
      source: item?.source || "IBSS_LOCAL"
    });

    window.IBSS_NEWS.unshift(normalized);

    window.dispatchEvent(new CustomEvent("ibss:ingestion-updated", {
      detail: {
        source: "news-engine",
        item: clone(normalized)
      }
    }));

    return clone(normalized);
  }

  function toFeedItems(limit = 10, lang = "en") {
    return getLatest(limit).map(item => ({
      id: item.id,
      type: "news",
      priority: item.priority,
      source: item.source,
      text: {
        en: getLocalizedText(item.text || item.title, "en"),
        ar: getLocalizedText(item.text || item.title, "ar")
      },
      createdAt: item.publishedAt,
      lang
    }));
  }

  return {
    CONFIG,
    normalizeNewsItem,
    getAllNews,
    getLatest,
    getByRegion,
    getHighPriority,
    addLocalNews,
    toFeedItems
  };
})();
