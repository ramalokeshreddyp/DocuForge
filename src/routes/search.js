'use strict';

const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

// ─────────────────────────────────────────────
// GET /api/search?q=<term>[&tags=tag1,tag2]
// ─────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { q, tags } = req.query;

    if (!q || q.trim() === '') {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    const db = getDb();
    const collection = db.collection('documents');

    // Build filter: text search is mandatory
    const filter = {
      $text: { $search: q.trim() },
    };

    // If tags provided, ALL must be present (AND semantics via $all)
    if (tags && tags.trim() !== '') {
      const tagList = tags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);
      if (tagList.length > 0) {
        filter.tags = { $all: tagList };
      }
    }

    // Project relevance score from text index
    const projection = {
      score: { $meta: 'textScore' },
      slug: 1,
      title: 1,
      content: 1,
      version: 1,
      tags: 1,
      metadata: 1,
      revision_history: 1,
    };

    const results = await collection
      .find(filter, { projection })
      .sort({ score: { $meta: 'textScore' } })
      .limit(50)
      .toArray();

    return res.status(200).json(results);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
