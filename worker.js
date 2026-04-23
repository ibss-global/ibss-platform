export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, env, ctx);
  }
};

const APP_NAME = "IBSS Facebook Publisher Worker";

async function handleRequest(request, env, ctx) {
  const url = new URL(request.url);

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: buildCorsHeaders(env)
    });
  }

  try {
    if (url.pathname === "/") {
      return jsonResponse(
        {
          ok: true,
          service: APP_NAME,
          version: "1.0.0",
          status: "active",
          endpoints: [
            "GET /health",
            "POST /publish/facebook",
            "POST /publish/facebook-photo",
            "POST /publish/facebook-link"
          ]
        },
        200,
        env
      );
    }

    if (url.pathname === "/health" && request.method === "GET") {
      return handleHealth(env);
    }

    if (url.pathname === "/publish/facebook" && request.method === "POST") {
      return handleFacebookTextPost(request, env);
    }

    if (url.pathname === "/publish/facebook-photo" && request.method === "POST") {
      return handleFacebookPhotoPost(request, env);
    }

    if (url.pathname === "/publish/facebook-link" && request.method === "POST") {
      return handleFacebookLinkPost(request, env);
    }

    return jsonResponse(
      {
        ok: false,
        error: "NOT_FOUND",
        message: "Endpoint not found."
      },
      404,
      env
    );
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error: "UNHANDLED_WORKER_ERROR",
        message: error instanceof Error ? error.message : "Unknown worker error."
      },
      500,
      env
    );
  }
}

/* =========================================
   Health
========================================= */

async function handleHealth(env) {
  const missing = [];

  if (!env.META_PAGE_ID) missing.push("META_PAGE_ID");
  if (!env.META_PAGE_ACCESS_TOKEN) missing.push("META_PAGE_ACCESS_TOKEN");

  return jsonResponse(
    {
      ok: missing.length === 0,
      service: APP_NAME,
      configured: missing.length === 0,
      missing,
      timestamp: new Date().toISOString()
    },
    missing.length === 0 ? 200 : 500,
    env
  );
}

/* =========================================
   Publish: Text Post
========================================= */

async function handleFacebookTextPost(request, env) {
  await requireAuthorizedRequest(request, env);

  const body = await parseJsonBody(request);

  const message = safeText(body?.message);
  const published = normalizePublishedFlag(body?.published, true);
  const scheduledPublishTime = body?.scheduled_publish_time ?? null;

  if (!message) {
    return jsonResponse(
      {
        ok: false,
        error: "INVALID_MESSAGE",
        message: "Field 'message' is required."
      },
      400,
      env
    );
  }

  const payload = new URLSearchParams();
  payload.set("message", message);
  payload.set("access_token", env.META_PAGE_ACCESS_TOKEN);

  if (!published) {
    payload.set("published", "false");
  }

  if (scheduledPublishTime != null) {
    payload.set("scheduled_publish_time", String(scheduledPublishTime));
    payload.set("published", "false");
  }

  const apiResult = await postToMetaGraph(
    buildGraphUrl(env, `${env.META_PAGE_ID}/feed`),
    payload
  );

  return jsonResponse(
    {
      ok: true,
      type: "facebook_text_post",
      meta: apiResult
    },
    200,
    env
  );
}

/* =========================================
   Publish: Photo Post
========================================= */

async function handleFacebookPhotoPost(request, env) {
  await requireAuthorizedRequest(request, env);

  const body = await parseJsonBody(request);

  const imageUrl = safeText(body?.image_url);
  const caption = safeText(body?.caption);
  const published = normalizePublishedFlag(body?.published, true);
  const scheduledPublishTime = body?.scheduled_publish_time ?? null;

  if (!imageUrl) {
    return jsonResponse(
      {
        ok: false,
        error: "INVALID_IMAGE_URL",
        message: "Field 'image_url' is required."
      },
      400,
      env
    );
  }

  const payload = new URLSearchParams();
  payload.set("url", imageUrl);
  payload.set("access_token", env.META_PAGE_ACCESS_TOKEN);

  if (caption) {
    payload.set("caption", caption);
  }

  if (!published) {
    payload.set("published", "false");
  }

  if (scheduledPublishTime != null) {
    payload.set("scheduled_publish_time", String(scheduledPublishTime));
    payload.set("published", "false");
  }

  const apiResult = await postToMetaGraph(
    buildGraphUrl(env, `${env.META_PAGE_ID}/photos`),
    payload
  );

  return jsonResponse(
    {
      ok: true,
      type: "facebook_photo_post",
      meta: apiResult
    },
    200,
    env
  );
}

