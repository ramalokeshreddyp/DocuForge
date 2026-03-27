'use strict';

const { MongoClient } = require('mongodb');

let client;
let db;

async function connect() {
  if (db) return db;

  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017';
  const dbName = process.env.DATABASE_NAME || 'wikidocs';

  client = new MongoClient(uri, {
    connectTimeoutMS: 30000,
    serverSelectionTimeoutMS: 30000,
  });

  await client.connect();
  db = client.db(dbName);
  console.log(`[DB] Connected to MongoDB — database: "${dbName}"`);
  return db;
}

function getDb() {
  if (!db) throw new Error('Database not initialized. Call connect() first.');
  return db;
}

async function close() {
  if (client) {
    await client.close();
    db = null;
    client = null;
  }
}

module.exports = { connect, getDb, close };
