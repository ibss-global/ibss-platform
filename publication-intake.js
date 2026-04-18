<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>IBSS Intake Console</title>

  <style>
    :root{
      --gold:#d4af37;
      --bg:#040404;
      --panel:#0d0d0d;
      --panel2:#121212;
      --panel3:#171717;
      --text:#ffffff;
      --muted:#9d9d9d;
      --red:#ff4d4f;
      --orange:#ff9f1a;
      --green:#00d084;
      --border:rgba(212,175,55,.28);
      --soft-border:rgba(255,255,255,.08);
      --soft-border-2:rgba(255,255,255,.06);
      --shadow:0 10px 24px rgba(0,0,0,.18);
    }

    *{box-sizing:border-box}

    html,body{
      margin:0;
      padding:0;
      font-family:Arial,sans-serif;
      background:
        radial-gradient(circle at top, rgba(212,175,55,.07), transparent 30%),
        var(--bg);
      color:var(--text);
    }

    body{min-height:100vh}

    .wrap{
      width:min(1280px,92%);
      margin:auto;
      padding:20px 0 42px;
    }

    .topbar{
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:16px;
      padding:14px 0 22px;
      border-bottom:1px solid rgba(255,255,255,.05);
      flex-wrap:wrap;
    }

    .brand{
      color:var(--gold);
      font-size:30px;
      font-weight:900;
      text-decoration:none;
      letter-spacing:1px;
    }

    .top-actions{
      display:flex;
      align-items:center;
      gap:12px;
      flex-wrap:wrap;
      justify-content:center;
    }

    .nav{
      display:flex;
      gap:10px;
      flex-wrap:wrap;
      justify-content:center;
    }

    .nav a{
      color:var(--muted);
      text-decoration:none;
      border:1px solid var(--soft-border);
      padding:10px 14px;
      border-radius:12px;
      font-size:14px;
      transition:.2s ease;
    }

    .nav a:hover,
    .nav a.active{
      color:var(--gold);
      border-color:var(--border);
      box-shadow:0 0 0 1px rgba(212,175,55,.08) inset;
    }

    .lang-switch{
      display:flex;
      gap:6px;
    }

    .lang-switch button{
      background:none;
      border:1px solid rgba(255,255,255,.1);
      color:#ccc;
      padding:8px 10px;
      border-radius:10px;
      cursor:pointer;
      transition:.2s ease;
      font-size:13px;
    }

    .lang-switch button:hover,
    .lang-switch button.active{
      color:var(--gold);
      border-color:var(--gold);
    }

    .hero{
      text-align:center;
      padding:30px 0 18px;
    }

    .hero h1{
      margin:0 0 10px;
      font-size:42px;
      color:var(--gold);
      font-weight:900;
      letter-spacing:.5px;
    }

    .hero p{
      margin:0;
      color:var(--muted);
      font-size:16px;
      line-height:1.8;
    }

    .meta-line{
      margin-top:10px;
      color:#8a8a8a;
      font-size:13px;
    }

    .hero-badges{
      display:flex;
      justify-content:center;
      gap:10px;
      flex-wrap:wrap;
      margin-top:14px;
    }

    .meta-badge{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      padding:8px 12px;
      border-radius:999px;
      font-size:12px;
      font-weight:700;
      border:1px solid rgba(255,255,255,.08);
      background:rgba(255,255,255,.03);
      color:#ddd;
    }

    .meta-badge.live{
      color:var(--green);
      border-color:rgba(0,208,132,.25);
      background:rgba(0,208,132,.08);
    }

    .meta-badge.fallback{
      color:var(--orange);
      border-color:rgba(255,159,26,.30);
      background:rgba(255,159,26,.08);
    }

    .section{
      margin-top:18px;
    }

    .grid{
      display:grid;
      grid-template-columns:1.1fr .9fr;
      gap:18px;
      margin-top:18px;
    }

    .grid-2{
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:18px;
      margin-top:18px;
    }

    .card{
      background:var(--panel);
      border:1px solid var(--soft-border);
      border-radius:22px;
      padding:22px;
      box-shadow:var(--shadow);
    }

    .title{
      color:var(--gold);
      font-size:24px;
      font-weight:900;
      margin-bottom:16px;
    }

    .sub-title{
      color:#b8b8b8;
      font-size:13px;
      margin-top:-8px;
      margin-bottom:16px;
      line-height:1.7;
    }

    .form-grid{
      display:grid;
      grid-template-columns:repeat(2,1fr);
      gap:14px;
    }

    .field{
      background:var(--panel2);
      border:1px solid var(--soft-border-2);
      border-radius:16px;
      padding:14px;
    }

    .field.full{
      grid-column:1 / -1;
    }

    .field label{
      display:block;
      color:var(--muted);
      font-size:12px;
      margin-bottom:8px;
    }

    .field input,
    .field select,
    .field textarea{
      width:100%;
      background:#101010;
      color:#fff;
      border:1px solid rgba(255,255,255,.08);
      border-radius:12px;
      padding:11px 12px;
      font-size:14px;
      outline:none;
      font-family:Arial,sans-serif;
    }

    .field textarea{
      min-height:120px;
      resize:vertical;
      line-height:1.8;
    }

    .actions{
      display:flex;
      gap:10px;
      flex-wrap:wrap;
      margin-top:16px;
    }

    .actions button{
      padding:12px 16px;
      border-radius:12px;
      font-weight:700;
      cursor:pointer;
      font-size:14px;
      transition:.2s ease;
    }

    .btn-primary{
      border:none;
      background:#d4af37;
      color:#000;
    }

    .btn-secondary{
      border:1px solid rgba(255,255,255,.1);
      background:transparent;
      color:#ddd;
    }

    .btn-danger{
      border:1px solid rgba(255,77,79,.35);
      background:rgba(255,77,79,.1);
      color:#ffd4d4;
    }

    .preview-box,
    .registry-box,
    .status-box{
      background:var(--panel2);
      border:1px solid var(--soft-border-2);
      border-radius:16px;
      padding:16px;
    }

    .preview-title{
      color:#fff;
      font-size:26px;
      font-weight:900;
      line-height:1.45;
      margin:0 0 10px;
    }

    .preview-text{
      color:#ddd;
      line-height:1.9;
      font-size:14px;
      white-space:pre-wrap;
    }

    .chip-row{
      display:flex;
      flex-wrap:wrap;
      gap:8px;
      margin-top:12px;
    }

    .chip{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      padding:7px 10px;
      border-radius:999px;
      font-size:11px;
      font-weight:700;
      border:1px solid rgba(255,255,255,.08);
      background:rgba(255,255,255,.03);
      color:#ddd;
    }

    .chip.high{
      color:#ffd7d7;
      background:rgba(255,77,79,.12);
      border-color:rgba(255,77,79,.28);
    }

    .chip.medium{
      color:#ffe2b8;
      background:rgba(255,159,26,.12);
      border-color:rgba(255,159,26,.28);
    }

    .chip.low{
      color:#d6fff1;
      background:rgba(0,208,132,.12);
      border-color:rgba(0,208,132,.28);
    }

    .registry-list{
      display:grid;
      gap:12px;
    }

    .registry-item{
      background:var(--panel2);
      border:1px solid var(--soft-border-2);
      border-radius:16px;
      padding:14px;
      cursor:pointer;
      transition:.2s ease;
    }

    .registry-item:hover{
      border-color:rgba(212,175,55,.24);
    }

    .registry-item.active{
      border-color:rgba(212,175,55,.38);
      box-shadow:0 0 0 1px rgba(212,175,55,.08) inset;
    }

    .registry-name{
      color:#fff;
      font-size:16px;
      font-weight:800;
      line-height:1.6;
      margin-bottom:6px;
    }

    .registry-meta{
      color:var(--muted);
      font-size:12px;
      line-height:1.7;
    }

    .status-box{
      color:#ddd;
      line-height:1.8;
      font-size:14px;
    }

    .json-view{
      width:100%;
      min-height:280px;
      background:#101010;
      color:#f3f3f3;
      border:1px solid rgba(255,255,255,.08);
      border-radius:14px;
      padding:14px;
      font-size:13px;
      line-height:1.8;
      resize:vertical;
      font-family:Consolas, monospace;
    }

    .footer{
      margin-top:26px;
      text-align:center;
      color:#777;
      font-size:14px;
      border-top:1px solid rgba(255,255,255,.05);
      padding-top:22px;
    }

    html[dir="rtl"] body{
      text-align:right;
    }

    html[dir="rtl"] .topbar,
    html[dir="rtl"] .top-actions,
    html[dir="rtl"] .nav{
      direction:rtl;
    }

    html[dir="rtl"] .hero,
    html[dir="rtl"] .footer{
      text-align:center;
    }

    @media (max-width:1100px){
      .grid,
      .grid-2,
      .form-grid{
        grid-template-columns:1fr;
      }
    }

    @media (max-width:640px){
      .hero h1{font-size:34px}
      .topbar{flex-direction:column}
      .nav{justify-content:center}
      .brand{text-align:center}
      .actions{flex-direction:column}
    }
  </style>
