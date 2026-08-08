// src/db/migrate.ts
// Ejecutar con: npm run db:migrate
import 'dotenv/config';
import { pool } from './pool';

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ─── Extensiones ──────────────────────────────────────────
    await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await client.query(`CREATE EXTENSION IF NOT EXISTS "postgis"`); // coordenadas geoespaciales

    // ─── Usuarios ─────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        nombre      TEXT NOT NULL,
        email       TEXT UNIQUE NOT NULL,
        password    TEXT NOT NULL,
        foto_perfil TEXT,
        puntos      INT DEFAULT 0,
        creado_en   TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // ─── Parchaderos ──────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS parchaderos (
        id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        nombre                TEXT NOT NULL,
        tipo                  TEXT NOT NULL CHECK (tipo IN ('cafe','parque','bar','tienda','plaza','otro')),
        descripcion           TEXT DEFAULT '',
        ubicacion             GEOGRAPHY(POINT, 4326) NOT NULL,
        fotos                 TEXT[] DEFAULT '{}',
        tags                  TEXT[] DEFAULT '{}',
        calificacion_promedio NUMERIC(3,1) DEFAULT 0,
        total_calificaciones  INT DEFAULT 0,
        creado_por            UUID REFERENCES usuarios(id) ON DELETE SET NULL,
        creado_en             TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Índice espacial para búsquedas por cercanía (muy rápido con PostGIS)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_parchaderos_ubicacion
      ON parchaderos USING GIST(ubicacion)
    `);

    // ─── Calificaciones ───────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS calificaciones (
        parchadero_id UUID REFERENCES parchaderos(id) ON DELETE CASCADE,
        usuario_id    UUID REFERENCES usuarios(id) ON DELETE CASCADE,
        valor         INT NOT NULL CHECK (valor BETWEEN 1 AND 5),
        creado_en     TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (parchadero_id, usuario_id)  -- un voto por usuario
      )
    `);

    // ─── Comentarios ──────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS comentarios (
        id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        parchadero_id UUID REFERENCES parchaderos(id) ON DELETE CASCADE,
        usuario_id    UUID REFERENCES usuarios(id) ON DELETE CASCADE,
        texto         TEXT NOT NULL,
        calificacion  INT CHECK (calificacion BETWEEN 1 AND 5),
        creado_en     TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_comentarios_parchadero
      ON comentarios(parchadero_id)
    `);

    // ─── Favoritos ────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS favoritos (
        usuario_id    UUID REFERENCES usuarios(id) ON DELETE CASCADE,
        parchadero_id UUID REFERENCES parchaderos(id) ON DELETE CASCADE,
        creado_en     TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (usuario_id, parchadero_id)
      )
    `);

    await client.query('COMMIT');
    console.log('✅ Migración completada');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Error en migración:', e);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
