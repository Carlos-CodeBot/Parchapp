# 📍 ParchApp móvil

Aplicación Expo/React Native para descubrir y recomendar parchaderos. El cliente **no usa Firebase**: consume la API REST y el WebSocket del backend autohospedado.

## Desarrollo

```bash
npm install
cp .env.example .env
# En un teléfono, usa la IP LAN del computador, no localhost.
EXPO_PUBLIC_API_URL=http://192.168.1.20:3000 npx expo start
```

Para producción, configura la URL HTTPS pública antes de generar la aplicación:

```bash
EXPO_PUBLIC_API_URL=https://api.tu-dominio.com npx expo prebuild
```

## Servicios del backend

- Autenticación propia mediante email, contraseña con bcrypt y JWT.
- PostgreSQL/PostGIS para usuarios, lugares, reseñas, calificaciones y consultas geográficas.
- MinIO para fotos, usando una interfaz compatible con S3.
- Redis y WebSocket para alertas comunitarias con expiración automática.

El token se almacena localmente con AsyncStorage y se valida contra `/api/auth/me` al abrir la aplicación. La URL se lee de `EXPO_PUBLIC_API_URL`; no hay credenciales del backend dentro del cliente.

## Verificaciones

```bash
npm run typecheck
npx expo export --platform android
```
