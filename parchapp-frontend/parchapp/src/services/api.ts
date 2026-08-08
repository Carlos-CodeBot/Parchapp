// src/services/api.ts
// Cliente HTTP/WS para la API autohospedada de ParchApp.

export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000')
  .replace(/\/$/, '');

let _token: string | null = null;

export function setToken(t: string | null) { _token = t; }
export function getToken() { return _token; }

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (_token) headers['Authorization'] = `Bearer ${_token}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('El servidor tardó demasiado en responder');
    }
    throw new Error('No se pudo conectar con ParchApp. Revisa tu conexión.');
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    const message = typeof err.error === 'string'
      ? err.error
      : err.message || `Solicitud inválida (${res.status})`;
    throw new Error(message);
  }
  return res.json();
}

// ─── Auth ─────────────────────────────────────────────────────────────

export const authApi = {
  registro: (nombre: string, email: string, password: string) =>
    request<{ token: string; usuario: any }>('/api/auth/registro', {
      method: 'POST',
      body: JSON.stringify({ nombre, email, password }),
    }),

  login: (email: string, password: string) =>
    request<{ token: string; usuario: any }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () => request<any>('/api/auth/me'),
};

// ─── Parchaderos ──────────────────────────────────────────────────────

export const parchaderoApi = {
  listar: (params?: { lat?: number; lng?: number; radio?: number; tipo?: string }) => {
    const q = Object.entries(params || {})
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
      .join('&');
    return request<any[]>(`/api/parchaderos${q ? '?' + q : ''}`);
  },

  obtener: (id: string) => request<any>(`/api/parchaderos/${id}`),

  crear: (datos: {
    nombre: string; tipo: string; descripcion: string;
    lat: number; lng: number; tags: string[];
  }) => request<any>('/api/parchaderos', { method: 'POST', body: JSON.stringify(datos) }),

  subirFoto: async (id: string, uri: string) => {
    const formData = new FormData();
    formData.append('file', { uri, name: 'foto.jpg', type: 'image/jpeg' } as any);
    const res = await fetch(`${API_BASE_URL}/api/parchaderos/${id}/fotos`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${_token}` },
      body: formData,
    });
    if (!res.ok) throw new Error('Error subiendo foto');
    return res.json() as Promise<{ url: string }>;
  },

  calificar: (id: string, valor: number) =>
    request<any>(`/api/parchaderos/${id}/calificar`, {
      method: 'POST', body: JSON.stringify({ valor }),
    }),

  comentarios: (id: string) => request<any[]>(`/api/parchaderos/${id}/comentarios`),

  comentar: (id: string, texto: string, calificacion?: number) =>
    request<any>(`/api/parchaderos/${id}/comentarios`, {
      method: 'POST', body: JSON.stringify({ texto, calificacion }),
    }),

  toggleFavorito: (id: string) =>
    request<{ favorito: boolean }>(`/api/parchaderos/${id}/favorito`, { method: 'POST' }),
};

// ─── Alertas ──────────────────────────────────────────────────────────

export const alertaApi = {
  listar: () => request<any[]>('/api/alertas'),

  crear: (tipo: string, lat: number, lng: number) =>
    request<any>('/api/alertas', { method: 'POST', body: JSON.stringify({ tipo, lat, lng }) }),

  confirmar: (id: string) =>
    request<any>(`/api/alertas/${id}/confirmar`, { method: 'POST' }),

  eliminar: (id: string) =>
    request<any>(`/api/alertas/${id}`, { method: 'DELETE' }),
};

// ─── WebSocket para alertas en tiempo real ────────────────────────────
// Canal de alertas en tiempo real con reconexión exponencial.

export function conectarAlertasWS(
  onEvento: (evento: { tipo: string; alerta?: any; alertas?: any[]; id?: string }) => void
): () => void {
  const wsUrl = API_BASE_URL.replace(/^http/, 'ws') + '/ws/alertas';
  let ws: WebSocket;
  let reconectar = true;
  let intentos = 0;

  function conectar() {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      intentos = 0;
      console.log('WS alertas conectado');
    };

    ws.onmessage = (e) => {
      try {
        const evento = JSON.parse(e.data);
        onEvento(evento);
      } catch {}
    };

    ws.onclose = () => {
      if (!reconectar) return;
      // Reconexión exponencial: 1s, 2s, 4s, 8s… máximo 30s
      const delay = Math.min(1000 * Math.pow(2, intentos++), 30000);
      setTimeout(conectar, delay);
    };

    ws.onerror = (e) => console.warn('WS error:', e);
  }

  conectar();

  // Retorna función de limpieza
  return () => {
    reconectar = false;
    ws?.close();
  };
}
