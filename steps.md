# Steps :
## Set-up background sync
* TODO : Slide sur comment register un sync (tag, etc)
La première chose dont un va parler est, comment savoir si on est connecté ou non.
Eh ben, on ne peut pas vraiment.
Par contre, le service worker lui, peut !
* Dans sw.js

```javascript
self.addEventListener('sync', event => {
	console.log('sync event fired')
});
```
* Dans script.js (addPhoto() - line 97)

```javascript
if (reg) {
    reg.sync.register('syncPhoto').then(() => {
        console.log("Sync registered");
    });
}
```
Tests : 
* check with connection : both console.log appears  
* disconnect and reconnect : "sync postPhoto" will display after we get connection

```javascript
self.addEventListener('sync', event => {
    if (event.tag === 'postPhoto') {
        console.log("sync postPhoto");
    }
});
```

## Comment ça va marcher
Quand on prend une photo, on veut qu'elle soit :
* envoyée sur internet si on a du réseau
* qu'on attende d'avoir du réseau pour l'envoyer
Oui mais, il faut aussi gérer le cas ou on prend plusieurs photos...
* Steps :
    + On clique sur le bouton pour prendre une photo
    + le client :
        + stock la photo dans une bdd locale
        + register un sync sur le serviceWorker
    + Si on a du réseau :
        + le sw récupère les photos de la bdd et les envoi sur internet

### IndexedDb
IndexedDb (Indexed Database API) est un standard W3C pour une bdd locale embarquée dans le navigateur. Comme pour des bdd nosql
on a une collection d'objets json.  

__Problème :__ L'API n'utilise pas les promesses mais un système d'événements sur l'objet IDBRequest.  
__Heureusement__, il existe une implémentation faite par Jake Archibald qui va remplacer IDBRequest par des promesses.

C'est ce qu'on va utiliser

* Dans sw.js  
On cache './assets/js/vendors/idb.js'
* Dans script.js
    + En haut

    ```javascript
    var db = null;
    ```

    + Après le Init du serviceWorker

    ```javascript
    // Init db
    var dbPromise = idb.open('offlinedemo-db', 1, upgradeDb => {
        upgradeDb.createObjectStore('photobooth', {
            keyPath: 'id',
        });
    });
    ```

    Montrer qu'on voit la base de donnée dans les devtools et qu'elle est vide

    + dans addPhoto() - l129

    ```javascript
    dbPromise.then(db => {
        let tx = db.transaction('photobooth', 'readwrite');
        let store = tx.objectStore('photobooth');
        let photo = {
            id: Date.now(),
            date: new Date().toString(),
            source: snap
        };
        store.put(photo);
        photos.push(photo);
        photos_list.insertBefore(generatePhotoTemplate(photo, false), photos_list.firstChild);
    });
    ```
 
Tests :
* Faire 2 ou 3 photos
* Montrer la bdd avec les photos
* Rafraichir : Ah, on ne voit pas les photos de notre bdd

On fait une fonction qui récupère toutes les photos de la bdd

```javascript
function getAllPhotosFromDb() {
    return dbPromise.then(function(db) {
        return db.transaction('photobooth', 'read').objectStore('photobooth')
            .getAll();
    });
}

dbPromise.then(function(db) {
    getAllPhotosFromDb()
    .then(function(data) {
        for (let photo of data) {
            photos_list.insertBefore(generatePhotoTemplate(photo, true), photos_list.firstChild);
        }
    });
});
```

On va pouvoir refactoriser un peu notre code. On va souvent avoir besoin d'ouvrir une trnsaction et récupérer un objecStore de notre base de donnée.
On va faire une fonction pour nous épargnier de taper à chaque fois

```javascript
function getStore() {
    return dbPromise.then(db => {
        return db.transaction('photobooth').objectStore('photobooth')
    });
}
function getAllPhotosFromDb() {
    return getStore().then(store => {
        return store.getAll();
    });
}
```
Bon, ça fait beaucoup trop de promesses tout ça. Ca sert à rien de troquer les vieux callbacks pour des promsees.
Quelqu'un a une idée pour faire quelque chose de mieux?
__Montrer slides sur async/await

```javascript
async function getStore(store) {
    const db = await dbPromise;
    return db.transaction(store, 'readwrite')
             .objectStore(store);
}

async function getAllPhotosFromDb(store) {
    const s = await getStore(store);
    return s.getAll();
}
```
On peut même refactoriser le code qui récupère les photos de la bdd

```javascript
dbPromise.then(async db => {
    const data = await getAllPhotosFromDb('photobooth');
    for (let photo of data) {
        photos_list.insertBefore(generatePhotoTemplate(photo, false), photos_list.firstChild);
    }
});
```

__montrer slide du schéma pour montrer ou on en est__
On va aussi pouvoir refactoriser dans addPhoto() -l148
   + dans addPhoto()

```javascript
if (reg) {
    reg.sync.register('postPhoto').then(() => {
        console.log("Sync registered");
    });
}
```

__montrer slide du schéma pour montrer ou on en est__

Ensuite, on veut que le service worker aille chercher les images et les envoient sur internet

* Dans sw.js

```javascript
self.importScripts('./assets/js/vendors/idb.js');
```

Récupérer code l49 dans script.js

