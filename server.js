// IBSS FACEBOOK BRIDGE SERVER
// Version: v1.1 — Render Ready / Secure Backend
// Endpoint: POST /publish/facebook

import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 3000;
const GRAPH_VERSION = process.env.FB_GRAPH_VERSION || "v20.0";
const PAGE_ID = process.env.FB_PAGE_ID;
const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;

const ALLOWED_ORIGINS = [
  "https://ibss-global.github.io",
  "https://ibss-global.github.io/ibss-platform"
];

app.use(express.json({ limit: "1mb" }));

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS_NOT_ALLOWED"));
      }
    },
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "X-IBSS-Client"]
  })
);

function safeText(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function hasFacebookConfig() {
  return Boolean(PAGE_ID && PAGE_ACCESS_TOKEN);
}

app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "IBSS Facebook Bridge",
    status: "RUNNING",
    graphVersion: GRAPH_VERSION,
    facebookConfigured: hasFacebookConfig()
  });
});

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    status: "HEALTHY"
  });
});

app.post("/publish/facebook", async (req, res) => {
  try {
    const text = safeText(req.body?.text || req.body?.message, "");

    if (!text) {
      return res.status(400).json({
        ok: false,
        error: "EMPTY_POST_TEXT"
      });
    }

    if (!hasFacebookConfig()) {
      return res.status(500).json({
        ok: false,
        error: "FACEBOOK_ENV_MISSING"
      });
    }

    const url = `https://graph.facebook.com/${GRAPH_VERSION}/${PAGE_ID}/feed`;

    const fbResponse = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: text,
        access_token: PAGE_ACCESS_TOKEN
      })
    });

    const data = await fbResponse.json();

    if (!fbResponse.ok) {
      return res.status(fbResponse.status).json({
        ok: false,
        error: "FACEBOOK_PUBLISH_FAILED",
        details: data
      });
    }

    return res.json({
      ok: true,
      platform: "facebook",
      postId: data.id,
      response: data
    });
  } catch (error) {
    console.error("IBSS Facebook publish error:", error);

    return res.status(500).json({
      ok: false,
      error: "SERVER_ERROR",
      message: error.message
    });
  }
});

app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: "ROUTE_NOT_FOUND"
  });
});

app.listen(PORT, () => {
  console.log(`IBSS Facebook Bridge running on port ${PORT}`);
});
