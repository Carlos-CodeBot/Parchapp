// src/services/parchaderos.service.ts
import {
  collection, doc, addDoc, updateDoc, getDocs,
  onSnapshot, query, orderBy, where,
  increment, serverTimestamp, getDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import { Parchadero, Comentario } from '../types';
import uuid from 'react-native-uuid';

const COL_PARCHADEROS = 'parchaderos';
const COL_COMENTARIOS = 'comentarios';

// ─── Parchaderos ────────────────────────────────────────────────────

/** Escucha en tiempo real todos los parchaderos */
export function suscribirParchaderos(
  onData: (parchaderos: Parchadero[]) => void
) {
  const q = query(collection(db, COL_PARCHADEROS), orderBy('creadoEn', 'desc'));
  return onSnapshot(q, (snap) => {
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Parchadero));
    onData(data);
  });
}

/** Crea un nuevo parchadero */
export async function crearParchadero(
  datos: Omit<Parchadero, 'id' | 'calificacionPromedio' | 'totalCalificaciones' | 'creadoEn'>
): Promise<string> {
  const ref = await addDoc(collection(db, COL_PARCHADEROS), {
    ...datos,
    calificacionPromedio: 0,
    totalCalificaciones: 0,
    creadoEn: Date.now(),
  });
  return ref.id;
}

/** Obtiene un parchadero por ID */
export async function obtenerParchadero(id: string): Promise<Parchadero | null> {
  const snap = await getDoc(doc(db, COL_PARCHADEROS, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Parchadero;
}

// ─── Fotos ──────────────────────────────────────────────────────────

/** Sube una foto a Storage y retorna la URL pública */
export async function subirFoto(
  parchaderoId: string,
  uriLocal: string
): Promise<string> {
  const fotoId = uuid.v4() as string;
  const storageRef = ref(storage, `parchaderos/${parchaderoId}/${fotoId}.jpg`);

  const response = await fetch(uriLocal);
  const blob = await response.blob();
  await uploadBytes(storageRef, blob);

  const url = await getDownloadURL(storageRef);

  // Agrega la URL al array de fotos del parchadero
  await updateDoc(doc(db, COL_PARCHADEROS, parchaderoId), {
    fotos: [...(await obtenerParchadero(parchaderoId))?.fotos ?? [], url],
  });

  return url;
}

// ─── Calificaciones ─────────────────────────────────────────────────

/**
 * Califica un parchadero. Usa una subcolección "calificaciones"
 * para que cada usuario solo pueda calificar una vez.
 */
export async function calificarParchadero(
  parchaderoId: string,
  usuarioId: string,
  calificacion: number   // 1–5
) {
  const calRef = doc(db, COL_PARCHADEROS, parchaderoId, 'calificaciones', usuarioId);
  await updateDoc(calRef, { valor: calificacion }).catch(async () => {
    // Primera vez que califica: crear el documento
    const { setDoc } = await import('firebase/firestore');
    await setDoc(calRef, { valor: calificacion, creadoEn: Date.now() });
  });

  // Recalcula el promedio (en producción esto lo haría una Cloud Function)
  const calSnap = await getDocs(collection(db, COL_PARCHADEROS, parchaderoId, 'calificaciones'));
  const valores = calSnap.docs.map((d) => d.data().valor as number);
  const promedio = valores.reduce((a, b) => a + b, 0) / valores.length;

  await updateDoc(doc(db, COL_PARCHADEROS, parchaderoId), {
    calificacionPromedio: Math.round(promedio * 10) / 10,
    totalCalificaciones: valores.length,
  });
}

// ─── Comentarios ────────────────────────────────────────────────────

/** Escucha comentarios de un parchadero en tiempo real */
export function suscribirComentarios(
  parchaderoId: string,
  onData: (comentarios: Comentario[]) => void
) {
  const q = query(
    collection(db, COL_COMENTARIOS),
    where('parchaderoId', '==', parchaderoId),
    orderBy('creadoEn', 'desc')
  );
  return onSnapshot(q, (snap) => {
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Comentario));
    onData(data);
  });
}

/** Agrega un comentario */
export async function agregarComentario(
  comentario: Omit<Comentario, 'id' | 'creadoEn'>
) {
  await addDoc(collection(db, COL_COMENTARIOS), {
    ...comentario,
    creadoEn: Date.now(),
  });
}
