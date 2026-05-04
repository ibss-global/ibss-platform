// doctrine-matrix.js

export const DOCTRINE = {

  BLACK_LAYER: {
    BLACK_BOX: {
      name: "Black Box",
      question: "Who inserted the decision?",
    },

    INVISIBLE_INK: {
      name: "Invisible Ink",
      question: "What is written but not read?",
    },

    SHOCK: {
      name: "Shock",
      question: "Is the shock a tool or a result?",
    },

    BEHIND_CURTAIN: {
      name: "Behind the Curtain",
      question: "Who wants this information out now?",
    },

    BEYOND_WALL: {
      name: "Beyond the Wall",
      question: "What is forming structurally?",
    },

    BLACK_GATE: {
      name: "Black Gate",
      question: "Is the system transitioning to action?",
    }
  },

  CONFLICT_SYSTEMS: {
    TIME_WARFARE: "Time Warfare",
    WAAD: "War Acceptance Architecture",
    INFO_WAR: "Information Warfare",
    REFRAMING: "Strategic Reframing"
  },

  REGIONAL: {
    IRAN: "Nuclear Threshold",
    GAZA: "Gaza Restructuring",
    NORTH: "Northern Front",
    REGION: "Regional Reconstruction"
  }
}


// =========================
// AUTO CLASSIFIER
// =========================

export function classifySignal(signal) {

  const text = signal.toLowerCase()

  if (text.includes("source") || text.includes("official") || text.includes("report")) {
    return "BEHIND_CURTAIN"
  }

  if (text.includes("shock") || text.includes("attack") || text.includes("explosion")) {
    return "SHOCK"
  }

  if (text.includes("nuclear") || text.includes("proposal")) {
    return "INVISIBLE_INK"
  }

  if (text.includes("troops") || text.includes("movement") || text.includes("deployment")) {
    return "BLACK_GATE"
  }

  return "BEYOND_WALL"
}
