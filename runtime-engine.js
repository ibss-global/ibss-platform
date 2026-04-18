window.IBSS_RUNTIME = (function () {
  "use strict";

  const CONFIG = {
    storageKey: "ibss_runtime_state_v6",
    defaultRefreshMs: 4000,
    minRefreshMs: 1000,
    maxRefreshMs: 60000,

    tickerStepPx: 0.7,
    tickerFrameMs: 20,
    minTickerCopies: 3,
    deadTickerRetryEvery: 18
  };

  const STATE = {
    started: false,
    lang: "en",
    system: null,

    refreshMs: CONFIG.defaultRefreshMs,
    refreshTimer: null,

    tickerTrackEl: null,
    tickerAnimationId: null,
    tickerItems: [],
    tickerSignature: "",
    tickerOffset: 0,
    tickerCycleWidth: 0,

    afterRender: null,
    systemProvider: null
  };

  /* ========= UTIL ========= */

  const safeText = (v,f="") => typeof v==="string" && v.trim()?v.trim():f;
  const safeNumber = (v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
  const asArray = v => Array.isArray(v)?v:[];
  const clamp = (v,min,max)=>Math.max(min,Math.min(max,v));

  function getText(v){
    if(!v) return "";
    if(typeof v==="string") return v;
    return v.en || v.ar || v.text || v.title || "";
  }

  function priorityClass(p){
    p = String(p||"LOW").toUpperCase();
    if(p==="HIGH") return "high";
    if(p==="MEDIUM") return "medium";
    return "low";
  }

  function escapeHtml(text){
    const d=document.createElement("div");
    d.textContent=text||"";
    return d.innerHTML;
  }

  /* ========= STORAGE ========= */

  function saveState(){
    try{
      localStorage.setItem(CONFIG.storageKey, JSON.stringify({
        lang:STATE.lang,
        refreshMs:STATE.refreshMs
      }));
    }catch(e){}
  }

  function loadState(){
    try{
      const raw = localStorage.getItem(CONFIG.storageKey);
      if(!raw) return;
      const p = JSON.parse(raw);
      STATE.lang = p.lang || "en";
      STATE.refreshMs = clamp(safeNumber(p.refreshMs,CONFIG.defaultRefreshMs),1000,60000);
    }catch(e){}
  }

  /* ========= TICKER ========= */

  function buildTicker(system){
    const feed = asArray(system?.publisherFeed || system?.feed);

    if(feed.length){
      return feed.map(f=>({
        text:getText(f),
        priority:f.priority || system.level
      }));
    }

    return [{
      text: STATE.lang==="ar" ? "النظام في وضع المراقبة" : "System monitoring",
      priority:"LOW"
    }];
  }

  function renderTicker(items){
    if(!STATE.tickerTrackEl) return;

    const base = items.length?items:[{text:"-",priority:"LOW"}];
    const all = [];

    for(let i=0;i<CONFIG.minTickerCopies;i++){
      all.push(...base);
    }

    STATE.tickerTrackEl.innerHTML = all.map(i=>`
      <div class="ticker-item">
        <span class="ticker-dot ${priorityClass(i.priority)}"></span>
        <span class="ticker-item-text">${escapeHtml(i.text)}</span>
      </div>
    `).join("");

    requestAnimationFrame(()=>{
      STATE.tickerCycleWidth = STATE.tickerTrackEl.scrollWidth / CONFIG.minTickerCopies;
    });
  }

  function animateTicker(){
    if(!STATE.tickerTrackEl) return;

    STATE.tickerOffset += CONFIG.tickerStepPx;

    if(STATE.tickerOffset >= STATE.tickerCycleWidth){
      STATE.tickerOffset = 0;
    }

    STATE.tickerTrackEl.style.transform =
      `translateX(${STATE.lang==="ar"?STATE.tickerOffset:-STATE.tickerOffset}px)`;

    STATE.tickerAnimationId = requestAnimationFrame(animateTicker);
  }

  function refreshTicker(system){
    if(!STATE.tickerTrackEl) return;

    const items = buildTicker(system);
    const sig = JSON.stringify(items);

    if(sig !== STATE.tickerSignature){
      STATE.tickerSignature = sig;
      STATE.tickerItems = items;

      renderTicker(items);

      cancelAnimationFrame(STATE.tickerAnimationId);
      STATE.tickerAnimationId = requestAnimationFrame(animateTicker);
    }
  }

  /* ========= SYSTEM ========= */

  function getSystem(){
    try{
      if(STATE.systemProvider) return STATE.systemProvider();

      if(window.IBSS_ENGINE?.getSystemState){
        return window.IBSS_ENGINE.getSystemState();
      }
    }catch(e){}
    return null;
  }

  /* ========= RENDER ========= */

  function render(system){
    if(!system) return null;

    STATE.system = system;

    refreshTicker(system);

    // 🔥 AUDIO HOOK
    try{
      window.IBSS_AUDIO?.updateFromSystem?.(system);
    }catch(e){
      console.error("audio error",e);
    }

    if(STATE.afterRender){
      try{ STATE.afterRender(system); }catch(e){}
    }

    return system;
  }

  function frame(){
    const sys = getSystem();
    if(!sys) return;
    render(sys);
  }

  function loop(){
    clearInterval(STATE.refreshTimer);

    STATE.refreshTimer = setInterval(()=>{
      frame();
    }, STATE.refreshMs);
  }

  /* ========= API ========= */

  function start(opt={}){
    loadState();

    STATE.lang = opt.lang || STATE.lang;
    STATE.refreshMs = opt.refreshMs || STATE.refreshMs;
    STATE.tickerTrackEl = opt.tickerTrackEl || null;
    STATE.afterRender = opt.afterRender || null;
    STATE.systemProvider = opt.systemProvider || null;

    saveState();
    loop();

    return frame();
  }

  function setLanguage(l){
    STATE.lang = l;
    saveState();
    if(STATE.system) refreshTicker(STATE.system);
  }

  function stop(){
    clearInterval(STATE.refreshTimer);
    cancelAnimationFrame(STATE.tickerAnimationId);
  }

  return {
    start,
    stop,
    setLanguage
  };

})();
