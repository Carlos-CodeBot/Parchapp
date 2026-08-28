"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = authRoutes;
const bcrypt_1 = __importDefault(require("bcrypt"));
const zod_1 = require("zod");
const pool_1 = require("../db/pool");
const RegisterSchema = zod_1.z.object({
    nombre: zod_1.z.string().trim().min(2).max(60),
    email: zod_1.z.string().trim().email().transform((email) => email.toLowerCase()),
    password: zod_1.z.string().min(8).max(128),
});
const LoginSchema = zod_1.z.object({
    email: zod_1.z.string().trim().email().transform((email) => email.toLowerCase()),
    password: zod_1.z.string().min(1).max(128),
});
async function authRoutes(app) {
    // POST /api/auth/registro
    app.post('/registro', async (req, reply) => {
        const body = RegisterSchema.safeParse(req.body);
        if (!body.success)
            return reply.status(400).send({ error: body.error.flatten() });
        const { nombre, email, password } = body.data;
        const hash = await bcrypt_1.default.hash(password, 12);
        let rows;
        try {
            ({ rows } = await pool_1.pool.query(`INSERT INTO usuarios (nombre, email, password)
         VALUES ($1, $2, $3)
         RETURNING id, nombre, email, puntos, creado_en`, [nombre, email, hash]));
        }
        catch (error) {
            if (error.code === '23505') {
                return reply.status(409).send({ error: 'Email ya registrado' });
            }
            throw error;
        }
        const usuario = rows[0];
        const token = app.jwt.sign({ uid: usuario.id, nombre: usuario.nombre });
        return reply.status(201).send({ token, usuario });
    });
    // POST /api/auth/login
    app.post('/login', async (req, reply) => {
        const body = LoginSchema.safeParse(req.body);
        if (!body.success)
            return reply.status(400).send({ error: body.error.flatten() });
        const { email, password } = body.data;
        const { rows } = await pool_1.pool.query('SELECT id, nombre, email, password, puntos FROM usuarios WHERE email = $1', [email]);
        if (!rows.length)
            return reply.status(401).send({ error: 'Credenciales inválidas' });
        const usuario = rows[0];
        const ok = await bcrypt_1.default.compare(password, usuario.password);
        if (!ok)
            return reply.status(401).send({ error: 'Credenciales inválidas' });
        const token = app.jwt.sign({ uid: usuario.id, nombre: usuario.nombre });
        const { password: _, ...perfil } = usuario;
        return reply.send({ token, usuario: perfil });
    });
    // GET /api/auth/me  (requiere token)
    app.get('/me', {
        preHandler: async (req, reply) => {
            try {
                await req.jwtVerify();
            }
            catch {
                return reply.status(401).send({ error: 'No autorizado' });
            }
        }
    }, async (req, reply) => {
        const { uid } = req.user;
        const { rows } = await pool_1.pool.query('SELECT id, nombre, email, foto_perfil, puntos, creado_en FROM usuarios WHERE id = $1', [uid]);
        if (!rows.length)
            return reply.status(404).send({ error: 'Usuario no encontrado' });
        return reply.send(rows[0]);
    });
}
