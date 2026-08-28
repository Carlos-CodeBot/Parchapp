"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisSub = exports.redisPub = exports.redis = void 0;
exports.guardarAlerta = guardarAlerta;
exports.obtenerAlertasActivas = obtenerAlertasActivas;
exports.confirmarAlerta = confirmarAlerta;
exports.eliminarAlerta = eliminarAlerta;
// src/db/redis.ts
const ioredis_1 = __importDefault(require("ioredis"));
exports.redis = new ioredis_1.default({
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    retryStrategy: (times) => Math.min(times * 50, 2000),
    lazyConnect: true,
});
exports.redis.on('error', (err) => console.error('Redis error:', err));
exports.redis.on('connect', () => console.log('✅ Redis conectado'));
// ─── Helpers para alertas ─────────────────────────────────────────
const DURACION_ALERTA_SEG = 45 * 60; // 45 minutos
/** Guarda una alerta en Redis con expiración automática */
async function guardarAlerta(alerta) {
    const key = `alerta:${alerta.id}`;
    const confirmacionesKey = `alerta-confirmaciones:${alerta.id}`;
    await exports.redis.multi()
        .setex(key, DURACION_ALERTA_SEG, JSON.stringify(alerta))
        .sadd(confirmacionesKey, alerta.reportadoPor)
        .expire(confirmacionesKey, DURACION_ALERTA_SEG)
        .geoadd('alertas:geo', alerta.lng, alerta.lat, alerta.id)
        .exec();
}
/** Obtiene todas las alertas activas (las expiradas desaparecen solas) */
async function obtenerAlertasActivas() {
    const ids = [];
    let cursor = '0';
    do {
        const [siguienteCursor, encontradas] = await exports.redis.scan(cursor, 'MATCH', 'alerta:*', 'COUNT', 100);
        cursor = siguienteCursor;
        ids.push(...encontradas);
    } while (cursor !== '0');
    if (!ids.length)
        return [];
    const vals = await exports.redis.mget(...ids);
    return vals
        .filter(Boolean)
        .map((v) => JSON.parse(v));
}
/** Suma una confirmación y extiende la vida 5 minutos */
async function confirmarAlerta(id, usuarioId) {
    const key = `alerta:${id}`;
    const raw = await exports.redis.get(key);
    if (!raw)
        return null;
    const alerta = JSON.parse(raw);
    const confirmacionesKey = `alerta-confirmaciones:${id}`;
    const esNuevaConfirmacion = await exports.redis.sadd(confirmacionesKey, usuarioId);
    if (!esNuevaConfirmacion)
        return alerta;
    alerta.confirmaciones += 1;
    alerta.expiraEn = Math.min(alerta.expiraEn + 5 * 60 * 1000, alerta.creadoEn + 2 * 60 * 60 * 1000);
    // Extiende 5 minutos más en Redis también
    const ttlActual = await exports.redis.ttl(key);
    const nuevoTtl = Math.max(ttlActual, 0) + 5 * 60;
    await exports.redis.multi()
        .setex(key, nuevoTtl, JSON.stringify(alerta))
        .expire(confirmacionesKey, nuevoTtl)
        .exec();
    return alerta;
}
/** Elimina una alerta */
async function eliminarAlerta(id) {
    await exports.redis.del(`alerta:${id}`);
    await exports.redis.del(`alerta-confirmaciones:${id}`);
    await exports.redis.zrem('alertas:geo', id);
}
/** Pub/Sub: publica un evento a todos los clientes WebSocket conectados */
exports.redisPub = new ioredis_1.default({
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
});
exports.redisSub = new ioredis_1.default({
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
});
