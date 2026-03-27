# Collaborative Document Store

A **production-ready collaborative wiki backend** built with **Node.js**, **Express**, and **MongoDB 7**. Implements optimistic concurrency control, full-text search, analytics aggregation pipelines, and schema migration strategies.

---

## 🚀 Quick Start

### Prerequisites

- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/) installed

### Run with Docker Compose

```bash
# 1. Copy environment variables (or use defaults — they work out of the box)
cp .env.example .env

# 2. Start all services (MongoDB + API)
docker-compose up --build
```

The API will be available at **http://localhost:3000**.

On first run, the application automatically:
1. Connects to MongoDB
2. Creates indexes (`slug` unique, `title`+`content` text search)
3. Seeds **10,000 synthetic wiki documents** (with ~10% using the old schema for migration testing)

---

## 📐 Architecture

```
docker-compose
├── mongo (MongoDB 7)     — Port 27017  — Volume: mongo_data
└── api   (Node.js/Express) — Port 3000  — Source: ./src

src/
├── index.js                # App bootstrap: connect → seed → listen
├── db.js                   # MongoDB connection singleton
├── seed.js                 # 10,000 synthetic document seeder
├── middleware/
│   └── errorHandler.js     # Global error handling
└── routes/
    ├── documents.js         # CRUD + OCC + lazy schema migration
    ├── search.js            # Full-text search with tag filtering
    └── analytics.js         # Aggregation pipeline endpoints

scripts/
└── migrate_author_schema.js  # Background schema migration (bulkWrite)
```

---

## 📡 API Reference

### Documents

| Method   | Endpoint                | Description                              |
|----------|-------------------------|------------------------------------------|
| `POST`   | `/api/documents`        | Create a new document                    |
| `GET`    | `/api/documents/:slug`  | Get document by slug (+ lazy migration)  |
| `PUT`    | `/api/documents/:slug`  | Update with OCC (must include `version`) |
| `DELETE` | `/api/documents/:slug`  | Delete a document                        |

#### Example: Create Document
```bash
curl -X POST http://localhost:3000/api/documents \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My First Document",
    "content": "# Hello World\n\nThis is my first wiki page.",
    "tags": ["mongodb", "guide"],
    "authorName": "Jane Doe",
    "authorEmail": "jane@example.com"
  }'
```

**Response (201):**
```json
{
  "slug": "my-first-document",
  "title": "My First Document",
  "content": "# Hello World\n\nThis is my first wiki page.",
  "version": 1,
  "tags": ["mongodb", "guide"],
  "metadata": {
    "author": { "id": null, "name": "Jane Doe", "email": "jane@example.com" },
    "createdAt": "...",
    "updatedAt": "...",
    "wordCount": 9
  },
  "revision_history": [{ "version": 1, "updatedAt": "...", "authorId": null, "contentDiff": "Initial version" }]
}
```

#### Example: Update with OCC
```bash
# Send the current version — server returns 409 Conflict if version is stale
curl -X PUT http://localhost:3000/api/documents/my-first-document \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Title",
    "content": "New content here",
    "version": 1
  }'
# → 200 with version: 2 on success
# → 409 with latest document if version mismatch
```

### Search

```bash
# Full-text search
curl "http://localhost:3000/api/search?q=mongodb"

# With tag filter (AND — all specified tags must be present)
curl "http://localhost:3000/api/search?q=mongodb&tags=guide,backend"
```

**Response:** Array of documents sorted by relevance score (descending), each including a `score` field.

### Analytics

```bash
# Top 10 most-edited documents
curl http://localhost:3000/api/analytics/most-edited

# Tag co-occurrence pairs sorted by frequency
curl http://localhost:3000/api/analytics/tag-cooccurrence
```

**Tag co-occurrence example response:**
```json
[
  { "tags": ["mongodb", "database"], "count": 42 },
  { "tags": ["docker", "devops"],    "count": 38 }
]
```

### Health Check

```bash
curl http://localhost:3000/health
# → { "status": "ok", "timestamp": "..." }
```

---

## 🔐 Optimistic Concurrency Control (OCC)

Prevents lost updates when multiple users edit the same document simultaneously:

