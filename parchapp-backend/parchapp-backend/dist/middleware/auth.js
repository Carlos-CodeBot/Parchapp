"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.optionalAuth = optionalAuth;
async function requireAuth(req, reply) {
    try {
        await req.jwtVerify();
    }
    catch {
        reply.status(401).send({ error: 'No autorizado' });
    }
}
// Middleware opcional: no rechaza si no hay token, pero lo parsea si existe
async function optionalAuth(req, _reply) {
    try {
        await req.jwtVerify();
    }
    catch {
        // Sin token — el handler decidirá qué hacer
    }
}
