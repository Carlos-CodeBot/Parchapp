import { Comentario, Parchadero } from '../types';
import { parchaderoApi } from './api';

/** Consulta el API inmediatamente y luego cada 15 s para reflejar aportes comunitarios. */
export function suscribirParchaderos(onData: (parchaderos: Parchadero[]) => void) {
  let activo = true;
  const cargar = async () => {
    try {
      const data = await parchaderoApi.listar();
      if (activo) onData(data);
    } catch (error) {
      console.warn('No se pudieron actualizar los parchaderos:', error);
    }
  };
  void cargar();
  const intervalo = setInterval(cargar, 15000);
  return () => { activo = false; clearInterval(intervalo); };
}

export async function crearParchadero(
  datos: Omit<Parchadero, 'id' | 'calificacionPromedio' | 'totalCalificaciones' | 'creadoEn'>
): Promise<string> {
  const creado = await parchaderoApi.crear({
    nombre: datos.nombre,
    tipo: datos.tipo,
    descripcion: datos.descripcion,
    lat: datos.coordenadas.lat,
    lng: datos.coordenadas.lng,
    tags: datos.tags,
  });
  return creado.id;
}

export async function obtenerParchadero(id: string): Promise<Parchadero> {
  return parchaderoApi.obtener(id);
}

export async function subirFoto(parchaderoId: string, uriLocal: string): Promise<string> {
  const { url } = await parchaderoApi.subirFoto(parchaderoId, uriLocal);
  return url;
}

export async function calificarParchadero(
  parchaderoId: string,
  _usuarioId: string,
  calificacion: number
) {
  await parchaderoApi.calificar(parchaderoId, calificacion);
}

function mapComentario(raw: any): Comentario {
  return {
    id: raw.id,
    parchaderoId: raw.parchadero_id,
    usuarioId: raw.usuario_id,
    usuarioNombre: raw.usuario_nombre || 'Parcero',
    texto: raw.texto,
    calificacion: raw.calificacion || 0,
    creadoEn: new Date(raw.creado_en).getTime(),
  };
}

export function suscribirComentarios(
  parchaderoId: string,
  onData: (comentarios: Comentario[]) => void
) {
  let activo = true;
  const cargar = async () => {
    try {
      const comentarios = await parchaderoApi.comentarios(parchaderoId);
      if (activo) onData(comentarios.map(mapComentario));
    } catch (error) {
      console.warn('No se pudieron actualizar los comentarios:', error);
    }
  };
  void cargar();
  const intervalo = setInterval(cargar, 10000);
  return () => { activo = false; clearInterval(intervalo); };
}

export async function agregarComentario(
  comentario: Omit<Comentario, 'id' | 'creadoEn'>
) {
  await parchaderoApi.comentar(
    comentario.parchaderoId,
    comentario.texto,
    comentario.calificacion
  );
}
