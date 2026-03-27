'use strict';

const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

// ─────────────────────────────────────────────
// GET /api/analytics/most-edited
// Returns top 10 documents by revision count
// ─────────────────────────────────────────────
router.get('/most-edited', async (req, res, next) => {
  try {
    const db = getDb();
    const collection = db.collection('documents');

    const pipeline = [
      {
        $project: {
          slug: 1,
          title: 1,
          version: 1,
          editCount: { $size: '$revision_history' },
        },
      },
      { $sort: { editCount: -1 } },
      { $limit: 10 },
    ];

    const results = await collection.aggregate(pipeline).toArray();
    return res.status(200).json(results);
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────
// GET /api/analytics/tag-cooccurrence
// Returns pairs of tags and how often they appear together
// ─────────────────────────────────────────────
router.get('/tag-cooccurrence', async (req, res, next) => {
  try {
    const db = getDb();
    const collection = db.collection('documents');

    const pipeline = [
      // Only consider docs that have at least 2 tags
      { $match: { $expr: { $gte: [{ $size: '$tags' }, 2] } } },

      // Keep only the _id and tags
      { $project: { tags: 1 } },

      // Unwind tags to get one doc per tag
      { $unwind: '$tags' },

      // Group back per document to get sorted unique tag arrays
      {
        $group: {
          _id: '$_id',
          tags: { $push: '$tags' },
        },
      },

      // Self-join: combine every unique pair from each document's tags
      // We do this by unwinding twice and using a computed pairKey
      {
        $project: {
          pairs: {
            $reduce: {
              input: { $range: [0, { $size: '$tags' }] },
              initialValue: [],
              in: {
                $concatArrays: [
                  '$$value',
                  {
                    $map: {
                      input: {
                        $filter: {
                          input: { $range: [0, { $size: '$tags' }] },
                          as: 'j',
                          cond: { $gt: ['$$j', '$$this'] },
                        },
                      },
                      as: 'j',
                      in: {
                        t1: { $arrayElemAt: ['$tags', '$$this'] },
                        t2: { $arrayElemAt: ['$tags', '$$j'] },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      },

      // Unwind pairs
      { $unwind: '$pairs' },

      // Group by tag pair and count
      {
        $group: {
          _id: { t1: '$pairs.t1', t2: '$pairs.t2' },
          count: { $sum: 1 },
        },
      },

      // Format output
      {
        $project: {
          _id: 0,
          tags: ['$_id.t1', '$_id.t2'],
          count: 1,
        },
      },

      { $sort: { count: -1 } },
      { $limit: 100 },
    ];

    const results = await collection.aggregate(pipeline).toArray();
    return res.status(200).json(results);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
