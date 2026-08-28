// src/db/minio.ts
import { Client } from 'minio';
import { Readable } from 'stream';

export const minio = new Client({
  endPoint:  process.env.MINIO_ENDPOINT || 'localhost',
  port:      Number(process.env.MINIO_PORT) || 9000,
  useSSL:    process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY!,
  secretKey: process.env.MINIO_SECRET_KEY!,
});

const BUCKET = process.env.MINIO_BUCKET || 'parchapp-fotos';

/** Crea el bucket si no existe (se llama al arrancar) */
export async function initMinio() {
  const exists = await minio.bucketExists(BUCKET);
  if (!exists) {
    await minio.makeBucket(BUCKET, 'us-east-1');
    console.log(`✅ Bucket "${BUCKET}" creado`);
  }

  // Se aplica en cada arranque: un bucket creado anteriormente también debe
  // poder servir sus imágenes a través del proxy público /media/.
  await minio.setBucketPolicy(BUCKET, JSON.stringify({
    Version: '2012-10-17',
    Statement: [{
      Effect: 'Allow',
      Principal: { AWS: ['*'] },
      Action: ['s3:GetObject'],
      Resource: [`arn:aws:s3:::${BUCKET}/*`],
    }],
  }));
}

/** Sube una foto y retorna la URL pública */
export async function subirFoto(
  nombre: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  await minio.putObject(BUCKET, nombre, Readable.from(buffer), buffer.length, {
    'Content-Type': contentType,
  });
  const base = (process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, '');
  return `${base}/media/${BUCKET}/${nombre}`;
}

/** Elimina una foto */
export async function eliminarFoto(nombre: string) {
  await minio.removeObject(BUCKET, nombre);
}
