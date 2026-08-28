"use strict";
// src/routes/alertas.ts
// Las alertas usan dos canales:
//   REST  → crear / confirmar / eliminar
//   WS    → recibir actualizaciones en tiempo real desde Redis Pub/Sub
Object.defineProperty(exports, "__esModule", { value: true });
exports.alertaRoutes = alertaRoutes;
const zod_1 = require("zod");
const uuid_1 = require("uuid");
const redis_1 = require("../db/redis");
const auth_1 = require("../middleware/auth");
const TIPOS_ALERTA = ['policia', 'bloqueo', 'rumba', 'peligro', 'ruido', 'parche', 'lluvia', 'cerrado'];
// Fastify WebSocket v10 entrega el socket directamente al handler.
const clientes = new Set();
async function alertaRoutes(app) {
    // ─── WebSocket /ws/alertas ─────────────────────────────────────────
    // El cliente se conecta aquí y recibe todas las actualizaciones en tiempo real
    app.get('/ws/alertas', { websocket: true }, async (ws) => {
        clientes.add(ws);
        // Al conectar, envía todas las alertas activas
        const activas = await (0, redis_1.obtenerAlertasActivas)();
        ws.send(JSON.stringify({ tipo: 'estado_inicial', alertas: activas }));
        ws.on('close', () => clientes.delete(ws));
        ws.on('error', () => clientes.delete(ws));
    });
    // Redis Pub/Sub: cuando una alerta cambia en cualquier instancia del servidor,
    // se propaga a todos los clientes WS conectados
    await redis_1.redisSub.subscribe('alertas:eventos', (err) => {
        if (err)
            console.error('Redis sub error:', err);
    });
    redis_1.redisSub.on('message', (_channel, message) => {
        for (const ws of clientes) {
            if (ws.readyState === 1) {
                ws.send(message);
            }
        }
    });
    // Broadcast local + publica en Redis para otras instancias
    async function broadcast(evento) {
        const msg = JSON.stringify(evento);
        await redis_1.redisPub.publish('alertas:eventos', msg);
    }
    // ─── GET /api/alertas ──────────────────────────────────────────────
    app.get('/api/alertas', async (_req, reply) => {
        const alertas = await (0, redis_1.obtenerAlertasActivas)();
        return reply.send(alertas);
    });
    // ─── POST /api/alertas ─────────────────────────────────────────────
    app.post('/api/alertas', { preHandler: auth_1.requireAuth }, async (req, reply) => {
        const body = zod_1.z.object({
            tipo: zod_1.z.enum(TIPOS_ALERTA),
            lat: zod_1.z.number().min(-90).max(90),
            lng: zod_1.z.number().min(-180).max(180),
        }).safeParse(req.body);
        if (!body.success)
            return reply.status(400).send({ error: body.error.flatten() });
        const { uid } = req.user;
        const ahora = Date.now();
        const alerta = {
            id: (0, uuid_1.v4)(),
            tipo: body.data.tipo,
            lat: body.data.lat,
            lng: body.data.lng,
            reportadoPor: uid,
            confirmaciones: 1,
            creadoEn: ahora,
            expiraEn: ahora + 45 * 60 * 1000,
        };
        await (0, redis_1.guardarAlerta)(alerta);
        await broadcast({ tipo: 'alerta_nueva', alerta });
        return reply.status(201).send(alerta);
    });
    // ─── POST /api/alertas/:id/confirmar ──────────────────────────────
    app.post('/api/alertas/:id/confirmar', { preHandler: auth_1.requireAuth }, async (req, reply) => {
        const { id } = req.params;
        const { uid } = req.user;
        const alerta = await (0, redis_1.confirmarAlerta)(id, uid);
        if (!alerta)
            return reply.status(404).send({ error: 'Alerta no encontrada o expirada' });
        await broadcast({ tipo: 'alerta_actualizada', alerta });
        return reply.send(alerta);
    });
    // ─── DELETE /api/alertas/:id ───────────────────────────────────────
    app.delete('/api/alertas/:id', { preHandler: auth_1.requireAuth }, async (req, reply) => {
        const { id } = req.params;
        const { uid } = req.user;
        const alerta = (await (0, redis_1.obtenerAlertasActivas)()).find((item) => item.id === id);
        if (!alerta)
            return reply.status(404).send({ error: 'Alerta no encontrada o expirada' });
        if (alerta.reportadoPor !== uid) {
            return reply.status(403).send({ error: 'Solo quien creó la alerta puede eliminarla' });
        }
        await (0, redis_1.eliminarAlerta)(id);
        await broadcast({ tipo: 'alerta_eliminada', id });
        return reply.send({ ok: true });
    });
}
