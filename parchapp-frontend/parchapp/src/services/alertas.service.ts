// src/services/alertas.service.ts
// Usa Realtime Database (no Firestore) porque:
// 1. Las alertas necesitan sincronización instantánea (<200ms)
// 2. Se pueden setear reglas de expiración automática con Cloud Functions
// 3. El costo por operación es menor para datos volátiles

import { ref, push, onValue, off, remove, query, orderByChild, get } from 'firebase/database';
import { rtdb } from '../config/firebase';
import { Alerta, AlertaTipo } from '../types';
import uuid from 'react-native-uuid';

const DURACION_ALERTA_MS = 45 * 60 * 1000; // 45 minutos, como Waze

// ─── Crear alerta ────────────────────────────────────────────────────

export async function crearAlerta(
  tipo: AlertaTipo,
  lat: number,
  lng: number,
  usuarioId: string
): Promise<string> {
  const ahora = Date.now();
  const alerta: Omit<Alerta, 'id'> = {
    tipo,
    coordenadas: { lat, lng },
    reportadoPor: usuarioId,
    creadoEn: ahora,
    expiraEn: ahora + DURACION_ALERTA_MS,
    confirmaciones: 1,
  };

  const alertaRef = push(ref(rtdb, 'alertas'), alerta);
  return alertaRef.key!;
}

// ─── Confirmar alerta (como el pulgar arriba en Waze) ────────────────

export async function confirmarAlerta(alertaId: string) {
  const { update } = await import('firebase/database');
  const alertaRef = ref(rtdb, `alertas/${alertaId}`);
  const snap = await get(alertaRef);
  if (!snap.exists()) return;

  const alerta = snap.val() as Omit<Alerta, 'id'>;
  await update(alertaRef, {
    confirmaciones: alerta.confirmaciones + 1,
    // Cada confirmación extiende la vida 5 minutos (máximo 2h)
    expiraEn: Math.min(
      alerta.expiraEn + 5 * 60 * 1000,
      alerta.creadoEn + 2 * 60 * 60 * 1000
    ),
  });
}

// ─── Escuchar alertas activas ─────────────────────────────────────────

export function suscribirAlertas(onData: (alertas: Alerta[]) => void) {
  const alertasRef = ref(rtdb, 'alertas');

  const unsubscribe = onValue(alertasRef, (snap) => {
    const ahora = Date.now();
    const alertas: Alerta[] = [];

    snap.forEach((child) => {
      const data = child.val() as Omit<Alerta, 'id'>;
      // Filtra las expiradas localmente (la limpieza real la hace una Cloud Function)
      if (data.expiraEn > ahora) {
        alertas.push({ id: child.key!, ...data });
      }
    });

    onData(alertas);
  });

  // Retorna función de limpieza
  return () => off(alertasRef, 'value', unsubscribe as any);
}

// ─── Eliminar alerta (el que la creó puede borrarla) ─────────────────

export async function eliminarAlerta(alertaId: string) {
  await remove(ref(rtdb, `alertas/${alertaId}`));
}
