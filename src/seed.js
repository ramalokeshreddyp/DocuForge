'use strict';

const slugify = require('slugify');
const { getDb } = require('./db');

// Wikipedia-style topics for generating realistic documents
const TOPICS = [
  'MongoDB', 'Database Design', 'NoSQL', 'Document Store', 'Redis', 'PostgreSQL',
  'MySQL', 'Cassandra', 'Elasticsearch', 'Apache Kafka', 'RabbitMQ', 'Docker',
  'Kubernetes', 'Microservices', 'REST API', 'GraphQL', 'gRPC', 'WebSockets',
  'OAuth 2.0', 'JWT Authentication', 'TLS Encryption', 'Load Balancing',
  'Horizontal Scaling', 'Vertical Scaling', 'CAP Theorem', 'ACID Properties',
  'BASE Consistency', 'Eventual Consistency', 'Sharding', 'Replication',
  'Machine Learning', 'Deep Learning', 'Neural Networks', 'Natural Language Processing',
  'Computer Vision', 'Reinforcement Learning', 'Decision Trees', 'Random Forests',
  'Support Vector Machines', 'K-Means Clustering', 'Principal Component Analysis',
  'Python', 'JavaScript', 'TypeScript', 'Rust', 'Go', 'Java', 'C++', 'Kotlin',
  'React', 'Vue.js', 'Angular', 'Next.js', 'Svelte', 'Node.js', 'Deno', 'Express',
  'FastAPI', 'Django', 'Flask', 'Spring Boot', 'Laravel', 'Ruby on Rails',
  'CI/CD Pipeline', 'GitHub Actions', 'Jenkins', 'Travis CI', 'CircleCI',
  'Terraform', 'Ansible', 'Puppet', 'Chef', 'Vagrant',
  'TCP/IP', 'HTTP/2', 'HTTP/3', 'DNS', 'CDN', 'Nginx', 'Apache', 'HAProxy',
  'Agile Methodology', 'Scrum', 'Kanban', 'Waterfall Model', 'DevOps', 'SRE',
  'Blockchain', 'Smart Contracts', 'Ethereum', 'DeFi', 'NFTs', 'Web3',
  'Quantum Computing', 'Binary Search', 'Merge Sort', 'Quick Sort', 'Dijkstra',
  'Graph Theory', 'Data Structures', 'Hash Tables', 'Linked Lists', 'Binary Trees',
  'Software Architecture', 'Design Patterns', 'SOLID Principles', 'Clean Code',
  'Test-Driven Development', 'Behavior-Driven Development', 'Unit Testing',
  'Integration Testing', 'End-to-End Testing', 'Performance Testing',
  'API Gateway', 'Service Mesh', 'Istio', 'Envoy Proxy', 'Consul',
  'AWS', 'Azure', 'Google Cloud', 'Serverless', 'Lambda Functions', 'Edge Computing',
  'Data Warehousing', 'ETL Pipeline', 'Apache Spark', 'Hadoop', 'Data Lake',
  'Business Intelligence', 'Dashboard Analytics', 'A/B Testing', 'Feature Flags',
  'Cryptography', 'Public Key Infrastructure', 'OpenID Connect', 'SAML',
  'Zero Trust Security', 'Penetration Testing', 'Vulnerability Scanning',
  'Caching Strategies', 'CDN Caching', 'Memory Caching', 'Optimistic Locking',
  'Pessimistic Locking', 'Database Transactions', 'Two-Phase Commit',
  'Saga Pattern', 'CQRS Pattern', 'Event Sourcing', 'Hexagonal Architecture',
  'Domain-Driven Design', 'Bounded Context', 'Aggregate Root', 'Repository Pattern',
  'Observer Pattern', 'Factory Pattern', 'Singleton Pattern', 'Strategy Pattern',
  'Full-Text Search', 'Inverted Index', 'TF-IDF', 'BM25 Ranking', 'Semantic Search',
  'Vector Embeddings', 'Approximate Nearest Neighbor', 'Recommender Systems',
];

const TAGS_POOL = [
  'mongodb', 'database', 'nosql', 'guide', 'api-design', 'backend',
  'performance', 'scalability', 'architecture', 'security', 'cloud',
  'devops', 'tutorial', 'advanced', 'beginner', 'python', 'javascript',
  'node', 'docker', 'kubernetes', 'microservices', 'search', 'analytics',
  'concurrency', 'caching', 'testing', 'patterns', 'algorithms', 'data',
];

const AUTHORS = [
  { id: 'user-001', name: 'Alice Chen', email: 'alice.chen@example.com' },
  { id: 'user-002', name: 'Bob Martinez', email: 'bob.martinez@example.com' },
  { id: 'user-003', name: 'Carol Johnson', email: 'carol.j@example.com' },
  { id: 'user-004', name: 'David Kim', email: 'd.kim@example.com' },
  { id: 'user-005', name: 'Eva Schmidt', email: 'eva.schmidt@example.com' },
  { id: 'user-006', name: 'Frank Liu', email: 'frank.liu@example.com' },
  { id: 'user-007', name: 'Grace Okonkwo', email: 'grace.o@example.com' },
  { id: 'user-008', name: 'Henry Patel', email: 'h.patel@example.com' },
];

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickMultiple(arr, min, max) {
  const count = randInt(min, max);
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return [...new Set(shuffled.slice(0, count))];
}

