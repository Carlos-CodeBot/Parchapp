// src/types/index.ts

export type ParchaderoTipo = 'cafe' | 'parque' | 'bar' | 'tienda' | 'plaza' | 'otro';

export interface Parchadero {
  id: string;
  nombre: string;
  tipo: ParchaderoTipo;
  descripcion: string;
  coordenadas: {
    lat: number;
    lng: number;
  };
  fotos: string[];          // URLs de Firebase Storage
  calificacionPromedio: number;
  totalCalificaciones: number;
  creadoPor: string;        // uid del usuario
  creadoEn: number;         // timestamp
  tags: string[];           // ['wifi', 'económico', 'tranquilo', etc.]
}

export interface Comentario {
  id: string;
  parchaderoId: string;
  usuarioId: string;
  usuarioNombre: string;
  texto: string;
  calificacion: number;     // 1-5
  creadoEn: number;
}

export type AlertaTipo =
  | 'policia'
  | 'bloqueo'
  | 'rumba'
  | 'peligro'
  | 'ruido'
  | 'parche'
  | 'lluvia'
  | 'cerrado';

export interface Alerta {
  id: string;
  tipo: AlertaTipo;
  coordenadas: {
    lat: number;
    lng: number;
  };
  reportadoPor: string;
  creadoEn: number;
  expiraEn: number;         // creadoEn + 45 minutos (como Waze)
  confirmaciones: number;
}

export interface Usuario {
  uid: string;
  nombre: string;
  email: string;
  fotoPerfil?: string;
  parchaderosFavoritos: string[];
  parchaderosCreadosPor: string[];
  puntos: number;           // gamificación futura
}

// Emojis y labels para cada tipo
export const PARCHADERO_CONFIG: Record<ParchaderoTipo, { emoji: string; label: string; color: string }> = {
  cafe:    { emoji: '☕', label: 'Café',    color: '#7F77DD' },
  parque:  { emoji: '🌳', label: 'Parque',  color: '#1D9E75' },
  bar:     { emoji: '🍺', label: 'Bar',     color: '#D85A30' },
  tienda:  { emoji: '🏪', label: 'Tienda',  color: '#BA7517' },
  plaza:   { emoji: '🏛️', label: 'Plaza',  color: '#185FA5' },
  otro:    { emoji: '📍', label: 'Otro',    color: '#888780' },
};

export const ALERTA_CONFIG: Record<AlertaTipo, { emoji: string; label: string }> = {
  policia:  { emoji: '🚔', label: 'Policía' },
  bloqueo:  { emoji: '🚧', label: 'Bloqueo' },
  rumba:    { emoji: '🎉', label: 'Rumba' },
  peligro:  { emoji: '⚠️', label: 'Peligro' },
  ruido:    { emoji: '📢', label: 'Ruido' },
  parche:   { emoji: '🍻', label: 'Parche' },
  lluvia:   { emoji: '🌧️', label: 'Lluvia' },
  cerrado:  { emoji: '🔒', label: 'Cerrado' },
};

export const TAGS_DISPONIBLES = [
  'WiFi', 'Económico', 'Tranquilo', 'Con música', 'Pet friendly',
  'Enchufes', 'Al aire libre', 'Techado', '24 horas', 'Parqueadero'
];
