var VERSION = "portefolio-v6";
var SHELL = [
  "./",
  "index.html",
  "sobre.html",
  "ferramentas.html",
  "percurso.html",
  "trabalhos.html",
  "contacto.html",
  "briefing.html",
  "404.html",
  "css/style.css",
  "js/main.js",
  "favicon.svg",
  "manifest.webmanifest",
  "apple-touch-icon.png",
  "icon-192.png",
  "fonts.css",
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
      .then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(e){
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  var sameOrigin = url.origin === location.origin;
  var isFont = url.hostname.indexOf("fonts.") > -1;
  if (!sameOrigin && !isFont) return;

  var wantsHTML = req.mode === "navigate" || (req.headers.get("accept") || "").indexOf("text/html") > -1;

  if (wantsHTML){
    e.respondWith(
      fetch(req).then(function(res){
        var copy = res.clone();
        caches.open(VERSION).then(function(c){ c.put(req, copy); });
        return res;
      }).catch(function(){
        return caches.match(req, { ignoreSearch: true }).then(function(m){
          return m || caches.match("404.html");
        });
      })
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(function(cached){
      var net = fetch(req).then(function(res){
        if (res && (res.ok || res.type === "opaque")){
          var copy = res.clone();
          caches.open(VERSION).then(function(c){ c.put(req, copy); });
        }
        return res;
      }).catch(function(){ return cached; });
      return cached || net;
    })
  );
});
