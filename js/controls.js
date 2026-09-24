/* --------------------------------------------------------------------------
   Site controls: dark/light theme + PT/EN language.
   The <html> data-theme / data-lang attributes are seeded before paint by a
   tiny inline script in each page's <head>. This file only wires the header
   buttons, persists choices, keeps meta tags in sync and exposes window.RR.
   -------------------------------------------------------------------------- */
(function(){
  "use strict";
  var root = document.documentElement;

  function store(k, v){ try{ localStorage.setItem(k, v); }catch(e){} }

  function lang(){ return root.getAttribute("data-lang") === "en" ? "en" : "pt"; }
  function theme(){ return root.getAttribute("data-theme") === "light" ? "light" : "dark"; }

  /* Capture the Portuguese <title>/description once so we can swap back. */
  var PT_TITLE = document.title;
  var descEl = document.querySelector('meta[name="description"]');
  var PT_DESC = descEl ? descEl.getAttribute("content") : "";

  var LBL = {
    themeToLight:  { pt: "Ativar modo claro",  en: "Switch to light mode" },
    themeToDark:   { pt: "Ativar modo escuro", en: "Switch to dark mode" },
    langToEn:      { pt: "Switch to English",  en: "Mudar para portugu\u00eas" }
  };

  function syncMeta(){
    var light = theme() === "light";
    var en = lang() === "en";

    var tc = document.querySelector('meta[name="theme-color"]');
    if (tc) tc.setAttribute("content", light ? "#F3F5FC" : "#05060F");

    var cs = document.querySelector('meta[name="color-scheme"]');
    if (cs) cs.setAttribute("content", light ? "light" : "dark");

    var og = document.querySelector('meta[property="og:locale"]');
    if (og) og.setAttribute("content", en ? "en_GB" : "pt_PT");

    var t = document.querySelector("title");
    if (t){
      var enTitle = t.getAttribute("data-en");
      if (enTitle) document.title = (en && enTitle) ? enTitle : PT_TITLE;
    }
    if (descEl){
      var enDesc = descEl.getAttribute("data-en");
      if (enDesc) descEl.setAttribute("content", (en && enDesc) ? enDesc : PT_DESC);
    }
  }

  function syncToggleA11y(){
    var tt = document.getElementById("themeToggle");
    if (tt){
      var light = theme() === "light";
      var lbl = light ? LBL.themeToDark[lang()] : LBL.themeToLight[lang()];
      tt.setAttribute("aria-label", lbl);
      tt.setAttribute("title", lbl);
      tt.setAttribute("aria-pressed", light ? "true" : "false");
    }
    var lt = document.getElementById("langToggle");
    if (lt){
      lt.setAttribute("aria-label", LBL.langToEn[lang()]);
      lt.setAttribute("title", LBL.langToEn[lang()]);
    }
  }

  function setLang(l, silent){
    l = (l === "en") ? "en" : "pt";
    root.setAttribute("data-lang", l);
    root.setAttribute("lang", l === "en" ? "en" : "pt-PT");
    store("rr-lang", l);
    syncMeta();
    syncToggleA11y();
    if (!silent){
      try{ document.dispatchEvent(new CustomEvent("rr:lang", { detail: { lang: l } })); }catch(e){}
    }
  }

  function setTheme(t){
    t = (t === "light") ? "light" : "dark";
    root.setAttribute("data-theme", t);
    store("rr-theme", t);
    syncMeta();
    syncToggleA11y();
  }

  function toggleLang(){
    var lt = document.getElementById("langToggle");
    if (lt){
      lt.classList.remove("flip");
      void lt.offsetWidth; /* restart the animation */
      lt.classList.add("flip");
    }
    setLang(lang() === "en" ? "pt" : "en");
  }

  function toggleTheme(){
    var tt = document.getElementById("themeToggle");
    if (tt){
      /* .ready switches on the transitions/flourish — only after a real click. */
      tt.classList.add("ready");
      tt.classList.remove("pop");
      void tt.offsetWidth;
      tt.classList.add("pop");
      var clear = function(){ tt.classList.remove("pop"); tt.removeEventListener("animationend", clear); };
      tt.addEventListener("animationend", clear);
    }
    setTheme(theme() === "light" ? "dark" : "light");
  }

  function init(){
    syncMeta();
    syncToggleA11y();
    var tt = document.getElementById("themeToggle");
    if (tt) tt.addEventListener("click", toggleTheme);
    var lt = document.getElementById("langToggle");
    if (lt) lt.addEventListener("click", toggleLang);
  }

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.RR = {
    lang: lang,
    theme: theme,
    setLang: setLang,
    setTheme: setTheme,
    toggleLang: toggleLang,
    toggleTheme: toggleTheme
  };
})();
