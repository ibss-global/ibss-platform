window.IBSS_CORRELATION = (function () {
  "use strict";

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function normalizeText(value) {
    return String(value || "").toLowerCase().trim();
  }

  function detectClusterKey(item) {
    const region = normalizeText(item?.region || item?.country || "global");
    const domain = normalizeText(item?.domain || item?.category || "general");
    return `${region}::${domain}`;
  }

  function clusterNews(items) {
    const groups = new Map();

    asArray(items).forEach(item => {
      const key = detectClusterKey(item);

      if (!groups.has(key)) {
        groups.set(key, []);
      }

      groups.get(key).push(item);
    });

    return [...groups.entries()].map(([key, rows]) => ({
      key,
      count: rows.length,
      items: rows,
      region: rows[0]?.region || rows[0]?.country || "global",
      domain: rows[0]?.domain || rows[0]?.category || "general"
    }));
  }

  function measureClusterIntensity(cluster) {
    const count = Number(cluster?.count || 0);
    const items = asArray(cluster?.items);

    let high = 0;
    let medium = 0;

    items.forEach(item => {
      const p = String(item?.priority || item?.severity || "LOW").toUpperCase();
      if (p === "HIGH") high += 1;
      else if (p === "MEDIUM") medium += 1;
    });

    return Math.min(100, (count * 12) + (high * 18) + (medium * 9));
  }

  function buildCorrelationMap(items) {
    const clusters = clusterNews(items);

    return clusters.map(cluster => ({
      ...cluster,
      intensity: measureClusterIntensity(cluster)
    })).sort((a, b) => b.intensity - a.intensity);
  }

  return {
    clusterNews,
    buildCorrelationMap,
    measureClusterIntensity
  };
})();
