// IBSS FACEBOOK PUBLISHER LAYER — Clean Bridge // Version: v1.0 Manual Review Mode

window.IBSS_FACEBOOK = (function () { "use strict";

const CONFIG = { storageKey: "ibss_facebook_publisher_v1", maxDrafts: 120, maxPublished: 200 };

const STATE = { initialized: false, drafts: [], published: [], connection: { status: "disconnected", // disconnected | connected pageName: "", pageId: "" } };

/* ============================= Utilities ============================= */

function nowIso() { return new Date().toISOString(); }

function clone(v) { try { return JSON.parse(JSON.stringify(v)); } catch { return null; } }

function safeText(v, f = "") { return typeof v === "string" && v.trim() ? v.trim() : f; }

function asArray(v) { return Array.isArray(v) ? v : []; }

function buildId(prefix = "FB") { return ${prefix}-${Date.now()}-${Math.floor(Math.random()*10000)}; }

/* ============================= Storage ============================= */

function load() { try { const raw = localStorage.getItem(CONFIG.storageKey); if (!raw) return; const p = JSON.parse(raw); STATE.drafts = asArray(p.drafts); STATE.published = asArray(p.published); STATE.connection = p.connection || STATE.connection; } catch (e) { console.error("FB load error", e); } }

function save() { try { localStorage.setItem(CONFIG.storageKey, JSON.stringify({ drafts: STATE.drafts, published: STATE.published, connection: STATE.connection })); } catch (e) { console.error("FB save error", e); } }

function init() { if (STATE.initialized) return; load(); STATE.initialized = true; }

/* ============================= Draft Builder ============================= */

function createDraft(type, payload) { init();

const draft = {
  id: buildId("FBPOST"),
  type,
  createdAt: nowIso(),
  status: "draft",
  payload
};

STATE.drafts.unshift(draft);
if (STATE.drafts.length > CONFIG.maxDrafts) {
  STATE.drafts = STATE.drafts.slice(0, CONFIG.maxDrafts);
}

save();
return clone(draft);

}

/* ============================= Generators from IBSS ============================= */

function generateFromTopSignal() { const post = window.IBSS_PUBLISHER?.generateTopSignalPost?.(); if (!post) return null;

return createDraft("signal", post.payload);

}

function generateStrategicBrief() { const post = window.IBSS_PUBLISHER?.generateStrategicBrief?.(); if (!post) return null;

return createDraft("brief", post.payload);

}

function generateFeaturedPublication() { const post = window.IBSS_PUBLISHER?.generateFeaturedPublicationPost?.(); if (!post) return null;

return createDraft("publication", post.payload);

}

function generateLinkedPublication(signal) { const post = window.IBSS_PUBLISHER?.generateLinkedPublicationPost?.(signal); if (!post) return null;

return createDraft("linked_publication", post.payload);

}

function generateCustom(text_en, text_ar) { return createDraft("custom", { text_en: safeText(text_en, "-"), text_ar: safeText(text_ar, text_en || "-") }); }

/* ============================= Publish (Manual Mode) ============================= */

function markAsPublished(id) { init();

const i = STATE.drafts.findIndex(d => d.id === id);
if (i === -1) return null;

const post = {
  ...STATE.drafts[i],
  status: "published",
  publishedAt: nowIso()
};

STATE.drafts.splice(i, 1);
STATE.published.unshift(post);

if (STATE.published.length > CONFIG.maxPublished) {
  STATE.published = STATE.published.slice(0, CONFIG.maxPublished);
}

save();
return clone(post);

}

function removeDraft(id) { init(); STATE.drafts = STATE.drafts.filter(d => d.id !== id); save(); }

/* ============================= Connection (Phase B ready) ============================= */

function connect(pageName, pageId) { init();

STATE.connection = {
  status: "connected",
  pageName: safeText(pageName, "IBSS Page"),
  pageId: safeText(pageId, "unknown")
};

save();
return clone(STATE.connection);

}

function disconnect() { init();

STATE.connection = {
  status: "disconnected",
  pageName: "",
  pageId: ""
};

save();

}

/* ============================= Readers ============================= */

function getDrafts() { init(); return clone(STATE.drafts); }

function getPublished() { init(); return clone(STATE.published); }

function getConnection() { init(); return clone(STATE.connection); }

return { generateFromTopSignal, generateStrategicBrief, generateFeaturedPublication, generateLinkedPublication, generateCustom,

markAsPublished,
removeDraft,

getDrafts,
getPublished,

connect,
disconnect,
getConnection

}; })();
