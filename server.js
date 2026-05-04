// IBSS FACEBOOK BACKEND PUBLISHER
// Secure backend for Facebook Page publishing

import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
const PAGE_ID = process.env.FB_PAGE_ID;

app.get("/", (req, res) => {
  res.json({
    ok: true,
    status: "IBSS Facebook Backend Running"
  });
});

app.post("/publish/facebook", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        ok: false,
        error: "No text provided"
      });
    }

    if (!PAGE_ACCESS_TOKEN || !PAGE_ID) {
      return res.status(500).json({
        ok: false,
        error: "Facebook credentials missing"
      });
    }

    const url = `https://graph.facebook.com/${PAGE_ID}/feed`;

    const fbRes = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: text,
        access_token: PAGE_ACCESS_TOKEN
      })
    });

    const data = await fbRes.json();

    if (!fbRes.ok) {
      return res.status(500).json({
        ok: false,
        error: data
      });
    }

    return res.json({
      ok: true,
      postId: data.id
    });

  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`IBSS Facebook Backend running on port ${PORT}`);
});
