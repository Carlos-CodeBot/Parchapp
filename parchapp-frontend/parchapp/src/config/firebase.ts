// src/config/firebase.ts
// 1. Ve a https://console.firebase.google.com
// 2. Crea un proyecto llamado "parchapp"
// 3. Activa: Authentication (Email/Google), Firestore, Realtime Database, Storage
// 4. Reemplaza estos valores con los de tu proyecto

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "parchapp.firebaseapp.com",
  databaseURL: "https://parchapp-default-rtdb.firebaseio.com",
  projectId: "parchapp",
  storageBucket: "parchapp.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);       // Parchaderos, comentarios, calificaciones
export const rtdb = getDatabase(app);      // Alertas en tiempo real (expiran solos)
export const storage = getStorage(app);    // Fotos de los parchaderos
export const auth = getAuth(app);

export default app;
