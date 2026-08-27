// src/db/redis.ts
import Redis from 'ioredis';

export const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  retryStrategy: (times) => Math.min(times * 50, 2000),
  lazyConnect: true,
});

redis.on('error', (err) => console.error('Redis error:', err));
redis.on('connect', () => console.log('✅ Redis conectado'));

// ─── Helpers para alertas ─────────────────────────────────────────

const DURACION_ALERTA_SEG = 45 * 60; // 45 minutos

export interface AlertaRedis {
  id: string;
  tipo: string;
  lat: number;
  lng: number;
  reportadoPor: string;
  confirmaciones: number;
  creadoEn: number;
  expiraEn: number;
}

/** Guarda una alerta en Redis con expiración automática */
export async function guardarAlerta(alerta: AlertaRedis) {
  const key = `alerta:${alerta.id}`;
  await redis.setex(key, DURACION_ALERTA_SEG, JSON.stringify(alerta));
  // Índice geoespacial para buscar alertas cercanas
  await redis.geoadd('alertas:geo', alerta.lng, alerta.lat, alerta.id);
}

/** Obtiene todas las alertas activas (las expiradas desaparecen solas) */
export async function obtenerAlertasActivas(): Promise<AlertaRedis[]> {
  const ids = await redis.keys('alerta:*');
  if (!ids.length) return [];

  const vals = await redis.mget(...ids);
  return vals
    .filter(Boolean)
    .map((v) => JSON.parse(v!) as AlertaRedis);
}

/** Suma una confirmación y extiende la vida 5 minutos */
export async function confirmarAlerta(id: string): Promise<AlertaRedis | null> {
  const key = `alerta:${id}`;
  const raw = await redis.get(key);
  if (!raw) return null;

  const alerta = JSON.parse(raw) as AlertaRedis;
  alerta.confirmaciones += 1;
  alerta.expiraEn = Math.min(
    alerta.expiraEn + 5 * 60 * 1000,
    alerta.creadoEn + 2 * 60 * 60 * 1000
  );

  // Extiende 5 minutos más en Redis también
  const ttlActual = await redis.ttl(key);
  await redis.setex(key, Math.max(ttlActual, 0) + 5 * 60, JSON.stringify(alerta));
  return alerta;
}

/** Elimina una alerta */
export async function eliminarAlerta(id: string) {
  await redis.del(`alerta:${id}`);
  await redis.zrem('alertas:geo', id);
}

/** Pub/Sub: publica un evento a todos los clientes WebSocket conectados */
export const redisPub = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
});

export const redisSub = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
});
