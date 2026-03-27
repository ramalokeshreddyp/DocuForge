'use strict';

const express = require('express');
const router = express.Router();
const slugify = require('slugify');
const { createPatch } = require('diff');
const { getDb } = require('../db');

// Helper: transform author field if using old schema (string → object)
function transformAuthor(doc) {
  if (!doc) return doc;
  if (doc.metadata && typeof doc.metadata.author === 'string') {
    doc.metadata = {
      ...doc.metadata,
      author: {
        id: null,
        name: doc.metadata.author,
        email: null,
      },
    };
  }
  return doc;
}

// Helper: generate unique slug
async function generateUniqueSlug(db, title) {
  const base = slugify(title, { lower: true, strict: true }) || 'document';
  const collection = db.collection('documents');

  // Try base slug first
  const existing = await collection.findOne({ slug: base }, { projection: { _id: 1 } });
  if (!existing) return base;

  // Append random suffix until no collision
  let slug;
  let attempts = 0;
  do {
    const suffix = Math.random().toString(36).slice(2, 8);
    slug = `${base}-${suffix}`;
    const conflict = await collection.findOne({ slug }, { projection: { _id: 1 } });
    if (!conflict) return slug;
    attempts++;
  } while (attempts < 10);

  // Fallback: timestamp-based (virtually guaranteed unique)
  return `${base}-${Date.now()}`;
}

// ─────────────────────────────────────────────
// POST /api/documents
// ─────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const {
      title,
      content,
      tags = [],
      authorName = 'Anonymous',
      authorEmail = null,
    } = req.body;

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({ error: 'title is required and must be a non-empty string' });
    }
    if (!content || typeof content !== 'string' || content.trim() === '') {
      return res.status(400).json({ error: 'content is required and must be a non-empty string' });
    }

    const db = getDb();
    const collection = db.collection('documents');

    const slug = await generateUniqueSlug(db, title);
    const now = new Date();

    const doc = {
      slug,
      title: title.trim(),
      content,
      version: 1,
      tags: Array.isArray(tags) ? tags : [],
      metadata: {
        author: {
          id: null,
          name: authorName,
          email: authorEmail,
        },
        createdAt: now,
        updatedAt: now,
        wordCount: content.split(/\s+/).filter(Boolean).length,
      },
      revision_history: [
        {
          version: 1,
          updatedAt: now,
          authorId: null,
          contentDiff: 'Initial version',
        },
      ],
    };

    await collection.insertOne(doc);

    return res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────
// GET /api/documents/:slug
// ─────────────────────────────────────────────
router.get('/:slug', async (req, res, next) => {
  try {
    const db = getDb();
    const collection = db.collection('documents');

    const doc = await collection.findOne({ slug: req.params.slug });
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Phase 6: Lazy Schema Migration — convert old string author to object
    const transformed = transformAuthor(doc);

    return res.status(200).json(transformed);
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────
// PUT /api/documents/:slug — OCC Update
// ─────────────────────────────────────────────
router.put('/:slug', async (req, res, next) => {
  try {
    const { title, content, tags, version: expectedVersion, authorId = null } = req.body;

    if (expectedVersion === undefined || expectedVersion === null) {
      return res.status(400).json({ error: 'version is required for updates' });
    }

    const numericExpectedVersion = Number(expectedVersion);
    if (!Number.isInteger(numericExpectedVersion) || numericExpectedVersion < 1) {
      return res.status(400).json({ error: 'version must be a positive integer' });
    }

    if (title === undefined && content === undefined && tags === undefined) {
      return res.status(400).json({ error: 'At least one of title, content, or tags is required' });
    }

    const db = getDb();
    const collection = db.collection('documents');
    const { slug } = req.params;
    const now = new Date();
    const newVersion = numericExpectedVersion + 1;

    // Fetch current content for diff BEFORE update (snapshot for diff generation only)
    let contentDiff = 'Updated document';
    if (content !== undefined) {
      const current = await collection.findOne({ slug }, { projection: { content: 1 } });
      if (current && current.content) {
        try {
          const patch = createPatch(slug, current.content, content, '', '');
          const lines = patch.split('\n').filter(l => l.startsWith('+') || l.startsWith('-'));
          contentDiff = lines.length > 0
            ? `${lines.length} line(s) changed`
            : 'Minor edits (no visible diff)';
        } catch (_) {
          contentDiff = 'Content updated';
        }
      }
    }

    // Build the $set fields
    const setFields = { 'metadata.updatedAt': now };
    if (title !== undefined) setFields.title = title;
    if (content !== undefined) {
      setFields.content = content;
      setFields['metadata.wordCount'] = content.split(/\s+/).filter(Boolean).length;
    }
    if (tags !== undefined) setFields.tags = Array.isArray(tags) ? tags : [];

    const newRevisionEntry = {
      version: newVersion,
      updatedAt: now,
      authorId,
      contentDiff,
    };

    // Atomic OCC update — the version field in the query filter ensures atomicity
    const result = await collection.findOneAndUpdate(
      { slug, version: numericExpectedVersion },
      {
        $set: setFields,
        $inc: { version: 1 },
        $push: {
          revision_history: {
            $each: [newRevisionEntry],
            $slice: -20, // Keep only the last 20 revisions
          },
        },
      },
      { returnDocument: 'after' }
    );

    if (result) {
      // Success: version matched, update applied
      return res.status(200).json(transformAuthor(result));
    }

    // Conflict: no document matched the {slug, version} query
    const latest = await collection.findOne({ slug });
    if (!latest) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Return 409 with the latest version so the client can resolve the conflict
    return res.status(409).json(transformAuthor(latest));
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────
// DELETE /api/documents/:slug
// ─────────────────────────────────────────────
router.delete('/:slug', async (req, res, next) => {
  try {
    const db = getDb();
    const collection = db.collection('documents');
    const result = await collection.deleteOne({ slug: req.params.slug });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }
    return res.status(200).json({ message: 'Document deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
