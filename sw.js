// Service Worker for 班级运动器材借还小助手
// 缓存版本号 — 更新 HTML 后把这里改一个数字，Safari 会自动更新缓存
var CACHE_VERSION = 'v1';

// 需要预缓存的文件列表（首次访问时全部下载到本地）
var PRECACHE_FILES = [
    './',
    './index.html',
    // AI 模型文件（如果你有的话，取消下面的注释）
    // './ai-models/face/model.json',
    // './ai-models/face/metadata.json',
    // './ai-models/face/weights.bin',
    // './ai-models/equip/model.json',
    // './ai-models/equip/metadata.json',
    // './ai-models/equip/weights.bin',
];

// 运行时也缓存的来源（chart.js、TF.js 等 CDN 资源）
var RUNTIME_CACHE = 'runtime-' + CACHE_VERSION;

// ── 安装：预缓存所有列表内文件 ──
self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_VERSION).then(function(cache) {
            return cache.addAll(PRECACHE_FILES);
        }).then(function() {
            return self.skipWaiting();
        })
    );
});

// ── 激活：删除旧版本缓存 ──
self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(keys) {
            return Promise.all(
                keys.filter(function(key) {
                    return key !== CACHE_VERSION && key !== RUNTIME_CACHE;
                }).map(function(key) {
                    return caches.delete(key);
                })
            );
        }).then(function() {
            return self.clients.claim();
        })
    );
});

// ── 拦截请求：缓存优先，CDN 资源网络优先再缓存 ──
self.addEventListener('fetch', function(event) {
    var url = event.request.url;

    // CDN 资源（TF.js、chart.js、teachablemachine）：网络优先，失败走缓存
    if(url.includes('cdn.jsdelivr.net') || url.includes('cdnjs.cloudflare.com')) {
        event.respondWith(
            caches.open(RUNTIME_CACHE).then(function(cache) {
                return fetch(event.request).then(function(response) {
                    // 缓存成功响应，下次离线可用
                    if(response.ok) cache.put(event.request, response.clone());
                    return response;
                }).catch(function() {
                    // 无网络时走本地缓存
                    return cache.match(event.request);
                });
            })
        );
        return;
    }

    // 本地资源（HTML、模型文件等）：缓存优先
    event.respondWith(
        caches.match(event.request).then(function(cached) {
            if(cached) return cached;
            // 缓存没有时去网络取，并存入缓存
            return fetch(event.request).then(function(response) {
                if(response.ok) {
                    var clone = response.clone();
                    caches.open(CACHE_VERSION).then(function(cache) {
                        cache.put(event.request, clone);
                    });
                }
                return response;
            });
        })
    );
});
