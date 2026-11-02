const CACHE_NAME='turnaround-life-shell-v1';
const APP_SHELL=['/','/index.html','/manifest.json','/css/variables.css','/css/global.css','/css/layout.css','/css/components.css','/css/mobile.css','/js/app.js','/js/core/database.js','/js/core/settings.js','/js/features/navigation.js','/js/features/settings-ui.js','/assets/icons/icon.svg','/assets/icons/icon-192.png','/assets/icons/icon-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{const request=event.request;const url=new URL(request.url);
  // Never intercept Netlify Functions: their responses must remain live JSON, never cached HTML.
  if(url.origin!==self.location.origin || url.pathname.startsWith('/.netlify/functions/') || request.method!=='GET' || request.headers.has('authorization')) return;
  if(request.mode==='navigate'){event.respondWith(fetch(request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put('/index.html',copy));}return response;}).catch(()=>caches.match('/index.html')));return;}
  if(APP_SHELL.includes(url.pathname)){event.respondWith(caches.match(request).then(cached=>cached||fetch(request)));}
});