```javascript
var dbPromise = idb.open('offlinedemo-db', 1, upgradeDb => {
	upgradeDb.createObjectStore('photobooth', {
	keyPath: 'id',
	});
});
```
+ Dans 'sync'

```javascript
event.waitUntil(uploadPhotos());
```

__Les fonctions en async sont castées en promesses, on n'a pas besoin d'en rengoyer une__

```javascript
async function uploadPhotos() {
	const photos = await getAllPhotosFromDb('photobooth');
	for (let photo of photos) {
	    try {
			await uploadPhoto(photo);
		} catch (error) {
			console.log("Error : Can't upload photo" + error);
		}
	}
}
```

Récupérer getStore et getAllPhotosFromDb() - l65


```javascript
async function uploadPhotos() {
	const photos = await getAllPhotosFromDb();
	//for (let photo of photos) {
	//	try {
	//		await uploadPhoto(photo);
	//		await removePhotoFromDb(photo);
	//	} catch (e) {
    //    // TODO : retry
	//		console.log(e.name + " " + e);
	//	}
	//}
}
```

TODO : Mettre le code partagé dans un autre fichier js

__Quand on fait un await dans un "for", il bloque la boucle__

On n'est pas obligé de mettre le résultat de await dans une variable.

```javascript
async function uploadPhoto(photo) {
	//broadcast("uploading", photo.id);
	await fetch('https://offline-demo-4b2ee.firebaseio.com/photos.json', {
					method: 'post',
					body: JSON.stringify(photo)
				});
	//broadcast("uploaded", photo.id);
}
```

Test : On prend une photo. Elle est uploadée. Je reprends une photo, les 2 sont uploadées.

```javascript
async function removePhoto(photo) {
	const store = await getStore('photobooth');
	store.delete(photo.id);
}
```

Test : On prend une photo et on l'upload
Pb : l'interface ne se met pas à jour

## Communication sw/client
On veut que le client sache quand on est en train d'uploader une photo et quand le backup est finit
* Dans sw.js

```javascript
async function broadcast(action, photoId) {
	let clients = await self.clients.matchAll();
	clients.forEach(client => {
		client.postMessage({
			client: client.id,
			message: {action: action, id: photoId}
		});
	});
}
```

+ Dans uploadPhoto()

```javascript
broadcast("backup", photo.id);
// ...
broadcast("cloud_done", photo.id);
```

Une fois qu'on envoi les événements, il faut bien les recevoir du côté de notre client
// TODO : Mettre le nom de l'icone directement dans l'action du message
* Dans script.js
```javascript
navigator.serviceWorker.addEventListener('message', event => {
    let message = event.data.message;
    document.querySelector(`#photo-${message.id} .material-icons`).textContent = message.action;
});
```
# __PENSER A REFRESH POUR AVOIR LES CLIENTS__

On s'approche d'une expérience offline convaincante.
Il nous manque encore un petit quelque chose. Quand on lance l'application sans réseau, nous n'avons pas les images de firebase qui se chargent
Ce qu'on va faire c'est qu'on va aussi les cachées

```javascript
var dbPromise = idb.open('offlinedemo-db', 1, upgradeDb => {
    upgradeDb.createObjectStore('photobooth', {
        keyPath: 'id',
    });
    upgradeDb.createObjectStore('photobooth-fb', {
        keyPath: 'id',
    });
});
```
Faire un indexedDB.deleteDatabase('offlinedemo-db') dans la console !

line 88

```javascript
if (data) {
    $('.no-photo').style.display = 'none';
    
    const store = await getStore('photobooth-fb');
    store.clear();
    photos_list_fb.innerHTML = '';

    for (let photo of Object.values(data)) {
        store.put(photo);
        photos_lis_fb.insertBefore(generatePhotoTemplate(photo, true), photos_list_fb.firstChild);
    }  
}
```

Test :
Les photos sont dans la bdd

Maintenant, il faut qu'on les affichent. On les récupère, on les affiche.
Et en parallèle, on récupère les nouvelles du réseau pour remplacer celles cachées.

```javascript
dbPromise.then(db => {
    getAllPhotosFromDb('photobooth-bf')
    .then(data => {
        for (let photo of data) {
            photos_list.insertBefore(generatePhotoTemplate(photo, true), photos_list.firstChild);
        }
    })
});
```

Test : 
Offline : Mes photos s'affichent
 * Je prends une photo.
 * Je recharge. Tout s'affiche
 * Je reprends une photo
 * Je remets le réseau
 * Elles s'uploadent

 Problème : Si je me redéconnecte, et que je recharge ma page. Je vais seulement avoir les 3 photos cachées qui vont s'afficher, pas les nouvelles.
 Alors, en soit ce n'est pas grave, on va récupérer la nouvelle liste sur le réseau dès qu'on sera connecté mais bon, on peut faire mieux !

On retourne dans le service worker. Une fois que notre photo est uploadée
```javascript
upgradeDb.createObjectStore('photobooth-bf', {
        keyPath: 'id'
});
```

 ```javascript
async function removePhoto(photo) {
	const store = await getStore('photobooth');
	const storeBf = await getStore('photobooth-bf');

	Promise.all([
		store.delete(photo.id),
		storeBf.put(photo)
	]);
}
 ``` 

 Test :
 * Je recharge (CLIENT !)
 * Je prends une photo
 * Je vérifie, la photo est bien dans la bdd
 * Je me déconnecte, je recharge => OK !