/* =========================================
   Publish: Link Post
========================================= */

async function handleFacebookLinkPost(request, env) {
  await requireAuthorizedRequest(request, env);

  const body = await parseJsonBody(request);

  const link = safeText(body?.link);
  const message = safeText(body?.message);
  const published = normalizePublishedFlag(body?.published, true);
  const scheduledPublishTime = body?.scheduled_publish_time ?? null;

  if (!link) {
    return jsonResponse(
      {
        ok: false,
        error: "INVALID_LINK",
        message: "Field 'link' is required."
      },
      400,
      env
    );
  }

  const payload = new URLSearchParams();
  payload.set("link", link);
  payload.set("access_token", env.META_PAGE_ACCESS_TOKEN);

  if (message) {
    payload.set("message", message);
  }

  if (!published) {
    payload.set("published", "false");
  }

  if (scheduledPublishTime != null) {
    payload.set("scheduled_publish_time", String(scheduledPublishTime));
    payload.set("published", "false");
  }

  const apiResult = await postToMetaGraph(
    buildGraphUrl(env, `${env.META_PAGE_ID}/feed`),
    payload
  );

  return jsonResponse(
    {
      ok: true,
      type: "facebook_link_post",
      meta: apiResult
    },
    200,
    env
  );
}

/* =========================================
   Meta API
========================================= */

async function postToMetaGraph(url, formData) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: formData.toString()
  });

  const rawText = await response.text();

  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    data = { raw: rawText };
  }

  if (!response.ok || data?.error) {
    throw new Error(
      data?.error?.message ||
      `Meta Graph API error. HTTP ${response.status}`
    );
  }

  return data;
}

function buildGraphUrl(env, path) {
  const version = safeText(env.META_GRAPH_VERSION, "v19.0");
  return `https://graph.facebook.com/${version}/${path}`;
}

/* =========================================
   Auth
========================================= */

async function requireAuthorizedRequest(request, env) {
  const workerSecret = safeText(env.WORKER_SHARED_SECRET);

  if (!workerSecret) {
    throw new Error("Missing WORKER_SHARED_SECRET in environment.");
  }

  const authHeader = request.headers.get("Authorization");
  const xApiKey = request.headers.get("x-api-key");

  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";

  const providedSecret = safeText(bearerToken || xApiKey);

  if (!providedSecret) {
    throw new Response(
      JSON.stringify({
        ok: false,
        error: "UNAUTHORIZED",
        message: "Missing authorization secret."
      }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }

  if (providedSecret !== workerSecret) {
    throw new Response(
      JSON.stringify({
        ok: false,
        error: "FORBIDDEN",
        message: "Invalid authorization secret."
      }),
      {
        status: 403,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
}

/* =========================================
   Helpers
========================================= */

async function parseJsonBody(request) {
  try {
    return await request.json();
  } catch {
    throw new Error("Invalid JSON body.");
  }
}

function normalizePublishedFlag(value, fallback = true) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v === "true") return true;
    if (v === "false") return false;
  }
  return fallback;
}

function safeText(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function buildCorsHeaders(env) {
  const allowedOrigin = safeText(env.ALLOWED_ORIGIN, "*");

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
    "Access-Control-Max-Age": "86400"
  };
}

function jsonResponse(data, status = 200, env) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...buildCorsHeaders(env)
    }
  });
}
