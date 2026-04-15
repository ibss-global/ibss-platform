window.IBSS_WEIGHTS = (function () {
  "use strict";

  const DOMAIN_WEIGHTS = {
    military: {
      base: 1.25,
      escalation: 1.3,
      persistence: 1.15,
      spread: 1.1
    },
    security: {
      base: 1.15,
      escalation: 1.2,
      persistence: 1.1,
      spread: 1.0
    },
    diplomatic: {
      base: 0.95,
      escalation: 1.0,
      persistence: 1.05,
      spread: 0.95
    },
    economic: {
      base: 1.0,
      escalation: 0.95,
      persistence: 1.2,
      spread: 1.15
    },
    maritime: {
      base: 1.05,
      escalation: 1.1,
      persistence: 1.0,
      spread: 1.1
    },
    geopolitical: {
      base: 1.1,
      escalation: 1.15,
      persistence: 1.1,
      spread: 1.05
    },
    structural: {
      base: 1.0,
      escalation: 1.0,
      persistence: 1.25,
      spread: 0.95
    },
    internal: {
      base: 0.95,
      escalation: 1.0,
      persistence: 1.05,
      spread: 0.9
    },
    energy: {
      base: 1.1,
      escalation: 1.0,
      persistence: 1.2,
      spread: 1.1
    },
    logistics: {
      base: 1.0,
      escalation: 0.95,
      persistence: 1.15,
      spread: 1.15
    },
    default: {
      base: 1.0,
      escalation: 1.0,
      persistence: 1.0,
      spread: 1.0
    }
  };

  function normalizeDomain(domain) {
    return String(domain || "").toLowerCase().trim();
  }

  function getDomainWeight(domain) {
    const key = normalizeDomain(domain);
    return DOMAIN_WEIGHTS[key] || DOMAIN_WEIGHTS.default;
  }

  function applyWeights(input) {
    const domainWeight = getDomainWeight(input?.domain);

    const impact = Number(input?.impact || 0);
    const confidence = Number(input?.confidence || 0);
    const urgency = Number(input?.urgency || 0);
    const persistence = Number(input?.persistence || 5);
    const spread = Number(input?.spread || 5);

    const weightedImpact = impact * domainWeight.base;
    const weightedUrgency = urgency * domainWeight.escalation;
    const weightedPersistence = persistence * domainWeight.persistence;
    const weightedSpread = spread * domainWeight.spread;

    const composite =
      (weightedImpact * 0.34) +
      (confidence * 0.18) +
      (weightedUrgency * 0.22) +
      (weightedPersistence * 0.14) +
      (weightedSpread * 0.12);

    return {
      domain: normalizeDomain(input?.domain || "default"),
      weightedImpact,
      weightedUrgency,
      weightedPersistence,
      weightedSpread,
      composite: Math.max(0, Math.min(10, composite))
    };
  }

  return {
    DOMAIN_WEIGHTS,
    getDomainWeight,
    applyWeights
  };
})();
