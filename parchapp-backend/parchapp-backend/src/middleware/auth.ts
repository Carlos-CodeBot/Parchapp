// src/middleware/auth.ts
import { FastifyRequest, FastifyReply } from 'fastify';

export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify();
  } catch {
    return reply.status(401).send({ error: 'No autorizado' });
  }
}

// Middleware opcional: no rechaza si no hay token, pero lo parsea si existe
export async function optionalAuth(req: FastifyRequest, _reply: FastifyReply) {
  try {
    await req.jwtVerify();
  } catch {
    // Sin token — el handler decidirá qué hacer
  }
}
