/* Rent vs Buy — offline cache. Bump VERSION when shipping changes to cached assets. */
var VERSION = "rob-v1";
var SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", function(e){
  e.waitUntil(caches.open(VERSION).then(function(c){ return c.addAll(SHELL); }).then(function(){ return self.skipWaiting(); }));
});

self.addEventListener("activate", function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){ return k !== VERSION; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});

self.addEventListener("fetch", function(e){
  var req = e.request;
  if(req.method !== "GET") return;
  var url = new URL(req.url);

  // Pages: network first so updates show up right away; fall back to the cached copy offline.
  if(req.mode === "navigate"){
    e.respondWith(fetch(req).then(function(res){
      var copy = res.clone();
      caches.open(VERSION).then(function(c){ c.put("./index.html", copy); });
      return res;
    }).catch(function(){
      return caches.match("./index.html").then(function(r){ return r || caches.match("./"); });
    }));
    return;
  }

  // Same-origin assets and Google Fonts: cache first, fill the cache on the way.
  var fonts = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if(url.origin === self.location.origin || fonts){
    e.respondWith(caches.match(req).then(function(hit){
      return hit || fetch(req).then(function(res){
        if(res.ok || res.type === "opaque"){
          var copy = res.clone();
          caches.open(VERSION).then(function(c){ c.put(req, copy); });
        }
        return res;
      });
    }));
  }
});
