'use strict';

require('dotenv').config();

const express = require('express');
const { connect } = require('./db');
const { seedDatabase } = require('./seed');
const errorHandler = require('./middleware/errorHandler');

// Route handlers
const documentsRouter = require('./routes/documents');
const searchRouter = require('./routes/search');
const analyticsRouter = require('./routes/analytics');

const PORT = process.env.PORT || 3000;

async function bootstrap() {
  // 1. Connect to MongoDB
  await connect();

  // 2. Seed database if empty
  await seedDatabase();

  // 3. Create and configure Express app
  const app = express();

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API Routes
  app.use('/api/documents', documentsRouter);
  app.use('/api/search', searchRouter);
  app.use('/api/analytics', analyticsRouter);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
  });

  // Global error handler (must be last)
  app.use(errorHandler);

  // 4. Start listening
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[APP] Server running on http://0.0.0.0:${PORT}`);
    console.log(`[APP] API endpoints:`);
    console.log(`[APP]   GET    /health`);
    console.log(`[APP]   POST   /api/documents`);
    console.log(`[APP]   GET    /api/documents/:slug`);
    console.log(`[APP]   PUT    /api/documents/:slug`);
    console.log(`[APP]   DELETE /api/documents/:slug`);
    console.log(`[APP]   GET    /api/search?q=<term>[&tags=tag1,tag2]`);
    console.log(`[APP]   GET    /api/analytics/most-edited`);
    console.log(`[APP]   GET    /api/analytics/tag-cooccurrence`);
  });
}

bootstrap().catch(err => {
  console.error('[APP] Fatal error during startup:', err);
  process.exit(1);
});
