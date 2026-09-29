import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './server/config';
import { dbManager } from './server/db';
import { hindsightService } from './server/hindsight';
import { apiRouter } from './server/routes/api';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();

  // Basic security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // CORS configuration
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-role', 'x-user-name', 'x-user-id', 'x-user-email'],
  }));

  // Request body parsing with strict size limits
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  // Simple in-memory rate limiter for API endpoints
  const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
  app.use('/api', (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || 'anonymous';
    const key = Array.isArray(ip) ? ip[0] : String(ip);
    const now = Date.now();
    const windowMs = config.security.rateLimitWindowMs || 60000;
    const maxReqs = config.security.rateLimitMax || 120;

    const record = rateLimitMap.get(key) || { count: 0, resetTime: now + windowMs };
    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + windowMs;
    } else {
      record.count += 1;
    }
    rateLimitMap.set(key, record);

    if (record.count > maxReqs) {
      return res.status(429).json({
        error: 'Too many requests. Rate limit exceeded.',
        retryAfterMs: record.resetTime - now,
      });
    }
    next();
  });

  // Initialize DB and services
  await dbManager.init();
  await hindsightService.init();

  // Mount API Router
  app.use('/api', apiRouter);

  // Serve Frontend: Dev with Vite middleware, Prod with static files
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('[Dev] Vite middleware mounted');
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
    console.log('[Prod] Static production assets mounted from', distPath);
  }

  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[Server Error]', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: err.message || 'An unexpected error occurred',
    });
  });

  const port = config.port;
  app.listen(port, '0.0.0.0', () => {
    console.log(`[Hindsight SRE Agent] Server running on http://0.0.0.0:${port} (Mode: ${config.isDemoMode ? 'DEMO MODE' : 'PRODUCTION'})`);
  });
}

startServer().catch((err) => {
  console.error('[Fatal Error starting server]', err);
  process.exit(1);
});
