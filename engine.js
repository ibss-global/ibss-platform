// IBSS ENGINE — FINAL VERSION (Dashboard Compatible)

(function () {
  "use strict";

  function safe(val, fallback = "-") {
    return (val !== undefined && val !== null && val !== "") ? val : fallback;
  }

  function getSignals() {
    return Array.isArray(window.IBSS_SIGNALS) ? window.IBSS_SIGNALS : [];
  }

  function scoreSignal(signal) {
    const metrics = signal?.metrics || {};
    const weight = Number(metrics.weight || 0);
    const volatility = Number(metrics.volatility || 0);
    const impact = Number(metrics.impact || 0);

    let priorityBoost = 0;
    if (signal?.priority === "HIGH") priorityBoost = 0.08;
    else if (signal?.priority === "MEDIUM") priorityBoost = 0.04;

    return Math.min(
      ((weight * 0.5) + (volatility * 0.25) + (impact * 0.25) + priorityBoost),
      1
    );
  }

  function buildSystem() {
    const signals = getSignals();

    const rankedSignals = [...signals]
      .map(signal => ({
        ...signal,
        score: scoreSignal(signal)
      }))
      .sort((a, b) => b.score - a.score);

    const topSignal = rankedSignals[0] || null;

    const avgScore = rankedSignals.length
      ? rankedSignals.reduce((sum, signal) => sum + signal.score, 0) / rankedSignals.length
      : 0;

    const activeSignals = rankedSignals.filter(signal => signal.active || signal.live).length;

    let systemPressure = Math.round(
      Math.min(
        (avgScore * 55) +
        ((topSignal?.score || 0) * 25) +
        Math.min(activeSignals, 10),
        100
      )
    );

    if (topSignal?.priority === "HIGH") {
      systemPressure = Math.min(systemPressure + 9, 100);
    } else if (topSignal?.priority === "MEDIUM") {
      systemPressure = Math.min(systemPressure + 5, 100);
    }

    return {
      systemPressure,
      topSignal,
      rankedSignals
    };
  }

  function setLevel(system) {
    const levelEl = document.getElementById("level");
    const ssiEl = document.getElementById("ssi");
    const alertBox = document.getElementById("alertBox");

    if (!levelEl || !ssiEl || !alertBox) return "LOW";

    const pressure = system.systemPressure || 0;

    let level = "LOW";
    if (pressure >= 70) level = "HIGH";
    else if (pressure >= 40) level = "MEDIUM";

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
      alertBox.style.display = "none";
      alertBox.textContent = "";
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

    radar.querySelectorAll(".radar-signal").forEach(e => e.remove());

    const signals = system.rankedSignals || [];

    signals.forEach(signal => {
      if (!signal.metrics) return;

      const dot = document.createElement("div");

      const size = signal.priority === "HIGH" ? 14 : signal.priority === "MEDIUM" ? 10 : 8;
      const x = 20 + ((Number(signal.metrics.volatility || 0)) * 60);
      const y = 20 + ((Number(signal.metrics.impact || 0)) * 60);

      dot.className = "radar-signal " + priorityClass(signal.priority);
      dot.style.width = size + "px";
      dot.style.height = size + "px";
      dot.style.left = x + "%";
      dot.style.top = y + "%";

      radar.appendChild(dot);
    });

    legend.innerHTML = signals.map(signal => `
      <div class="legend-item">
        <div class="legend-left">
          <span class="legend-dot ${priorityClass(signal.priority)}"></span>
          <span class="legend-name">${safe(signal.title?.en || signal.title)}</span>
        </div>
        <div class="legend-meta">${safe(signal.signalType?.en || signal.signalType)}</div>
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
      "• Escalation memory active",
      "• Decision lock engaged"
    ];

    signals.forEach(signal => {
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

  window.addEventListener("load", () => {
    render();
    setInterval(render, 3000);
  });
})();
