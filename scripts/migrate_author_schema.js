'use strict';

/**
 * Background Schema Migration Script
 * Converts documents with old author schema (string) to the new object schema.
 *
 * Usage:
 *   node scripts/migrate_author_schema.js
 *
 * Environment Variables:
 *   MONGO_URI      - MongoDB connection string (default: mongodb://localhost:27017)
 *   DATABASE_NAME  - Database name (default: wikidocs)
 *   BATCH_SIZE     - Documents per batch (default: 1000)
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DATABASE_NAME = process.env.DATABASE_NAME || 'wikidocs';
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '1000', 10);

async function migrate() {
  const client = new MongoClient(MONGO_URI, {
    connectTimeoutMS: 30000,
    serverSelectionTimeoutMS: 30000,
  });

  try {
    await client.connect();
    console.log(`[MIGRATE] Connected to MongoDB — database: "${DATABASE_NAME}"`);

    const db = client.db(DATABASE_NAME);
    const collection = db.collection('documents');

    // Count total old-schema documents
    const totalOld = await collection.countDocuments({
      'metadata.author': { $type: 'string' },
    });

    if (totalOld === 0) {
      console.log('[MIGRATE] No documents with old author schema found. Nothing to migrate.');
      return;
    }

    console.log(`[MIGRATE] Found ${totalOld} document(s) with old author schema.`);
    console.log(`[MIGRATE] Processing in batches of ${BATCH_SIZE}...`);

    let processed = 0;
    let migrated = 0;

    while (true) {
      // Fetch a batch of documents with old author schema (string)
      const batch = await collection
        .find({ 'metadata.author': { $type: 'string' } })
        .limit(BATCH_SIZE)
        .toArray();

      if (batch.length === 0) break;

      // Build bulk write operations
      const bulkOps = batch.map(doc => {
        const authorName = doc.metadata.author; // current string value
        return {
          updateOne: {
            filter: { _id: doc._id, 'metadata.author': { $type: 'string' } },
            update: {
              $set: {
                'metadata.author': {
                  id: null,
                  name: authorName,
                  email: null,
                },
              },
            },
          },
        };
      });

      // Execute all updates in this batch atomically
      const result = await collection.bulkWrite(bulkOps, { ordered: false });
      migrated += result.modifiedCount;
      processed += batch.length;

      console.log(
        `[MIGRATE] Progress: ${processed}/${totalOld} processed, ${migrated} migrated.`
      );

      // Small delay to reduce load on the database
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Verify no remaining old-schema docs
    const remaining = await collection.countDocuments({
      'metadata.author': { $type: 'string' },
    });

    console.log(`\n[MIGRATE] ✅ Migration complete!`);
    console.log(`[MIGRATE]    Documents processed : ${processed}`);
    console.log(`[MIGRATE]    Documents migrated  : ${migrated}`);
    console.log(`[MIGRATE]    Remaining old-schema: ${remaining}`);
  } catch (err) {
    console.error('[MIGRATE] ❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log('[MIGRATE] Connection closed.');
  }
}

migrate();
