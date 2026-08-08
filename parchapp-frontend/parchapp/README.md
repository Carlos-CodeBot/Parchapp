# 📍 ParchApp

Encuentra los mejores parchaderos de tu ciudad. Mapa colaborativo con pines, fotos, calificaciones, comentarios y alertas en tiempo real tipo Waze.

---

## Stack

- **React Native + Expo** (cross-platform iOS/Android)
- **Firebase Firestore** — parchaderos, comentarios, calificaciones
- **Firebase Realtime Database** — alertas en tiempo real (expiran en 45 min)
- **Firebase Storage** — fotos de los parchaderos
- **Firebase Auth** — autenticación de usuarios
- **Zustand** — estado global
- **react-native-maps** — mapa con Google Maps

---

## Configuración inicial

### 1. Clona e instala
```bash
git clone <repo>
cd parchapp
npm install
```

### 2. Firebase
1. Ve a https://console.firebase.google.com
2. Crea un proyecto llamado **parchapp**
3. Activa:
   - **Authentication** → Email/Password
   - **Firestore Database** (modo producción)
   - **Realtime Database**
   - **Storage**
4. En Configuración del proyecto → tu app web → copia las credenciales
5. Pégalas en `src/config/firebase.ts`

### 3. Google Maps API
1. Ve a https://console.cloud.google.com
2. Crea un proyecto o usa el mismo de Firebase
3. Activa: **Maps SDK for Android**, **Maps SDK for iOS**
4. Crea una API Key y pégala en `app.json`:
   - `android.config.googleMaps.apiKey`
   - `ios.config.googleMapsApiKey`

### 4. Reglas de seguridad
- Copia `firestore.rules` en Firebase Console → Firestore → Rules
- Copia `database.rules.json` en Firebase Console → Realtime Database → Rules

### 5. Corre la app
```bash
npx expo start
```
Escanea el QR con **Expo Go** (Android) o en el simulador de iOS.

---

## Estructura del proyecto

```
parchapp/
├── app/
│   ├── _layout.tsx          ← Root + listener de sesión
│   └── index.tsx            ← Router: mapa o login
├── src/
│   ├── config/
│   │   └── firebase.ts      ← Credenciales Firebase
│   ├── types/
│   │   └── index.ts         ← Todos los tipos TypeScript
│   ├── store/
│   │   └── useStore.ts      ← Estado global (Zustand)
│   ├── services/
│   │   ├── auth.service.ts         ← Login, registro, sesión
│   │   ├── parchaderos.service.ts  ← CRUD parchaderos + fotos + calificaciones
│   │   └── alertas.service.ts      ← Alertas en tiempo real (RTDB)
│   ├── hooks/
│   │   └── useLocation.ts   ← Permisos y tracking de GPS
│   ├── screens/
│   │   ├── MapScreen.tsx    ← Pantalla principal con el mapa
│   │   └── AuthScreen.tsx   ← Login y registro
│   └── components/
│       ├── ParchaderoBottomSheet.tsx  ← Ficha del parchadero
│       ├── AgregarParchaderoSheet.tsx ← Formulario para agregar
│       └── AlertaPanel.tsx            ← Panel de alertas tipo Waze
└── firestore.rules
└── database.rules.json
```

---

## Flujo de uso

1. **Login** → el usuario entra con email/password
2. **Mapa** → ve pines de parchaderos y emojis de alertas en tiempo real
3. **Tap en un pin** → abre la ficha con fotos, calificación y comentarios
4. **Long press en el mapa** → modo agregar parchadero (pin arrastrable)
5. **Botón 🚨 Alertar** → panel de emojis tipo Waze, la alerta dura 45 min

---

## Próximos pasos (Fase 2)

- [ ] Búsqueda de parchaderos por nombre
- [ ] Filtros por tipo (cafés, parques, bares...)
- [ ] Notificaciones push cuando hay una alerta cerca
- [ ] Perfil de usuario con historial y favoritos
- [ ] Cloud Function para limpiar alertas expiradas automáticamente
- [ ] Gamificación: puntos e insignias por contribuir