1. Client fetches document → receives `"version": 5`
2. Client sends `PUT` with changes + `"version": 5`
3. Server atomically checks: `{ slug: '...', version: 5 }` — if matched, updates and increments to `6`
4. If another user already updated (version is now `6`):
   - Server returns **`409 Conflict`** with the **latest** document in the response body
   - Client can display a merge/diff UI

The key is `findOneAndUpdate` with `version` in the query filter — this is a **single atomic operation** that eliminates race conditions.

---

## 🔄 Schema Migration

### Lazy Migration (On-Read)

`GET /api/documents/:slug` automatically upgrades old-schema documents in memory:

| Schema | Format |
|--------|--------|
| Old | `"metadata.author": "Jane Doe"` (string) |
| New | `"metadata.author": { "id": null, "name": "Jane Doe", "email": null }` (object) |

No database writes are performed — the transformation happens transparently in the application layer before sending the response.

### Background Migration Script

Run to permanently migrate all old-schema documents in the database:

```bash
# Inside Docker
docker-compose exec api node scripts/migrate_author_schema.js

# Locally (point at your MongoDB instance)
MONGO_URI=mongodb://localhost:27017 node scripts/migrate_author_schema.js

# With custom batch size (default: 1000)
BATCH_SIZE=500 node scripts/migrate_author_schema.js
```

The script:
- Finds all documents where `metadata.author` is a string
- Processes in configurable batches (default: 1,000) using `bulkWrite` for efficiency
- Logs progress and final summary
- Is safe to re-run (idempotent — already-migrated docs are skipped)

---

## ⚙️ Environment Variables

See [`.env.example`](.env.example) for all variables.

| Variable        | Default                   | Description                    |
|-----------------|---------------------------|--------------------------------|
| `MONGO_URI`     | `mongodb://mongo:27017`   | MongoDB connection string       |
| `DATABASE_NAME` | `wikidocs`                | Database name                  |
| `PORT`          | `3000`                    | API server port                |

---

## 📊 Data Model

```json
{
  "_id": "ObjectId",
  "slug": "mongodb-comprehensive-guide-0-0-0",
  "title": "MongoDB — Comprehensive Guide",
  "content": "# MongoDB\n\nMarkdown content...",
  "version": 12,
  "tags": ["mongodb", "database", "nosql"],
  "metadata": {
    "author": {
      "id": "user-001",
      "name": "Alice Chen",
      "email": "alice.chen@example.com"
    },
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-03-20T14:30:00Z",
    "wordCount": 450
  },
  "revision_history": [
    {
      "version": 12,
      "updatedAt": "2024-03-20T14:30:00Z",
      "authorId": "user-001",
      "contentDiff": "3 line(s) changed"
    }
  ]
}
```

**Indexes:**
- `slug`: unique index (primary lookup key)
- `title` + `content`: text index with weights (`title: 10`, `content: 5`)

---

## 🛠️ Development

```bash
# Install dependencies
npm install

# Run locally (requires a running MongoDB instance)
MONGO_URI=mongodb://localhost:27017 npm start

# Development with auto-reload
MONGO_URI=mongodb://localhost:27017 npm run dev

# Run migration script
MONGO_URI=mongodb://localhost:27017 npm run migrate
```

---

## 📋 Requirements Checklist

| # | Requirement | Status |
|---|-------------|--------|
| 1 | Docker Compose with healthcheck, depends_on, volumes | ✅ |
| 2 | Auto-seed 10,000+ docs with correct schema & indexes | ✅ |
| 3 | `POST /api/documents` → 201, version=1, server-generated slug | ✅ |
| 4 | `GET /api/documents/:slug` → 200/404 | ✅ |
| 5 | `PUT /api/documents/:slug` OCC success → 200, version incremented | ✅ |
| 6 | `PUT /api/documents/:slug` OCC conflict → 409 with latest doc | ✅ |
| 7 | `GET /api/search?q=` with textScore, sorted by relevance | ✅ |
| 8 | `GET /api/search?q=&tags=` with tag filtering ($all) | ✅ |
| 9 | `GET /api/analytics/most-edited` top 10 by revision count | ✅ |
| 10 | `GET /api/analytics/tag-cooccurrence` with counts | ✅ |
| 11 | `scripts/migrate_author_schema.js` exists and is runnable | ✅ |
| 12 | Lazy on-read schema migration for old string author | ✅ |
| 13 | `.env.example` with `MONGO_URI`, `DATABASE_NAME`, `PORT` | ✅ |
