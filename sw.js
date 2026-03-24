var CACHE = 'sports-v1';
var RUNTIME = 'runtime-v1';

var PRE_CACHE = [
    './',
    './index.html',
    './manifest.json'
    // 模型文件（取消注释后首次访问时自动缓存）
    // './ai-models/face/model.json',
    // './ai-models/face/metadata.json',
    // './ai-models/face/weights.bin',
    // './ai-models/equip/model.json',
    // './ai-models/equip/metadata.json',
    // './ai-models/equip/weights.bin'
];

self.addEventListener('install', function(e) {
    e.waitUntil(
        caches.open(CACHE).then(function(c) {
            return c.addAll(PRE_CACHE);
        }).then(function() {
            return self.skipWaiting();
        })
    );
});

self.addEventListener('activate', function(e) {
    e.waitUntil(
        caches.keys().then(function(keys) {
            return Promise.all(keys.filter(function(k) {
                return k !== CACHE && k !== RUNTIME;
            }).map(function(k) {
                return caches.delete(k);
            }));
        }).then(function() {
            return self.clients.claim();
        })
    );
});

self.addEventListener('fetch', function(e) {
    var url = e.request.url;

    // CDN资源（TF.js、chart.js）：网络优先，失败读缓存
    if (url.indexOf('cdn.jsdelivr.net') !== -1 || url.indexOf('cdnjs.cloudflare.com') !== -1) {
        e.respondWith(
            caches.open(RUNTIME).then(function(cache) {
                return fetch(e.request).then(function(res) {
                    if (res.ok) cache.put(e.request, res.clone());
                    return res;
                }).catch(function() {
                    return cache.match(e.request);
                });
            })
        );
        return;
    }

    // 本地资源：缓存优先，缓存没有再去网络取并存入缓存
    e.respondWith(
        caches.match(e.request).then(function(cached) {
            if (cached) return cached;
            return fetch(e.request).then(function(res) {
                if (res.ok) {
                    var clone = res.clone();
                    caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
                }
                return res;
            });
        })
    );
});