</head>
<body>
  <div class="wrap">

    <div class="topbar">
      <a class="brand" href="index.html">IBSS</a>

      <div class="top-actions">
        <div class="nav">
          <a href="index.html">Home</a>
          <a href="dashboard.html">Dashboard</a>
          <a href="signals.html">Signals</a>
          <a href="reports.html">Reports</a>
          <a href="countries.html">Countries</a>
          <a href="models.html">Models</a>
          <a href="about.html">About</a>
          <a href="intake-console.html" class="active">Intake</a>
        </div>

        <div class="lang-switch">
          <button id="btn-en" type="button">EN</button>
          <button id="btn-ar" type="button">AR</button>
        </div>
      </div>
    </div>

    <div class="hero">
      <h1 id="pageTitle">IBSS Intake Console</h1>
      <p id="pageSub">Structured publication entry layer for sovereign studies, policy papers, analyses, and linked signal objects.</p>
      <div id="metaLine" class="meta-line">INTAKE LAYER — READY</div>

      <div class="hero-badges">
        <span id="registryBadge" class="meta-badge live">REGISTRY — ACTIVE</span>
        <span id="storageBadge" class="meta-badge live">STORAGE — LOCAL</span>
      </div>
    </div>

    <div class="grid section">
      <div class="card">
        <div class="title" id="formTitle">Publication Intake Form</div>
        <div class="sub-title" id="formSub">Enter a structured sovereign publication and register it directly into the intake layer.</div>

        <div class="form-grid">
          <div class="field">
            <label for="pubId">ID</label>
            <input id="pubId" type="text" placeholder="Optional custom ID" />
          </div>

          <div class="field">
            <label for="pubType">Type</label>
            <select id="pubType">
              <option value="study">study</option>
              <option value="report">report</option>
              <option value="analysis">analysis</option>
              <option value="brief">brief</option>
              <option value="policy_paper">policy_paper</option>
              <option value="news">news</option>
            </select>
          </div>

          <div class="field full">
            <label for="titleAr">Arabic Title</label>
            <input id="titleAr" type="text" placeholder="أدخل العنوان العربي" />
          </div>

          <div class="field full">
            <label for="titleEn">English Title</label>
            <input id="titleEn" type="text" placeholder="Enter English title" />
          </div>

          <div class="field full">
            <label for="summaryAr">Arabic Summary</label>
            <textarea id="summaryAr" placeholder="أدخل الملخص العربي"></textarea>
          </div>

          <div class="field full">
            <label for="summaryEn">English Summary</label>
            <textarea id="summaryEn" placeholder="Enter English summary"></textarea>
          </div>

          <div class="field full">
            <label for="bodyAr">Arabic Body</label>
            <textarea id="bodyAr" placeholder="أدخل المتن العربي الكامل"></textarea>
          </div>

          <div class="field full">
            <label for="bodyEn">English Body</label>
            <textarea id="bodyEn" placeholder="Enter English body or translated abstract"></textarea>
          </div>

          <div class="field">
            <label for="classification">Classification</label>
            <input id="classification" type="text" placeholder="L9 Blueprint Deconstruction" />
          </div>

          <div class="field">
            <label for="edition">Edition</label>
            <input id="edition" type="text" placeholder="L9-SOV Blueprint Deconstruction Edition" />
          </div>

          <div class="field">
            <label for="layer">Layer</label>
            <select id="layer">
              <option value="L1">L1</option>
              <option value="L2">L2</option>
              <option value="L3">L3</option>
              <option value="L4">L4</option>
              <option value="L5">L5</option>
              <option value="L6">L6</option>
              <option value="L7">L7</option>
              <option value="L8">L8</option>
              <option value="L9">L9</option>
            </select>
          </div>

          <div class="field">
            <label for="mode">Mode</label>
            <input id="mode" type="text" placeholder="Blueprint Deconstruction" />
          </div>

          <div class="field">
            <label for="unit">Unit</label>
            <input id="unit" type="text" value="SSU" />
          </div>

          <div class="field">
            <label for="status">Status</label>
            <select id="status">
              <option value="published">published</option>
              <option value="pending">pending</option>
              <option value="draft">draft</option>
              <option value="archived">archived</option>
            </select>
          </div>

          <div class="field">
            <label for="domain">Domain</label>
            <input id="domain" type="text" placeholder="geo-security" />
          </div>

          <div class="field">
            <label for="region">Region</label>
            <input id="region" type="text" placeholder="gaza" />
          </div>

          <div class="field">
            <label for="country">Country</label>
            <input id="country" type="text" placeholder="gaza" />
          </div>

          <div class="field">
            <label for="countryId">Country ID</label>
            <input id="countryId" type="text" placeholder="CTR-GAZA" />
          </div>

          <div class="field">
            <label for="priority">Priority</label>
            <select id="priority">
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
          </div>

          <div class="field">
            <label for="author">Author</label>
            <input id="author" type="text" value="Naeem Dahalan" />
          </div>

          <div class="field">
            <label for="sourcePlatform">Source Platform</label>
            <input id="sourcePlatform" type="text" value="internal" />
          </div>

          <div class="field">
            <label for="publishedAt">Published At</label>
            <input id="publishedAt" type="datetime-local" />
          </div>

          <div class="field full">
            <label for="signalIds">Signal IDs (comma separated)</label>
            <input id="signalIds" type="text" placeholder="SIG-GAZA-NARRATIVE-001, SIG-GAZA-WAAD-001" />
          </div>

          <div class="field full">
            <label for="tags">Tags (comma separated)</label>
            <input id="tags" type="text" placeholder="غزة, L9, Blueprint Deconstruction, WAAD" />
          </div>

          <div class="field">
            <label for="policyRisk">Policy Risk</label>
            <input id="policyRisk" type="number" min="0" max="100" value="86" />
          </div>

          <div class="field">
            <label for="implementationDifficulty">Implementation Difficulty</label>
            <input id="implementationDifficulty" type="number" min="0" max="100" value="72" />
          </div>

          <div class="field">
            <label for="regionalSensitivity">Regional Sensitivity</label>
            <input id="regionalSensitivity" type="number" min="0" max="100" value="91" />
          </div>

          <div class="field">
            <label for="strategicWeight">Strategic Weight</label>
            <input id="strategicWeight" type="number" min="0" max="100" value="94" />
          </div>

          <div class="field">
            <label for="featured">Featured</label>
            <select id="featured">
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          </div>

          <div class="field">
            <label for="pinned">Pinned</label>
            <select id="pinned">
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          </div>

          <div class="field">
            <label for="canonical">Canonical</label>
            <select id="canonical">
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          </div>

          <div class="field">
            <label for="sourceUrl">Source URL</label>
            <input id="sourceUrl" type="text" placeholder="Optional source url" />
          </div>
        </div>

        <div class="actions">
          <button id="btnPreview" type="button" class="btn-secondary">Preview Object</button>
          <button id="btnRegister" type="button" class="btn-primary">Register Publication</button>
          <button id="btnLoadSample" type="button" class="btn-secondary">Load L9 Sample</button>
          <button id="btnReset" type="button" class="btn-danger">Reset Form</button>
        </div>
      </div>

      <div class="card">
        <div class="title" id="previewTitle">Live Preview</div>
        <div id="statusBox" class="status-box">No publication preview yet.</div>

        <div class="section">
          <div id="previewBox" class="preview-box">
            <h3 class="preview-title">-</h3>
            <div class="preview-text">-</div>
          </div>
        </div>

        <div class="section">
          <div class="title" id="jsonTitle">Normalized Object</div>
          <textarea id="jsonView" class="json-view" readonly></textarea>
        </div>
      </div>
    </div>

    <div class="grid-2 section">
      <div class="card">
        <div class="title" id="registryTitle">Registered Publications</div>
        <div id="registryList" class="registry-list"></div>
      </div>

      <div class="card">
        <div class="title" id="selectedTitle">Selected Publication</div>
        <div id="selectedPreview" class="preview-box">
          <h3 class="preview-title">-</h3>
          <div class="preview-text">-</div>
        </div>
      </div>
    </div>

    <div class="footer">© 2026 IBSS — Intake Console Layer</div>
  </div>

  <script src="publication-intake.js"></script>

  <script>
    (function () {
      "use strict";

      const UI = {
        en: {
          pageTitle: "IBSS Intake Console",
          pageSub: "Structured publication entry layer for sovereign studies, policy papers, analyses, and linked signal objects.",
          formTitle: "Publication Intake Form",
          formSub: "Enter a structured sovereign publication and register it directly into the intake layer.",
          previewTitle: "Live Preview",
          jsonTitle: "Normalized Object",
          registryTitle: "Registered Publications",
          selectedTitle: "Selected Publication",
          noPreview: "No publication preview yet.",
          noRegistry: "No registered publications yet.",
          registerOk: "Publication registered successfully.",
          registerFail: "Registration failed.",
          loadSample: "L9 sample loaded into the form."
        },
        ar: {
          pageTitle: "وحدة إدخال الدراسات",
          pageSub: "طبقة الإدخال المنظم للدراسات السيادية وأوراق السياسات والتحليلات والمنشورات المرتبطة بالإشارات.",
          formTitle: "نموذج إدخال الدراسة",
          formSub: "أدخل منشورًا سياديًا منظمًا وسجله مباشرة داخل طبقة الإدخال.",
          previewTitle: "المعاينة الحية",
          jsonTitle: "الكائن المنظم",
          registryTitle: "الدراسات المسجلة",
          selectedTitle: "الدراسة المحددة",
          noPreview: "لا توجد معاينة بعد.",
          noRegistry: "لا توجد دراسات مسجلة بعد.",
          registerOk: "تم تسجيل الدراسة بنجاح.",
          registerFail: "فشل تسجيل الدراسة.",
          loadSample: "تم تحميل مثال L9 داخل النموذج."
        }
      };

      let currentLang = localStorage.getItem("ibss_lang") || "en";
      let selectedPublicationId = null;

      function t(key){
        return UI[currentLang]?.[key] || key;
      }

      function qs(id){
        return document.getElementById(id);
      }

      function safeText(value, fallback = ""){
        return typeof value === "string" && value.trim() ? value.trim() : fallback;
      }

      function safeNumber(value, fallback = 0){
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
      }

      function getLocalizedText(value){
        if (!value) return "-";
        if (typeof value === "string" || typeof value === "number") return String(value);
        return value[currentLang] || value.en || value.ar || value.name || value.title || value.label || value.text || "-";
      }

      function escapeHtml(text){
        const div = document.createElement("div");
        div.textContent = text ?? "";
        return div.innerHTML;
      }

      function toIsoFromLocalInput(value){
        if (!value) return new Date().toISOString();
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
      }

      function applyLanguage(){
        document.documentElement.lang = currentLang;
        document.documentElement.dir = currentLang === "ar" ? "rtl" : "ltr";

        qs("pageTitle").textContent = t("pageTitle");
        qs("pageSub").textContent = t("pageSub");
        qs("formTitle").textContent = t("formTitle");
        qs("formSub").textContent = t("formSub");
        qs("previewTitle").textContent = t("previewTitle");
        qs("jsonTitle").textContent = t("jsonTitle");
        qs("registryTitle").textContent = t("registryTitle");
        qs("selectedTitle").textContent = t("selectedTitle");

        qs("btn-en").classList.toggle("active", currentLang === "en");
        qs("btn-ar").classList.toggle("active", currentLang === "ar");
      }

      function collectFormData(){
        return {
          id: safeText(qs("pubId").value, ""),
          type: qs("pubType").value,

          title: {
            ar: qs("titleAr").value,
            en: qs("titleEn").value
          },

          summary: {
            ar: qs("summaryAr").value,
            en: qs("summaryEn").value
          },

          body: {
            ar: qs("bodyAr").value,
            en: qs("bodyEn").value
          },

          classification: qs("classification").value,
          edition: qs("edition").value,
          layer: qs("layer").value,
          mode: qs("mode").value,
          unit: qs("unit").value,
          status: qs("status").value,

          domain: qs("domain").value,
          region: qs("region").value,
          country: qs("country").value,
          countryId: qs("countryId").value,

          priority: qs("priority").value,
          author: qs("author").value,
          authors: [qs("author").value].filter(Boolean),

          sourcePlatform: qs("sourcePlatform").value,
          sourceUrl: qs("sourceUrl").value,
          publishedAt: toIsoFromLocalInput(qs("publishedAt").value),

          signalIds: qs("signalIds").value
            .split(",")
            .map(v => v.trim())
            .filter(Boolean),

          tags: qs("tags").value
            .split(",")
            .map(v => v.trim())
            .filter(Boolean),

          metrics: {
            policyRisk: safeNumber(qs("policyRisk").value, 0),
            implementationDifficulty: safeNumber(qs("implementationDifficulty").value, 0),
            regionalSensitivity: safeNumber(qs("regionalSensitivity").value, 0),
            strategicWeight: safeNumber(qs("strategicWeight").value, 0)
          },

          meta: {
            featured: qs("featured").value === "true",
            pinned: qs("pinned").value === "true",
            canonical: qs("canonical").value === "true"
          }
        };
      }

      function renderPreview(normalized){
        const previewBox = qs("previewBox");
        const jsonView = qs("jsonView");

        if (!normalized) {
          previewBox.innerHTML = `
            <h3 class="preview-title">-</h3>
            <div class="preview-text">${escapeHtml(t("noPreview"))}</div>
          `;
          jsonView.value = "";
          return;
        }

        const priorityClass =
          String(normalized.priority || "LOW").toUpperCase() === "HIGH" ? "high" :
          String(normalized.priority || "LOW").toUpperCase() === "MEDIUM" ? "medium" : "low";

        previewBox.innerHTML = `
          <h3 class="preview-title">${escapeHtml(getLocalizedText(normalized.title))}</h3>
          <div class="preview-text">${escapeHtml(getLocalizedText(normalized.summary))}</div>
          <div class="chip-row">
            <span class="chip ${priorityClass}">${escapeHtml(normalized.priority || "-")}</span>
            <span class="chip">${escapeHtml(normalized.type || "-")}</span>
            <span class="chip">${escapeHtml(normalized.layer || "-")}</span>
            <span class="chip">${escapeHtml(normalized.mode || "-")}</span>
            <span class="chip">${escapeHtml(normalized.domain || "-")}</span>
            <span class="chip">${escapeHtml(normalized.region || "-")}</span>
          </div>
        `;

        jsonView.value = JSON.stringify(normalized, null, 2);
      }

      function renderStatus(message){
        qs("statusBox").textContent = message || t("noPreview");
      }

      function previewOnly(raw){
        return JSON.parse(JSON.stringify(raw));
      }

      function getAllPublications(){
        if (window.IBSS_PUBLICATIONS?.getAll) return window.IBSS_PUBLICATIONS.getAll();
        if (window.IBSS_PUBLICATION_INTAKE?.getAll) return window.IBSS_PUBLICATION_INTAKE.getAll();
        return [];
      }

      function renderRegistry(){
        const list = qs("registryList");
        const items = getAllPublications();

        if (!items.length) {
          list.innerHTML = `<div class="registry-box">${escapeHtml(t("noRegistry"))}</div>`;
          return;
        }

        list.innerHTML = items.map(item => `
          <div class="registry-item ${item.id === selectedPublicationId ? "active" : ""}" data-id="${escapeHtml(item.id)}">
            <div class="registry-name">${escapeHtml(getLocalizedText(item.title))}</div>
            <div class="registry-meta">
              ${escapeHtml(
                `${item.type || "-"} | ${item.layer || "-"} | ${item.priority || "-"} | ${item.region || "-"}`
              )}
            </div>
          </div>
        `).join("");

        list.querySelectorAll("[data-id]").forEach(el => {
          el.addEventListener("click", function () {
            selectedPublicationId = this.getAttribute("data-id");
            renderSelectedPublication();
            renderRegistry();
          });
        });
      }

      function renderSelectedPublication(){
        const target = qs("selectedPreview");
        const items = getAllPublications();
        const selected = items.find(item => item.id === selectedPublicationId) || items[0] || null;

        if (!selected) {
          target.innerHTML = `
            <h3 class="preview-title">-</h3>
            <div class="preview-text">${escapeHtml(t("noRegistry"))}</div>
          `;
          return;
        }

        if (!selectedPublicationId) {
          selectedPublicationId = selected.id;
        }

        target.innerHTML = `
          <h3 class="preview-title">${escapeHtml(getLocalizedText(selected.title))}</h3>
          <div class="preview-text">${escapeHtml(getLocalizedText(selected.body))}</div>
          <div class="chip-row">
            <span class="chip">${escapeHtml(selected.type || "-")}</span>
            <span class="chip">${escapeHtml(selected.classification || "-")}</span>
            <span class="chip">${escapeHtml(selected.layer || "-")}</span>
            <span class="chip">${escapeHtml(selected.mode || "-")}</span>
            <span class="chip">${escapeHtml(selected.region || "-")}</span>
          </div>
        `;
      }

      function loadL9Sample(){
        qs("pubId").value = "PUB-L9-GAZA-001";
        qs("pubType").value = "study";
        qs("titleAr").value = "غزة — تفكيك المخطط البنيوي: حين تتحول السردية إلى جزء من البنية القتالية";
        qs("titleEn").value = "Gaza — Blueprint Deconstruction: When Narrative Becomes Part of Operational War Architecture";
        qs("summaryAr").value = "دراسة من طبقة L9 تقرأ مسار التفاوض والتسريب والتصعيد بوصفه بنية تمهيدية لشرعنة استئناف الحرب، لا مجرد فشل تفاوضي عابر.";
        qs("summaryEn").value = "An L9-layer study reading negotiation failure, controlled leaks, and escalation rhetoric as a pre-operational architecture for war legitimation rather than a simple diplomatic breakdown.";
        qs("bodyAr").value = "الحدث الظاهر لا يُقرأ كسلسلة أخبار، بل كسؤال بنيوي: ما هو المخطط الذي يجعل الحرب تبدو نتيجة تفاوض فاشل لا قرارًا معدًا مسبقًا؟ وتخلص الدراسة إلى أن السردية ليست شرحًا للقرار، بل جزء من هندسة بيئته.";
        qs("bodyEn").value = "The visible event is not read as a sequence of news items, but as a structural question: What blueprint makes war appear as the result of failed negotiation rather than a pre-arranged decision? The study concludes that narrative is part of the architecture that legitimizes war.";
        qs("classification").value = "L9 Blueprint Deconstruction";
        qs("edition").value = "L9-SOV Blueprint Deconstruction Edition";
        qs("layer").value = "L9";
        qs("mode").value = "Blueprint Deconstruction";
        qs("unit").value = "SSU";
        qs("status").value = "published";
        qs("domain").value = "geo-security";
        qs("region").value = "gaza";
        qs("country").value = "gaza";
        qs("countryId").value = "CTR-GAZA";
        qs("priority").value = "HIGH";
        qs("author").value = "Naeem Dahalan";
        qs("sourcePlatform").value = "internal";
        qs("signalIds").value = "SIG-GAZA-NARRATIVE-001, SIG-GAZA-WAAD-001";
        qs("tags").value = "غزة, L9, Blueprint Deconstruction, War Acceptance Architecture, السردية, شرعنة الحرب, WAAD";
        qs("policyRisk").value = 86;
        qs("implementationDifficulty").value = 72;
        qs("regionalSensitivity").value = 91;
        qs("strategicWeight").value = 94;
        qs("featured").value = "true";
        qs("pinned").value = "true";
        qs("canonical").value = "true";

        renderStatus(t("loadSample"));
      }

      function resetForm(){
        [
          "pubId","titleAr","titleEn","summaryAr","summaryEn","bodyAr","bodyEn",
          "classification","edition","mode","domain","region","country","countryId",
          "signalIds","tags","sourceUrl"
        ].forEach(id => qs(id).value = "");

        qs("pubType").value = "study";
        qs("layer").value = "L1";
        qs("unit").value = "SSU";
        qs("status").value = "published";
        qs("priority").value = "HIGH";
        qs("author").value = "Naeem Dahalan";
        qs("sourcePlatform").value = "internal";
        qs("policyRisk").value = 86;
        qs("implementationDifficulty").value = 72;
        qs("regionalSensitivity").value = 91;
        qs("strategicWeight").value = 94;
        qs("featured").value = "true";
        qs("pinned").value = "true";
        qs("canonical").value = "true";

        renderPreview(null);
        renderStatus(t("noPreview"));
      }

      qs("btnPreview").addEventListener("click", function () {
        const raw = collectFormData();
        renderPreview(previewOnly(raw));
        renderStatus(t("noPreview"));
      });

      qs("btnRegister").addEventListener("click", function () {
        try {
          const raw = collectFormData();
          const registered = window.IBSS_PUBLICATION_INTAKE?.register?.(raw);

          if (!registered) {
            renderStatus(t("registerFail"));
            return;
          }

          renderPreview(registered);
          selectedPublicationId = registered.id;
          renderRegistry();
          renderSelectedPublication();
          renderStatus(t("registerOk"));
        } catch (error) {
          console.error("INTAKE register error:", error);
          renderStatus(`${t("registerFail")} ${error.message || ""}`);
        }
      });

      qs("btnLoadSample").addEventListener("click", function () {
        loadL9Sample();
      });

      qs("btnReset").addEventListener("click", function () {
        resetForm();
      });

      qs("btn-en").addEventListener("click", function () {
        currentLang = "en";
        localStorage.setItem("ibss_lang", "en");
        applyLanguage();
        renderRegistry();
        renderSelectedPublication();
      });

      qs("btn-ar").addEventListener("click", function () {
        currentLang = "ar";
        localStorage.setItem("ibss_lang", "ar");
        applyLanguage();
        renderRegistry();
        renderSelectedPublication();
      });

      window.addEventListener("load", function () {
        applyLanguage();
        renderStatus(t("noPreview"));
        renderPreview(null);
        renderRegistry();
        renderSelectedPublication();
      });
    })();
  </script>
</body>
</html>
