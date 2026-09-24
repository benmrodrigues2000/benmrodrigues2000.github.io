/* --------------------------------------------------------------------------
   Ajuda - the site's navigation agent.

   A small concierge that lives in the bottom-right corner. It asks why the
   visitor is here and where they came from, then routes them to the right
   page (and section) with one click. Free-typing is matched against a local
   knowledge base - no network calls, no cookies, nothing leaves the browser.

   Bilingual: follows <html data-lang> and re-renders on the "rr:lang" event
   fired by js/controls.js. Theming comes from the same CSS tokens.

   Public surface: window.RR_AJUDA = { open, close, toggle, ask }
   -------------------------------------------------------------------------- */
(function(){
  "use strict";

  var D = document;
  var root = D.documentElement;

  /* ------------------------------------------------------------ helpers -- */
  function lang(){ return root.getAttribute("data-lang") === "en" ? "en" : "pt"; }
  /* t() picks the active language from a {pt,en} pair (or passes strings). */
  function t(v){ return (v && typeof v === "object") ? (v[lang()] || v.pt || "") : (v == null ? "" : v); }
  function norm(s){
    var v = String(s == null ? "" : s).toLowerCase();
    try{ v = v.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }catch(e){}
    /* Punctuation becomes a space so "site?" still matches the word "site".
       Accents are already gone, so an ASCII-only class is safe here. */
    return v.replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
  }
  function ssGet(k){ try{ return sessionStorage.getItem(k); }catch(e){ return null; } }
  function ssSet(k, v){ try{ sessionStorage.setItem(k, v); }catch(e){} }
  function ssDel(k){ try{ sessionStorage.removeItem(k); }catch(e){} }
  function lsGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
  function lsSet(k, v){ try{ localStorage.setItem(k, v); }catch(e){} }

  var reduce = false;
  try{ reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches; }catch(e){}

  /* --------------------------------------------------------------- pages -- */
  /* Every destination the agent can hand a visitor. Keep in sync with sw.js. */
  var PAGES = {
    index:       { file:"index.html",       name:{pt:"Início",    en:"Home"} },
    sobre:       { file:"sobre.html",       name:{pt:"Sobre",     en:"About"} },
    ferramentas: { file:"ferramentas.html", name:{pt:"Ferramentas", en:"Tools"} },
    percurso:    { file:"percurso.html",    name:{pt:"Percurso",  en:"Journey"} },
    cvpage:      { file:"cv.html",          name:{pt:"CV",        en:"CV"} },
    trabalhos:   { file:"trabalhos.html",   name:{pt:"Trabalhos", en:"Work"} },
    contacto:    { file:"contacto.html",    name:{pt:"Contacto",  en:"Contact"} }
  };
  var EXTERNAL = {
    briefing: { href:"briefing.html",                    name:{pt:"Briefing de Missão", en:"Mission Briefing"} },
    postal:   { href:"postal/",                          name:{pt:"Postal imprimível",  en:"Printable postcard"} },
    cv:       { href:"cv.pdf",                           name:{pt:"CV (PDF)",           en:"CV (PDF)"}, download:true },
    provador: { href:"https://freedomoutdoor.pt/provador", name:{pt:"O Provador no ar", en:"O Provador, live"}, out:true },
    github:   { href:"https://github.com/benmrodrigues2000", name:{pt:"GitHub",          en:"GitHub"}, out:true },
    email:    { href:"mailto:benmrodrigues2000@gmail.com",  name:{pt:"Email direto",    en:"Direct email"} }
  };

  /* In-page sections, used the moment a visitor lands somewhere. */
  var SECTIONS = {
    index: [{ h:"#about", name:{pt:"O plano de voo", en:"The flight plan"},
              note:{pt:"3 rotas · estado atual", en:"3 routes · current status"} }],
    sobre: [
      { h:"#sobre",  name:{pt:"Quem está por trás", en:"Who's behind it"}, note:{pt:"idade, origem, percursos", en:"age, origin, moves"} },
      { h:"#method", name:{pt:"O método", en:"The method"},                note:{pt:"briefing → modelos → entrega", en:"brief → models → delivery"} }
    ],
    ferramentas: [{ h:"#tools", name:{pt:"O stack", en:"The stack"},
                    note:{pt:"6 ferramentas em uso diário", en:"6 tools in daily use"} }],
    cvpage: [{ h:"#cv", name:{pt:"Currículo", en:"Curriculum"},
               note:{pt:"uma página, cinco blocos", en:"one page, five blocks"} }],
    percurso: [{ h:"#curriculum", name:{pt:"Índice de capacidades", en:"Capability index"},
                 note:{pt:"3 rotas, prova por etapa", en:"3 routes, proof per step"} }],
    trabalhos: [
      { h:"#provador", name:{pt:"O Provador (caso de estudo)", en:"O Provador (case study)"}, note:{pt:"cliente real, em produção", en:"real client, live"} },
      { h:"#ferramentas-vivas", name:{pt:"Ferramentas públicas", en:"Public tools"}, note:{pt:"briefing e postal", en:"briefing and postcard"} },
      { h:"#ajuda", name:{pt:"O agente Ajuda", en:"The Ajuda agent"}, note:{pt:"como o guia decide", en:"how the guide decides"} },
      { h:"#metodo", name:{pt:"O critério", en:"The criterion"}, note:{pt:"como comparo respostas", en:"how I compare answers"} }
    ],
    contacto: [{ h:"#contact", name:{pt:"Serviços e contacto", en:"Services and contact"},
                 note:{pt:"4 serviços · email · CV", en:"4 services · email · CV"} }]
  };

  function currentPage(){
    var p = location.pathname.split("/").pop() || "index.html";
    for (var k in PAGES){ if (PAGES[k].file === p) return k; }
    return "";
  }
  function pageFromRef(url){
    if (!url) return "";
    try{
      var u = new URL(url, location.href);
      if (u.origin !== location.origin) return "ext:" + u.hostname.replace(/^www\./, "");
      var p = u.pathname.split("/").pop() || "index.html";
      for (var k in PAGES){ if (PAGES[k].file === p) return k; }
      if (p === "briefing.html") return "ext:briefing";
    }catch(e){}
    return "";
  }

  /* --------------------------------------------------------------- goals -- */
  /* Step 1 - why the visitor is here. Each goal owns its routing matrix. */
  var GOALS = [
    {
      id:"negocio",
      label:{ pt:"Quero um site para o meu negócio", en:"I want a website for my business" },
      echo:{ pt:"negócio", en:"business" },
      route:function(){
        return {
          head:{ pt:"Rota: novo projeto", en:"Route: new project" },
          text:{
            pt:"Começa no contacto, onde estão os quatro serviços (site completo, landing page, integração de IA e reparações). Se já souberes o que queres, o briefing de missão poupa a primeira reunião: respondes a oito módulos e envias-me o relatório.",
            en:"Start with contact, where the four services live (full site, landing page, AI integration and repairs). If you already know what you want, the mission briefing skips the first meeting: you answer eight modules and send me the report."
          },
          acts:[
            { page:"contacto", hash:"#contact", label:{pt:"Ver serviços e contacto", en:"See services and contact"},
              note:{pt:"4 serviços · email · CV", en:"4 services · email · CV"}, primary:true },
            { page:"briefing", label:{pt:"Preencher o briefing", en:"Fill in the briefing"},
              note:{pt:"8 módulos · ~15 min · zero tecnicismos", en:"8 modules · ~15 min · zero jargon"} },
            { page:"trabalhos", label:{pt:"Ver o que já entreguei", en:"See what I've delivered"},
              note:{pt:"O Provador, à frente de um cliente", en:"O Provador, in front of a client"} }
          ]
        };
      }
    },
    {
      id:"trabalhos",
      label:{ pt:"Quero ver os trabalhos", en:"I want to see the work" },
      echo:{ pt:"os trabalhos", en:"the work" },
      route:function(){
        return {
          head:{ pt:"Rota: prova", en:"Route: proof" },
          text:{
            pt:"A página Trabalhos abre pelo caso de estudo do Provador (quiz de recomendação com stock real, ligado à base de dados da Freedom Outdoor), mostra as ferramentas públicas, desmonta o próprio guia Ajuda por dentro e fecha com o critério de decisão por trás de tudo.",
            en:"The Work page opens with the O Provador case study (a recommendation quiz on real stock, wired to Freedom Outdoor's database), shows the public tools, takes the Ajuda guide itself apart inside, and closes with the decision criterion behind it all."
          },
          acts:[
            { page:"trabalhos", hash:"#provador", label:{pt:"Abrir o caso do Provador", en:"Open the Provador case"},
              note:{pt:"5 perguntas · 60 segundos · 310 modelos", en:"5 questions · 60 seconds · 310 models"}, primary:true },
            { page:"provador", label:{pt:"Ver o Provador a funcionar", en:"Use O Provador live"},
              note:{pt:"freedomoutdoor.pt/provador", en:"freedomoutdoor.pt/provador"} },
            { page:"trabalhos", hash:"#ferramentas-vivas", label:{pt:"Ferramentas públicas", en:"Public tools"},
              note:{pt:"briefing e postal imprimível", en:"briefing and printable postcard"} }
          ]
        };
      }
    },
    {
      id:"ia",
      label:{ pt:"Quero IA dentro de um produto", en:"I want AI inside a product" },
      echo:{ pt:"integração de IA", en:"AI integration" },
      route:function(){
        return {
          head:{ pt:"Rota: IA em produção", en:"Route: AI in production" },
          text:{
            pt:"É o serviço 03: assistentes e formulários inteligentes ligados ao teu fluxo de trabalho. Para ver a fundação, o Percurso mostra as duas rotas de IA (prompt & conversação, integrações & código) - e o Provador foi construído exatamente com esta lógica.",
            en:"That's service 03: assistants and smart forms wired into your workflow. To see the foundation, Journey shows the two AI routes (prompt & conversation, integrations & code) - and O Provador was built with exactly this logic."
          },
          acts:[
            { page:"contacto", hash:"#contact", label:{pt:"Falar sobre integração de IA", en:"Talk about AI integration"},
              note:{pt:"serviço 03 · resposta direta", en:"service 03 · straight answer"}, primary:true },
            { page:"percurso", hash:"#curriculum", label:{pt:"Ver as rotas de IA", en:"See the AI routes"},
              note:{pt:"prompt, contexto, guardrails, APIs", en:"prompt, context, guardrails, APIs"} },
            { page:"trabalhos", hash:"#provador", label:{pt:"Um sistema de IA em produção", en:"An AI system in production"},
              note:{pt:"O Provador, Freedom Outdoor", en:"O Provador, Freedom Outdoor"} }
          ]
        };
      }
    },
    {
      id:"recrutador",
      label:{ pt:"Sou recrutador / quero o CV", en:"I'm a recruiter / I want the CV" },
      echo:{ pt:"recrutamento", en:"recruiting" },
      route:function(){
        return {
          head:{ pt:"Rota: currículo", en:"Route: résumé" },
          text:{
            pt:"O CV em PDF tem o essencial para triagem; o Percurso dá a versão longa - três rotas de capacidade com provas, sem certificados. Se precisares de contexto humano (idade, de onde venho, o que fiz antes), está na página Sobre.",
            en:"The PDF CV has what screening needs; Journey gives the long version - three capability routes with proof, no certificates. If you need human context (age, where I'm from, what I did before), it's on the About page."
          },
          acts:[
            { page:"cv", label:{pt:"Descarregar o CV (PDF)", en:"Download the CV (PDF)"},
              note:{pt:"triagem rápida", en:"quick screening"}, primary:true },
            { page:"percurso", hash:"#curriculum", label:{pt:"Índice de capacidades", en:"Capability index"},
              note:{pt:"3 rotas · evidência por etapa", en:"3 routes · evidence per step"} },
            { page:"sobre", hash:"#sobre", label:{pt:"Contexto e percurso", en:"Context and journey"},
              note:{pt:"26 anos · Esmoriz, PT", en:"26 years old · Esmoriz, PT"} }
          ]
        };
      }
    },
    {
      id:"metodo",
      label:{ pt:"Quero ver como trabalhas", en:"I want to see how you work" },
      echo:{ pt:"o teu método", en:"your method" },
      route:function(){
        return {
          head:{ pt:"Rota: método", en:"Route: method" },
          text:{
            pt:"O método está em dois sítios: na página Sobre (definir o resultado antes de escrever o primeiro prompt) e em Trabalhos, no critério - respostas comparadas numa arena de modelos, nunca aceites à primeira.",
            en:"The method lives in two places: on About (define the outcome before writing the first prompt) and on Work, in the criterion - answers compared in a model arena, never accepted on the first try."
          },
          acts:[
            { page:"sobre", hash:"#method", label:{pt:"Abrir o método", en:"Open the method"},
              note:{pt:"briefing → rascunho → crítica → publicação", en:"brief → draft → critique → publish"}, primary:true },
            { page:"trabalhos", hash:"#metodo", label:{pt:"O critério de decisão", en:"The decision criterion"},
              note:{pt:"arena de modelos com veredicto", en:"model arena with a verdict"} },
            { page:"ferramentas", hash:"#tools", label:{pt:"As ferramentas do dia a dia", en:"The day-to-day tools"},
              note:{pt:"6 ferramentas em uso ativo", en:"6 tools in active use"} }
          ]
        };
      }
    },
    {
      id:"perdido",
      label:{ pt:"Não sei bem / estou a explorar", en:"Not sure / just exploring" },
      echo:{ pt:"explorar", en:"exploring" },
      route:function(){
        return {
          head:{ pt:"Rota: mapa completo", en:"Route: full map" },
          text:{
            pt:"Sem problema. O site tem seis páginas: Início (o plano de voo), Sobre (quem está por trás), Ferramentas (o stack), Percurso (as três rotas), Trabalhos (o Provador e as provas) e Contacto (serviços). Salta para onde quiseres - ou continua a perguntar-me.",
            en:"No problem. The site has six pages: Home (the flight plan), About (who's behind it), Tools (the stack), Journey (the three routes), Work (O Provador and the proof) and Contact (services). Jump wherever you like - or keep asking me."
          },
          acts:[
            { page:"trabalhos", hash:"#provador", label:{pt:"Ver o caso do Provador", en:"See the Provador case"},
              note:{pt:"a prova mais concreta", en:"the most concrete proof"}, primary:true },
            { page:"percurso", hash:"#curriculum", label:{pt:"Perceber o que faço", en:"Understand what I do"},
              note:{pt:"3 rotas de capacidade", en:"3 capability routes"} },
            { page:"contacto", hash:"#contact", label:{pt:"Falar comigo", en:"Talk to me"},
              note:{pt:"email direto no fim da página", en:"direct email at the bottom"} }
          ]
        };
      }
    }
  ];

  /* ------------------------------------------------------------- origins -- */
  /* Step 2 - where they came from. Each origin nudges the route and the copy. */
  var ORIGINS = [
    { id:"pesquisa", label:{pt:"Google / pesquisa", en:"Google / search"}, boost:"contacto",
      line:{ pt:"Vens de fora, provavelmente à procura de quem construa isto em Portugal.", en:"You arrived from outside, probably looking for someone who builds this in Portugal." } },
    { id:"indicacao", label:{pt:"Alguém me deu o teu contacto", en:"Someone gave me your contact"}, boost:"briefing",
      line:{ pt:"Se alguém te recomendou, o briefing é o caminho mais rápido até um orçamento.", en:"If someone recommended me, the briefing is the fastest road to a quote." } },
    { id:"social", label:{pt:"LinkedIn / Instagram", en:"LinkedIn / Instagram"}, boost:"trabalhos",
      line:{ pt:"Vens das redes - os trabalhos são a melhor porta de entrada.", en:"You came from social - the work is the best door in." } },
    { id:"cv-github", label:{pt:"CV ou GitHub", en:"CV or GitHub"}, boost:"percurso",
      line:{ pt:"Vens do CV ou do código - o percurso mostra o que está por trás de cada linha.", en:"You came from the CV or the code - Journey shows what's behind each line." } },
    { id:"direto", label:{pt:"Email / mensagem direta", en:"Email / direct message"}, boost:"contacto",
      line:{ pt:"Já tens o meu contacto, isso é meio caminho andado.", en:"You already have my contact - half the work is done." } },
    { id:"outro", label:{pt:"Outra coisa", en:"Somewhere else"}, boost:"",
      line:{ pt:"Seja como for, chegaste ao sítio certo.", en:"Either way, you're in the right place." } },
    { id:"skip", label:{pt:"Prefiro não dizer", en:"Rather not say"}, boost:"",
      line:{ pt:"Sem problema - a rota funciona na mesma.", en:"No problem - the route still works." } }
  ];

  function goalById(id){ for (var i=0;i<GOALS.length;i++) if (GOALS[i].id===id) return GOALS[i]; return null; }

  /* Guess where they came from: an internal page first, then the hostname. */
  function guessOrigin(){
    var from = pageFromRef(D.referrer || "");
    if (from && PAGES[from]) return { id:"interno", fromPage:from, host:"" };
    var host = from.indexOf("ext:") === 0 ? from.slice(4) : "";
    if (/google|bing|duckduckgo|ecosia|qwant|brave|yahoo/.test(host)) return { id:"pesquisa", host:host };
    if (/linkedin|instagram|facebook|twitter|x\.com|tiktok|behance|dribbble/.test(host)) return { id:"social", host:host };
    if (/github|gitlab|stackoverflow/.test(host)) return { id:"cv-github", host:host };
    if (/mail|gmail|outlook|proton/.test(host)) return { id:"direto", host:host };
    if (host) return { id:"outro", host:host };
    return { id:"", host:"" };
  }

  /* "I came from the Work page" is its own answer - the visitor was already
     inside the site, so the tip is to continue where they left off. */
  function internalOrigin(fromPage){
    if (!fromPage || !PAGES[fromPage]) return null;
    var name = PAGES[fromPage].name;
    return {
      id:"interno", boost:"", fromPage:fromPage,
      label:{ pt:"Vim da página " + name.pt, en:"I came from the " + name.en + " page" },
      line:{ pt:"Andavas a explorar o site - continuo daqui, sem te mandar de volta.",
             en:"You were already exploring the site - I'll carry on from here instead of sending you back." }
    };
  }
  function allOrigins(){
    var list = ORIGINS.slice();
    var io = internalOrigin(guessOrigin().fromPage);
    if (io) list.unshift(io);
    return list;
  }
  function originById(id){
    var list = allOrigins();
    for (var i=0;i<list.length;i++) if (list[i].id === id) return list[i];
    return null;
  }

  /* ----------------------------------------------------------------- KB -- */
  /* Free-typing knowledge base. Keyword weight = words in the phrase, +1 for
     a "!" suffix. A match needs >=2 points, so single words must be marked. */
  /* acts() shortcuts --------------------------------------------------- */
  function A(page, hash, pt, en, npt, nen, primary){
    return { page:page, hash:hash||"", label:{pt:pt, en:en}, note:{pt:npt, en:nen}, primary:!!primary };
  }
  var MAP_ACTS = [
    A("index","", "Início","Home","o plano de voo","the flight plan"),
    A("sobre","#sobre","Sobre","About","quem está por trás","who's behind it"),
    A("percurso","#curriculum","Percurso","Journey","3 rotas de capacidade","3 capability routes"),
    A("trabalhos","#provador","Trabalhos","Work","o Provador e as provas","O Provador and the proof"),
    A("contacto","#contact","Contacto","Contact","serviços e email","services and email")
  ];

  var KB = [
    { id:"servicos", goal:"negocio",
      kw:["que fazes","o que fazes","que servicos","servicos!","services!","que tipo de trabalho","trabalhas com","what do you do","your services","services you offer","what can you do","what do you build"],
      head:{pt:"Serviços", en:"Services"},
      text:{ pt:"Quatro coisas, por esta ordem de frequência: site completo para pequena empresa; landing page com um objetivo de conversão; integração de IA (assistentes e formulários inteligentes ligados ao fluxo de trabalho); e verificações e reparações de sites que já existem.",
              en:"Four things, in order of frequency: a full site for a small business; a landing page with one conversion goal; AI integration (assistants and smart forms wired into your workflow); and checks and repairs for sites that already exist." },
      acts:[A("contacto","#contact","Ver os 4 serviços","See the 4 services","com email no fim da página","with email at the bottom",true),
            A("trabalhos","#provador","Ver uma entrega real","See a real delivery","O Provador, em produção","O Provador, live")] },

    { id:"preco", goal:"negocio",
      kw:["preco!","precos","quanto custa","custa quanto","custo","orcamento","valor","barato","tabela de precos","price","prices","pricing","how much","cost","quote","budget"],
      head:{pt:"Preços", en:"Pricing"},
      text:{ pt:"Não há tabela pública - o valor depende do âmbito, e inflacionar um número antes de saber o âmbito não ajuda ninguém. O briefing de missão existe exatamente para isto: respondes a oito módulos e o relatório já mostra a dimensão do projeto, para eu responder com um número que se aguente.",
              en:"There's no public price list - the number depends on scope, and inflating a figure before knowing the scope helps nobody. The mission briefing exists for exactly this: you answer eight modules and the report already shows the size of the project, so I can reply with a number that holds." },
      acts:[A("briefing","","Preencher o briefing","Fill in the briefing","8 módulos · ~15 min","8 modules · ~15 min",true),
            A("email","","Perguntar por email","Ask by email","benmrodrigues2000@gmail.com","benmrodrigues2000@gmail.com"),
            A("contacto","#contact","Ver serviços","See services","o que está incluído","what's included")] },

    { id:"prazo", goal:"negocio",
      kw:["prazo","prazos","demora","quanto tempo","tempo de entrega","entrega","urgencia","deadline","how long","how fast","timeline","lead time","turnaround"],
      head:{pt:"Prazos", en:"Timelines"},
      text:{ pt:"Depende do âmbito, mas há um princípio: entrego por etapas visíveis, não num salto final. O briefing dá-me o suficiente para propor um calendário realista - incluindo o que fica de fora da primeira versão.",
              en:"It depends on scope, but there's one rule: I deliver in visible steps, not one final leap. The briefing gives me enough to propose a realistic calendar - including what stays out of the first version." },
      acts:[A("briefing","","Começar pelo briefing","Start with the briefing","define o âmbito primeiro","scope first",true),
            A("contacto","#contact","Falar comigo","Talk to me","email direto","direct email")] },

    { id:"site", goal:"negocio",
      kw:["quero um site","preciso de um site","fazer um site","site!","sites","website","web site","pagina web","quero uma pagina","loja online","i need a website","new website","build me a site","business site"],
      head:{pt:"Site novo", en:"New site"},
      text:{ pt:"Site completo para pequeno negócio: feito para durar, fácil de atualizar, sem dependências que se degradam em dois anos. Este portefólio é o próprio exemplo - HTML, CSS e JavaScript, funciona offline e não pede nada a servidores de terceiros.",
              en:"A full site for a small business: built to last, easy to update, no dependencies that rot in two years. This portfolio is the example itself - HTML, CSS and JavaScript, works offline, asks nothing of third-party servers." },
      acts:[A("contacto","#contact","Ver o serviço 01","See service 01","website · pequena empresa","website · small business",true),
            A("trabalhos","#provador","Ver um caso real","See a real case","O Provador, Freedom Outdoor","O Provador, Freedom Outdoor"),
            A("briefing","","Briefing de missão","Mission briefing","8 módulos antes de falarmos","8 modules before we talk")] },

    { id:"landing", goal:"negocio",
      kw:["landing","landing page","uma pagina","pagina unica","one page","one-page","conversao","conversion","promocao","campanha"],
      head:{pt:"Landing page", en:"Landing page"},
      text:{ pt:"Uma página com um objetivo só: transformar visitas em contactos. Copy, hierarquia e um formulário que funciona - sem menus a distrair. É o serviço 02.",
              en:"One page with a single goal: turn visits into contacts. Copy, hierarchy and a working form - no menus to distract. That's service 02." },
      acts:[A("contacto","#contact","Ver o serviço 02","See service 02","landing page","landing page",true),
            A("trabalhos","#ferramentas-vivas","Ver ferramentas de entrada","See input tools","briefing e postal","briefing and postcard")] },

    { id:"ia", goal:"ia",
      kw:["ia!","inteligencia artificial","chatbot!","bot","assistente!","assistentes","agente!","agentes","formulario inteligente","automacao!","automatizar","integracao de ia","gpt","openai","gemini","llm","ai!","artificial intelligence","ai agent","ai chatbot","automation","smart form","integrate ai","wire up ai"],
      head:{pt:"IA em produtos", en:"AI in products"},
      text:{ pt:"Ligar modelos a produtos reais: assistentes que respondem com contexto, formulários que percebem o pedido antes de o guardar, fluxos que deixam de ser manuais. Duas regras: o modelo é uma peça, não o produto; e cada resposta tem de ser verificável.",
              en:"Wiring models into real products: assistants that answer with context, forms that understand a request before storing it, workflows that stop being manual. Two rules: the model is a part, not the product; and every answer has to be verifiable." },
      acts:[A("contacto","#contact","Falar do serviço 03","Talk about service 03","integração de IA","AI integration",true),
            A("percurso","#curriculum","Ver as rotas de IA","See the AI routes","prompt, contexto, APIs","prompt, context, APIs"),
            A("provador","","Ver IA a trabalhar","See AI at work","O Provador, no ar","O Provador, live")] },

    { id:"reparacao", goal:"negocio",
      kw:["reparacao","reparacoes","arranjar","partido","avariado","bug","bugs","erro!","erros","nao funciona","lento!","lentidao!","velocidade","manutencao","site antigo","problema!","repair","fix","broken","slow","not working","maintenance","old site"],
      head:{pt:"Verificações e reparações", en:"Checks and repairs"},
      text:{ pt:"Diagnóstico primeiro, código depois: encontro o que está partido ou a arrastar, corrijo e devolvo um relatório do que mudou. Sem reescrever tudo por desporto - o cliente paga correções, não vaidades.",
              en:"Diagnosis first, code second: I find what's broken or dragging, fix it and hand back a report of what changed. No rewriting for sport - clients pay for fixes, not for vanity." },
      acts:[A("contacto","#contact","Ver o serviço 04","See service 04","verificações & reparações","checks & repairs",true),
            A("email","","Descrever o problema","Describe the problem","resposta direta por email","straight email reply")] },

    { id:"trabalhos", goal:"trabalhos",
      kw:["trabalhos","projetos","portfolio","portefolio","casos","caso de estudo","exemplos","provas","amostra","work","projects","case studies","case study","examples","your work"],
      head:{pt:"Trabalhos", en:"Work"},
      text:{ pt:"Quatro blocos: um caso de estudo (O Provador), duas ferramentas públicas (briefing e postal), o próprio guia Ajuda desmontado por dentro e um método de decisão. Nada de maquetas soltas - tudo recebe pessoas a sério.",
              en:"Four blocks: a case study (O Provador), two public tools (briefing and postcard), the Ajuda guide itself taken apart inside, and a decision method. No loose mockups - everything meets real people." },
      acts:[A("trabalhos","#provador","Abrir o caso do Provador","Open the Provador case","5 perguntas · 60 segundos","5 questions · 60 seconds",true),
            A("trabalhos","#ajuda","Ver o guia por dentro","See the guide from inside","nota de campo · sem nuvem","field note · no cloud"),
            A("trabalhos","#ferramentas-vivas","Ferramentas públicas","Public tools","briefing e postal","briefing and postcard")] },

    { id:"provador", goal:"trabalhos",
      kw:["provador!","freedom outdoor","sapatilha","sapatilhas","corrida","corredor","shoe","shoes","runner","running","quiz","espinho"],
      head:{pt:"O Provador", en:"O Provador"},
      text:{ pt:"O Provador transforma o aconselhamento de balcão numa decisão de cinco perguntas e sessenta segundos, com stock real da Freedom Outdoor. Construí-o durante o estágio e está em produção - cada recomendação sai da base de dados, não da imaginação do modelo.",
              en:"O Provador turns counter advice into a five-question, sixty-second decision, on Freedom Outdoor's real stock. I built it during my internship and it's in production - every recommendation comes from the database, not the model's imagination." },
      acts:[A("trabalhos","#provador","Ler o caso de estudo","Read the case study","desafio, eixos, resultados","challenge, axes, results",true),
            A("provador","","Abrir o Provador no ar","Open O Provador live","freedomoutdoor.pt","freedomoutdoor.pt")] },

    { id:"ferramentas", goal:"metodo",
      kw:["ferramentas","stack","que usas","que ferramentas usas","com o que trabalhas","tecnologias","tools","what tools","toolstack","tech stack","which tools"],
      head:{pt:"Ferramentas", en:"Tools"},
      text:{ pt:"Seis, em uso ativo: Arena.AI (comparar modelos às cegas), ChatGPT (pensar e escrever), Gemini (contexto longo e pesquisa), Eklipse (clipes), APIs de IA (construir) e Python/JavaScript (o que fica de pé). Cada uma com nota de campo e nível de uso.",
              en:"Six, in active use: Arena.AI (blind model comparison), ChatGPT (thinking and writing), Gemini (long context and research), Eklipse (clipping), AI APIs (building) and Python/JavaScript (what stays standing). Each with a field note and a usage level." },
      acts:[A("ferramentas","#tools","Abrir o stack","Open the stack","6 ferramentas, uma linha cada","6 tools, one row each",true)] },

    { id:"metodo", goal:"metodo",
      kw:["metodo","processo","como trabalhas","como e que trabalhas","fluxo de trabalho","como funciona","method","process","how do you work","your workflow","how it works"],
      head:{pt:"O método", en:"The method"},
      text:{ pt:"Prompt → rascunho → crítica → revisão → publicação. Defino o resultado, o cliente e a restrição antes de escrever o primeiro prompt; depois comparo respostas de dois ou três modelos numa arena e assino o veredicto com razão anexa.",
              en:"Prompt → draft → critique → revision → publish. I define the outcome, the client and the constraint before writing the first prompt; then I compare answers from two or three models in an arena and sign the verdict with a reason attached." },
      acts:[A("sobre","#method","Ver o método completo","See the full method","com o diagrama do briefing","with the brief diagram",true),
            A("trabalhos","#metodo","O critério aplicado","The criterion applied","veredicto da arena","arena verdict")] },

    { id:"ajuda-guia", goal:"metodo",
      kw:["como funciona a ajuda","como funciona o guia","como funciona ajuda","ajuda funciona","guia!","guia do site","como o guia","what is the help","how does the help work","how does the guide work","how does ajuda work","site guide","help widget","guide widget"],
      head:{pt:"O guia por dentro", en:"The guide from inside"},
      text:{ pt:"Sou eu. Duas perguntas primeiro - porque estás aqui e de onde vens - e a partir daí uma rota com portas. O que escreves é normalizado e pontuado por palavras-chave numa base local: a partir de dois pontos, a resposta escolhe-se; abaixo disso, vai o mapa completo. Tudo corre no teu browser: sem cookies, sem rede, sem modelo. A nota de campo na página Trabalhos desmonta o sistema por dentro.",
              en:"That's me. Two questions first - why you're here and where you came from - and from there a route with doors. What you type is normalised and scored against keywords in a local base: at two points the answer is picked; below that, the full map goes. It all runs in your browser: no cookies, no network, no model. The field note on the Work page takes the system apart inside." },
      acts:[A("trabalhos","#ajuda","Ler a nota de campo","Read the field note","o guia, por dentro","the guide, inside",true),
            A("sobre","#method","Ver o método","See the method","briefing → modelos → entrega","brief → models → delivery")] },

    { id:"percurso", goal:"metodo",
      kw:["percurso","experiencia","carreira","curriculo profissional","robot","ferreira de sa","servico militar","registo de servico","journey","experience","career","background","track record"],
      head:{pt:"Percurso", en:"Journey"},
      text:{ pt:"Três rotas: prompt & conversação; integrações de IA & código; web design & reparação. Sem certificados - cada rota tem provas e uma lista do que ainda está a ser treinado. Antes disto: estágio na Freedom Outdoor (onde construí o Provador), operador de robô na Ferreira de Sá e atendimento ao cliente no Pingo Doce.",
              en:"Three routes: prompt & conversation; AI & code integrations; web design & repair. No certificates - each route carries proof and a list of what's still being trained. Before this: an internship at Freedom Outdoor (where I built O Provador), robot operator at Ferreira de Sá and customer service at Pingo Doce." },
      acts:[A("percurso","#curriculum","Abrir o percurso","Open the journey","3 rotas, prova por etapa","3 routes, proof per step",true),
            A("sobre","#sobre","Quem está por trás","Who's behind it","26 anos · Esmoriz, PT","26 years old · Esmoriz, PT")] },

    { id:"cv", goal:"recrutador",
      kw:["cv!","curriculum","curriculo","curriculo vitae","recrutador","recrutamento","vaga","emprego","contratar","estagio","hire","hiring","resume","recruiter","recruiting","job","open role","internship"],
      head:{pt:"CV", en:"CV"},
      text:{ pt:"O PDF tem o essencial para triagem e é atualizado a cada entrega. Se a vaga for de IA aplicada ou front-end, o Percurso mostra a profundidade real - cada capacidade com a sua prova.",
              en:"The PDF carries what screening needs and is updated with every delivery. If the role is applied AI or front-end, Journey shows the real depth - every capability with its proof." },
      acts:[A("cv","","Descarregar o CV (PDF)","Download the CV (PDF)","pronto para triagem","screening-ready",true),
            A("cvpage","#cv","CV na página","CV as a web page","uma página, cinco blocos","one page, five blocks"),
            A("percurso","#curriculum","Índice de capacidades","Capability index","a versão longa","the long version"),
            A("email","","Falar sobre a vaga","Talk about the role","benmrodrigues2000@gmail.com","benmrodrigues2000@gmail.com")] },

    { id:"sobre", goal:"perdido",
      kw:["quem es","quem es tu","sobre ti","idade","anos tens","onde estas","onde vives","onde moras","about you","about yourself","tell me about you","who are you","how old","where are you","where do you live"],
      head:{pt:"Quem está por trás", en:"Who's behind it"},
      text:{ pt:"Ruben Monteiro Correia Rodrigues, 26 anos, Esmoriz - Portugal. Programador e especialista em IA: uso modelos todos os dias e transformo esse uso em produtos para pequenas empresas. Também assino como AYYLIENADO.",
              en:"Ruben Monteiro Correia Rodrigues, 26, from Esmoriz - Portugal. Developer and AI specialist: I use models every day and turn that into products for small businesses. I also sign as AYYLIENADO." },
      acts:[A("sobre","#sobre","Abrir a página Sobre","Open the About page","contexto e percurso","context and journey",true),
            A("percurso","#curriculum","Ver o percurso","See the journey","provas, não certificados","proof, not certificates")] },

    { id:"contacto", goal:"negocio",
      kw:["contacto!","contactos","falar contigo","telefone","email!","e-mail","marcar reuniao","conversar","duvidas","contact","get in touch","talk to you","phone","meeting","reach you","your email","reuniao!","telefone!"],
      head:{pt:"Contacto", en:"Contact"},
      text:{ pt:"Está tudo na página Contacto: email direto, GitHub, CV e o briefing. Traz uma pergunta confusa, um site partido ou um fluxo repetitivo que não devia existir - é por aí que começo.",
              en:"It's all on the Contact page: direct email, GitHub, CV and the briefing. Bring a messy question, a broken site or a repetitive workflow that shouldn't exist - that's where I start." },
      acts:[A("contacto","#contact","Abrir o contacto","Open contact","email, GitHub, CV","email, GitHub, CV",true),
            A("email","","Escrever agora","Write now","benmrodrigues2000@gmail.com","benmrodrigues2000@gmail.com")] },

    { id:"briefing", goal:"negocio",
      kw:["briefing!","questionario","formulario","mission briefing","questionnaire","intake form"],
      head:{pt:"Briefing de Missão", en:"Mission Briefing"},
      text:{ pt:"Oito módulos, cerca de quinze minutos, zero tecnicismos. No fim geras um relatório e envias-mo - quando o recebo, já sabemos exatamente para onde vai o site. Substitui a primeira reunião.",
              en:"Eight modules, about fifteen minutes, zero jargon. At the end you generate a report and send it to me - once I have it, we already know exactly where the site is headed. It replaces the first meeting." },
      acts:[A("briefing","","Abrir o briefing","Open the briefing","8 módulos · ~15 min","8 modules · ~15 min",true)] },

    { id:"postal", goal:"trabalhos",
      kw:["postal!","cartao","imprimir","imprimivel","postcard!","printable","print","card"],
      head:{pt:"Postal", en:"Postcard"},
      text:{ pt:"Um postal imprimível, em PT e EN, em A4 e A6. Existe por um motivo simples: quem recebe papel lembra-se. Está na secção de ferramentas públicas dos Trabalhos.",
              en:"A printable postcard, in PT and EN, in A4 and A6. It exists for a simple reason: people remember paper. It lives in the public tools section on Work." },
      acts:[A("postal","","Abrir o postal","Open the postcard","A4 e A6 · PT e EN","A4 and A6 · PT and EN",true),
            A("trabalhos","#ferramentas-vivas","Ver outras ferramentas","See other tools","briefing e postal","briefing and postcard")] },

    { id:"github", goal:"recrutador",
      kw:["github!","codigo","repositorio","repo!","source","open source","code"],
      head:{pt:"Código", en:"Code"},
      text:{ pt:"O GitHub tem os repositórios públicos. Este site é o melhor exemplo do estilo: sem frameworks, sem pedidos a terceiros, com service worker para funcionar offline.",
              en:"GitHub holds the public repositories. This site is the clearest example of the style: no frameworks, no third-party requests, with a service worker so it works offline." },
      acts:[A("github","","Abrir o GitHub","Open GitHub","github.com/benmrodrigues2000","github.com/benmrodrigues2000",true),
            A("trabalhos","#provador","Ver o caso em produção","See the live case","O Provador","O Provador")] },

    { id:"disponibilidade", goal:"negocio",
      kw:["disponivel","disponibilidade","aceitas trabalhos","estas livre","novos projetos","freelance","comecar um projeto","available","availability","are you available","take on work","new projects","free for a project"],
      head:{pt:"Disponibilidade", en:"Availability"},
      text:{ pt:"Estou a aceitar projetos novos. Diz-me o que precisas e quando precisas - se o encaixe não existir, digo-to na primeira resposta em vez de arrastar a conversa.",
              en:"I'm taking on new projects. Tell me what you need and when you need it - if the fit isn't there, I'll say so in the first reply instead of dragging the conversation out." },
      acts:[A("contacto","#contact","Falar comigo","Talk to me","resposta direta","straight answer",true),
            A("briefing","","Enviar o briefing","Send the briefing","chega para orçamentar","enough to quote")] },

    { id:"tema", do:"theme", kw:["modo claro","modo escuro","tema claro","tema escuro","theme","light mode","dark mode","claro","escuro"],
      head:{pt:"Tema", en:"Theme"},
      text:{ pt:"O site tem modo claro e escuro - os dois foram afinados para contraste, não invertidos à pressa.", en:"The site has light and dark mode - both tuned for contrast, not flipped in a hurry." } },

    { id:"idioma", do:"lang", kw:["ingles!","english!","idioma!","language!","portugues!","portuguese!","mudar de lingua","switch language","change language"],
      head:{pt:"Idioma", en:"Language"},
      text:{ pt:"Todo o site existe em português e inglês. Mudo agora, se quiseres.", en:"The whole site exists in Portuguese and English. I'll switch right now if you like." } },

    { id:"agradecimento",
      kw:["obrigado!","obrigada!","thanks!","thank you","valeu","agradecido"],
      head:{pt:"Ora essa", en:"Any time"},
      text:{ pt:"Sempre às ordens. Se ainda houver alguma coisa para descobrir, o mapa fica aqui em baixo.",
              en:"Always around. If there's still something to dig into, the map is right below." } },

    { id:"saudacao",
      kw:["ola!","bom dia","boa tarde","boa noite","boas!","viva","hey!","hi!","hello!","good morning","good afternoon"],
      head:{pt:"Olá", en:"Hello"},
      text:{ pt:"Boa. Diz-me o que procuras e levo-te lá - ou escolhe uma das opções abaixo.", en:"Good. Tell me what you're after and I'll take you there - or pick one of the options below." }, chips:true },

    { id:"site-info",
      kw:["que site e este","quem fez este site","este site","what is this site","who made this site","about this site"],
      head:{pt:"Este site", en:"This site"},
      text:{ pt:"É o portefólio do Ruben - em construção, como diz o aviso da página inicial: os trabalhos e serviços mostrados misturam projetos pessoais, académicos e um caso real em produção (O Provador).", en:"It's Ruben's portfolio - still being built, as the home banner says: the work and services shown mix personal projects, academic work and one real case in production (O Provador)." },
      acts:[A("index","","Voltar ao início","Back to home","o plano de voo","the flight plan",true),
            A("trabalhos","#provador","Ver o caso real","See the real case","O Provador","O Provador")] }
  ];

  /* ------------------------------------------------------------- engine --- */
  /* Weight: specificity, not length of the sentence. A matched keyword is
     worth max(1, chars/4) points, +1 when marked "!" (a single word that is
     strong enough on its own). A match needs 2 points, so a bare "site" is not
     enough but "precos!" is. Plurals are tolerated ("precos" -> "preco") and
     phrases whose words all appear somewhere get reduced credit - that covers
     "quanto e que custa" for the keyword "quanto custa". */
  function hasWord(pad, word){ return pad.indexOf(" " + word + " ") > -1; }
  function key(word){ return word.replace(/s$/, ""); }
  function score(kw, hay){
    var pad = " " + hay + " ";
    var singles = {}, phrases = 0, i, k;
    for (i=0;i<kw.length;i++){
      var phrase = kw[i];
      var strong = false;
      if (phrase.charAt(phrase.length-1) === "!"){ strong = true; phrase = phrase.slice(0, -1); }
      var words = phrase.split(" ");
      var w = Math.max(1, Math.round(phrase.length / 4)) + (strong ? 1 : 0);
      if (words.length === 1){
        var kk = key(phrase);
        if (hasWord(pad, phrase)) singles[kk] = Math.max(singles[kk] || 0, w);
        else if (phrase.length > 3 && hasWord(pad, phrase + "s")) singles[kk] = Math.max(singles[kk] || 0, w);
      } else if (pad.indexOf(" " + phrase + " ") > -1){
        phrases += w;
      } else {
        var all = true;
        for (k=0;k<words.length;k++){ if (words[k] && !hasWord(pad, words[k])){ all = false; break; } }
        if (all) phrases += (words.length > 2 ? 0 : 1);   /* loose credit, never decisive */
      }
    }
    for (k in singles) if (singles.hasOwnProperty(k)) phrases += singles[k];
    return phrases;
  }
  var KB_NORM = null;
  function kbNorm(){
    if (KB_NORM) return KB_NORM;
    KB_NORM = KB.map(function(e){
      return { entry:e, kw:e.kw.map(function(k){
        var strong = k.charAt(k.length-1) === "!";
        return norm(strong ? k.slice(0, -1) : k) + (strong ? "!" : "");
      }) };
    });
    return KB_NORM;
  }

  function match(text){
    var hay = norm(text);
    if (!hay) return null;
    var list = kbNorm();
    var best = null, bestScore = 0;
    for (var i=0;i<list.length;i++){
      var s = score(list[i].kw, hay);
      if (s > bestScore){ bestScore = s; best = list[i].entry; }
    }
    return bestScore >= 2 ? { entry:best, score:bestScore } : null;
  }

  /* ---------------------------------------------------------------- UI ---- */
  var ICON_NAV = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2v3.1"/><path d="M12 17.7v3.1"/><path d="M3.2 12h3.1"/><path d="M17.7 12h3.1"/><circle cx="12" cy="12" r="3.4"/></svg>';
  var ICON_X   = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
  var ICON_ORB = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h4l2-5 3 10 2-5h5"/></svg>';
  var ICON_SEND= '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13"/><path d="m12 5 7 7-7 7"/></svg>';

  var rootEl, bubble, panel, log, chipsBar, form, input, sendBtn, resetBtn, footNote;
  var lblEl, subEl;
  var nodes = [];          /* transcript, kept as data so it can re-render */
  var chips = [];          /* current quick choices */
  var state = { step:"goal", goal:"", origin:"", busy:false };

  function el(tag, cls, txt){
    var n = D.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  }

  function build(){
    rootEl = el("div", "aj-root");
    rootEl.id = "ajRoot";

    bubble = el("button", "aj-bubble unseen");
    bubble.type = "button";
    bubble.id = "ajBubble";
    bubble.setAttribute("aria-expanded", "false");
    bubble.setAttribute("aria-controls", "ajPanel");
    var ico = el("span", "aj-ico");
    ico.innerHTML = '<span class="aj-ico-nav">' + ICON_NAV + '</span><span class="aj-ico-x">' + ICON_X + '</span>';
    lblEl = el("span", "aj-lbl");
    lblEl.id = "ajBubbleLabel";
    bubble.appendChild(ico);
    bubble.appendChild(lblEl);
    bubble.addEventListener("click", toggle);

    panel = el("div", "aj-panel");
    panel.id = "ajPanel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "false");
    panel.setAttribute("aria-labelledby", "ajTitle");

    var head = el("div", "aj-head");
    var id = el("div", "aj-id");
    var orb = el("span", "aj-orb");
    orb.innerHTML = ICON_ORB + "<i></i>";
    var titles = el("div", "aj-titles");
    var b = el("b", "", "Ajuda");
    b.id = "ajTitle";
    subEl = el("span", "");
    subEl.id = "ajSub";
    titles.appendChild(b);
    titles.appendChild(subEl);
    id.appendChild(orb);
    id.appendChild(titles);
    var x = el("button", "aj-x");
    x.type = "button";
    x.innerHTML = ICON_X;
    x.setAttribute("aria-label", "Fechar");
    x.addEventListener("click", close);
    head.appendChild(id);
    head.appendChild(x);

    log = el("div", "aj-log");
    log.setAttribute("role", "log");
    log.setAttribute("aria-live", "polite");
    log.setAttribute("aria-relevant", "additions");

    chipsBar = el("div", "aj-chips");

    form = el("form", "aj-form");
    input = el("input", "aj-input");
    input.type = "text";
    input.autocomplete = "off";
    input.setAttribute("aria-label", "Escrever mensagem");
    sendBtn = el("button", "aj-send");
    sendBtn.type = "submit";
    sendBtn.innerHTML = ICON_SEND;
    sendBtn.setAttribute("aria-label", "Enviar");
    form.appendChild(input);
    form.appendChild(sendBtn);

    var foot = el("div", "aj-foot");
    resetBtn = el("button", "");
    resetBtn.type = "button";
    resetBtn.addEventListener("click", function(){ reset(true); });
    footNote = el("span", "");
    foot.appendChild(resetBtn);
    foot.appendChild(footNote);

    panel.appendChild(head);
    panel.appendChild(log);
    panel.appendChild(chipsBar);
    panel.appendChild(form);
    panel.appendChild(foot);

    rootEl.appendChild(bubble);
    rootEl.appendChild(panel);
    D.body.appendChild(rootEl);
    D.body.classList.add("aj-on");

    form.addEventListener("submit", function(e){
      e.preventDefault();
      var v = input.value.trim();
      if (!v || state.busy) return;
      input.value = "";
      handleText(v);
    });
  }

  /* Copy that depends on language or live state, refreshed on every render. */
  function syncChrome(){
    lblEl.textContent = isOpen() ? t({pt:"Fechar", en:"Close"}) : t({pt:"Ajuda", en:"Help"});
    bubble.setAttribute("aria-label", isOpen()
      ? t({pt:"Fechar a ajuda", en:"Close help"})
      : t({pt:"Abrir a ajuda - levo-te ao sítio certo", en:"Open help - I'll take you where you need to go"}));
    subEl.textContent = t({pt:"Guia do site · 2 perguntas", en:"Site guide · 2 questions"});
    input.placeholder = state.step === "goal"
      ? t({pt:"Escreve a tua pergunta…", en:"Type your question…"})
      : state.step === "origin"
        ? t({pt:"Ou escreve de onde vens…", en:"Or type where you came from…"})
        : t({pt:"Pergunta o que quiseres…", en:"Ask me anything…"});
    resetBtn.textContent = t({pt:"Recomeçar", en:"Start over"});
    footNote.textContent = t({pt:"Sem cookies · nada sai do browser", en:"No cookies · nothing leaves the browser"});
  }

  /* ------------------------------------------------------------ render ---- */
  function renderMsg(m){
    var wrap = el("div", "aj-msg " + (m.k === "me" ? "me" : "ag") + (m.k === "ag" && !m.text && !m.acts && !m.do ? " plain" : ""));
    if (m.k === "me"){
      wrap.textContent = t(m.text);
      return wrap;
    }
    if (m.head){
      var h = el("div", "aj-headline", t(m.head));
      wrap.appendChild(h);
    }
    if (m.text){
      var parts = Array.isArray(m.text) ? m.text : [m.text];
      for (var i=0;i<parts.length;i++){
        var p = el("p", "", t(parts[i]));
        wrap.appendChild(p);
      }
    }
    if (m.do){
      var b = el("button", "aj-do");
      b.type = "button";
      b.textContent = m.do === "theme"
        ? (isLight() ? t({pt:"Mudar para modo escuro", en:"Switch to dark mode"}) : t({pt:"Mudar para modo claro", en:"Switch to light mode"}))
        : (lang() === "pt" ? "Switch to English" : "Mudar para português");
      b.addEventListener("click", function(){
        if (m.do === "theme"){
          if (window.RR && window.RR.toggleTheme) window.RR.toggleTheme();
          else root.setAttribute("data-theme", isLight() ? "dark" : "light");
        } else {
          if (window.RR && window.RR.toggleLang) window.RR.toggleLang();
          else root.setAttribute("data-lang", lang() === "pt" ? "en" : "pt");
        }
        window.setTimeout(render, 60);
      });
      wrap.appendChild(b);
    }
    if (m.acts && m.acts.length){
      var acts = pruneActs(m.acts);
      if (acts.length){
        var list = el("div", "aj-acts");
        for (var j=0;j<acts.length;j++) list.appendChild(renderAct(acts[j]));
        wrap.appendChild(list);
      }
    }
    if (m.why){
      var why = el("div", "aj-why", t(m.why));
      wrap.appendChild(why);
    }
    if (m.opt){
      var opt = el("button", "aj-link-inline", t(m.opt.label));
      opt.type = "button";
      opt.addEventListener("click", m.opt.fn);
      wrap.appendChild(opt);
    }
    return wrap;
  }

  /* Drops duplicates and the "you are already here" rows, then makes sure the
     remaining list still has exactly one highlighted door. */
  function pruneActs(acts){
    var out = [], seen = {}, i;
    for (i=0;i<acts.length;i++){
      var a = acts[i];
      var key = (a.page || "") + "|" + (a.hash || "");
      if (seen[key]) continue;
      if (a.page && PAGES[a.page] && a.page === currentPage() && !a.hash){
        /* Same page, no section to scroll to: better to say nothing. */
        continue;
      }
      seen[key] = 1;
      out.push({ page:a.page, hash:a.hash, label:a.label, note:a.note, primary:!!a.primary });
    }
    var hasPrimary = false;
    for (i=0;i<out.length;i++) if (out[i].primary) hasPrimary = true;
    if (out.length && !hasPrimary) out[0].primary = true;
    return out;
  }

  function renderAct(a){
    var href = "", out = false, download = false, isLink = true;
    if (a.page && PAGES[a.page]) href = PAGES[a.page].file + (a.hash || "");
    else if (a.page && EXTERNAL[a.page]){
      href = EXTERNAL[a.page].href;
      out = !!EXTERNAL[a.page].out;
      download = !!EXTERNAL[a.page].download;
    } else if (a.href) href = a.href;
    else isLink = false;

    var node = el(isLink ? "a" : "button", "aj-act" + (a.primary ? " primary" : ""));
    if (isLink){
      node.href = href;
      if (out){ node.target = "_blank"; node.rel = "noopener"; }
      if (download) node.setAttribute("download", "");
    } else {
      node.type = "button";
    }
    var txt = el("span", "aj-act-txt");
    var strong = el("b", "", t(a.label));
    txt.appendChild(strong);
    if (t(a.note)) txt.appendChild(el("small", "", t(a.note)));
    node.appendChild(txt);
    node.appendChild(el("span", "aj-go", "\u2192"));

    /* Closing the panel is the whole point: the visitor should land on the
       page, not behind a pop-up. Navigation itself is left to the browser. */
    node.addEventListener("click", function(){
      if (a.page && PAGES[a.page]) markNav(a.page);
      close();
    });
    return node;
  }

  function renderChips(){
    if (!chips.length){ chipsBar.classList.remove("on"); chipsBar.textContent = ""; return; }
    chipsBar.classList.add("on");
    chipsBar.textContent = "";
    for (var i=0;i<chips.length;i++){
      (function(c){
        var b = el("button", "aj-chip" + (c.guess ? " guess" : ""));
        b.type = "button";
        b.textContent = t(c.label);
        if (c.title) b.title = t(c.title);
        b.addEventListener("click", function(){ if (!state.busy) c.fn(); });
        chipsBar.appendChild(b);
      })(chips[i]);
    }
  }

  function render(){
    syncChrome();
    log.textContent = "";
    for (var i=0;i<nodes.length;i++) log.appendChild(renderMsg(nodes[i]));
    renderChips();
    window.setTimeout(scrollDown, 30);
  }
  function scrollDown(){ log.scrollTop = log.scrollHeight; }

  function push(m){
    nodes.push(m);
    if (nodes.length > 24) nodes = nodes.slice(-24);
    log.appendChild(renderMsg(m));
    window.setTimeout(scrollDown, 20);
    persist();
  }
  function say(m){
    /* Small human delay so a one-line answer doesn't feel like a web form. */
    if (state.busy) return;
    state.busy = true;
    var typing = el("div", "aj-typing");
    typing.innerHTML = "<i></i><i></i><i></i>";
    if (!reduce){
      log.appendChild(typing);
      scrollDown();
    }
    window.setTimeout(function(){
      if (typing.parentNode) typing.parentNode.removeChild(typing);
      state.busy = false;
      push(m);
      renderChips();
    }, reduce ? 40 : 420);
  }
  function ask(text){ handleText(text); }

  /* --------------------------------------------------------- persistence -- */
  function persist(){
    var slim = nodes.map(function(m){
      if (m.k === "me") return { k:"me", text:m.text };
      var o = { k:"ag", head:m.head, text:m.text };
      if (m.acts) o.acts = m.acts.map(function(a){
        return { page:a.page, hash:a.hash, label:a.label, note:a.note, primary:a.primary };
      });
      if (m.why) o.why = m.why;
      return o;
    });
    ssSet("aj-transcript", JSON.stringify(slim));
    ssSet("aj-state", JSON.stringify({ step:state.step, goal:state.goal, origin:state.origin }));
  }
  function restore(){
    try{
      var s = ssGet("aj-state");
      if (s){ var o = JSON.parse(s); state.step = o.step || "goal"; state.goal = o.goal || ""; state.origin = o.origin || ""; }
      var raw = ssGet("aj-transcript");
      if (raw){
        var list = JSON.parse(raw) || [];
        for (var i=0;i<list.length;i++){
          var m = list[i];
          if (m.k === "me") nodes.push({ k:"me", text:m.text });
          else nodes.push({ k:"ag", head:m.head, text:m.text, acts:m.acts, why:m.why });
        }
      }
    }catch(e){}
    if (!nodes.length) return false;
    /* Chips are rebuilt from the flow state, never from stale closures. */
    if (state.step === "origin") chips = originChips();
    else if (state.step === "goal") chips = goalChips();
    else chips = openChips();
    return true;
  }
  function reset(announce){
    nodes = [];
    chips = [];
    state = { step:"goal", goal:"", origin:"", busy:false };
    ssDel("aj-transcript"); ssDel("aj-state"); ssDel("aj-chips"); ssDel("aj-nav");
    if (announce){ log.textContent = ""; greet(); }
  }
  function markNav(page){
    try{ ssSet("aj-nav", JSON.stringify({ ts:Date.now(), to:page, from:currentPage() })); }catch(e){}
  }

  /* ------------------------------------------------------------- flows ---- */
  function goalChips(){
    var out = GOALS.map(function(g){
      return { label:g.label, act:"goal:" + g.id, fn:function(){ chooseGoal(g.id); } };
    });
    return out;
  }
  function originChips(){
    var g = guessOrigin();
    var out = allOrigins().map(function(o){
      return { label:o.label, act:"origin:" + o.id, guess:(g.id === o.id), fn:function(){ chooseOrigin(o.id); } };
    });
    out.push({ label:{pt:"Voltar", en:"Back"}, act:"back", fn:function(){
      state.step = "goal"; state.goal = "";
      push({ k:"me", text:{pt:"Voltar atrás", en:"Go back"} });
      say({ k:"ag", text:{pt:"Sem problema - porque estás aqui?", en:"No problem - why are you here?"} });
      chips = goalChips(); renderChips();
    }});
    return out;
  }
  function openChips(){
    return [
      { label:{pt:"Não é bem isto", en:"Not quite"}, act:"restart",
        fn:function(){
          push({ k:"me", text:{pt:"Não é bem isto.", en:"That's not quite it."} });
          state.step = "goal"; state.goal = ""; state.origin = "";
          say({ k:"ag", head:{pt:"Recomeçar", en:"Starting over"},
                text:{pt:"Então deixa-me perguntar de outra forma: o que te traz ao site?", en:"Let me ask differently then: what brings you to the site?"} });
          chips = goalChips(); renderChips();
        } },
      { label:{pt:"Falar com o Ruben", en:"Talk to Ruben"}, act:"contact",
        fn:function(){ navigate("contacto", "#contact"); } },
      { label:{pt:"Mapa do site", en:"Site map"}, act:"map",
        fn:function(){ showMap(); } }
    ];
  }
  function greet(){
    /* On the 404 page the visitor is already lost: acknowledge it instead of
       opening with "why are you here". */
    if (!currentPage()){
      say({
        k:"ag",
        head:{pt:"Ajuda", en:"Help"},
        text:[
          {pt:"Este endereço não existe - mas o que procuravas provavelmente existe. Onde querias ir?", en:"This address doesn't exist - but what you were looking for probably does. Where were you heading?"}
        ],
        acts:[
          A("index","","Voltar ao início","Back to home","o plano de voo","the flight plan", true),
          A("trabalhos","#provador","Ver os trabalhos","See the work","o Provador e as provas","O Provador and the proof"),
          A("contacto","#contact","Falar comigo","Talk to me","email direto","direct email")
        ]
      });
      chips = goalChips();
      renderChips();
      return;
    }
    say({
      k:"ag",
      head:{pt:"Ajuda", en:"Help"},
      text:[
        {pt:"Olá. Sou o guia do site - duas perguntas e ficamos com isto resolvido.", en:"Hello. I'm the site guide - two questions and we're done here."},
        {pt:"Porque estás aqui hoje?", en:"Why are you here today?"}
      ]
    });
    chips = goalChips();
    renderChips();
  }

  function chooseGoal(id){
    var g = goalById(id);
    if (!g) return;
    state.goal = id;
    state.step = "origin";
    push({ k:"me", text:g.label });
    var g2 = guessOrigin();
    var extra = "";
    if (g2.fromPage && PAGES[g2.fromPage]) extra = { pt:"Vi que vens da página " + t(PAGES[g2.fromPage].name) + ".", en:"I can see you came from the " + t(PAGES[g2.fromPage].name) + " page." };
    else if (g2.host) extra = { pt:"Vi que chegaste de " + g2.host + ".", en:"I can see you arrived from " + g2.host + "." };
    var body = [{pt:"Certo - " + t(g.echo) + ".", en:"Got it - " + t(g.echo) + "."}];
    if (extra) body.push(extra);
    body.push({pt:"E onde encontraste o site?", en:"And where did you find the site?"});
    say({ k:"ag", text:body });
    chips = originChips();
    renderChips();
  }

  function chooseOrigin(id){
    var o = originById(id);
    if (!o) return;
    state.origin = id;
    state.step = "open";
    push({ k:"me", text:o.label });
    var g = goalById(state.goal) || goalById("perdido");
    var route = g.route(o);
    var want = g.echo;
    var why = {
      pt:"rota montada a partir de - procuras: " + t(want) + " · vens de: " + t(o.label).toLowerCase(),
      en:"route built from - you want: " + t(want) + " · you came from: " + t(o.label).toLowerCase()
    };

    var acts = route.acts.slice();
    if (o.boost){
      acts.sort(function(a, b){
        var ab = (a.page === o.boost) ? -1 : 0;
        var bb = (b.page === o.boost) ? -1 : 0;
        return ab - bb;
      });
      if (acts[0]) acts[0].primary = true;
      /* keep only one "primary" flag so the eye has a single clear door */
      for (var i=1;i<acts.length;i++) acts[i].primary = false;
    }
    say({
      k:"ag",
      head:route.head,
      text:[route.text, o.line],
      acts:acts.slice(0,3),
      why:why
    });
    chips = openChips();
    renderChips();
  }

  /* Free-typing: match the KB, answer, and offer the next step. */
  function handleText(raw){
    push({ k:"me", text:raw });
    if (state.step === "origin"){
      /* A typed origin like "vim do google" should finish step 2. */
      var g = guessFromText(raw);
      if (g){ chooseOrigin(g); return; }
    }
    var hit = match(raw);
    if (!hit){
      showMap({ prefix:{pt:"Não tenho a certeza de ter percebido - mas não te deixo a andar às voltas. Aqui está o mapa completo:", en:"I'm not sure I caught that - but I won't leave you wandering. Here's the full map:"} });
      return;
    }
    var e = hit.entry;
    var msg = { k:"ag", head:e.head, text:e.text };
    if (e.do) msg.do = e.do;
    var acts = e.acts ? e.acts.slice(0,3) : null;
    if (!acts && e.goal){
      var gGoal = goalById(e.goal);
      if (gGoal) acts = gGoal.route(originById(state.origin) || originById("outro")).acts.slice(0, 2);
    }
    if (acts) msg.acts = acts;

    if (e.goal && state.step === "goal"){
      state.goal = e.goal;
      state.step = "origin";
      msg.text = (Array.isArray(e.text) ? e.text : [e.text]).concat([{pt:"Já agora: onde encontraste o site?", en:"While we're here: where did you find the site?"}]);
      say(msg);
      chips = originChips();
      renderChips();
      return;
    }
    if (state.step === "goal"){ state.step = "open"; }
    say(msg);
    chips = e.chips ? goalChips().concat(openChips().slice(0, 1)) : openChips();
    renderChips();
  }

  /* "vim do google", "instagram", "o meu chefe deu-me o link". We only treat
     short, clearly-origin answers this way, so a real question typed at step 2
     is answered instead of being mistaken for an origin. */
  function guessFromText(raw){
    var h = norm(raw);
    var tokens = h.split(" ").filter(function(x){ return !!x; });
    if (!tokens.length || tokens.length > 8) return "";
    var pairs = [
      ["pesquisa", ["google", "bing", "pesquisa", "search", "duckduckgo"]],
      ["social", ["linkedin", "instagram", "facebook", "twitter", "tiktok", "redes"]],
      ["cv-github", ["github", "cv", "curriculo", "curriculum", "resume"]],
      ["direto", ["email", "mail", "whatsapp", "mensagem"]],
      ["indicacao", ["recomendacao", "recomendaram", "indicaram", "indicacao", "falaram", "recommended", "amigo", "colega", "chefe"]]
    ];
    var markers = ["vim", "venho", "cheguei", "encontrei", "vi no", "soube", "came", "found", "arrived", "through", "via", "de "];
    var hasMarker = false;
    for (var m=0;m<markers.length;m++){ if (h.indexOf(markers[m]) > -1){ hasMarker = true; break; } }
    for (var i=0;i<pairs.length;i++){
      for (var j=0;j<pairs[i][1].length;j++){
        var k = pairs[i][1][j];
        /* One word alone ("instagram") or a sentence that says where you came from. */
        if (k.indexOf(" ") > -1 ? h.indexOf(k) > -1 : (tokens.length === 1 && tokens[0] === k) || (hasMarker && h.indexOf(k) > -1)) return pairs[i][0];
      }
    }
    return "";
  }

  function showMap(opts){
    var o = opts || {};
    var text = [];
    if (o.prefix) text.push(o.prefix);
    text.push({pt:"Sete páginas, sete intenções:", en:"Seven pages, seven intentions:"});
    say({
      k:"ag",
      head:{pt:"Mapa do site", en:"Site map"},
      text:text,
      acts:[
        A("sobre","#sobre","Sobre","About","quem está por trás","who's behind it"),
        A("percurso","#curriculum","Percurso","Journey","3 rotas de capacidade","3 capability routes"),
        A("cvpage","#cv","CV","CV","currículo numa página","the CV as a web page"),
        A("trabalhos","#provador","Trabalhos","Work","o Provador e as provas","O Provador and the proof"),
        A("contacto","#contact","Contacto","Contact","serviços e email","services and email")
      ]
    });
    chips = openChips();
    renderChips();
  }

  function navigate(page, hash){
    var url = (PAGES[page] ? PAGES[page].file : page) + (hash || "");
    markNav(page);
    close();
    window.location.href = url;
  }

  /* --------------------------------------------------- arriving somewhere -- */
  function arrival(){
    var page = currentPage();
    if (!page) return;
    var name = t(PAGES[page].name);
    var secs = (SECTIONS[page] || []).slice(0, 2).map(function(s){
      return { page:page, hash:s.h, label:s.name, note:s.note, primary:false };
    });
    /* One door out of this page, chosen so it never points back at itself. */
    var exit = page === "contacto"
      ? A("email","","Escrever agora","Write now","benmrodrigues2000@gmail.com","benmrodrigues2000@gmail.com")
      : A("contacto","#contact","Falar comigo","Talk to me","email direto","direct email");
    var acts = secs.concat([exit]);
    var m = {
      k:"ag",
      head:{pt:"Chegaste · " + name, en:"You're here · " + name},
      text:[
        {pt:"Estás em " + name + ". Aqui dentro, o que interessa:", en:"You're on " + name + ". Inside this page, what matters:"},
        {pt:"Precisas de mais alguma coisa? Escreve, ou pergunta-me outra vez.", en:"Need anything else? Type below, or ask me again."}
      ],
      acts:acts,
      opt:{ label:{pt:"Não abras sozinho para a próxima", en:"Don't open on your own next time"}, fn:function(){
        lsSet("rr-ajuda-auto", "off");
        push({ k:"ag", text:{pt:"Combinado - fico só no canto, à espera do clique.", en:"Done - I'll stay in the corner, waiting for the click."} });
      } }
    };
    say(m);
    chips = openChips();
    renderChips();
  }

  /* -------------------------------------------------------------- open ---- */
  function isOpen(){ return rootEl && rootEl.classList.contains("open"); }
  function isLight(){ return root.getAttribute("data-theme") === "light"; }

  function open(focus){
    if (!rootEl) return;
    var wasOpen = isOpen();
    rootEl.classList.add("open");
    panel.classList.add("open");
    bubble.classList.remove("unseen");
    bubble.setAttribute("aria-expanded", "true");
    syncChrome();
    if (!wasOpen){
      if (focus && !reduce) window.setTimeout(function(){ try{ input.focus({ preventScroll:true }); }catch(e){ input.focus(); } }, 240);
      else if (focus) try{ input.focus({ preventScroll:true }); }catch(e){}
      lsSet("rr-ajuda-seen", "1");
    }
    scrollDown();
  }
  function close(){
    if (!rootEl) return;
    rootEl.classList.remove("open");
    panel.classList.remove("open");
    bubble.setAttribute("aria-expanded", "false");
    syncChrome();
  }
  function toggle(){ isOpen() ? close() : open(true); }

  /* --------------------------------------------------------------- init --- */
  function init(){
    if (!D.body) return;
    /* Escape hatch for embeds/screenshots: ?noajuda=1 */
    if (/[?&]noajuda=1/.test(location.search)) return;
    if (D.getElementById("ajRoot")) return;

    build();
    syncChrome();          /* bubble label + footer copy in the current language */
    if (lsGet("rr-ajuda-seen")) bubble.classList.remove("unseen");

    D.addEventListener("keydown", function(e){
      if (e.key === "Escape" && isOpen()){ close(); try{ bubble.focus(); }catch(err){} }
    });
    /* Language switch: re-render the whole conversation in the new language. */
    D.addEventListener("rr:lang", function(){ syncChrome(); render(); });

    var resumed = restore();   /* thread started earlier in this session */
    if (resumed) render();

    /* Arrival from another page: the two questions are already answered, so we
       skip them and say what matters here. Decided before the greeting, or the
       two would race for the same slot. */
    var nav = null;
    try{ nav = JSON.parse(ssGet("aj-nav") || "null"); }catch(e){}
    if (nav && nav.ts && (Date.now() - nav.ts) < 12000 && lsGet("rr-ajuda-auto") !== "off"){
      ssDel("aj-nav");
      var here = currentPage();
      if (nav.to && PAGES[nav.to] && PAGES[nav.to] === PAGES[here]){
        state.step = "open";
        arrival();
        open(false);
        return;
      }
    }

    if (!resumed) greet();     /* first visit: ask why they are here */

    /* We never take the screen over on our own, except on a deep link: landing
       on #section means the visitor is already looking for something. */
    if (location.hash && !lsGet("rr-ajuda-seen")){
      window.setTimeout(function(){ open(false); }, 1400);
    }
  }

  window.RR_AJUDA = { open:open, close:close, toggle:toggle, ask:ask, reset:reset };

  if (D.readyState === "loading") D.addEventListener("DOMContentLoaded", init);
  else init();
})();
