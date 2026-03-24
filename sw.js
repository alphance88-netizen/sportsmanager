var CACHE = 'sports-v2';
var RUNTIME = 'runtime-v2';

var PRE_CACHE = [
    './',
    './index.html',
    './manifest.json'
];

self.addEventListener('install', function(e) {
    e.waitUntil(
        caches.open(CACHE).then(function(c) {
            return c.addAll(PRE_CACHE);
        }).then(function() { return self.skipWaiting(); })
    );
});

self.addEventListener('activate', function(e) {
    e.waitUntil(
        caches.keys().then(function(keys) {
            return Promise.all(keys.filter(function(k) {
                return k !== CACHE && k !== RUNTIME;
            }).map(function(k) { return caches.delete(k); }));
        }).then(function() { return self.clients.claim(); })
    );
});

self.addEventListener('fetch', function(e) {
    var url = e.request.url;
    if (url.indexOf('cdn.jsdelivr.net') !== -1 || url.indexOf('cdnjs.cloudflare.com') !== -1) {
        e.respondWith(
            caches.open(RUNTIME).then(function(cache) {
                return fetch(e.request.clone()).then(function(res) {
                    if (res.ok) cache.put(e.request, res.clone());
                    return res;
                }).catch(function() {
                    return cache.match(e.request).then(function(hit) {
                        return hit || Response.error();
                    });
                });
            })
        );
        return;
    }
    e.respondWith(
        caches.match(e.request).then(function(cached) {
            if (cached) return cached;
            return fetch(e.request).then(function(res) {
                if (res.ok) {
                    var clone = res.clone();
                    caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
                }
                return res;
            }).catch(function() { return Response.error(); });
        })
    );
});
