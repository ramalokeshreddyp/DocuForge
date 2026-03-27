# Architecture Documentation - DocuForge

## 1. Architecture Objective

DocuForge is built as a modular backend architecture that supports collaborative document editing, text retrieval, operational analytics, and schema evolution while maintaining data consistency under concurrent updates.

Design priorities:
- Consistency under concurrent edits
- Query performance at scale
- Operability in local and containerized environments
- Backward compatibility during schema transitions
- Clear separation of concerns by route/module boundaries

## 2. High-Level Architecture

```mermaid
flowchart TB
  C[Clients: Web/Mobile/CLI] --> G[HTTP API Gateway Layer - Express]
  G --> D1[Documents Module]
  G --> S1[Search Module]
  G --> A1[Analytics Module]
  D1 --> DB[(MongoDB documents collection)]
  S1 --> DB
  A1 --> DB
  B[Bootstrap + Seeder] --> DB
  M[Batch Migration Worker] --> DB
```

## 3. Component Topology

```mermaid
flowchart LR
  subgraph Runtime
    I[index.js]
    DBM[db.js]
    EH[errorHandler.js]
    RDoc[routes/documents.js]
    RSearch[routes/search.js]
    RAnalytics[routes/analytics.js]
    Seed[seed.js]
  end

  I --> DBM
  I --> Seed
  I --> RDoc
  I --> RSearch
  I --> RAnalytics
  I --> EH
  RDoc --> DBM
  RSearch --> DBM
  RAnalytics --> DBM
  Seed --> DBM

  Migrator[scripts/migrate_author_schema.js] --> Mongo[(MongoDB)]
  DBM --> Mongo
```

## 4. Module Responsibilities

| Module | Responsibility | Key Behaviors |
|---|---|---|
| index.js | App bootstrap and runtime wiring | Connects DB, runs seed, mounts routes, starts server |
| db.js | Database lifecycle abstraction | Singleton client setup, retrieval, and close |
| seed.js | Initial data/index provisioning | Ensures indexes, inserts 10k documents in batches |
| routes/documents.js | CRUD and OCC logic | Version-aware atomic update, schema transform on read |
| routes/search.js | Full-text retrieval | Mongo text search, relevance sort, optional tag filtering |
| routes/analytics.js | Derived insights | Most edited and tag co-occurrence pipelines |
| errorHandler.js | Unified failure responses | Converts thrown errors to stable JSON format |
| migrate_author_schema.js | Background schema migration | Batch bulkWrite conversion string author -> object |

## 5. Data Model Architecture

### 5.1 Core Document Schema
- slug: canonical API lookup key
- title, content: primary user content with text index coverage
- version: optimistic concurrency counter
- tags: classification and filtering metadata
- metadata.author: object schema target for normalized author info
- revision_history: rolling revision audit trail

### 5.2 Index Strategy
- Unique index on slug:
  - Guarantees deterministic URL/resource identity
  - Prevents duplicate logical documents
- Weighted text index on title + content:
  - Higher weight for title to improve ranking quality
  - Supports textScore-based relevance ordering

## 6. Concurrency Control Architecture

```mermaid
flowchart TD
  U[Client submits PUT with version N] --> Q[Filter by slug + version N]
  Q --> X{findOneAndUpdate matched?}
  X -- Yes --> S[Apply mutation, increment version to N+1]
  X -- No --> L[Fetch latest document]
  S --> R200[Return 200 updated document]
  L --> R409[Return 409 conflict + latest state]
```

Why this works:
- The predicate and mutation execute atomically in one database operation.
- Stale writers cannot overwrite newer state.
- Clients can reconcile using returned latest payload.

## 7. Search and Analytics Architecture

### 7.1 Search Pipeline
```mermaid
flowchart LR
  Q[Query q and optional tags] --> F[Build Mongo filter]
  F --> T[$text search]
  T --> P[Project textScore + document fields]
  P --> O[Sort by textScore desc, limit 50]
  O --> R[JSON response]
```

### 7.2 Analytics Pipelines
- most-edited:
  - Projects editCount via size(revision_history)
  - Sorts descending and limits top 10
- tag-cooccurrence:
  - Filters docs with 2+ tags
  - Generates unique tag pairs per document
  - Aggregates global pair frequencies
  - Returns ranked pairs

## 8. Schema Evolution Strategy

Two-phase migration model:
1. Lazy compatibility layer in read path:
   - If metadata.author is string, transform to object in memory
   - No immediate write required
2. Background durable migration script:
   - Reads old-schema documents in batches
   - Applies bulkWrite updates for throughput
   - Idempotent and resumable behavior

```mermaid
sequenceDiagram
  participant API
  participant DB
  participant Script as Migration Script

  API->>DB: Read document
  DB-->>API: old schema (author string)
  API-->>Client: transformed schema (author object)

  Script->>DB: scan old-schema docs
  Script->>DB: bulkWrite conversion batches
  DB-->>Script: modifiedCount progress
```

## 9. Deployment Architecture

### 9.1 Docker Compose Roles
- mongo service:
  - Persistent volume for data durability
  - Healthcheck with ping command
- api service:
  - Depends on healthy mongo
  - Receives environment via compose
  - Mounts source/script volumes for iterative development

### 9.2 Startup Contract
- API starts only after Mongo health passes.
- App boot then ensures indexes and data availability.

## 10. Scalability and Performance Considerations

Strengths:
- Index-backed retrieval paths for lookup/search
- Batch writes during seed and migration to reduce overhead
- Route-level specialization keeps logic maintainable
- OCC avoids expensive lock management while preserving correctness

Constraints and trade-offs:
- Single collection design is simple but can grow large without archival strategy
- Full-text search is Mongo-native; semantic ranking would need separate vector/search subsystem
- API currently stateless but no cache layer yet for hot reads

Scale-out options:
- Horizontal API scaling behind load balancer
- Mongo replica set for HA and read scaling
- Add Redis cache for popular document/search queries
- Move analytics heavy jobs to async worker pipeline

## 11. Reliability, Security, and Operational Gaps

Implemented:
- Health endpoint
- Consistent error response format
- Startup failure exits fast for visibility
- Migration script progress logs and final verification

Recommended for production hardening:
- AuthN/AuthZ middleware
- Input schema validation library (Joi/Zod)
- Rate limiting and abuse controls
- Structured logging and distributed tracing
- Backup and restore runbooks

## 12. Why This Stack Was Chosen

- Node.js + Express: fast development, mature ecosystem, efficient JSON APIs
- MongoDB: natural fit for evolving document schemas and text indexing
- Native Mongo driver: direct control over atomic operations and pipelines
- Docker Compose: low-friction local reproducibility and onboarding

This architecture balances implementation speed, operational clarity, and room for future scaling while already supporting non-trivial concurrency and migration requirements.
