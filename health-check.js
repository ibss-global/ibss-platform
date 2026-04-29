// IBSS HEALTH CHECK — System Diagnostics
// Version: v1.0

window.IBSS_HEALTH = (function () {
  "use strict";

  function check(name, condition) {
    return {
      name,
      status: condition ? "OK" : "FAIL"
    };
  }

  function run() {
    const results = [];

    // ENGINE
    results.push(check(
      "ENGINE",
      !!(window.IBSS_ENGINE && window.IBSS_ENGINE.getSystemState)
    ));

    // PUBLISHER
    results.push(check(
      "PUBLISHER",
      !!(window.IBSS_PUBLISHER && window.IBSS_PUBLISHER.generateStrategicBrief)
    ));

    // AUTO PUBLISH
    results.push(check(
      "AUTO PUBLISH",
      !!window.IBSS_AUTO_PUBLISH
    ));

    // RUNTIME
    results.push(check(
      "RUNTIME",
      !!(window.IBSS_RUNTIME && window.IBSS_RUNTIME.start)
    ));

    // FACEBOOK LAYER
    results.push(check(
      "FACEBOOK",
      !!window.IBSS_FACEBOOK_LAYER
    ));

    // VIRAL
    results.push(check(
      "VIRAL",
      !!window.IBSS_VIRAL
    ));

    console.clear();
    console.log("=== IBSS SYSTEM HEALTH ===");

    results.forEach(r => {
      if (r.status === "OK") {
        console.log(`✅ ${r.name}: OK`);
      } else {
        console.log(`❌ ${r.name}: FAIL`);
      }
    });

    return results;
  }

  return {
    run
  };
})();
