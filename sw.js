const version = '1.0.1'
const cacheName = 'offlinedemo-v' + Date.now();
const firebaseDbUrl = 'https://offline-demo-4b2ee.firebaseio.com/photos.json';

self.importScripts('./assets/js/vendors/idb.js');
var dbPromise = idb.open('offlinedemo-db', 1, upgradeDB => {
    upgradeDB.createStore('photobooth', {
        keypath: 'id',
    });
});

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

self.addEventListener('sync', event => {
    if (event.tag === 'postPhoto') {
        console.log('sync postPhoto');
        event.waitUntil(uploadPhotos());
    }
});


async function uploadPhotos() {
    const photos = await getAllPhotosFromDB('photobooth');
    for (let photo of photos) {
        try {
            await uploadPhoto(photo);
            await removePhoto(photo);
        } catch (error) {
            console.log('upload error', error);
        }
    }
}

async function uploadPhoto(photo) {
    broadcast('backup', photo.id);
    await fetch(firebaseDbUrl, {
        method: 'POST',
        body: JSON.stringify(photo)
    });
    broadcast('cloud_done', photo.id);
}

async function removePhoto(photo) {
    const store = await getStore('photobooth');
    store.delete(photo.id);
}

async function getStore() {
    const db = await dbPromise;
    return db.transaction('photobooth', 'readwrite').objectStore('photobooth');
}

async function getAllPhotosFromDB() {
    const store = await getStore();
    return store.getAll();
}

async function getAllPhotosFromDB() {
    const store = await getStore();
    return store.getAll();
}

async function broadcast(action, photoId) {
    let clients = await self.clients.matchAll();
    clients.forEach(client => {
        client.postMessage({
            client: client.id,
            message: {
                action,
                id: photoId
            }
        });
    })
}