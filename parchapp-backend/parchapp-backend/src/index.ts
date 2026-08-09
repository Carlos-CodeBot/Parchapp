// src/index.ts
import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import websocket from '@fastify/websocket';

import { pool } from './db/pool';
import { redis } from './db/redis';
import { initMinio } from './db/minio';
import { authRoutes } from './routes/auth';
import { parchaderoRoutes } from './routes/parchaderos';
import { alertaRoutes } from './routes/alertas';

const app = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
  },
});

async function main() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET debe tener al menos 32 caracteres');
  }
  // ─── Plugins ────────────────────────────────────────────────────────
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN === '*' || !process.env.CORS_ORIGIN
      ? true
      : process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()),
    credentials: true,
  });

  await app.register(jwt, {
    secret: process.env.JWT_SECRET!,
    sign: { expiresIn: process.env.JWT_EXPIRES_IN || '30d' },
  });

  await app.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB máximo por foto
  });

  await app.register(websocket);

  // ─── Rutas ──────────────────────────────────────────────────────────
  await app.register(authRoutes,       { prefix: '/api/auth' });
  await app.register(parchaderoRoutes, { prefix: '/api/parchaderos' });
  await app.register(alertaRoutes);    // incluye /api/alertas y /ws/alertas

  // ─── Health check ────────────────────────────────────────────────────
  app.get('/health', async () => {
    const [pgOk, redisOk] = await Promise.all([
      pool.query('SELECT 1').then(() => true).catch(() => false),
      redis.ping().then(() => true).catch(() => false),
    ]);
    return { status: 'ok', postgres: pgOk, redis: redisOk };
  });

  // ─── Inicializa servicios ────────────────────────────────────────────
  await redis.connect();
  await initMinio();

  // ─── Arranca el servidor ─────────────────────────────────────────────
  const host = process.env.HOST || '0.0.0.0';
  const port = Number(process.env.PORT) || 3000;

  await app.listen({ host, port });
  console.log(`\n🚀 ParchApp API corriendo en http://${host}:${port}`);
  console.log(`📋 Health check: http://${host}:${port}/health\n`);
}

// Graceful shutdown
const signals = ['SIGTERM', 'SIGINT'];
signals.forEach((signal) => {
  process.on(signal, async () => {
    console.log(`\n${signal} recibido — cerrando servidor...`);
    await app.close();
    await pool.end();
    await redis.quit();
    process.exit(0);
  });
});

main().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(1);
});
