 'use strict';

 class Datastore {

     constructor() {
        this.dbPromise = idb.open('offlinedemo-db', 1, upgradeDb => {
                upgradeDb.createObjectStore('photobooth', {
                    keyPath: 'id'
                });
            });
     }

    async getStore() {
        const db = await this.dbPromise;
        return db.transaction('photobooth', 'readwrite').objectStore('photobooth');
    }

    async getAllPhotosFromDb() {
        const store = await this.getStore();
        return store.getAll();
    }


    async removePhoto(photo) {
        const store = await this.getStore();
        store.delete(photo.id);
    }
}