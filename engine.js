// IBSS ENGINE — CLEAN STABLE VERSION

(function () {
  "use strict";

  function safe(val, fallback = "-") {
    return val !== undefined && val !== null && val !== "" ? val : fallback;
  }

  function getSignals() {
    return Array.isArray(window.IBSS_SIGNALS) ? window.IBSS_SIGNALS : [];
  }

  function getPriority(signal) {
    return safe(signal?.reportMeta?.priority, signal?.weight || "LOW");
  }

  function scoreSignal(signal) {
    const metrics = signal?.metrics || {};

    const weight = Number(metrics.weight) || 0;
    const volatility = Number(metrics.volatility) || 0;
    const impact = Number(metrics.impact) || 0;

    let priorityBoost = 0;
    const priority = getPriority(signal);

    if (priority === "HIGH") priorityBoost = 0.04;
    else if (priority === "MEDIUM") priorityBoost = 0.02;

    const rawScore =
      (weight * 0.5) +
      (volatility * 0.3) +
      (impact * 0.2) +
      priorityBoost;

    return Math.min(rawScore, 0.95);
  }

  function getScore100(signal) {
    return Math.round(scoreSignal(signal) * 100);
  }

  function buildSystem() {
    const signals = getSignals();

    const rankedSignals = [...signals]
      .map(signal => ({
        ...signal,
        score: scoreSignal(signal),
        score100: getScore100(signal),
        priority: getPriority(signal)
      }))
      .sort((a, b) => b.score - a.score);

    const topSignal = rankedSignals[0] || null;
    const secondSignal = rankedSignals[1] || null;

    const avgScore = rankedSignals.length
      ? rankedSignals.reduce((sum, signal) => sum + signal.score, 0) / rankedSignals.length
      : 0;

    const activeSignals = rankedSignals.filter(signal => signal.live === true || signal.active === true);
    const highSignals = rankedSignals.filter(signal => signal.priority === "HIGH");

    let systemPressure = Math.round(avgScore * 100);

    if (topSignal?.priority === "HIGH") {
      systemPressure += 4;
    } else if (topSignal?.priority === "MEDIUM") {
      systemPressure += 2;
    }

    systemPressure = Math.min(systemPressure, 95);

    return {
      systemPressure,
      topSignal,
      secondSignal,
      rankedSignals,
      activeSignals,
      highSignals,
      timestamp: Date.now()
    };
  }

  function setLevel(system) {
    const levelEl = document.getElementById("level");
    const ssiEl = document.getElementById("ssi");
    const alertBox = document.getElementById("alertBox");

    if (!levelEl || !ssiEl || !alertBox) return "LOW";

    const pressure = Number(system.systemPressure) || 0;

    let level = "LOW";
    if (pressure >= 75) level = "HIGH";
    else if (pressure >= 50) level = "MEDIUM";

    levelEl.textContent = level;
    ssiEl.textContent = pressure;

    levelEl.className = "value " + level.toLowerCase();
    ssiEl.className = "value " + level.toLowerCase();

    if (level === "HIGH") {
      alertBox.style.display = "block";
      alertBox.textContent = "⚠ HIGH ESCALATION — ACTIVE RESPONSE";
    } else if (level === "MEDIUM") {
      alertBox.style.display = "block";
      alertBox.textContent = "⚠ STRUCTURED PRESSURE — PREPARATION MODE";
    } else {
      alertBox.style.display = "block";
      alertBox.textContent = "✓ LOW PRESSURE — MONITORING STABLE";
    }

    return level;
  }

  function setDecision(system, level) {
    const decisionEl = document.getElementById("decision");
    const decisionWord = document.getElementById("decisionWord");
    const decisionNote = document.getElementById("decisionNote");
    const modeEl = document.getElementById("mode");

    if (!decisionEl || !decisionWord || !decisionNote || !modeEl) return;

    let decision = "WATCH";
    let note = "Low pressure. Continue monitoring.";
    let mode = "MONITORING";

    if (level === "HIGH") {
      decision = "ACT";
      note = "High pressure environment detected. Immediate response required.";
      mode = "ACTIVE RESPONSE";
    } else if (level === "MEDIUM") {
      decision = "PRD";
      note = "Structured pressure detected. Maintain preparation readiness.";
      mode = "PREPARATION";
    }

    decisionEl.textContent = decision;
    decisionWord.textContent = decision;
    decisionNote.textContent = note;
    modeEl.textContent = mode;
  }

  function setPrimarySignal(system) {
    const titleEl = document.getElementById("signalTitle");
    const descEl = document.getElementById("signalDesc");

    if (!titleEl || !descEl) return;

    const signal = system.topSignal;

    if (!signal) {
      titleEl.textContent = "-";
      descEl.textContent = "-";
      return;
    }

    titleEl.textContent = safe(signal.title?.en || signal.title);
    descEl.textContent = safe(signal.description?.en || signal.description);
  }

  function priorityClass(priority) {
    if (priority === "HIGH") return "high";
    if (priority === "MEDIUM") return "medium";
    return "low";
  }

  function renderRadar(system) {
    const radar = document.getElementById("radar");
    const legend = document.getElementById("radarLegend");

    if (!radar || !legend) return;

    radar.querySelectorAll(".radar-signal").forEach(el => el.remove());

    const signals = (system.rankedSignals || []).slice(0, 5);

    const positions = [
      { x: 50, y: 18 },
      { x: 78, y: 38 },
      { x: 68, y: 72 },
      { x: 28, y: 68 },
      { x: 18, y: 45 }
    ];

    signals.forEach((signal, index) => {
      const dot = document.createElement("div");
      const pos = positions[index] || { x: 50, y: 50 };

      const size = Math.max(10, Math.min(24, Math.round(signal.score * 24)));
      const cls = priorityClass(signal.priority);

      dot.className = "radar-signal " + cls + (index === 0 ? " dominant" : "");
      dot.style.width = size + "px";
      dot.style.height = size + "px";
      dot.style.left = pos.x + "%";
      dot.style.top = pos.y + "%";

      radar.appendChild(dot);
    });

    legend.innerHTML = signals.map((signal, index) => `
      <div class="legend-item">
        <div class="legend-left">
          <span class="legend-dot ${priorityClass(signal.priority)}"></span>
          <span class="legend-name">${safe(signal.title?.en || signal.title)}</span>
        </div>
        <div class="legend-meta">${signal.score100}</div>
      </div>
    `).join("");
  }

  function setFeed(system) {
    const feed = document.getElementById("feed");
    if (!feed) return;

    const signals = system.rankedSignals || [];

    const lines = [
      "• Pressure index updated to " + safe(system.systemPressure, 0),
      "• Decision driven by engine",
      "• Ranked signal matrix synchronized",
      "• Primary file now drives system posture"
    ];

    signals.slice(0, 5).forEach(signal => {
      const title = safe(signal.title?.en || signal.title);
      const mode = safe(signal.decisionMode?.en || signal.decisionMode);
      lines.push(`• ${title} — ${mode}`);
    });

    feed.innerHTML = lines.map(line => `<div class="feed-item">${line}</div>`).join("");
  }

  function render() {
    try {
      const system = buildSystem();
      const level = setLevel(system);
      setDecision(system, level);
      setPrimarySignal(system);
      renderRadar(system);
      setFeed(system);
    } catch (e) {
      console.error("Render error:", e);
    }
  }

  window.IBSS_ENGINE = {
    getCurrentState: buildSystem,
    render
  };

  window.addEventListener("load", () => {
    render();
    setInterval(render, 3000);
  });
})();
