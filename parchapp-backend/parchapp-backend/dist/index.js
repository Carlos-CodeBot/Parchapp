"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/index.ts
require("dotenv/config");
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const jwt_1 = __importDefault(require("@fastify/jwt"));
const multipart_1 = __importDefault(require("@fastify/multipart"));
const websocket_1 = __importDefault(require("@fastify/websocket"));
const pool_1 = require("./db/pool");
const redis_1 = require("./db/redis");
const minio_1 = require("./db/minio");
const auth_1 = require("./routes/auth");
const parchaderos_1 = require("./routes/parchaderos");
const alertas_1 = require("./routes/alertas");
const app = (0, fastify_1.default)({
    logger: {
        level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
        transport: process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
    },
});
async function main() {
    // ─── Plugins ────────────────────────────────────────────────────────
    await app.register(cors_1.default, {
        origin: true, // En producción, limita esto a tu dominio: 'https://tu-dominio.com'
        credentials: true,
    });
    await app.register(jwt_1.default, {
        secret: process.env.JWT_SECRET,
        sign: { expiresIn: process.env.JWT_EXPIRES_IN || '30d' },
    });
    await app.register(multipart_1.default, {
        limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB máximo por foto
    });
    await app.register(websocket_1.default);
    // ─── Rutas ──────────────────────────────────────────────────────────
    await app.register(auth_1.authRoutes, { prefix: '/api/auth' });
    await app.register(parchaderos_1.parchaderoRoutes, { prefix: '/api/parchaderos' });
    await app.register(alertas_1.alertaRoutes); // incluye /api/alertas y /ws/alertas
    // ─── Health check ────────────────────────────────────────────────────
    app.get('/health', async () => {
        const [pgOk, redisOk] = await Promise.all([
            pool_1.pool.query('SELECT 1').then(() => true).catch(() => false),
            redis_1.redis.ping().then(() => true).catch(() => false),
        ]);
        return { status: 'ok', postgres: pgOk, redis: redisOk };
    });
    // ─── Inicializa servicios ────────────────────────────────────────────
    await redis_1.redis.connect();
    await (0, minio_1.initMinio)();
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
        await pool_1.pool.end();
        await redis_1.redis.quit();
        process.exit(0);
    });
});
main().catch((err) => {
    console.error('Error fatal:', err);
    process.exit(1);
});
