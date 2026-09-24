/* --------------------------------------------------------------------------
   Site behaviour — Gestalt in orbit.
   Menu, reveals, tools master/detail, copy email, flight-plan cycling,
   back-to-top, starfield (common fate parallax) and the hero pointer trail.
   -------------------------------------------------------------------------- */
(function(){
  "use strict";
  var root = document.documentElement;
  var mq = (typeof window.matchMedia === "function") ? window.matchMedia.bind(window) : null;
  var reduce = mq ? mq("(prefers-reduced-motion: reduce)").matches : false;
  var coarse = mq ? mq("(pointer: coarse)").matches : false;
  var canAnimate = !reduce;
  var raf = window.requestAnimationFrame ? window.requestAnimationFrame.bind(window)
                                         : function(fn){ return window.setTimeout(function(){ fn(Date.now()); }, 16); };

  function lang(){ return root.getAttribute("data-lang") === "en" ? "en" : "pt"; }
  var STR = {
    toTop:   { pt: "Voltar ao topo", en: "Back to top" },
    copied:  { pt: "Email copiado - ", en: "Email copied - " },
    menuOpen:{ pt: "Abrir menu", en: "Open menu" },
    menuClose:{ pt: "Fechar menu", en: "Close menu" }
  };
  function tr(k){ return (STR[k] && STR[k][lang()]) || ""; }

  /* ---------------------------------------------------------------- boot */
  function boot(){ document.body.classList.remove("boot"); document.body.classList.add("booted"); }
  if (reduce) boot(); else raf(function(){ window.setTimeout(boot, 120); });

  /* ---------------------------------------------------------------- menu */
  var burger = document.getElementById("burger");
  var nav = document.getElementById("nav");
  if (burger && nav){
    var setMenu = function(open){
      nav.classList.toggle("open", open);
      document.body.classList.toggle("menu-open", open);
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      burger.setAttribute("aria-label", open ? tr("menuClose") : tr("menuOpen"));
    };
    burger.addEventListener("click", function(){ setMenu(!nav.classList.contains("open")); });
    nav.addEventListener("click", function(e){ if (e.target.closest("a")) setMenu(false); });
    document.addEventListener("keydown", function(e){
      if (e.key === "Escape" && nav.classList.contains("open")){ setMenu(false); burger.focus(); }
    });
    document.addEventListener("click", function(e){
      if (nav.classList.contains("open") && !nav.contains(e.target) && !burger.contains(e.target)) setMenu(false);
    });
    var desk = mq ? mq("(min-width: 1041px)") : null;
    if (desk){
      var close = function(e){ if (e.matches) setMenu(false); };
      if (desk.addEventListener) desk.addEventListener("change", close); else if (desk.addListener) desk.addListener(close);
    }
  }

  /* ------------------------------------------------------------- reveals */
  var revealables = document.querySelectorAll(".rv");
  if ("IntersectionObserver" in window && !reduce){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){ if (en.isIntersecting){ en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });
    revealables.forEach(function(el){ io.observe(el); });
  } else {
    revealables.forEach(function(el){ el.classList.add("in"); });
  }

  /* ------------------------------------------------ tools: master/detail */
  var TOOLS = [
    {note:{pt:"Comparo respostas de modelos diferentes ao mesmo pedido, sem ver qual é qual. O vencedor define a direção; os perdedores mostram o que faltava na instrução.",en:"I compare answers from different models to the same request, without seeing which is which. The winner sets the direction; the losers show what the instruction was missing."},prompt:{pt:"Mesmo briefing, três modelos. Ordena por clareza, tom e utilidade. Diz-me o que os perdedores erraram.",en:"Same brief, three models. Rank for clarity, tone and usefulness. Tell me what the losers got wrong."},out:{pt:"Uma escolha ordenada, com a razão escrita ao lado.",en:"A ranked choice, with the reason written next to it."}},
    {note:{pt:"Notas confusas de clientes entram; saem estrutura, rascunhos e contra-argumentos. Uso-o para pensar comigo, não por mim.",en:"Messy client notes go in; structure, drafts and counter-arguments come out. I use it to think with me, not for me."},prompt:{pt:"Aqui está o meu briefing confuso. Dá-me 3 estruturas e depois argumenta contra a que eu escolheria naturalmente.",en:"Here is my messy brief. Give me 3 structures, then argue against the one I'd naturally pick."},out:{pt:"Rascunhos utilizáveis e uma lista curta de pontos fracos que ainda tenho de corrigir.",en:"Usable drafts plus a short list of weak points I still have to fix."}},
    {note:{pt:"Transcrições longas, documentos e referências entram; sai um mapa do que interessa. Segunda opinião quando o primeiro modelo se desvia.",en:"Long transcripts, documents and references go in; a map of what matters comes out. A second opinion when the first model drifts."},prompt:{pt:"Lê os documentos anexos. Cria uma cronologia, lista contradições e responde apenas com base nas fontes.",en:"Read the attached documents. Build a timeline, list contradictions, and answer only from the sources."},out:{pt:"Um resumo com fontes e citações, para eu poder confirmar cada linha.",en:"A summary with sources and citations, so I can check every line."}},
    {note:{pt:"Entra stream longa, saem clipes verticais. A ferramenta é rápida a encontrar momentos; eu escolho o que publicar.",en:"A long stream goes in, vertical clips come out. The tool is quick to find moments; I pick what gets published."},prompt:{pt:"Encontra os 5 momentos mais carregados emocionalmente. Ordena pela força do gancho nos primeiros 2 segundos.",en:"Find the 5 most emotionally charged moments. Rank by the strength of the hook in the first 2 seconds."},out:{pt:"Três clipes com legendas e uma lista de cortes.",en:"Three clips with captions and a cut list."}},
    {note:{pt:"Modelos, formulários e assistentes ligados a sites com Python e JavaScript, para empresas que só querem que aquilo funcione.",en:"Models, forms and assistants wired into sites with Python and JavaScript, for businesses that just want it to work."},prompt:{pt:"Dada a tarefa mais repetitiva deste cliente, desenha a funcionalidade de IA mais fina que a elimina. Inclui estados de falha.",en:"Given this client's most repetitive task, design the thinnest AI feature that removes it. Include failure states."},out:{pt:"Uma integração com âmbito definido: endpoints, prompts, base de dados e um preço combinado antes de começar.",en:"A scoped integration: endpoints, prompts, database and a price agreed before we start."}},
    {note:{pt:"Os prompts dão um rascunho; Python e JavaScript dão um produto. E quando um build parte, é aqui que se resolve.",en:"Prompts give you a draft; Python and JavaScript give you a product. And when a build breaks, this is where it gets fixed."},prompt:{pt:"Explica este bug como um sénior: causa raiz, correção mínima, guarda de regressão.",en:"Explain this bug like a senior: root cause, minimal fix, regression guard."},out:{pt:"Código a funcionar, revisto e legível.",en:"Working code, reviewed and readable."}}
  ];
  var rows = Array.prototype.slice.call(document.querySelectorAll(".tool-row"));
  var panel = document.getElementById("toolPanel");
  var tdName = document.getElementById("td-name");
  var tdNote = document.getElementById("td-note");
  var tdPrompt = document.getElementById("td-prompt");
  var tdOut = document.getElementById("td-out");
  var currentTool = 0;
  function visibleText(el){
    if (!el) return "";
    var clone = el.cloneNode(true);
    var hide = clone.querySelectorAll(lang() === "en" ? ".pt" : ".en");
    for (var i = 0; i < hide.length; i++) hide[i].remove();
    return clone.textContent.trim();
  }
  function selectTool(i){
    currentTool = i;
    rows.forEach(function(r, idx){
      var s = idx === i;
      r.setAttribute("aria-selected", s ? "true" : "false");
      r.setAttribute("tabindex", s ? "0" : "-1");
    });
    var t = TOOLS[i], L = lang();
    if (t && tdNote && tdPrompt && tdOut){
      tdNote.textContent = t.note[L];
      tdPrompt.textContent = t.prompt[L];
      tdOut.textContent = t.out[L];
    }
    if (tdName && rows[i]) tdName.textContent = visibleText(rows[i].querySelector(".t-name"));
    if (panel && rows[i]) panel.setAttribute("aria-labelledby", rows[i].id);
  }
  rows.forEach(function(row, i){
    row.addEventListener("click", function(){ selectTool(i); });
    row.addEventListener("focus", function(){ selectTool(i); });
    if (!coarse) row.addEventListener("mouseenter", function(){ selectTool(i); });
    row.addEventListener("keydown", function(e){
      var n = null;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") n = (i + 1) % rows.length;
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") n = (i - 1 + rows.length) % rows.length;
      if (e.key === "Home") n = 0;
      if (e.key === "End") n = rows.length - 1;
      if (n !== null){ e.preventDefault(); rows[n].focus(); selectTool(n); }
    });
  });
  if (rows.length) selectTool(0);

  /* ---------------------------------------------------------- copy email */
  var copyBtn = document.getElementById("copyEmail");
  var toast = document.getElementById("toast");
  var toastT = null;
  function showToast(msg){
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    window.clearTimeout(toastT);
    toastT = window.setTimeout(function(){ toast.classList.remove("show"); }, 2000);
  }
  if (copyBtn){
    copyBtn.addEventListener("click", function(){
      var email = copyBtn.getAttribute("data-email") || "";
      if (navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(email).then(function(){ showToast(tr("copied") + email); }, legacy);
      } else legacy();
      function legacy(){
        var ta = document.createElement("textarea");
        ta.value = email; ta.setAttribute("readonly", "");
        ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select();
        var ok = false;
        try{ ok = document.execCommand("copy"); }catch(err){}
        document.body.removeChild(ta);
        showToast(ok ? tr("copied") + email : email);
      }
    });
  }

  /* --------------------------------- flight plan: route + rail move together */
  var routes = Array.prototype.slice.call(document.querySelectorAll(".route"));
  var railSpans = Array.prototype.slice.call(document.querySelectorAll(".rail span"));
  if (canAnimate && routes.length){
    var mi = 0, routeTimer = 0;
    var cycleRoutes = function(){
      mi = (mi + 1) % Math.max(routes.length, railSpans.length);
      routes.forEach(function(n, i){ n.classList.toggle("is-live", i === mi % routes.length); });
      railSpans.forEach(function(s, i){ s.classList.toggle("is-live", i === mi % railSpans.length); });
    };
    var armRoutes = function(){
      window.clearInterval(routeTimer);
      routeTimer = 0;
      if (document.hidden) return;
      routeTimer = window.setInterval(cycleRoutes, 2600);
    };
    armRoutes();
    document.addEventListener("visibilitychange", armRoutes);
  }

  /* --------------------------------------------------------- back to top */
  var toTop = document.createElement("a");
  toTop.className = "to-top";
  toTop.href = "#main";
  toTop.setAttribute("aria-label", tr("toTop"));
  toTop.textContent = "\u2191";
  document.body.appendChild(toTop);
  document.addEventListener("rr:lang", function(){
    toTop.setAttribute("aria-label", tr("toTop"));
    if (rows.length) selectTool(currentTool);
    if (burger) burger.setAttribute("aria-label", nav && nav.classList.contains("open") ? tr("menuClose") : tr("menuOpen"));
  });
  var ticking = false;
  window.addEventListener("scroll", function(){
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function(){ toTop.classList.toggle("show", window.scrollY > 700); ticking = false; });
  }, { passive: true });
  toTop.addEventListener("click", function(e){ e.preventDefault(); window.scrollTo({ top: 0, behavior: (reduce || coarse) ? "auto" : "smooth" }); });

  /* Pause the marquee while it is off screen. The track is a wide stroked
     headline; there is no point compositing it on pages that never show it. */
  var marq = document.querySelector(".marquee-track");
  if (marq && "IntersectionObserver" in window){
    marq.style.animationPlayState = "paused";
    new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        marq.style.animationPlayState = (en.isIntersecting && !reduce) ? "running" : "paused";
      });
    }, { rootMargin: "120px" }).observe(marq.parentElement || marq);
  }

  /* ----------------------------------------------------------------------
     SKY — three depth layers that drift with scroll (common fate).
     Painted only when the page actually changes: first frame, scroll,
     resize, theme. A continuous twinkle loop sat under the header's
     backdrop-filter and forced a re-blur on every frame, which is what
     made scrolling feel heavy. Stars are batched by colour (a handful of
     fills, not one path per star) and the bitmap stays at 1x — dots do
     not need a retina buffer.
     ---------------------------------------------------------------------- */
  try{
    var sky = document.getElementById("sky");
    if (sky && sky.getContext){
      var sctx = sky.getContext("2d");
      var SW = 0, SH = 0, viewW = 0, viewH = 0, layers = [];
      var saveData = false;
      try{ saveData = !!(navigator.connection && navigator.connection.saveData); }catch(e){}
      var tightSky = reduce || coarse || saveData;
      var palette = function(){
        var light = root.getAttribute("data-theme") === "light";
        return light ? ["20,24,48", "11,119,168", "109,74,224"] : ["236,238,250", "125,211,252", "167,139,250"];
      };
      var buffers = [];
      var bakeSky = function(){
        var pal = palette();
        var light = root.getAttribute("data-theme") === "light";
        var k = light ? 0.35 : 1;
        buffers = layers.map(function(L){
          var c = document.createElement("canvas");
          c.width = SW; c.height = SH;
          var g = c.getContext("2d");
          if (!g) return c;
          for (var ci = 0; ci < 3; ci++){
            g.beginPath();
            var any = false;
            for (var i = 0; i < L.stars.length; i++){
              var s = L.stars[i];
              if (s.c !== ci) continue;
              any = true;
              g.moveTo(s.x + s.r, s.y);
              g.arc(s.x, s.y, s.r, 0, 6.2832);
            }
            if (!any) continue;
            g.fillStyle = "rgba(" + pal[ci] + "," + (L.a * k).toFixed(3) + ")";
            g.fill();
          }
          return c;
        });
      };
      var seedSky = function(){
        viewW = window.innerWidth;
        viewH = window.innerHeight;
        /* CSS sizes the element. Cap the bitmap so a 4K window cannot
           allocate four full-screen buffers, and stay at 1x so retina
           phones don't pay for a buffer that is uploaded on every scroll. */
        var cap = tightSky ? 700000 : 1600000;
        var scale = (viewW * viewH > cap) ? Math.sqrt(cap / (viewW * viewH)) : 1;
        SW = Math.max(1, Math.round(viewW * scale));
        SH = Math.max(1, Math.round(viewH * scale));
        sky.width = SW; sky.height = SH;
        sctx.setTransform(1, 0, 0, 1, 0, 0);
        var area = SW * SH;
        var div = tightSky ? 1.35 : 1;
        var spec = [
          { n: Math.min(tightSky ? 90 : 320, Math.round(area / (5200 * div))), r: [0.35, 0.8], speed: 0.04, a: 0.45 },
          { n: Math.min(tightSky ? 40 : 140, Math.round(area / (16000 * div))), r: [0.8, 1.3], speed: 0.10, a: 0.7 },
          { n: Math.min(tightSky ? 16 : 48, Math.round(area / (60000 * div))), r: [1.3, 2.0], speed: 0.20, a: 0.95 }
        ];
        layers = spec.map(function(s){
          var stars = [];
          for (var i = 0; i < s.n; i++){
            var roll = Math.random();
            stars.push({
              x: Math.random() * SW,
              y: Math.random() * SH,
              r: s.r[0] + Math.random() * (s.r[1] - s.r[0]),
              c: roll < 0.8 ? 0 : (roll < 0.92 ? 1 : 2)
            });
          }
          return { stars: stars, speed: s.speed, a: s.a };
        });
        bakeSky();
      };
      /* Scroll only blits the three pre-rendered layers. Rebuilding arcs
         here is what made the page hitch while the finger was still down. */
      var drawSky = function(){
        if (!SW || !SH || !buffers.length) return;
        sctx.setTransform(1, 0, 0, 1, 0, 0);
        sctx.clearRect(0, 0, SW, SH);
        var sy = window.scrollY || 0;
        for (var l = 0; l < buffers.length; l++){
          var off = (sy * layers[l].speed) % SH;
          sctx.drawImage(buffers[l], 0, -off);
          sctx.drawImage(buffers[l], 0, SH - off);
        }
      };
      var skyScroll = false;
      var paintSky = function(){ skyScroll = false; drawSky(); };
      seedSky();
      drawSky();
      window.addEventListener("scroll", function(){
        if (skyScroll || document.hidden) return;
        skyScroll = true;
        raf(paintSky);
      }, { passive: true });
      window.addEventListener("load", paintSky);
      var skyResizeT = 0;
      window.addEventListener("resize", function(){
        window.clearTimeout(skyResizeT);
        skyResizeT = window.setTimeout(function(){
          var w = window.innerWidth, h = window.innerHeight;
          /* Ignore the mobile URL-bar resize so stars don't flash. */
          if (w === viewW && Math.abs(h - viewH) < 140) return;
          seedSky();
          drawSky();
        }, 150);
      });
      var mo = new MutationObserver(function(){ bakeSky(); drawSky(); });
      mo.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    }
  }catch(skyErr){}

  /* ----------------------------------------------------------------------
     HERO — pointer leaves a short comet trail (desktop only).
     The loop runs only while a trail or meteor is on screen, then stops.
     ---------------------------------------------------------------------- */
  try{
    var canvas = document.getElementById("field");
    if (canvas && canAnimate && !coarse && canvas.getContext){
      var ctx = canvas.getContext("2d");
      var hero = canvas.parentElement;
      var W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 1.5);
      var trail = [], meteors = [], looping = false, heroOn = true;
      var resizeHero = function(){
        W = hero.clientWidth; H = hero.clientHeight;
        if (!W || !H) return;
        canvas.width = Math.floor(W * DPR); canvas.height = Math.floor(H * DPR);
        canvas.style.width = W + "px"; canvas.style.height = H + "px";
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      };
      var heroResizeT = 0;
      resizeHero();
      window.addEventListener("resize", function(){
        window.clearTimeout(heroResizeT);
        heroResizeT = window.setTimeout(resizeHero, 120);
      });
      var kickHero = function(){
        if (!heroOn || looping) return;
        looping = true;
        raf(drawHero);
      };
      hero.addEventListener("pointermove", function(e){
        if (!heroOn) return;
        var r = canvas.getBoundingClientRect();
        trail.push({ x: e.clientX - r.left, y: e.clientY - r.top, life: 1 });
        if (trail.length > 28) trail.shift();
        kickHero();
      }, { passive: true });
      var drawHero = function(){
        if (!looping) return;
        ctx.clearRect(0, 0, W, H);
        var busy = false;
        for (var m = meteors.length - 1; m >= 0; m--){
          var mt = meteors[m];
          mt.x += mt.vx; mt.y += mt.vy; mt.life -= 0.02;
          if (mt.life <= 0){ meteors.splice(m, 1); continue; }
          busy = true;
          ctx.strokeStyle = "rgba(236,238,250," + (mt.life * 0.85).toFixed(3) + ")";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(mt.x, mt.y);
          ctx.lineTo(mt.x - mt.vx * 12, mt.y - mt.vy * 12);
          ctx.stroke();
        }
        var next = [];
        for (var i = 0; i < trail.length; i++){
          trail[i].life -= 0.04;
          if (trail[i].life > 0) next.push(trail[i]);
        }
        trail = next;
        if (trail.length > 1){
          busy = true;
          ctx.lineCap = "round";
          for (var j = 1; j < trail.length; j++){
            var a = trail[j - 1], b = trail[j];
            ctx.strokeStyle = "rgba(125,211,252," + (b.life * 0.55).toFixed(3) + ")";
            ctx.lineWidth = 1 + b.life * 1.4;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
          var head = trail[trail.length - 1];
          ctx.beginPath(); ctx.arc(head.x, head.y, 2.5, 0, 6.2832);
          ctx.fillStyle = "rgba(167,139,250," + head.life.toFixed(3) + ")"; ctx.fill();
        }
        if (busy && heroOn) raf(drawHero);
        else { looping = false; ctx.clearRect(0, 0, W, H); }
      };
      var meteorT = 0;
      var armMeteor = function(){
        window.clearTimeout(meteorT);
        meteorT = window.setTimeout(function(){
          if (heroOn && !document.hidden && meteors.length < 1 && Math.random() < 0.7){
            meteors.push({ x: W * (0.3 + Math.random() * 0.6), y: Math.random() * H * 0.3, vx: -(3 + Math.random() * 2), vy: 1.4 + Math.random(), life: 1 });
            kickHero();
          }
          armMeteor();
        }, 3200);
      };
      if ("IntersectionObserver" in window){
        new IntersectionObserver(function(entries){
          entries.forEach(function(en){
            heroOn = en.isIntersecting && !document.hidden;
            if (!heroOn){ looping = false; trail = []; meteors = []; ctx.clearRect(0, 0, W, H); }
          });
        }).observe(hero);
      }
      document.addEventListener("visibilitychange", function(){
        if (document.hidden){ heroOn = false; looping = false; }
        else heroOn = true;
      });
      armMeteor();
    }
  }catch(heroErr){}

  /* --------------------------------------------------------- offline */
  try{
    if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)){
      navigator.serviceWorker.register("sw.js").catch(function(){});
    }
  }catch(swErr){}

  /* Work page: "Talk to Ajuda" opens the corner guide (when it is enabled). */
  document.addEventListener("click", function(e){
    var opener = e.target && e.target.closest ? e.target.closest("[data-ajuda-open]") : null;
    if (!opener) return;
    if (window.RR_AJUDA && window.RR_AJUDA.open) window.RR_AJUDA.open(true);
    else window.location.href = "contacto.html#contact";
  });
})();
