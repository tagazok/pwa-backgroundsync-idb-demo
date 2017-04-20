self.importScripts('./assets/js/vendors/idb.js');
self.importScripts('./assets/js/datastore.js');

const version = '1.0.1'
const cacheName = 'offlinedemo-v' + Date.now();

var ds = new Datastore();

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
				'./manifest.json',
				'./assets/js/vendors/idb.js'
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

async function uploadPhoto(photo) {
	broadcast('backup', photo.id);
	await fetch('https://offline-demo-4b2ee.firebaseio.com/photos.json', {
             method: 'post',
             body: JSON.stringify(photo)
         });
	broadcast('cloud_done', photo.id);
}

async function broadcast(action, photoId) {
	let clients = await self.clients.matchAll();
	for (let client of clients) {
		client.postMessage({
			client: client.id,
			message: {action: action, id: photoId}
		});
	}
}

async function uploadPhotos() {
	const photos = await ds.getAllPhotosFromDb();
	for (let photo of photos) {
		await uploadPhoto(photo);
		await ds.removePhoto(photo);
	}
}

self.addEventListener('sync', event => {
	if (event.tag === 'syncPhoto') {
		event.waitUntil(uploadPhotos());
	}
});