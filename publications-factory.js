window.IBSS_PUBLICATIONS_FACTORY = (function () {
  "use strict";

  const CONFIG = {
    defaultType: "study",
    defaultClassification: "study",
    defaultEdition: "Standard Edition",
    defaultStatus: "published",
    defaultUnit: "SSU",
    defaultRegion: "global",
    defaultCountry: "global",
    defaultDomain: "general",
    defaultPriority: "MEDIUM"
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

  function normalizeText(value) {
    return safeText(String(value || ""))
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function buildId(prefix = "pub") {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function normalizeLocalized(value, fallback = "-") {
    if (typeof value === "string" || typeof value === "number") {
      const text = String(value);
      return {
        en: safeText(text, fallback),
        ar: safeText(text, fallback)
      };
    }

    return {
      en: safeText(value?.en, fallback),
      ar: safeText(value?.ar, safeText(value?.en, fallback))
    };
  }

  function normalizePriority(priority) {
    const p = String(priority || CONFIG.defaultPriority).toUpperCase().trim();
    if (p === "HIGH") return "HIGH";
    if (p === "MEDIUM") return "MEDIUM";
    return "LOW";
  }

  function normalizeStatus(status) {
    const s = normalizeText(status || CONFIG.defaultStatus);
    if (s === "draft") return "draft";
    if (s === "pending") return "pending";
    return "published";
  }

  function normalizeType(type) {
    const t = normalizeText(type || CONFIG.defaultType);
    if (
      t === "study" ||
      t === "report" ||
      t === "brief" ||
      t === "analysis" ||
      t === "policy_paper" ||
      t === "policy-paper" ||
      t === "briefing"
    ) {
      return t === "policy-paper" ? "policy_paper" : t;
    }

    return CONFIG.defaultType;
  }

  function normalizeClassification(classification, type) {
    const c = safeText(classification, "");
    if (c) return c;
    return type || CONFIG.defaultClassification;
  }

  function normalizeMetrics(metrics) {
    return {
      policyRisk: safeNumber(metrics?.policyRisk, 0),
      implementationDifficulty: safeNumber(metrics?.implementationDifficulty, 0),
      regionalSensitivity: safeNumber(metrics?.regionalSensitivity, 0),
      strategicWeight: safeNumber(metrics?.strategicWeight, 0)
    };
  }

  function normalizeTags(tags) {
    return asArray(tags)
      .map(tag => safeText(String(tag)))
      .filter(Boolean)
      .slice(0, 20);
  }

  function normalizeLinks(links) {
    return asArray(links)
      .map(link => ({
        label: safeText(link?.label, "Link"),
        url: safeText(link?.url, "#")
      }))
      .filter(link => link.url);
  }

  function normalizeAuthors(authors) {
    return asArray(authors)
      .map(author => safeText(String(author)))
      .filter(Boolean)
      .slice(0, 10);
  }

  function normalizePublishedAt(value) {
    const raw = safeText(value, "");
    if (!raw) return new Date().toISOString();

    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return new Date().toISOString();

    return date.toISOString();
  }

  function buildSlugFromTitle(title) {
    const base = normalizeText(title?.en || title?.ar || "publication")
      .replace(/[^a-z0-9\u0600-\u06FF\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    return safeText(base, "publication");
  }

  function createPublication(input) {
    const type = normalizeType(input?.type);
    const title = normalizeLocalized(input?.title, "Untitled Publication");
    const summary = normalizeLocalized(input?.summary, "No summary available.");
    const body = normalizeLocalized(input?.body, "No body available.");

    const id = safeText(input?.id, buildId(type));
    const slug = safeText(input?.slug, buildSlugFromTitle(title));

    const publication = {
      id,
      slug,
      type,
      classification: normalizeClassification(input?.classification, type),
      edition: safeText(input?.edition, CONFIG.defaultEdition),
      status: normalizeStatus(input?.status),
      unit: safeText(input?.unit, CONFIG.defaultUnit),

      title,
      summary,
      body,

      region: safeText(input?.region, CONFIG.defaultRegion),
      country: safeText(input?.country, input?.region || CONFIG.defaultCountry),
      domain: safeText(input?.domain, CONFIG.defaultDomain),
      priority: normalizePriority(input?.priority),

      tags: normalizeTags(input?.tags),
      links: normalizeLinks(input?.links),
      authors: normalizeAuthors(input?.authors),

      publishedAt: normalizePublishedAt(input?.publishedAt),
      createdAt: normalizePublishedAt(input?.createdAt || input?.publishedAt),
      updatedAt: normalizePublishedAt(input?.updatedAt || input?.publishedAt),

      metrics: normalizeMetrics(input?.metrics),

      meta: {
        featured: !!input?.meta?.featured,
        pinned: !!input?.meta?.pinned,
        canonical: !!input?.meta?.canonical
      }
    };

    return publication;
  }

  function createPolicyPaper(input) {
    return createPublication({
      ...input,
      type: "policy_paper",
      classification: input?.classification || "policy_paper",
      edition: input?.edition || "Executive Policy Edition",
      unit: input?.unit || "SSU"
    });
  }

  function createStudy(input) {
    return createPublication({
      ...input,
      type: "study",
      classification: input?.classification || "study",
      edition: input?.edition || "Strategic Study Edition",
      unit: input?.unit || "SSU"
    });
  }

  function createReport(input) {
    return createPublication({
      ...input,
      type: "report",
      classification: input?.classification || "report",
      edition: input?.edition || "Operational Report Edition",
      unit: input?.unit || "SSU"
    });
  }

  function createBrief(input) {
    return createPublication({
      ...input,
      type: "brief",
      classification: input?.classification || "brief",
      edition: input?.edition || "Executive Brief Edition",
      unit: input?.unit || "SSU"
    });
  }

  function validatePublication(item) {
    const errors = [];

    if (!item || typeof item !== "object") {
      return {
        valid: false,
        errors: ["Publication is not an object."]
      };
    }

    if (!safeText(item.id)) errors.push("Missing id.");
    if (!safeText(item.type)) errors.push("Missing type.");
    if (!safeText(item.classification)) errors.push("Missing classification.");
    if (!safeText(item.title?.en) && !safeText(item.title?.ar)) errors.push("Missing title.");
    if (!safeText(item.summary?.en) && !safeText(item.summary?.ar)) errors.push("Missing summary.");
    if (!safeText(item.body?.en) && !safeText(item.body?.ar)) errors.push("Missing body.");
    if (!safeText(item.publishedAt)) errors.push("Missing publishedAt.");

    return {
      valid: errors.length === 0,
      errors
    };
  }

  return {
    CONFIG,
    createPublication,
    createPolicyPaper,
    createStudy,
    createReport,
    createBrief,
    validatePublication
  };
})();
