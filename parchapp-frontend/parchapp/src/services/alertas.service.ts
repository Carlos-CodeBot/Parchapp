import { Alerta, AlertaTipo } from '../types';
import { alertaApi, conectarAlertasWS } from './api';

export async function crearAlerta(
  tipo: AlertaTipo,
  lat: number,
  lng: number,
  _usuarioId: string
): Promise<string> {
  const alerta = await alertaApi.crear(tipo, lat, lng);
  return alerta.id;
}

export async function confirmarAlerta(alertaId: string) {
  await alertaApi.confirmar(alertaId);
}

export function suscribirAlertas(onData: (alertas: Alerta[]) => void) {
  let alertas: Alerta[] = [];
  let activo = true;
  const publicar = () => onData(alertas.filter((a) => a.expiraEn > Date.now()));

  void alertaApi.listar().then((data) => {
    if (activo) { alertas = data; publicar(); }
  }).catch((error) => console.warn('No se pudieron cargar las alertas:', error));

  const desconectar = conectarAlertasWS((evento) => {
    if (!activo) return;
    if (evento.tipo === 'estado_inicial' && evento.alertas) alertas = evento.alertas;
    if (evento.tipo === 'alerta_nueva' && evento.alerta) alertas = [...alertas, evento.alerta];
    if (evento.tipo === 'alerta_actualizada' && evento.alerta) {
      alertas = alertas.map((a) => a.id === evento.alerta.id ? evento.alerta : a);
    }
    if (evento.tipo === 'alerta_eliminada' && evento.id) {
      alertas = alertas.filter((a) => a.id !== evento.id);
    }
    publicar();
  });

  const limpiar = setInterval(publicar, 30000);
  return () => { activo = false; clearInterval(limpiar); desconectar(); };
}

export async function eliminarAlerta(alertaId: string) {
  await alertaApi.eliminar(alertaId);
}
