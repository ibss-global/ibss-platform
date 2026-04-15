window.IBSS_SCENARIO = (function () {
  "use strict";

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function buildScenarioPack(input) {
    const systemPressure = Number(input?.systemPressure || 0);
    const newsPressure = Number(input?.newsPressure || 0);
    const topClusterIntensity = Number(input?.topClusterIntensity || 0);
    const liveSignals = Number(input?.liveSignals || 0);

    const escalation =
      (systemPressure * 0.4) +
      (newsPressure * 0.25) +
      (topClusterIntensity * 0.2) +
      (liveSignals * 1.5);

    const stabilized =
      100 - escalation;

    let scenarioA = clamp(Math.round(escalation * 0.65), 10, 80);
    let scenarioB = clamp(Math.round((100 - Math.abs(50 - escalation)) * 0.42), 10, 60);
    let scenarioC = clamp(100 - scenarioA - scenarioB, 5, 70);

    const total = scenarioA + scenarioB + scenarioC;

    scenarioA = Math.round((scenarioA / total) * 100);
    scenarioB = Math.round((scenarioB / total) * 100);
    scenarioC = 100 - scenarioA - scenarioB;

    let dominant = "C";
    if (scenarioA >= scenarioB && scenarioA >= scenarioC) dominant = "A";
    else if (scenarioB >= scenarioA && scenarioB >= scenarioC) dominant = "B";

    return {
      dominant,
      scenarios: [
        { key: "A", value: scenarioA, label: "Escalation" },
        { key: "B", value: scenarioB, label: "Managed Pressure" },
        { key: "C", value: scenarioC, label: "Containment" }
      ]
    };
  }

  return {
    buildScenarioPack
  };
})();
