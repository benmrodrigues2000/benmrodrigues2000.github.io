var VERSION = "portefolio-v16";
var SHELL = [
  "./",
  "index.html",
  "sobre.html",
  "ferramentas.html",
  "percurso.html",
  "trabalhos.html",
  "contacto.html",
  "cv.html",
  "briefing.html",
  "404.html",
  "css/style.css",
  "css/cv.css",
  "css/ajuda.css",
  "js/main.js",
  "js/controls.js",
  "js/ajuda.js",
  "favicon.svg",
  "manifest.webmanifest",
  "apple-touch-icon.png",
  "icon-192.png",
  "icon-512.png",
  "fonts.css",
  "cv.pdf",
  "fonts/bebas-neue-400-latin.woff2",
  "fonts/ibm-plex-mono-400-latin.woff2",
  "fonts/ibm-plex-mono-500-latin.woff2",
  "fonts/inter-400_700-latin.woff2"
];

self.addEventListener("install", function(e){
  e.waitUntil(
    caches.open(VERSION)
      .then(function(c){ return c.addAll(SHELL); })
      .then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys()
      .then(function(keys){
        return Promise.all(keys.filter(function(k){ return k !== VERSION; }).map(function(k){ return caches.delete(k); }));
      })
      .then(function(){
        if (self.registration.navigationPreload) return self.registration.navigationPreload.enable();
      })
      .then(function(){ return self.clients.claim(); })
  );
});

function store(req, res){
  if (!res || !res.ok || res.type === "opaque") return;
  var copy = res.clone();
  caches.open(VERSION).then(function(c){ c.put(req, copy).catch(function(){}); });
}

self.addEventListener("fetch", function(e){
  var req = e.request;
  if (req.method !== "GET") return;
  var url;
  try{ url = new URL(req.url); }catch(err){ return; }
  if (url.origin !== location.origin) return;

  var wantsHTML = req.mode === "navigate" || (req.headers.get("accept") || "").indexOf("text/html") > -1;

  /* HTML is stale-while-revalidate: a return visit paints from cache
     immediately, then the network refreshes the copy. Navigation preload
     (enabled on activate) skips the service-worker wait on that refresh. */
  if (wantsHTML){
    var preload = e.preloadResponse || Promise.resolve(undefined);
    e.respondWith(
      preload.catch(function(){ return undefined; }).then(function(pre){
        if (pre){ store(req, pre); return pre; }
        return caches.match(req, { ignoreSearch: true }).then(function(cached){
          var net = fetch(req).then(function(res){
            store(req, res);
            return res;
          }).catch(function(){
            return cached || caches.match("404.html");
          });
          return cached || net;
        });
      })
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(function(cached){
      var net = fetch(req).then(function(res){
        store(req, res);
        return res;
      }).catch(function(){ return cached || Response.error(); });
      return cached || net;
    })
  );
});
