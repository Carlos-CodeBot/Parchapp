"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.minio = void 0;
exports.initMinio = initMinio;
exports.subirFoto = subirFoto;
exports.eliminarFoto = eliminarFoto;
// src/db/minio.ts
const minio_1 = require("minio");
const stream_1 = require("stream");
exports.minio = new minio_1.Client({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: Number(process.env.MINIO_PORT) || 9000,
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_SECRET_KEY,
});
const BUCKET = process.env.MINIO_BUCKET || 'parchapp-fotos';
/** Crea el bucket si no existe (se llama al arrancar) */
async function initMinio() {
    const exists = await exports.minio.bucketExists(BUCKET);
    if (!exists) {
        await exports.minio.makeBucket(BUCKET, 'us-east-1');
        // Política pública para que las fotos sean accesibles por URL directa
        await exports.minio.setBucketPolicy(BUCKET, JSON.stringify({
            Version: '2012-10-17',
            Statement: [{
                    Effect: 'Allow',
                    Principal: { AWS: ['*'] },
                    Action: ['s3:GetObject'],
                    Resource: [`arn:aws:s3:::${BUCKET}/*`],
                }],
        }));
        console.log(`✅ Bucket "${BUCKET}" creado`);
    }
}
/** Sube una foto y retorna la URL pública */
async function subirFoto(nombre, buffer, contentType) {
    await exports.minio.putObject(BUCKET, nombre, stream_1.Readable.from(buffer), buffer.length, {
        'Content-Type': contentType,
    });
    const base = (process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, '');
    return `${base}/media/${BUCKET}/${nombre}`;
}
/** Elimina una foto */
async function eliminarFoto(nombre) {
    await exports.minio.removeObject(BUCKET, nombre);
}
