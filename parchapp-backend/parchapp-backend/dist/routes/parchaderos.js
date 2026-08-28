"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parchaderoRoutes = parchaderoRoutes;
const zod_1 = require("zod");
const uuid_1 = require("uuid");
const pool_1 = require("../db/pool");
const minio_1 = require("../db/minio");
const auth_1 = require("../middleware/auth");
const TIPOS_VALIDOS = ['cafe', 'parque', 'bar', 'tienda', 'plaza', 'otro'];
const CrearSchema = zod_1.z.object({
    nombre: zod_1.z.string().min(2).max(100),
    tipo: zod_1.z.enum(TIPOS_VALIDOS),
    descripcion: zod_1.z.string().min(10).max(500),
    lat: zod_1.z.number().min(-90).max(90),
    lng: zod_1.z.number().min(-180).max(180),
    tags: zod_1.z.array(zod_1.z.string()).max(10).optional().default([]),
});
async function parchaderoRoutes(app) {
    // ─── GET /api/parchaderos ──────────────────────────────────────────
    // Lista todos; filtrar por cercanía con ?lat=&lng=&radio= (metros)
    app.get('/', { preHandler: auth_1.optionalAuth }, async (req, reply) => {
        const { lat, lng, radio, tipo } = req.query;
        let query;
        let params;
        if (lat && lng) {
            // Búsqueda geoespacial — PostGIS retorna los más cercanos primero
            const radioM = Number(radio) || 5000;
            query = `
        SELECT p.*, ST_Y(p.ubicacion::geometry) AS lat,
          ST_X(p.ubicacion::geometry) AS lng, u.nombre AS creado_por_nombre,
          ST_Distance(p.ubicacion, ST_MakePoint($2, $1)::geography) AS distancia_m
        FROM parchaderos p
        LEFT JOIN usuarios u ON u.id = p.creado_por
        WHERE ST_DWithin(p.ubicacion, ST_MakePoint($2, $1)::geography, $3)
        ${tipo ? 'AND p.tipo = $4' : ''}
        ORDER BY distancia_m ASC
        LIMIT 100
      `;
            params = tipo ? [lat, lng, radioM, tipo] : [lat, lng, radioM];
        }
        else {
            query = `
        SELECT p.*, ST_Y(p.ubicacion::geometry) AS lat,
          ST_X(p.ubicacion::geometry) AS lng, u.nombre AS creado_por_nombre
        FROM parchaderos p
        LEFT JOIN usuarios u ON u.id = p.creado_por
        ${tipo ? 'WHERE p.tipo = $1' : ''}
        ORDER BY p.creado_en DESC
        LIMIT 200
      `;
            params = tipo ? [tipo] : [];
        }
        const { rows } = await pool_1.pool.query(query, params);
        return reply.send(rows.map(formatParchadero));
    });
    // ─── GET /api/parchaderos/:id ──────────────────────────────────────
    app.get('/:id', async (req, reply) => {
        const { id } = req.params;
        const { rows } = await pool_1.pool.query(`
      SELECT p.*, ST_Y(p.ubicacion::geometry) AS lat,
        ST_X(p.ubicacion::geometry) AS lng, u.nombre AS creado_por_nombre
      FROM parchaderos p
      LEFT JOIN usuarios u ON u.id = p.creado_por
      WHERE p.id = $1
    `, [id]);
        if (!rows.length)
            return reply.status(404).send({ error: 'Parchadero no encontrado' });
        return reply.send(formatParchadero(rows[0]));
    });
    // ─── POST /api/parchaderos ─────────────────────────────────────────
    app.post('/', { preHandler: auth_1.requireAuth }, async (req, reply) => {
        const body = CrearSchema.safeParse(req.body);
        if (!body.success)
            return reply.status(400).send({ error: body.error.flatten() });
        const { nombre, tipo, descripcion, lat, lng, tags } = body.data;
        const { uid } = req.user;
        const { rows } = await pool_1.pool.query(`
      INSERT INTO parchaderos (nombre, tipo, descripcion, ubicacion, tags, creado_por)
      VALUES ($1, $2, $3, ST_MakePoint($5, $4)::geography, $6, $7)
      RETURNING *, ST_Y(ubicacion::geometry) AS lat, ST_X(ubicacion::geometry) AS lng
    `, [nombre, tipo, descripcion, lat, lng, tags, uid]);
        // Suma puntos por contribuir
        await pool_1.pool.query('UPDATE usuarios SET puntos = puntos + 10 WHERE id = $1', [uid]);
        return reply.status(201).send(formatParchadero(rows[0]));
    });
    // ─── POST /api/parchaderos/:id/fotos ──────────────────────────────
    // Sube una foto al parchadero (multipart/form-data)
    app.post('/:id/fotos', { preHandler: auth_1.requireAuth }, async (req, reply) => {
        const { id } = req.params;
        const data = await req.file();
        if (!data)
            return reply.status(400).send({ error: 'No se recibió ninguna foto' });
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(data.mimetype)) {
            return reply.status(415).send({ error: 'Formato no permitido. Usa JPG, PNG o WebP' });
        }
        const existe = await pool_1.pool.query('SELECT 1 FROM parchaderos WHERE id = $1', [id]);
        if (!existe.rowCount)
            return reply.status(404).send({ error: 'Parchadero no encontrado' });
        const buffer = await data.toBuffer();
        const extension = data.mimetype === 'image/png' ? 'png' : data.mimetype === 'image/webp' ? 'webp' : 'jpg';
        const nombre = `${id}/${(0, uuid_1.v4)()}.${extension}`;
        const url = await (0, minio_1.subirFoto)(nombre, buffer, data.mimetype);
        await pool_1.pool.query('UPDATE parchaderos SET fotos = array_append(fotos, $1) WHERE id = $2', [url, id]);
        return reply.send({ url });
    });
    // ─── POST /api/parchaderos/:id/calificar ──────────────────────────
    app.post('/:id/calificar', { preHandler: auth_1.requireAuth }, async (req, reply) => {
        const { id } = req.params;
        const body = zod_1.z.object({ valor: zod_1.z.number().int().min(1).max(5) }).safeParse(req.body);
        if (!body.success)
            return reply.status(400).send({ error: body.error.flatten() });
        const { uid } = req.user;
        // INSERT OR UPDATE (un voto por usuario)
        await pool_1.pool.query(`
      INSERT INTO calificaciones (parchadero_id, usuario_id, valor)
      VALUES ($1, $2, $3)
      ON CONFLICT (parchadero_id, usuario_id) DO UPDATE SET valor = $3
    `, [id, uid, body.data.valor]);
        // Recalcula el promedio en la misma transacción
        await pool_1.pool.query(`
      UPDATE parchaderos SET
        calificacion_promedio = (
          SELECT ROUND(AVG(valor)::numeric, 1) FROM calificaciones WHERE parchadero_id = $1
        ),
        total_calificaciones = (
          SELECT COUNT(*) FROM calificaciones WHERE parchadero_id = $1
        )
      WHERE id = $1
    `, [id]);
        return reply.send({ ok: true });
    });
    // ─── GET /api/parchaderos/:id/comentarios ─────────────────────────
    app.get('/:id/comentarios', async (req, reply) => {
        const { id } = req.params;
        const { rows } = await pool_1.pool.query(`
      SELECT c.*, u.nombre AS usuario_nombre, u.foto_perfil AS usuario_foto
      FROM comentarios c
      JOIN usuarios u ON u.id = c.usuario_id
      WHERE c.parchadero_id = $1
      ORDER BY c.creado_en DESC
      LIMIT 50
    `, [id]);
        return reply.send(rows);
    });
    // ─── POST /api/parchaderos/:id/comentarios ─────────────────────────
    app.post('/:id/comentarios', { preHandler: auth_1.requireAuth }, async (req, reply) => {
        const { id } = req.params;
        const body = zod_1.z.object({
            texto: zod_1.z.string().min(1).max(500),
            calificacion: zod_1.z.number().int().min(1).max(5).optional(),
        }).safeParse(req.body);
        if (!body.success)
            return reply.status(400).send({ error: body.error.flatten() });
        const { uid } = req.user;
        const { rows } = await pool_1.pool.query(`
      INSERT INTO comentarios (parchadero_id, usuario_id, texto, calificacion)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [id, uid, body.data.texto, body.data.calificacion ?? null]);
        return reply.status(201).send(rows[0]);
    });
    // ─── POST /api/parchaderos/:id/favorito ───────────────────────────
    app.post('/:id/favorito', { preHandler: auth_1.requireAuth }, async (req, reply) => {
        const { id } = req.params;
        const { uid } = req.user;
        // Toggle favorito
        const { rows } = await pool_1.pool.query('SELECT 1 FROM favoritos WHERE usuario_id=$1 AND parchadero_id=$2', [uid, id]);
        if (rows.length) {
            await pool_1.pool.query('DELETE FROM favoritos WHERE usuario_id=$1 AND parchadero_id=$2', [uid, id]);
            return reply.send({ favorito: false });
        }
        else {
            await pool_1.pool.query('INSERT INTO favoritos (usuario_id, parchadero_id) VALUES ($1, $2)', [uid, id]);
            return reply.send({ favorito: true });
        }
    });
}
// Convierte el formato interno de PostGIS al formato que espera la app
function formatParchadero(row) {
    return {
        id: row.id,
        nombre: row.nombre,
        tipo: row.tipo,
        descripcion: row.descripcion,
        coordenadas: {
            lat: Number(row.lat),
            lng: Number(row.lng),
        },
        fotos: row.fotos || [],
        tags: row.tags || [],
        calificacionPromedio: Number(row.calificacion_promedio),
        totalCalificaciones: Number(row.total_calificaciones),
        creadoPor: row.creado_por,
        creadoPorNombre: row.creado_por_nombre,
        creadoEn: new Date(row.creado_en).getTime(),
        distanciaM: row.distancia_m ? Math.round(Number(row.distancia_m)) : undefined,
    };
}
