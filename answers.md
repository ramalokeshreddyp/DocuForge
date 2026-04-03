# Questionnaire Answers

## 1. Describe the architecture of your backend service. Why did you choose the patterns or frameworks you used?

The backend is built as a small layered Node.js service using Express and the native MongoDB driver.

At the top level, `src/index.js` is responsible for application bootstrap: it loads environment variables, connects to MongoDB, seeds the database on startup, and mounts the route modules. The route modules under `src/routes/` each own a specific concern:
- `documents.js` handles CRUD, optimistic concurrency control, and lazy schema migration on read.
- `search.js` handles full-text search and optional tag filtering.
- `analytics.js` handles aggregation-based reporting endpoints.
- `middleware/errorHandler.js` centralizes error responses.

This is closer to a layered architecture than full MVC. I used Express because the project is an API service with straightforward HTTP routing, middleware, and JSON responses. Express keeps the service lightweight and readable, which is a good fit for a backend that is dominated by database operations rather than complex presentation logic.

I used the native MongoDB driver instead of an ORM because the project depends on MongoDB-specific features such as `$text` search, `findOneAndUpdate` for OCC, `bulkWrite` for migration, and aggregation pipelines. Using the native driver gives direct access to those features without an abstraction layer getting in the way.

The overall structure is intentionally modular:
- bootstrap and wiring in one place
- database access isolated in one module
- business logic separated by route
- reusable error handling in middleware

That keeps the code easy to reason about and easy to extend.

## 2. Explain your choice of framework, and the structure of your application.

I chose Express because it is simple, mature, and a strong fit for a JSON REST API. The application does not need a heavy opinionated framework; it needs predictable routing, middleware support, and easy integration with MongoDB.

The application is organized as a modular service:
- Bootstrap layer: `src/index.js`
- Data access layer: `src/db.js`
- Feature routes: `src/routes/*.js`
- Cross-cutting middleware: `src/middleware/errorHandler.js`
- Startup data provisioning: `src/seed.js`
- Maintenance script: `scripts/migrate_author_schema.js`

This structure is not strict MVC, because there is no separate view layer. It is better described as a layered API design with route modules acting as controllers and MongoDB documents acting as the domain/persistence model.

## 3. Explain the trade-offs of using Optimistic Concurrency Control (OCC) versus other strategies like Pessimistic Locking or "last-write-wins".

OCC is the right fit for a collaborative web application where many users may read the same document and only some of them will write back at the same time.

Why OCC works well here:
- It avoids locking documents while users are editing.
- It scales better for web workloads because reads are cheap and writes only conflict when they truly overlap.
- It preserves user experience because users are not blocked by locks.
- It protects data consistency by preventing silent overwrites.

In this project, each document has a `version` field. Updates use `findOneAndUpdate({ slug, version: expectedVersion })`, so the write succeeds only if the client still has the current version.

Compared with pessimistic locking:
- Pessimistic locking can prevent conflicts, but it is usually too heavy for a browser-based collaborative editor.
- It increases latency and adds operational complexity.
- It can create poor user experience if documents are locked while someone is editing.

Compared with last-write-wins:
- Last-write-wins is simpler, but it is dangerous in collaborative editing.
- It can silently discard a user’s changes.
- It is acceptable for low-value or non-critical updates, but not for wiki-style content where edit history matters.

The trade-off with OCC is that conflicts are pushed to the client. Users may have to resolve merge conflicts, which increases application logic complexity. However, that is a worthwhile trade-off because it preserves correctness without sacrificing responsiveness.

## 4. Discuss your schema migration strategy. What are the pros and cons of the lazy-on-read plus background job approach? When might you choose a different strategy?

The migration strategy combines two approaches:
- Lazy on read: if `metadata.author` is still a string, the API transforms it into the new object structure before returning the document.
- Background migration: `scripts/migrate_author_schema.js` scans old documents in batches and updates them with `bulkWrite`.

Pros:
- No downtime: the API can continue serving requests while old data still exists.
- Backward compatibility: old and new records can coexist during the transition.
- Safer rollout: application code can be deployed before all documents are rewritten.
- Better operational control: batch processing reduces load spikes and avoids huge one-shot migrations.

Cons:
- More complexity in the read path because the API must support two schema shapes.
- Temporary inconsistency between stored data and returned data.
- Migration work is split across application code and a maintenance script, so there is more to test.
- If many reads hit old documents, the transformation logic runs repeatedly until the background job finishes.

I would choose a different strategy if the schema change were small, the dataset were tiny, or the system could afford downtime. In those cases, a one-time migration or a direct rewrite might be simpler. For a large production collection with active traffic, the lazy-plus-background approach is the safer choice because it avoids disruption.

## 5. You implemented search using MongoDB's native `$text` index. When would you recommend moving to a dedicated search engine like Elasticsearch or OpenSearch, and what benefits would that provide?

MongoDB `$text` search is enough for this project because the search requirements are straightforward: keyword search over title and content, relevance ranking, and optional tag filtering.

I would recommend moving to Elasticsearch or OpenSearch when search becomes a first-class product feature with more advanced requirements, such as:
- fuzzy matching and typo tolerance
- custom analyzers and language-specific stemming
- faceted search and aggregations over results
- more advanced ranking and boosting rules
- autocomplete and prefix matching at scale
- cross-field search with richer relevance tuning
- very large search volumes that need dedicated scaling

Benefits of a dedicated search engine:
- much better control over relevance
- richer query syntax and ranking tools
- improved handling of large indexes and heavy search traffic
- better support for analytics-like search features such as faceting

The trade-off is operational overhead. A dedicated search engine adds another service to deploy, monitor, and keep in sync with MongoDB. For this project, that extra complexity is unnecessary because MongoDB’s native search covers the required use case cleanly.

## 6. What was the most challenging aggregation pipeline to build and why? Describe how you approached its design and optimization.

The most challenging pipeline was the tag co-occurrence analytics pipeline in `src/routes/analytics.js`.

The goal was to count how often tag pairs appear together across documents. The difficulty is that co-occurrence is not a simple one-field aggregation. It requires generating pair combinations from each document’s `tags` array and then counting those combinations globally.

The design approach was:
- filter out documents with fewer than two tags
- keep only the `tags` field to reduce payload size
- unwind the tags array
- regroup by document so the tags can be recombined into an array
- generate all unique tag pairs per document
- unwind the pair list
- group by pair and count occurrences
- normalize tag order so the same pair is not counted twice in different orders
- sort by count and limit the output

The main optimization choices were:
- restricting the pipeline to documents with at least two tags
- projecting only the fields needed for the computation
- keeping the result set bounded and sorted
- normalizing pair order so the counts are stable and consistent

The hardest part was making sure the pair counting was logically correct while still staying readable. In a larger system, I would likely precompute co-occurrence data or materialize a separate analytics collection if the query became expensive at scale. For this project, an on-demand pipeline is appropriate because it demonstrates the MongoDB aggregation model clearly and stays aligned with the assignment requirements.