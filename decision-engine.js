// IBSS DECISION ENGINE — Σ-9X Doctrine Authority Layer
// Version: v4.0 Full Doctrine Decision Override
// Clean replacement for decision-engine.js

window.IBSS_DECISION_ENGINE = (function () {
  "use strict";

  const VERSION = "v4.0-doctrine-authority";

  const STATE = {
    installed: false,
    originalApi: null,
    lastDecision: null
  };

  function safeNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function safeText(value, fallback = "") {
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function clone(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      console.error("IBSS_DECISION_ENGINE clone error:", error);
      return null;
    }
  }

  function getLocalizedText(value, lang = "en") {
    if (!value) return "-";
    if (typeof value === "string" || typeof value === "number") return String(value);

    return (
      value?.[lang] ||
      value?.en ||
      value?.ar ||
      value?.name ||
      value?.title ||
      value?.label ||
      value?.text ||
      "-"
    );
  }

  function normalizeId(value) {
    return String(value || "")
      .toUpperCase()
      .replace(/\s+/g, "_")
      .trim();
  }

  function normalizeLevel(score) {
    const n = safeNumber(score, 0);
    if (n >= 85) return "CRITICAL";
    if (n >= 70) return "HIGH";
    if (n >= 55) return "MEDIUM";
    if (n >= 35) return "WATCH";
    return "LOW";
  }

  function extractTopDoctrine(system) {
    const top =
      system?.topDoctrineSeries ||
      system?.doctrine?.topSeries ||
      null;

    if (!top) return null;

    const series = top.series || top;

    return {
      id: normalizeId(series.id || top.id),
      layer: safeText(series.layer || top.layer, "UNKNOWN"),
      name: series.name || top.name || { en: "-", ar: "-" },
      question: series.question || top.question || { en: "-", ar: "-" },
      count: safeNumber(top.count ?? top.signalCount, 0),
      maxAlert: safeNumber(top.maxAlert ?? top.alertScore ?? top.score, 0),
      avgAlert: safeNumber(top.avgAlert ?? top.averageAlert, 0),
      raw: top
    };
  }

  function baseDecision(systemPressure, confidenceScore) {
    if (systemPressure >= 90 && confidenceScore >= 78) {
      return {
        decision: "ACT",
        mode: "ACTIVE RESPONSE",
        authority: "SYSTEM_PRESSURE"
      };
    }

    if (systemPressure >= 78) {
      return {
        decision: "PRD",
        mode: "PREPARATION",
        authority: "SYSTEM_PRESSURE"
      };
    }

    if (systemPressure >= 55) {
      return {
        decision: "WATCH+",
        mode: "HEIGHTENED MONITORING",
        authority: "SYSTEM_PRESSURE"
      };
    }

    return {
      decision: "WATCH",
      mode: "MONITORING",
      authority: "SYSTEM_PRESSURE"
    };
  }

  function doctrineDecision(topDoctrine, system) {
    const pressure = safeNumber(system?.systemPressure ?? system?.ssi, 0);
    const confidence = safeNumber(system?.confidenceScore, 0);
    const l3Pressure = safeNumber(system?.l3?.l3Pressure, 0);

    if (!topDoctrine) {
      return {
        active: false,
        decision: null,
        mode: null,
        doctrineDecision: "NO_DOCTRINE",
        reason: "No active doctrine series detected.",
        priority: 0
      };
    }

    const id = topDoctrine.id;
    const alert = safeNumber(topDoctrine.maxAlert, 0);
    const count = safeNumber(topDoctrine.count, 0);

    let result = {
      active: false,
      decision: null,
      mode: null,
      doctrineDecision: "OBSERVE",
      reason: "Doctrine observed but no override threshold reached.",
      priority: 0
    };

    if (id === "BLACK_GATE" && alert >= 70) {
      result = {
        active: true,
        decision: pressure >= 82 || l3Pressure >= 80 ? "ACT" : "PRD",
        mode: pressure >= 82 || l3Pressure >= 80 ? "BLACK GATE ACTIVE" : "BLACK GATE PREPARATION",
        doctrineDecision: "PREPARE_GATE",
        reason: "Black Gate indicates transition from deterrence toward action.",
        priority: 95
      };
    }

    else if (id === "SHOCK_ARCHITECTURE" && alert >= 70) {
      result = {
        active: true,
        decision: pressure >= 85 ? "PRD" : "WATCH+",
        mode: "SHOCK CONTAINMENT",
        doctrineDecision: "CONTAIN_SHOCK",
        reason: "Shock Architecture requires containment before escalation reading.",
        priority: 86
      };
    }

    else if (id === "BEHIND_CURTAIN" && alert >= 60) {
      result = {
        active: true,
        decision: pressure >= 78 ? "PRD" : "WATCH+",
        mode: "CONTROLLED LEAK MONITORING",
        doctrineDecision: "READ_BEHIND_CURTAIN",
        reason: "Behind the Curtain indicates managed disclosure or controlled leak.",
        priority: 78
      };
    }

    else if (id === "INVISIBLE_INK" && alert >= 60) {
      result = {
        active: true,
        decision: pressure >= 70 ? "PRD" : "WATCH+",
        mode: "MESSAGE DECODING",
        doctrineDecision: "DECODE_SIGNAL",
        reason: "Invisible Ink indicates hidden message inside public language.",
        priority: 76
      };
    }

    else if (id === "BLACK_BOX" && alert >= 65) {
      result = {
        active: true,
        decision: "WATCH+",
        mode: "HIDDEN DECISION TRACE",
        doctrineDecision: "TRACE_HIDDEN_DECISION",
        reason: "Black Box indicates visible result with unclear decision source.",
        priority: 74
      };
    }

    else if (id === "BEYOND_WALL" && alert >= 55) {
      result = {
        active: true,
        decision: pressure >= 75 ? "PRD" : "WATCH+",
        mode: "STRUCTURAL FORECASTING",
        doctrineDecision: "FORECAST_STRUCTURE",
        reason: "Beyond the Wall indicates structural forecasting rather than direct news reading.",
        priority: 70
      };
    }

    else if (id === "IRAN_NUCLEAR_THRESHOLD" && alert >= 60) {
      result = {
        active: true,
        decision: pressure >= 78 ? "PRD" : "WATCH+",
        mode: "NUCLEAR THRESHOLD MONITORING",
        doctrineDecision: "MONITOR_NUCLEAR_THRESHOLD",
        reason: "Iran Nuclear Threshold elevates strategic sensitivity of the signal.",
        priority: 82
      };
    }

    else if (id === "GAZA_RESTRUCTURING" && alert >= 60) {
      result = {
        active: true,
        decision: pressure >= 75 ? "PRD" : "WATCH+",
        mode: "GAZA RESTRUCTURING TRACK",
        doctrineDecision: "TRACK_GAZA_RESTRUCTURING",
        reason: "Gaza Restructuring indicates post-war control architecture.",
        priority: 80
      };
    }

    else if (id === "NORTHERN_PRESSURE" && alert >= 60) {
      result = {
        active: true,
        decision: pressure >= 75 ? "PRD" : "WATCH+",
        mode: "NORTHERN PRESSURE WATCH",
        doctrineDecision: "TRACK_NORTHERN_PRESSURE",
        reason: "Northern Pressure indicates controlled or escaping escalation on the northern front.",
        priority: 79
      };
    }

    else if (id === "TEMPORAL_WARFARE" && alert >= 55) {
      result = {
        active: true,
        decision: "WATCH+",
        mode: "TEMPORAL WARFARE TRACK",
        doctrineDecision: "TRACK_TIME_PRESSURE",
        reason: "Temporal Warfare indicates time is being used as an instrument of pressure.",
        priority: 68
      };
    }

    else if (id === "WAAD" && alert >= 55) {
      result = {
        active: true,
        decision: "WATCH+",
        mode: "WAR ACCEPTANCE ARCHITECTURE",
        doctrineDecision: "TRACK_WAR_ACCEPTANCE",
        reason: "WAAD indicates preparation of perception before action.",
        priority: 72
      };
    }

    else if (id === "INFORMATION_WARFARE" && alert >= 55) {
      result = {
        active: true,
        decision: "WATCH+",
        mode: "INFORMATION WARFARE TRACK",
        doctrineDecision: "TRACK_NARRATIVE",
        reason: "Information Warfare indicates narrative control pressure.",
        priority: 66
      };
    }

    else if (id === "STRATEGIC_REFRAMING" && alert >= 55) {
      result = {
        active: true,
        decision: pressure >= 70 ? "PRD" : "WATCH+",
        mode: "STRATEGIC REFRAMING",
        doctrineDecision: "TRACK_REFRAMING",
        reason: "Strategic Reframing indicates changing definition of victory or objective.",
        priority: 73
      };
    }

    else if (id === "REGIONAL_RECONSTRUCTION" && alert >= 55) {
      result = {
        active: true,
        decision: pressure >= 70 ? "PRD" : "WATCH+",
        mode: "REGIONAL RECONSTRUCTION TRACK",
        doctrineDecision: "TRACK_REGIONAL_ORDER",
        reason: "Regional Reconstruction indicates redesign of regional order.",
        priority: 75
      };
    }

    if (l3Pressure >= 85 && alert >= 70) {
      result = {
        active: true,
        decision: "ACT",
        mode: "DOCTRINE-L3 CONVERGENCE",
        doctrineDecision: "CONVERGENCE_RESPONSE",
        reason: "L3 pressure and doctrine alert converged above activation threshold.",
        priority: 100
      };
    }

    if (confidence < 45 && result.decision === "ACT") {
      result = {
        ...result,
        decision: "PRD",
        mode: `${result.mode} — CONFIDENCE LIMITED`,
        doctrineDecision: `${result.doctrineDecision}_LIMITED`,
        reason: `${result.reason} Confidence is below activation reliability threshold.`,
        priority: Math.max(0, result.priority - 10)
      };
    }

    if (count >= 3 && alert >= 60 && !result.active) {
      result = {
        active: true,
        decision: "WATCH+",
        mode: "DOCTRINE CONCENTRATION WATCH",
        doctrineDecision: "TRACK_SERIES_CONCENTRATION",
        reason: "Multiple signals are concentrated under one doctrine series.",
        priority: 64
      };
    }

    return result;
  }

  function buildDecisionTrace(system, topDoctrine, base, doctrine) {
    return {
      version: VERSION,
      createdAt: new Date().toISOString(),
      baseDecision: base.decision,
      baseMode: base.mode,
      finalDecision: doctrine.active ? doctrine.decision : base.decision,
      finalMode: doctrine.active ? doctrine.mode : base.mode,
      doctrineOverride: doctrine.active,
      doctrineDecision: doctrine.doctrineDecision,
      doctrineId: topDoctrine?.id || null,
      doctrineName: topDoctrine?.name || null,
      doctrineAlert: topDoctrine?.maxAlert || 0,
      doctrineReason: doctrine.reason,
      doctrinePriority: doctrine.priority,
      systemPressure: safeNumber(system?.systemPressure ?? system?.ssi, 0),
      confidenceScore: safeNumber(system?.confidenceScore, 0),
      l3Pressure: safeNumber(system?.l3?.l3Pressure, 0)
    };
  }

  function buildDecisionFeedItem(trace) {
    return {
      id: `DECISION-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
      type: "doctrine_decision",
      priority: trace.doctrineOverride ? "HIGH" : "MEDIUM",
      source: "Σ-9X DECISION ENGINE",
      createdAt: new Date().toISOString(),
      text: {
        en: trace.doctrineOverride
          ? `Doctrine override active: ${getLocalizedText(trace.doctrineName, "en")} → ${trace.finalMode}`
          : `Decision engine monitoring: ${trace.finalMode}`,
        ar: trace.doctrineOverride
          ? `تم تفعيل تجاوز عقائدي: ${getLocalizedText(trace.doctrineName, "ar")} ← ${trace.finalMode}`
          : `محرك القرار في وضع المراقبة: ${trace.finalMode}`
      }
    };
  }

  function applyDecisionLayer(system) {
    if (!system || typeof system !== "object") return system;

    const enhanced = clone(system) || system;

    const pressure = safeNumber(enhanced.systemPressure ?? enhanced.ssi, 0);
    const confidence = safeNumber(enhanced.confidenceScore, 0);

    const topDoctrine = extractTopDoctrine(enhanced);
    const base = baseDecision(pressure, confidence);
    const doctrine = doctrineDecision(topDoctrine, enhanced);
    const trace = buildDecisionTrace(enhanced, topDoctrine, base, doctrine);

    enhanced.baseDecision = base.decision;
    enhanced.baseMode = base.mode;

    enhanced.decision = trace.finalDecision;
    enhanced.mode = trace.finalMode;

    enhanced.doctrineDecision = trace.doctrineDecision;
    enhanced.doctrineOverride = trace.doctrineOverride;
    enhanced.doctrineDecisionId = trace.doctrineId;
    enhanced.doctrineDecisionAlert = trace.doctrineAlert;
    enhanced.doctrineDecisionReason = trace.doctrineReason;
    enhanced.doctrineDecisionPriority = trace.doctrinePriority;
    enhanced.decisionTrace = trace;

    enhanced.decisionEngineVersion = VERSION;

    if (enhanced.presence && trace.doctrineOverride) {
      enhanced.presence = {
        ...enhanced.presence,
        doctrineOverride: true,
        doctrineMode: trace.finalMode
      };
    }

    if (enhanced.voice && trace.doctrineOverride) {
      const enLine = `Doctrine override active under ${getLocalizedText(trace.doctrineName, "en")}. ${trace.doctrineReason}`;
      const arLine = `تم تفعيل تجاوز عقائدي ضمن ${getLocalizedText(trace.doctrineName, "ar")}. ${trace.doctrineReason}`;

      enhanced.voice = {
        ...enhanced.voice,
        advisory: {
          en: `${getLocalizedText(enhanced.voice.advisory, "en")}\n${enLine}`,
          ar: `${getLocalizedText(enhanced.voice.advisory, "ar")}\n${arLine}`
        }
      };
    }

    const feed = asArray(enhanced.feed);
    const decisionItem = buildDecisionFeedItem(trace);

    enhanced.feed = [
      decisionItem,
      ...feed.filter(item => item?.type !== "doctrine_decision")
    ].slice(0, 14);

    STATE.lastDecision = trace;

    return enhanced;
  }

  function getLastDecision() {
    return clone(STATE.lastDecision);
  }

  function evaluate(system) {
    return applyDecisionLayer(system);
  }

  function install() {
    if (STATE.installed) return true;

    if (!window.IBSS_ENGINE) {
      console.warn("IBSS_DECISION_ENGINE install skipped: IBSS_ENGINE not found.");
      return false;
    }

    const original = {
      getSystemState: window.IBSS_ENGINE.getSystemState?.bind(window.IBSS_ENGINE),
      getStaticSystemFallback: window.IBSS_ENGINE.getStaticSystemFallback?.bind(window.IBSS_ENGINE),
      getLastSystemState: window.IBSS_ENGINE.getLastSystemState?.bind(window.IBSS_ENGINE),
      getHomeSnapshot: window.IBSS_ENGINE.getHomeSnapshot?.bind(window.IBSS_ENGINE)
    };

    STATE.originalApi = original;

    if (original.getSystemState) {
      window.IBSS_ENGINE.getSystemState = function () {
        const system = original.getSystemState();
        return applyDecisionLayer(system);
      };
    }

    if (original.getStaticSystemFallback) {
      window.IBSS_ENGINE.getStaticSystemFallback = function () {
        const system = original.getStaticSystemFallback();
        return applyDecisionLayer(system);
      };
    }

    if (original.getLastSystemState) {
      window.IBSS_ENGINE.getLastSystemState = function () {
        const system = original.getLastSystemState();
        return applyDecisionLayer(system);
      };
    }

    if (original.getHomeSnapshot) {
      window.IBSS_ENGINE.getHomeSnapshot = function () {
        const snapshot = original.getHomeSnapshot();
        const latest = original.getLastSystemState ? applyDecisionLayer(original.getLastSystemState()) : null;

        if (!latest) return snapshot;

        return {
          ...(snapshot || {}),
          doctrineDecision: latest.doctrineDecision,
          doctrineOverride: latest.doctrineOverride,
          doctrineDecisionId: latest.doctrineDecisionId,
          doctrineDecisionAlert: latest.doctrineDecisionAlert,
          decisionTrace: latest.decisionTrace
        };
      };
    }

    window.IBSS_ENGINE.getDecisionTrace = function () {
      return getLastDecision();
    };

    window.IBSS_ENGINE.evaluateDecision = function (system) {
      return applyDecisionLayer(system);
    };

    STATE.installed = true;
    console.log("IBSS_DECISION_ENGINE installed:", VERSION);

    return true;
  }

  function uninstall() {
    if (!STATE.installed || !STATE.originalApi || !window.IBSS_ENGINE) return false;

    if (STATE.originalApi.getSystemState) {
      window.IBSS_ENGINE.getSystemState = STATE.originalApi.getSystemState;
    }

    if (STATE.originalApi.getStaticSystemFallback) {
      window.IBSS_ENGINE.getStaticSystemFallback = STATE.originalApi.getStaticSystemFallback;
    }

    if (STATE.originalApi.getLastSystemState) {
      window.IBSS_ENGINE.getLastSystemState = STATE.originalApi.getLastSystemState;
    }

    if (STATE.originalApi.getHomeSnapshot) {
      window.IBSS_ENGINE.getHomeSnapshot = STATE.originalApi.getHomeSnapshot;
    }

    STATE.installed = false;
    return true;
  }

  setTimeout(function () {
    install();
  }, 0);

  return {
    VERSION,
    install,
    uninstall,
    evaluate,
    applyDecisionLayer,
    getLastDecision
  };
})();
