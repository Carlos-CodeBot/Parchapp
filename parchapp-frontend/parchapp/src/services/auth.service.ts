import { authApi, setToken } from './api';
import { Usuario } from '../types';

declare const require: (moduleName: string) => unknown;
const AsyncStorage = require('@react-native-async-storage/async-storage') as {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

const TOKEN_KEY = '@parchapp:token';

function mapUsuario(u: any): Usuario {
  return {
    uid: u.id,
    nombre: u.nombre || 'Parcero',
    email: u.email,
    fotoPerfil: u.foto_perfil || undefined,
    parchaderosFavoritos: [],
    parchaderosCreadosPor: [],
    puntos: u.puntos || 0,
  };
}

export async function registrar(
  nombre: string, email: string, password: string
): Promise<Usuario> {
  const { token, usuario } = await authApi.registro(nombre.trim(), email.trim(), password);
  setToken(token);
  await AsyncStorage.setItem(TOKEN_KEY, token);
  return mapUsuario(usuario);
}

export async function login(email: string, password: string): Promise<Usuario> {
  const { token, usuario } = await authApi.login(email.trim(), password);
  setToken(token);
  await AsyncStorage.setItem(TOKEN_KEY, token);
  return mapUsuario(usuario);
}

export async function logout() {
  setToken(null);
  await AsyncStorage.removeItem(TOKEN_KEY);
}

/** Restaura el JWT guardado y valida que siga vigente contra el servidor. */
export function escucharSesion(
  onSession: (usuario: Usuario) => void,
  onSignedOut: () => void
) {
  let activo = true;
  void AsyncStorage.getItem(TOKEN_KEY).then(async (token) => {
    if (!token) {
      if (activo) onSignedOut();
      return;
    }
    try {
      setToken(token);
      const usuario = await authApi.me();
      if (activo) onSession(mapUsuario(usuario));
    } catch {
      setToken(null);
      await AsyncStorage.removeItem(TOKEN_KEY);
      if (activo) onSignedOut();
    }
  });
  return () => { activo = false; };
}
