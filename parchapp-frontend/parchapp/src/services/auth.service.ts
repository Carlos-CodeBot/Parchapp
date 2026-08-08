// src/services/auth.service.ts  (versión backend propio)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi, setToken } from './api';
import { Usuario } from '../types';

const TOKEN_KEY = '@parchapp:token';

function mapUsuario(u: any): Usuario {
  return {
    uid: u.id,
    nombre: u.nombre,
    email: u.email,
    fotoPerfil: u.foto_perfil ?? undefined,
    parchaderosFavoritos: [],
    parchaderosCreadosPor: [],
    puntos: u.puntos ?? 0,
  };
}

export async function registrar(
  nombre: string, email: string, password: string
): Promise<Usuario> {
  const { token, usuario } = await authApi.registro(nombre, email, password);
  setToken(token);
  await AsyncStorage.setItem(TOKEN_KEY, token);
  return mapUsuario(usuario);
}

export async function login(email: string, password: string): Promise<Usuario> {
  const { token, usuario } = await authApi.login(email, password);
  setToken(token);
  await AsyncStorage.setItem(TOKEN_KEY, token);
  return mapUsuario(usuario);
}

export async function logout() {
  setToken(null);
  await AsyncStorage.removeItem(TOKEN_KEY);
}

/** Restaura sesión al arrancar la app */
export async function restaurarSesion(): Promise<Usuario | null> {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  try {
    setToken(token);
    const usuario = await authApi.me();
    return mapUsuario(usuario);
  } catch {
    setToken(null);
    await AsyncStorage.removeItem(TOKEN_KEY);
    return null;
  }
}
