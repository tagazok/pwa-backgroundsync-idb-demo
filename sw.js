const version = '1.0.1'
const cacheName = 'offlinedemo-v' + Date.now();


this.addEventListener('install', function(event) {
	event.waitUntil(
		caches.open(cacheName).then(function(cache) {
			// The cache will fail if any of these resources can't be saved.
			return cache.addAll([
				// Path is relative to the origin, not the app directory.
				'./',
				'./index.html',
				'./assets/css/styles.css',
				'./assets/fonts/MaterialIcons-Regular.woff2',
				'./assets/js/script.js',
				'./assets/icons/ic-face.png',
				'./assets/icons/ic-face-large.png',
				'./manifest.json'
			])
			.then(function() {
				console.log('Success! App is available offline!');
			})
		})
	);
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keyList => {
      return Promise.all(keyList.map(key => {
        if (key !== cacheName) {
          console.log('Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
});

self.addEventListener('fetch', function(event) {
	event.respondWith(
	    caches.match(event.request)
    	.then(function(response) {
			return response || fetch(event.request);
		})
		.catch(function() {
			return caches.match('/offline.html');
		})
  	);
});