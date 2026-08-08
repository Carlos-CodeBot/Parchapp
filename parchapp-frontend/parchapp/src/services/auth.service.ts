import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { Usuario } from '../types';

function mapUsuario(u: { uid: string; displayName: string | null; email: string | null; photoURL: string | null }): Usuario {
  return {
    uid: u.uid,
    nombre: u.displayName || 'Parcero',
    email: u.email || '',
    fotoPerfil: u.photoURL || undefined,
    parchaderosFavoritos: [],
    parchaderosCreadosPor: [],
    puntos: 0,
  };
}

export async function registrar(
  nombre: string, email: string, password: string
): Promise<Usuario> {
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await updateProfile(credential.user, { displayName: nombre.trim() });
  return mapUsuario(credential.user);
}

export async function login(email: string, password: string): Promise<Usuario> {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  return mapUsuario(credential.user);
}

export async function logout() {
  await signOut(auth);
}

/** Mantiene la sesión sincronizada y notifica cuando Firebase termina de restaurarla. */
export function escucharSesion(
  onSession: (usuario: Usuario) => void,
  onSignedOut: () => void
) {
  return onAuthStateChanged(auth, (user) => {
    if (user) onSession(mapUsuario(user));
    else onSignedOut();
  });
}