function generateContent(topic) {
  const paragraphs = [
    `${topic} is a fundamental concept in modern software engineering. Understanding it deeply allows engineers to build more reliable, scalable, and maintainable systems.`,
    `The history of ${topic} dates back several decades. Initial implementations were limited in scope, but the field has evolved considerably with advances in hardware and distributed systems.`,
    `Key principles of ${topic} include separation of concerns, modularity, and adherence to established best practices. These principles guide practitioners in making sound architectural decisions.`,
    `When implementing ${topic} in production environments, one must consider fault tolerance, horizontal scalability, and graceful degradation. Monitoring and observability are equally critical.`,
    `The community around ${topic} has grown significantly, with numerous open-source projects, conferences, and academic papers advancing the state of the art. Practitioners are encouraged to engage with this community.`,
    `Performance benchmarks for ${topic} vary widely depending on the use case, hardware configuration, and implementation quality. Always measure in your specific context rather than relying on synthetic benchmarks.`,
    `Security considerations for ${topic} include authentication, authorization, data encryption at rest and in transit, and protection against common vulnerabilities such as injection attacks and denial of service.`,
    `Future developments in ${topic} are likely to be influenced by trends in cloud computing, edge computing, and artificial intelligence. Staying informed through reputable sources is essential.`,
    `Integration with other systems is a common use case for ${topic}. Well-defined APIs, event-driven architectures, and robust error handling facilitate reliable integrations.`,
    `Testing strategies for ${topic} encompass unit tests, integration tests, and end-to-end tests. A comprehensive test suite provides confidence in correctness and facilitates refactoring.`,
  ];
  const numParagraphs = randInt(3, 7);
  const selected = paragraphs.slice(0, numParagraphs);
  return `# ${topic}\n\n${selected.join('\n\n')}`;
}

function countWords(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

function generateRevisionHistory(version, authorPool) {
  const history = [];
  const historyCount = Math.min(version, 20);
  for (let v = Math.max(1, version - historyCount + 1); v <= version; v++) {
    const revAuthor = pick(authorPool);
    history.push({
      version: v,
      updatedAt: new Date(Date.now() - (version - v) * 86400000 * randInt(1, 7)),
      authorId: revAuthor.id,
      contentDiff: `v${v}: ${pick([
        'Updated introduction',
        'Fixed typo',
        'Added section on performance',
        'Expanded examples',
        'Revised conclusion',
        'Added references',
      ])}`,
    });
  }
  return history;
}

async function ensureIndexes(collection) {
  console.log('[SEED] Ensuring indexes...');
  await collection.createIndex({ slug: 1 }, { unique: true });
  await collection.createIndex(
    { title: 'text', content: 'text' },
    { weights: { title: 10, content: 5 }, name: 'text_search' }
  );
  console.log('[SEED] Indexes ready.');
}

async function seedDatabase() {
  const db = getDb();
  const collection = db.collection('documents');

  // Always ensure indexes exist (idempotent)
  await ensureIndexes(collection);

  const count = await collection.countDocuments();
  if (count > 0) {
    console.log(`[SEED] Collection already has ${count} documents. Skipping seed.`);
    return;
  }

  console.log('[SEED] Starting data seeding (10,000 documents)...');

  const TOTAL = 10000;
  const BATCH_SIZE = 500;
  const OLD_SCHEMA_RATE = 0.10; // 10% use old author string schema

  let inserted = 0;
  let batchIndex = 0;

  while (inserted < TOTAL) {
    const docs = [];
    const batchCount = Math.min(BATCH_SIZE, TOTAL - inserted);

    for (let i = 0; i < batchCount; i++) {
      const globalIndex = inserted + i;
      const topic = pick(TOPICS);

      // Always include a numeric suffix to guarantee uniqueness across 10k docs
      const baseSlug = slugify(topic, { lower: true, strict: true }) || 'document';
      const slug = `${baseSlug}-${batchIndex}-${i}-${globalIndex}`;

      const version = randInt(1, 25);
      const author = pick(AUTHORS);
      const tags = pickMultiple(TAGS_POOL, 2, 6);
      const content = generateContent(topic);
      const wordCount = countWords(content);
      const now = new Date();
      const createdAt = new Date(now.getTime() - randInt(1, 365) * 86400000);
      const updatedAt = new Date(createdAt.getTime() + randInt(0, now - createdAt));
      const revisionHistory = generateRevisionHistory(version, AUTHORS);

      // ~10% use old string schema for migration testing
      const useOldSchema = globalIndex % 10 === 0;

      docs.push({
        slug,
        title: `${topic} — Comprehensive Guide`,
        content,
        version,
        tags,
        metadata: {
          author: useOldSchema
            ? author.name  // OLD schema: plain string
            : { id: author.id, name: author.name, email: author.email }, // NEW schema: object
          createdAt,
          updatedAt,
          wordCount,
        },
        revision_history: revisionHistory,
      });
    }

    try {
      await collection.insertMany(docs, { ordered: false });
    } catch (err) {
      // Handle duplicate key errors gracefully (shouldn't happen with unique suffixes)
      if (err.code !== 11000) throw err;
      console.warn(`[SEED] Skipped ${err.writeErrors ? err.writeErrors.length : 1} duplicate(s) in batch ${batchIndex}`);
    }

    inserted += docs.length;
    batchIndex++;

    if (inserted % 2000 === 0 || inserted >= TOTAL) {
      console.log(`[SEED] Inserted ${Math.min(inserted, TOTAL)}/${TOTAL} documents...`);
    }
  }

  const finalCount = await collection.countDocuments();
  const oldSchemaCount = await collection.countDocuments({
    'metadata.author': { $type: 'string' },
  });

  console.log(`[SEED] Seeding complete! ${finalCount} documents total.`);
  console.log(`[SEED] ~${oldSchemaCount} documents use old author schema (string).`);
}

module.exports = { seedDatabase };
