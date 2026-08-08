// src/routes/auth.ts
import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { pool } from '../db/pool';

const RegisterSchema = z.object({
  nombre:   z.string().min(2).max(60),
  email:    z.string().email(),
  password: z.string().min(6),
});

const LoginSchema = z.object({
  email:    z.string().email(),
  password: z.string(),
});

export async function authRoutes(app: FastifyInstance) {

  // POST /api/auth/registro
  app.post('/registro', async (req, reply) => {
    const body = RegisterSchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const { nombre, email, password } = body.data;

    const existe = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (existe.rows.length) return reply.status(409).send({ error: 'Email ya registrado' });

    const hash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      `INSERT INTO usuarios (nombre, email, password)
       VALUES ($1, $2, $3)
       RETURNING id, nombre, email, puntos, creado_en`,
      [nombre, email, hash]
    );

    const usuario = rows[0];
    const token = app.jwt.sign({ uid: usuario.id, nombre: usuario.nombre });
    return reply.status(201).send({ token, usuario });
  });

  // POST /api/auth/login
  app.post('/login', async (req, reply) => {
    const body = LoginSchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const { email, password } = body.data;

    const { rows } = await pool.query(
      'SELECT id, nombre, email, password, puntos FROM usuarios WHERE email = $1',
      [email]
    );
    if (!rows.length) return reply.status(401).send({ error: 'Credenciales inválidas' });

    const usuario = rows[0];
    const ok = await bcrypt.compare(password, usuario.password);
    if (!ok) return reply.status(401).send({ error: 'Credenciales inválidas' });

    const token = app.jwt.sign({ uid: usuario.id, nombre: usuario.nombre });
    const { password: _, ...perfil } = usuario;
    return reply.send({ token, usuario: perfil });
  });

  // GET /api/auth/me  (requiere token)
  app.get('/me', {
    preHandler: async (req, reply) => {
      try { await req.jwtVerify(); }
      catch { reply.status(401).send({ error: 'No autorizado' }); }
    }
  }, async (req, reply) => {
    const { uid } = req.user as { uid: string };
    const { rows } = await pool.query(
      'SELECT id, nombre, email, foto_perfil, puntos, creado_en FROM usuarios WHERE id = $1',
      [uid]
    );
    if (!rows.length) return reply.status(404).send({ error: 'Usuario no encontrado' });
    return reply.send(rows[0]);
  });
}
