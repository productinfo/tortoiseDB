const { MongoClient, ObjectId } = require('mongodb');
const uuidv4 = require("uuid/v4");

class MongoShell {
  constructor() {
    this._store = 'store';
    this._meta = 'metaStore';
    this._syncFromStore = 'syncFromStore';
    this._syncToStore = 'syncToStore';
    this._url = 'mongodb://localhost:27017';
    this._dbName = 'tortoiseDB';

    let db;
    this.connect()
      .then(tempDB => {
        db = tempDB;
        return db.listCollections().toArray();
      })
      .then(stores => {
        const storeNames = stores.map(store => store.name);
        if (!storeNames.includes(this._store)) {
          db.createCollection(this._store)
          .then(() => db.collection(this._store).createIndex({ _id_rev: 1 }))
        }
        if (!storeNames.includes(this._meta)) {
          db.createCollection(this._meta)
        }
        if (!storeNames.includes(this._syncFromStore)) {
          db.createCollection(this._syncFromStore)
        }
        if (!storeNames.includes(this.syncToStore)) {
          db.createCollection(this._syncToStore)
        }
      })
      .catch(err => console.log("Error:", err));
  }

  connect() {
    return MongoClient.connect(this._url, { useNewUrlParser: true })
      .then(client => {
        this._client = client;
        return this._client.db(this._dbName);
      })
      .catch(err => console.log("error:", err));
  }

  // createLocalSyncHistory() {
  //   const tortoiseID = 'tortoiseDB' + '::' + uuidv4();
  //   const syncHistory = { history: [], _id: tortoiseID };
  //   return this.command(this._replicationHistoryFrom, 'CREATE', syncHistory)
  //   .catch(err => console.log(err));
  // }

  // STORE OPERATIONS
  command(store, action, query, projection) {
    return this.connect()
      .then(db => db.collection(store))
      .then(collection => {
        if (action === "CREATE") {
          return collection.insertOne(query);
        } else if (action === "CREATE_MANY") {
          return collection.insertMany(query);
        } else if (action === "READ") {
          return collection.find(query, projection).toArray();
        } else if (action === 'READ_ALL') {
          return collection.find({}).toArray();
        } else if (action === 'READ_BETWEEN') {
          return collection.find({
            _id: {
              $gt: ObjectId(query.min),
              $lte: ObjectId(query.max)
            }
          }).toArray();
        } else if (action === 'GET_MAX_ID') {
          return collection.find().sort({_id: -1}).limit(1).toArray();
        } else if (action === "UPDATE") {
          collection.update({ _id: query._id }, query, {upsert: true});
        } else if (action === "UPDATE_MANY") {
          query.forEach(doc => {
            collection.update({ _id: doc._id }, query, {upsert: true});
          });
       }})
      .then(res => {
        this._client.close();
        return res;
      })
      .catch(err => {
        this._client.close();
        console.log(`${action} error:`, err)
      })
  }
  // METASTORE OPERATIONS

  readMetaDocs(ids) {
    return this.command(this._meta, 'READ', {_id: {$in: ids}})
  }

  updateMetaDocs(docs) {
    return this.command(this._meta, 'UPDATE_MANY', docs);
  }
}

const mongoShell = new MongoShell();

module.exports = { mongoShell };
