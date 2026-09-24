(function(){
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  /* Touch devices get the lightweight static hero rather than a continuous canvas loop. */
  var coarsePointer = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
  var canAnimate = !reduce && !coarsePointer;

  function boot(){
    document.body.classList.remove("boot");
    document.body.classList.add("booted");
  }
  if (reduce) { boot(); }
  else { window.requestAnimationFrame(function(){ window.setTimeout(boot, 120); }); }

  var burger = document.getElementById("burger");
  var nav = document.getElementById("nav");
  if (burger && nav){
    function setMenu(open){
      nav.classList.toggle("open", open);
      document.body.classList.toggle("menu-open", open);
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      burger.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
    }
    burger.addEventListener("click", function(){
      setMenu(!nav.classList.contains("open"));
    });
    nav.addEventListener("click", function(e){
      if (e.target.closest("a")) setMenu(false);
    });
    document.addEventListener("keydown", function(e){
      if (e.key === "Escape" && nav.classList.contains("open")){
        setMenu(false);
        burger.focus();
      }
    });
    document.addEventListener("click", function(e){
      if (nav.classList.contains("open") && !nav.contains(e.target) && !burger.contains(e.target)) setMenu(false);
    });
    var desktopNav = window.matchMedia && window.matchMedia("(min-width: 721px)");
    function closeForDesktop(e){ if (e.matches) setMenu(false); }
    if (desktopNav){
      if (desktopNav.addEventListener) desktopNav.addEventListener("change", closeForDesktop);
      else if (desktopNav.addListener) desktopNav.addListener(closeForDesktop);
    }
  }

  var revealables = document.querySelectorAll(".rv, .rv-left, .pathway");
  if ("IntersectionObserver" in window && !reduce){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if (en.isIntersecting){ en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.08 });
    revealables.forEach(function(el){ io.observe(el); });
  } else {
    revealables.forEach(function(el){ el.classList.add("in"); });
  }

  var TOOLS = [
    {note: "Comparar antes de comprometer. Todo o prompt que importa passa primeiro por uma pequena arena de modelos - o vencedor define a direção, os perdedores revelam o que faltava na instrução.", prompt: "Mesmo briefing, três modelos. Ordena por clareza, tom e utilidade. Diz-me o que os perdedores erraram.", out: "Uma decisão ordenada com razão anexa - a escolha do modelo é um passo documentado, não um hábito."},
    {note: "O parceiro de pensamento. Notas confusas de clientes entram; saem estrutura, rascunhos e contra-argumentos. Uso-o para pensar comigo, não por mim.", prompt: "Aqui está o meu briefing confuso. Dá-me 3 estruturas e depois argumenta contra a que eu escolheria naturalmente.", out: "Rascunhos com espinha - e uma lista curta de pontos fracos que ainda tenho de corrigir eu."},
    {note: "Quando a pilha é grande demais para um cérebro. Transcrições longas, documentos e referências entram; sai um mapa do território. Segunda opinião quando o enviesamento de um modelo aparece.", prompt: "Lê os documentos anexos. Cria uma cronologia, lista contradições e responde apenas com base nas fontes.", out: "Um briefing com fontes com que posso discutir - citações incluídas, nada flutua sem evidência."},
    {note: "O motor de clipes. Entra stream longa, saem candidatos verticais curtos. A IA é rápida a encontrar momentos; sou eu que sei que momento significou alguma coisa.", prompt: "Encontra os 5 momentos mais carregados emocionalmente. Ordena pela força do gancho nos primeiros 2 segundos.", out: "Três clipes publicáveis com ganchos e legendas - e uma lista de cortes que poupa uma hora."},
    {note: "A camada de publicação. Modelos, formulários inteligentes e assistentes ligados a produtos reais com Python e JavaScript - para pequenas empresas que só querem que as coisas funcionem.", prompt: "Dada a tarefa mais repetitiva deste cliente, desenha a funcionalidade de IA mais fina que a elimina. Inclui estados de falha.", out: "Uma integração com âmbito definido: endpoints, prompts, ligações à base de dados - e um preço que o cliente entende."},
    {note: "O ofício por trás de cada fluxo de IA. Os prompts dão-te um rascunho; Python e JavaScript dão-te um produto - e a reparação tira-te de apuros quando um build parte.", prompt: "Explica este bug como um sénior: causa raiz, correção mínima, guarda de regressão.", out: "Código a funcionar com razão anexa - revisto, reparado e legível."}
  ];

  var rows = Array.prototype.slice.call(document.querySelectorAll(".tool-row"));
  var panel = document.getElementById("toolPanel");
  var tdNote = document.getElementById("td-note");
  var tdPrompt = document.getElementById("td-prompt");
  var tdOut = document.getElementById("td-out");

  function selectTool(i){
    rows.forEach(function(r, idx){
      var selected = idx === i;
      r.setAttribute("aria-selected", selected ? "true" : "false");
      r.setAttribute("tabindex", selected ? "0" : "-1");
    });
    var t = TOOLS[i];
    if (t && tdNote && tdPrompt && tdOut){
      tdNote.textContent = t.note;
      tdPrompt.textContent = t.prompt;
      tdOut.textContent = t.out;
    }
    if (panel && rows[i]) panel.setAttribute("aria-labelledby", rows[i].id);
  }

  rows.forEach(function(row, i){
    row.addEventListener("click", function(){ selectTool(i); });
    row.addEventListener("mouseenter", function(){ selectTool(i); });
    row.addEventListener("focus", function(){ selectTool(i); });
    row.addEventListener("keydown", function(e){
      var n = null;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") n = (i + 1) % rows.length;
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") n = (i - 1 + rows.length) % rows.length;
      if (e.key === "Home") n = 0;
      if (e.key === "End") n = rows.length - 1;
      if (n !== null){ e.preventDefault(); rows[n].focus(); selectTool(n); }
    });
  });

  if (rows.length){ selectTool(0); }

  var copyBtn = document.getElementById("copyEmail");
  var toast = document.getElementById("toast");
  function showToast(msg){
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    window.setTimeout(function(){ toast.classList.remove("show"); }, 1800);
  }
  if (copyBtn){
    copyBtn.addEventListener("click", function(){
      var email = copyBtn.getAttribute("data-email") || "";
      if (navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(email).then(
          function(){ showToast("Email copiado - " + email); },
          function(){ showToast(email); }
        );
      } else {
        showToast(email);
      }
    });
  }

  var mapNodes = Array.prototype.slice.call(document.querySelectorAll(".map-node"));
  var railSpans = Array.prototype.slice.call(document.querySelectorAll(".map-rail span"));
  if (canAnimate && mapNodes.length){
    var mi = 0;
    window.setInterval(function(){
      mapNodes.forEach(function(n, i){ n.classList.toggle("is-live", i === mi); });
      if (railSpans.length){
        railSpans.forEach(function(s, i){ s.classList.toggle("is-live", i === mi); });
      }
      mi = (mi + 1) % mapNodes.length;
    }, 2400);
  }


  var toTop = document.createElement("a");
  toTop.className = "to-top";
  toTop.href = "#main";
  toTop.setAttribute("aria-label", "Voltar ao topo");
  toTop.textContent = "\u2191";
  document.body.appendChild(toTop);
  var ticking = false;
  function onScroll(){
    if (!ticking){
      window.requestAnimationFrame(function(){
        toTop.classList.toggle("show", window.scrollY > 600);
        ticking = false;
      });
      ticking = true;
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  toTop.addEventListener("click", function(e){
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  });

  try{
  var canvas = document.getElementById("field");
  if (canvas && canAnimate && canvas.getContext){
    var ctx = canvas.getContext("2d");
    var hero = canvas.parentElement;
    var W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);
    var pointer = { x: -999, y: -999, has: false };
    var trail = [];
    var nodes = [];
    var stars = [];
    var meteors = [];
    var idleT = 0;
    var running = true;

    function resize(){
      W = hero.clientWidth; H = hero.clientHeight;
      canvas.width = Math.floor(W * DPR);
      canvas.height = Math.floor(H * DPR);
      canvas.style.width = W + "px";
      canvas.style.height = H + "px";
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    function makeStars(){
      stars = [];
      var count = Math.round((W * H) / 9000);
      for (var s = 0; s < count; s++){
        stars.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: Math.random() < 0.85 ? (0.6 + Math.random() * 0.9) : (1.6 + Math.random() * 1.1),
          p: Math.random() * Math.PI * 2,
          sp: 0.4 + Math.random() * 1.2,
          c: Math.random() < 0.78 ? "237,239,250" : "125,211,252"
        });
      }
    }
    resize();
    makeStars();
    window.addEventListener("resize", function(){ resize(); makeStars(); });
    hero.classList.add("canvas-live");

    hero.addEventListener("pointermove", function(e){
      var r = canvas.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
      pointer.has = true;
      trail.push({ x: pointer.x, y: pointer.y, life: 1 });
      if (trail.length > 90) trail.shift();
      if (Math.random() < 0.16 && nodes.length < 26){
        nodes.push({
          x: pointer.x + (Math.random() * 40 - 20),
          y: pointer.y + (Math.random() * 40 - 20),
          life: 1,
          r: 2 + Math.random() * 3
        });
      }
    }, { passive: true });

    hero.addEventListener("pointerleave", function(){
      pointer.has = false;
    });

    function grid(){
      ctx.clearRect(0, 0, W, H);
      if (Math.random() < 0.005 && meteors.length < 2){
        meteors.push({
          x: W * 0.15 + Math.random() * W * 0.7,
          y: Math.random() * H * 0.35,
          vx: -(2.4 + Math.random() * 1.8),
          vy: 1.2 + Math.random() * 0.9,
          life: 1
        });
      }
      for (var i = 0; i < stars.length; i++){
        var st = stars[i];
        var tw = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(idleT * st.sp + st.p));
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(" + st.c + "," + tw.toFixed(3) + ")";
        ctx.fill();
      }
      for (var m = meteors.length - 1; m >= 0; m--){
        var mt = meteors[m];
        mt.x += mt.vx; mt.y += mt.vy; mt.life -= 0.012;
        if (mt.life <= 0 || mt.x < -80 || mt.y > H + 40){ meteors.splice(m, 1); continue; }
        var tail = 11;
        var grad = ctx.createLinearGradient(mt.x, mt.y, mt.x - mt.vx * tail, mt.y - mt.vy * tail);
        grad.addColorStop(0, "rgba(237,239,250," + (mt.life * 0.95).toFixed(3) + ")");
        grad.addColorStop(0.4, "rgba(167,139,250," + (mt.life * 0.5).toFixed(3) + ")");
        grad.addColorStop(1, "rgba(167,139,250,0)");
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(mt.x, mt.y);
        ctx.lineTo(mt.x - mt.vx * tail, mt.y - mt.vy * tail);
        ctx.stroke();
      }
    }

    function draw(){
      if (!running) return;
      idleT += 0.01;
      if (!pointer.has){
        var ax = W * (0.5 + 0.35 * Math.sin(idleT * 0.7));
        var ay = H * (0.45 + 0.28 * Math.cos(idleT * 0.5));
        trail.push({ x: ax, y: ay, life: 1 });
        if (trail.length > 70) trail.shift();
        if (Math.random() < 0.05 && nodes.length < 18){
          nodes.push({ x: ax + (Math.random()*30-15), y: ay + (Math.random()*30-15), life: 1, r: 2 + Math.random()*2.5 });
        }
      }
      grid();
      for (var i = 0; i < trail.length; i++){
        var p = trail[i];
        p.life -= 0.012;
        if (p.life <= 0) continue;
        var a = p.life * 0.85;
        var rad = 6 + (1 - p.life) * 18;
        var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad);
        g.addColorStop(0, "rgba(167,139,250," + (a * 0.55).toFixed(3) + ")");
        g.addColorStop(0.5, "rgba(125,211,252," + (a * 0.22).toFixed(3) + ")");
        g.addColorStop(1, "rgba(5,6,15,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
        ctx.fill();
      }
      trail = trail.filter(function(p){ return p.life > 0; });
      if (trail.length > 2){
        ctx.strokeStyle = "rgba(125,211,252,0.35)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(trail[0].x, trail[0].y);
        for (var j = 1; j < trail.length; j++) ctx.lineTo(trail[j].x, trail[j].y);
        ctx.stroke();
      }
      for (var k = 0; k < nodes.length; k++){
        var n = nodes[k];
        n.life -= 0.016;
        if (n.life <= 0) continue;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r + (1 - n.life) * 8, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(167,139,250," + (n.life * 0.8).toFixed(3) + ")";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(167,139,250," + n.life.toFixed(3) + ")";
        ctx.fill();
      }
      nodes = nodes.filter(function(n){ return n.life > 0; });
      window.requestAnimationFrame(draw);
    }
    window.requestAnimationFrame(draw);

    document.addEventListener("visibilitychange", function(){
      if (document.hidden){ running = false; }
      else if (!running){ running = true; window.requestAnimationFrame(draw); }
    });

    if ("IntersectionObserver" in window){
      var heroIo = new IntersectionObserver(function(entries){
        entries.forEach(function(en){
          if (en.isIntersecting && !running){ running = true; window.requestAnimationFrame(draw); }
          else if (!en.isIntersecting){ running = false; }
        });
      }, { threshold: 0 });
      heroIo.observe(hero);
    }
  }
  }catch(canvasErr){}

  try{
    if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)){
      navigator.serviceWorker.register("sw.js").catch(function(){});
    }
  }catch(swErr){}
})();
