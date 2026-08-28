// src/routes/alertas.ts
// Las alertas usan dos canales:
//   REST  → crear / confirmar / eliminar
//   WS    → recibir actualizaciones en tiempo real desde Redis Pub/Sub

import { FastifyInstance } from 'fastify';
import type { WebSocket } from '@fastify/websocket';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import {
  guardarAlerta, obtenerAlertasActivas,
  confirmarAlerta, eliminarAlerta,
  redisPub, redisSub, AlertaRedis,
} from '../db/redis';
import { requireAuth } from '../middleware/auth';

const TIPOS_ALERTA = ['policia','bloqueo','rumba','peligro','ruido','parche','lluvia','cerrado'] as const;

// Fastify WebSocket v10 entrega el socket directamente al handler.
const clientes = new Set<WebSocket>();

export async function alertaRoutes(app: FastifyInstance) {

  // ─── WebSocket /ws/alertas ─────────────────────────────────────────
  // El cliente se conecta aquí y recibe todas las actualizaciones en tiempo real
  app.get('/ws/alertas', { websocket: true }, async (ws) => {
    clientes.add(ws);

    // Al conectar, envía todas las alertas activas
    const activas = await obtenerAlertasActivas();
    ws.send(JSON.stringify({ tipo: 'estado_inicial', alertas: activas }));

    ws.on('close', () => clientes.delete(ws));
    ws.on('error', () => clientes.delete(ws));
  });

  // Redis Pub/Sub: cuando una alerta cambia en cualquier instancia del servidor,
  // se propaga a todos los clientes WS conectados
  await redisSub.subscribe('alertas:eventos', (err) => {
    if (err) console.error('Redis sub error:', err);
  });

  redisSub.on('message', (_channel: string, message: string) => {
    for (const ws of clientes) {
      if (ws.readyState === 1) {
        ws.send(message);
      }
    }
  });

  // Broadcast local + publica en Redis para otras instancias
  async function broadcast(evento: object) {
    const msg = JSON.stringify(evento);
    await redisPub.publish('alertas:eventos', msg);
  }

  // ─── GET /api/alertas ──────────────────────────────────────────────
  app.get('/api/alertas', async (_req, reply) => {
    const alertas = await obtenerAlertasActivas();
    return reply.send(alertas);
  });

  // ─── POST /api/alertas ─────────────────────────────────────────────
  app.post('/api/alertas', { preHandler: requireAuth }, async (req, reply) => {
    const body = z.object({
      tipo: z.enum(TIPOS_ALERTA),
      lat:  z.number().min(-90).max(90),
      lng:  z.number().min(-180).max(180),
    }).safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const { uid } = req.user as { uid: string };
    const ahora = Date.now();

    const alerta: AlertaRedis = {
      id:             uuidv4(),
      tipo:           body.data.tipo,
      lat:            body.data.lat,
      lng:            body.data.lng,
      reportadoPor:   uid,
      confirmaciones: 1,
      creadoEn:       ahora,
      expiraEn:       ahora + 45 * 60 * 1000,
    };

    await guardarAlerta(alerta);
    await broadcast({ tipo: 'alerta_nueva', alerta });

    return reply.status(201).send(alerta);
  });

  // ─── POST /api/alertas/:id/confirmar ──────────────────────────────
  app.post('/api/alertas/:id/confirmar', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { uid } = req.user as { uid: string };
    const alerta = await confirmarAlerta(id, uid);
    if (!alerta) return reply.status(404).send({ error: 'Alerta no encontrada o expirada' });

    await broadcast({ tipo: 'alerta_actualizada', alerta });
    return reply.send(alerta);
  });

  // ─── DELETE /api/alertas/:id ───────────────────────────────────────
  app.delete('/api/alertas/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { uid } = req.user as { uid: string };
    const alerta = (await obtenerAlertasActivas()).find((item) => item.id === id);
    if (!alerta) return reply.status(404).send({ error: 'Alerta no encontrada o expirada' });
    if (alerta.reportadoPor !== uid) {
      return reply.status(403).send({ error: 'Solo quien creó la alerta puede eliminarla' });
    }
    await eliminarAlerta(id);
    await broadcast({ tipo: 'alerta_eliminada', id });
    return reply.send({ ok: true });
  });
}
