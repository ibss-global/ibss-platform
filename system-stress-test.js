window.IBSS_STRESS_TEST = (function () {
  "use strict";

  const CONFIG = {
    version: "IBSS_STRESS_TEST_V1",
    ingestionBatchSize: 40,
    ingestionBursts: 5,
    engineCycles: 12,
    runtimeCycles: 6,
    publisherCycles: 6,
    delayMs: 120,
    reportStorageKey: "ibss_stress_test_report_v1"
  };

  const STATE = {
    startedAt: null,
    finishedAt: null,
    report: null,
    logs: []
  };

  function nowIso() {
    return new Date().toISOString();
  }

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
    return JSON.parse(JSON.stringify(value));
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function log(step, status, details = {}) {
    const entry = {
      at: nowIso(),
      step,
      status,
      details
    };

    STATE.logs.push(entry);

    if (status === "fail") {
      console.error("[IBSS_STRESS_TEST]", step, details);
    } else {
      console.log("[IBSS_STRESS_TEST]", step, details);
    }

    return entry;
  }

  function saveReport(report) {
    try {
      localStorage.setItem(CONFIG.reportStorageKey, JSON.stringify(report));
    } catch (error) {
      console.error("IBSS_STRESS_TEST saveReport error:", error);
    }
  }

  function getLastReport() {
    try {
      const raw = localStorage.getItem(CONFIG.reportStorageKey);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (error) {
      console.error("IBSS_STRESS_TEST getLastReport error:", error);
      return null;
    }
  }

  function buildSyntheticItem(index, burstIndex) {
    const severity = (index % 3 === 0) ? "HIGH" : (index % 3 === 1 ? "MEDIUM" : "LOW");
    const regionList = ["levant", "gulf", "red sea", "europe", "global"];
    const domainList = ["military", "security", "economic", "diplomatic", "energy"];
    const countryList = ["israel", "iran", "lebanon", "egypt", "global"];

    const region = regionList[index % regionList.length];
    const domain = domainList[index % domainList.length];
    const country = countryList[index % countryList.length];

    return {
      id: `stress-${burstIndex}-${index}-${Date.now()}`,
      source: "STRESS_TEST_SOURCE",
      title: {
        en: `Stress Signal ${burstIndex}-${index} ${domain}`,
        ar: `إشارة ضغط ${burstIndex}-${index} ${domain}`
      },
      summary: {
        en: `Synthetic ingestion item for stress testing in ${region}.`,
        ar: `عنصر استقبال اصطناعي لاختبار الضغط في ${region}.`
      },
      priority: severity,
      severity: severity === "HIGH" ? 9 : severity === "MEDIUM" ? 6 : 3,
      confidence: 7,
      impact: severity === "HIGH" ? 9 : 6,
      urgency: severity === "HIGH" ? 8 : 5,
      persistence: 5,
      spread: 6,
      domain,
      region,
      country,
      timestamp: nowIso(),
      url: "#",
      tags: ["stress", "synthetic", region, domain]
    };
  }

  function buildSyntheticBatch(size, burstIndex) {
    const items = [];

    for (let i = 0; i < size; i += 1) {
      items.push(buildSyntheticItem(i, burstIndex));
    }

    return items;
  }

  function testEnvironment() {
    const checks = {
      hasIngestion: !!window.IBSS_INGESTION,
      hasEngine: !!window.IBSS_ENGINE,
      hasRuntime: !!window.IBSS_RUNTIME,
      hasPublisher: !!window.IBSS_PUBLISHER,
      hasMetrics: !!window.IBSS_METRICS
    };

    const passed = Object.values(checks).every(Boolean);

    log("environment", passed ? "pass" : "fail", checks);

    return {
      passed,
      checks
    };
  }

  async function runIngestionStress() {
    const result = {
      passed: true,
      bursts: [],
      beforeCount: 0,
      afterCount: 0,
      sourceState: null
    };

    if (!window.IBSS_INGESTION || typeof window.IBSS_INGESTION.injectItems !== "function") {
      result.passed = false;
      log("ingestion-stress", "fail", { reason: "IBSS_INGESTION unavailable" });
      return result;
    }

    const before = asArray(window.IBSS_INGESTION.getAllNormalized?.());
    result.beforeCount = before.length;

    for (let burst = 0; burst < CONFIG.ingestionBursts; burst += 1) {
      try {
        const items = buildSyntheticBatch(CONFIG.ingestionBatchSize, burst);
        const normalized = window.IBSS_INGESTION.injectItems(items, {
          id: `stress-source-${burst}`,
          name: `Stress Source ${burst}`,
          type: "manual"
        });

        const burstInfo = {
          burst,
          injected: items.length,
          normalizedCount: asArray(normalized).length
        };

        result.bursts.push(burstInfo);
        log("ingestion-burst", "pass", burstInfo);
      } catch (error) {
        result.passed = false;
        result.bursts.push({
          burst,
          error: safeText(error?.message, "INGESTION_BURST_FAILED")
        });
        log("ingestion-burst", "fail", {
          burst,
          error: safeText(error?.message, "INGESTION_BURST_FAILED")
        });
      }

      await sleep(CONFIG.delayMs);
    }

    const after = asArray(window.IBSS_INGESTION.getAllNormalized?.());
    result.afterCount = after.length;
    result.sourceState = window.IBSS_INGESTION.getSourceState?.() || null;

    if (result.afterCount <= result.beforeCount) {
      result.passed = false;
      log("ingestion-stress-final", "fail", {
        beforeCount: result.beforeCount,
        afterCount: result.afterCount
      });
    } else {
      log("ingestion-stress-final", "pass", {
        beforeCount: result.beforeCount,
        afterCount: result.afterCount
      });
    }

    return result;
  }

  async function runEngineStress() {
    const result = {
      passed: true,
      cycles: [],
      sourcesSeen: [],
      lastSystem: null
    };

    if (!window.IBSS_ENGINE || typeof window.IBSS_ENGINE.getSystemState !== "function") {
      result.passed = false;
      log("engine-stress", "fail", { reason: "IBSS_ENGINE unavailable" });
      return result;
    }

    const sourceSet = new Set();

    for (let i = 0; i < CONFIG.engineCycles; i += 1) {
      try {
        const system = window.IBSS_ENGINE.getSystemState();

        const cycle = {
          cycle: i + 1,
          source: safeText(system?.source, "unknown"),
          updatedAt: safeText(system?.updatedAt, "-"),
          rankedSignals: asArray(system?.rankedSignals).length,
          unifiedFeed: asArray(system?.unifiedFeed).length,
          feed: asArray(system?.feed).length,
          clusters: asArray(system?.clusters).length,
          theaters: asArray(system?.theaters).length,
          countries: asArray(system?.countryRiskFeed).length,
          reports: asArray(window.IBSS_ENGINE.getReports?.()).length,
          systemPressure: safeNumber(system?.systemPressure, 0),
          level: safeText(system?.level, "LOW")
        };

        result.cycles.push(cycle);
        result.lastSystem = clone(system);
        sourceSet.add(cycle.source);

        const valid =
          cycle.rankedSignals > 0 &&
          cycle.systemPressure >= 0 &&
          cycle.feed >= 0 &&
          cycle.unifiedFeed >= 0;

        if (!valid) {
          result.passed = false;
          log("engine-cycle", "fail", cycle);
        } else {
          log("engine-cycle", "pass", cycle);
        }
      } catch (error) {
        result.passed = false;
        log("engine-cycle", "fail", {
          cycle: i + 1,
          error: safeText(error?.message, "ENGINE_CYCLE_FAILED")
        });
      }

      await sleep(CONFIG.delayMs);
    }

    result.sourcesSeen = [...sourceSet];
    return result;
  }

  async function runPublisherStress() {
    const result = {
      passed: true,
      beforeQueue: 0,
      afterQueue: 0,
      draftsCreated: 0,
      latestDraft: null
    };

    if (!window.IBSS_PUBLISHER) {
      result.passed = false;
      log("publisher-stress", "fail", { reason: "IBSS_PUBLISHER unavailable" });
      return result;
    }

    result.beforeQueue = asArray(window.IBSS_PUBLISHER.getQueue?.()).length;

    for (let i = 0; i < CONFIG.publisherCycles; i += 1) {
      try {
        const a = window.IBSS_PUBLISHER.generateTopSignalPost?.();
        const b = window.IBSS_PUBLISHER.generateStrategicBrief?.();

        if (a) result.draftsCreated += 1;
        if (b) result.draftsCreated += 1;

        log("publisher-cycle", "pass", {
          cycle: i + 1,
          draftsCreated: result.draftsCreated
        });
      } catch (error) {
        result.passed = false;
        log("publisher-cycle", "fail", {
          cycle: i + 1,
          error: safeText(error?.message, "PUBLISHER_CYCLE_FAILED")
        });
      }

      await sleep(CONFIG.delayMs);
    }

    result.afterQueue = asArray(window.IBSS_PUBLISHER.getQueue?.()).length;
    result.latestDraft = window.IBSS_PUBLISHER.getLatestDraft?.() || null;

    if (result.afterQueue <= result.beforeQueue) {
      result.passed = false;
      log("publisher-stress-final", "fail", {
        beforeQueue: result.beforeQueue,
        afterQueue: result.afterQueue
      });
    } else {
      log("publisher-stress-final", "pass", {
        beforeQueue: result.beforeQueue,
        afterQueue: result.afterQueue
      });
    }

    return result;
  }

  async function runRuntimeStress() {
    const result = {
      passed: true,
      cycles: [],
      tickerFound: false,
      tickerItems: 0
    };

    if (!window.IBSS_RUNTIME) {
      result.passed = false;
      log("runtime-stress", "fail", { reason: "IBSS_RUNTIME unavailable" });
      return result;
    }

    for (let i = 0; i < CONFIG.runtimeCycles; i += 1) {
      try {
        window.IBSS_RUNTIME.tick?.();

        const track = document.getElementById("tickerTrack");
        const tickerItems = track ? track.querySelectorAll(".ticker-item").length : 0;

        const cycle = {
          cycle: i + 1,
          tickerExists: !!track,
          tickerItems
        };

        result.cycles.push(cycle);
        result.tickerFound = result.tickerFound || !!track;
        result.tickerItems = Math.max(result.tickerItems, tickerItems);

        if (!track || tickerItems === 0) {
          result.passed = false;
          log("runtime-cycle", "fail", cycle);
        } else {
          log("runtime-cycle", "pass", cycle);
        }
      } catch (error) {
        result.passed = false;
        log("runtime-cycle", "fail", {
          cycle: i + 1,
          error: safeText(error?.message, "RUNTIME_CYCLE_FAILED")
        });
      }

      await sleep(CONFIG.delayMs);
    }

    return result;
  }

  function testPageBindings() {
    const checks = {
      pageTitle: !!document.getElementById("pageTitle"),
      tickerTrack: !!document.getElementById("tickerTrack"),
      audioToggleBtn: !!document.getElementById("audioToggleBtn"),
      metricsBox: !!document.getElementById("metricsBox") || !!document.getElementById("metricBox"),
      feedBox: !!document.getElementById("feed") || !!document.getElementById("feedBox"),
      countryBox: !!document.getElementById("countryBox")
    };

    const passed = Object.values(checks).some(Boolean);
    log("page-bindings", passed ? "pass" : "fail", checks);

    return {
      passed,
      checks
    };
  }

  function buildSummary(report) {
    const failures = STATE.logs.filter(item => item.status === "fail").length;

    return {
      startedAt: report.startedAt,
      finishedAt: report.finishedAt,
      durationMs: new Date(report.finishedAt).getTime() - new Date(report.startedAt).getTime(),
      overallPassed:
        report.environment.passed &&
        report.ingestion.passed &&
        report.engine.passed &&
        report.publisher.passed &&
        report.runtime.passed &&
        report.bindings.passed,
      failures,
      sourcesSeen: report.engine.sourcesSeen,
      finalSystemSource: safeText(report.engine.lastSystem?.source, "unknown"),
      finalSignalCount: asArray(report.engine.lastSystem?.rankedSignals).length,
      finalUnifiedFeedCount: asArray(report.engine.lastSystem?.unifiedFeed).length,
      finalReportCount: asArray(window.IBSS_ENGINE?.getReports?.()).length,
      finalPublisherQueue: asArray(window.IBSS_PUBLISHER?.getQueue?.()).length
    };
  }

  async function run() {
    STATE.startedAt = nowIso();
    STATE.finishedAt = null;
    STATE.logs = [];

    log("stress-test", "pass", { message: "System stress test started" });

    const environment = testEnvironment();
    const bindings = testPageBindings();
    const ingestion = await runIngestionStress();
    const engine = await runEngineStress();
    const publisher = await runPublisherStress();
    const runtime = await runRuntimeStress();

    STATE.finishedAt = nowIso();

    const report = {
      version: CONFIG.version,
      startedAt: STATE.startedAt,
      finishedAt: STATE.finishedAt,
      environment,
      bindings,
      ingestion,
      engine,
      publisher,
      runtime,
      logs: clone(STATE.logs)
    };

    report.summary = buildSummary(report);
    STATE.report = report;

    saveReport(report);

    if (report.summary.overallPassed) {
      console.log("✅ IBSS_STRESS_TEST PASSED", report.summary);
    } else {
      console.warn("⚠️ IBSS_STRESS_TEST FOUND FAILURES", report.summary);
    }

    return report;
  }

  function printLastReport() {
    const report = STATE.report || getLastReport();
    if (!report) {
      console.warn("No stress test report found.");
      return null;
    }

    console.table({
      overallPassed: report.summary?.overallPassed,
      failures: report.summary?.failures,
      finalSystemSource: report.summary?.finalSystemSource,
      finalSignalCount: report.summary?.finalSignalCount,
      finalUnifiedFeedCount: report.summary?.finalUnifiedFeedCount,
      finalReportCount: report.summary?.finalReportCount,
      finalPublisherQueue: report.summary?.finalPublisherQueue,
      durationMs: report.summary?.durationMs
    });

    return report;
  }

  return {
    CONFIG,
    run,
    getLastReport,
    printLastReport
  };
})();
