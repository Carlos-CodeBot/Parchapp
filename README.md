# ParchApp — guía completa para ejecutar el proyecto en local

ParchApp es una aplicación móvil comunitaria para descubrir, publicar y calificar lugares donde reunirse. Este repositorio contiene:

- una app móvil hecha con **React Native y Expo**;
- una API en **Node.js + Fastify**;
- **PostgreSQL/PostGIS** para usuarios, lugares, comentarios y consultas geográficas;
- **Redis** para alertas temporales y eventos en tiempo real;
- **MinIO** para almacenar fotografías;
- **Nginx** como punto de entrada local a la API, WebSocket y fotografías.

No es necesario crear un proyecto de Firebase ni contratar ningún servicio externo.

> **Entorno local sin certificados:** esta configuración usa HTTP y WebSocket (`http://` y `ws://`) exclusivamente para desarrollo en la red local. Nginx no carga certificados, no escucha en el puerto 443 y no redirige a HTTPS. No expongas este entorno directamente a Internet.

---

## 1. Requisitos

Instala las siguientes herramientas antes de comenzar:

| Herramienta | Versión recomendada | Comprobación |
| --- | --- | --- |
| Git | reciente | `git --version` |
| Docker Engine o Docker Desktop | Docker 24 o superior | `docker --version` |
| Docker Compose | Compose v2 | `docker compose version` |
| Node.js | 20 LTS | `node --version` |
| npm | 10 o superior | `npm --version` |
| Expo Go | compatible con Expo SDK 51 | instalar en el teléfono |

Para Android también puedes usar Android Studio y un emulador. Para iOS necesitas macOS si deseas usar el simulador de Xcode; un teléfono físico con Expo Go funciona sin Xcode.

> **Puertos utilizados:** el backend publica HTTP en el puerto `80` y la consola de MinIO en `127.0.0.1:9001`. Verifica que no haya otro servidor usando esos puertos.

---

## 2. Estructura del repositorio

```text
Parchapp/
├── parchapp-backend/parchapp-backend/  # API e infraestructura Docker
└── parchapp-frontend/parchapp/        # aplicación Expo
```

Todos los comandos de esta guía parten desde la raíz `Parchapp/`, salvo que se indique lo contrario.

---

## 3. Descargar y preparar el proyecto

```bash
git clone <URL_DEL_REPOSITORIO> Parchapp
cd Parchapp
```

Si ya tienes el repositorio, basta con entrar a su directorio:

```bash
cd /ruta/a/Parchapp
```

---

## 4. Configurar el backend

### 4.1 Crear el archivo de entorno

```bash
cd parchapp-backend/parchapp-backend
cp .env.example .env
```

Para una prueba local puedes reemplazar el contenido de `.env` por lo siguiente:

```dotenv
PORT=3000
HOST=0.0.0.0
NODE_ENV=development
CORS_ORIGIN=*

# Debe contener al menos 32 caracteres.
JWT_SECRET=local_parchapp_cambiar_antes_de_produccion_123456789
JWT_EXPIRES_IN=30d

POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=parchapp
POSTGRES_USER=parchapp
POSTGRES_PASSWORD=parchapp_local_password

REDIS_HOST=redis
REDIS_PORT=6379

MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=parchapp_access
MINIO_SECRET_KEY=parchapp_local_secret
MINIO_BUCKET=parchapp-fotos
MINIO_USE_SSL=false

# Consulta la tabla de URLs de la sección 6 antes de elegir este valor.
PUBLIC_URL=http://localhost
```

`PUBLIC_URL` es importante: el backend guarda esa base en las URLs de las fotos. Debe ser una dirección que el dispositivo donde ejecutas la app pueda abrir.

### 4.2 Iniciar los servicios

Desde `parchapp-backend/parchapp-backend` ejecuta:

```bash
docker compose up --build -d
```

La primera construcción descarga las imágenes y puede tardar varios minutos. No necesitas crear carpetas de certificados ni archivos `fullchain.pem`/`privkey.pem`.

Esto crea cinco contenedores:

| Contenedor | Función |
| --- | --- |
| `parchapp_nginx` | entrada en `http://localhost` |
| `parchapp_api` | API REST y WebSocket |
| `parchapp_postgres` | PostgreSQL con PostGIS |
| `parchapp_redis` | alertas y Pub/Sub |
| `parchapp_minio` | fotografías |

La API ejecuta automáticamente las migraciones al arrancar. No necesitas crear las tablas manualmente.

### 4.3 Verificar el backend

Espera unos segundos y comprueba el estado:

```bash
docker compose ps
curl http://localhost/health
```

La respuesta esperada es:

```json
{"status":"ok","postgres":true,"redis":true}
```

Consulta los logs si algún contenedor no inicia:

```bash
docker compose logs -f api
```

Pulsa `Ctrl+C` para salir de los logs; los contenedores continúan ejecutándose.

### 4.4 Probar el API sin la aplicación

Puedes comprobar el registro de usuarios con:

```bash
curl -X POST http://localhost/api/auth/registro \
  -H 'Content-Type: application/json' \
  -d '{"nombre":"Usuario local","email":"local@example.com","password":"prueba123"}'
```

La respuesta debe incluir un `token` y un objeto `usuario`. El mismo correo no puede registrarse dos veces y la contraseña debe tener entre 8 y 128 caracteres.

---

## 5. Instalar la aplicación móvil

Abre una **segunda terminal**, vuelve a la raíz del repositorio y ejecuta:

```bash
cd parchapp-frontend/parchapp
npm install
cp .env.example .env
```

No cierres los contenedores del backend mientras pruebas la aplicación.

---

## 6. Elegir la URL correcta del backend

La URL depende de dónde se ejecute Expo:

| Entorno | `EXPO_PUBLIC_API_URL` | `PUBLIC_URL` del backend |
| --- | --- | --- |
| Simulador iOS | `http://localhost` | `http://localhost` |
| Emulador Android | `http://10.0.2.2` | `http://10.0.2.2` |
| Teléfono físico | `http://IP_LAN_DEL_COMPUTADOR` | `http://IP_LAN_DEL_COMPUTADOR` |

Para un teléfono físico, el teléfono y el computador deben estar en la misma red Wi-Fi. Obtén la IP local del computador con uno de estos comandos:

```bash
# Linux
hostname -I

# macOS
ipconfig getifaddr en0

# Windows PowerShell
ipconfig
```

Por ejemplo, si la IP del computador es `192.168.1.25`, configura:

```dotenv
# parchapp-frontend/parchapp/.env
EXPO_PUBLIC_API_URL=http://192.168.1.25
```

Y en el backend:

```dotenv
# parchapp-backend/parchapp-backend/.env
PUBLIC_URL=http://192.168.1.25
```

Cuando cambies `PUBLIC_URL`, reinicia el backend:

```bash
cd parchapp-backend/parchapp-backend
docker compose up -d --force-recreate api
```

Cuando cambies `EXPO_PUBLIC_API_URL`, reinicia Expo para que vuelva a cargar las variables de entorno.

> Si el teléfono no abre `http://IP_LAN_DEL_COMPUTADOR/health` en su navegador, revisa el firewall del computador, que ambos dispositivos estén en la misma red y que el router no tenga activado el aislamiento de clientes Wi-Fi.

---

## 7. Ejecutar la app con Expo

Desde `parchapp-frontend/parchapp`:

```bash
npm start
```

Luego elige una opción:

- **Teléfono:** abre Expo Go y escanea el código QR.
- **Android Emulator:** inicia el emulador y pulsa `a` en la terminal de Expo.
- **iOS Simulator:** en macOS, pulsa `i`.

Si Expo conserva una configuración anterior, limpia su caché:

```bash
npx expo start --clear
```

La aplicación solicitará permisos de ubicación y acceso a fotografías. Acéptalos para probar el mapa y la publicación de parchaderos.

### Google Maps

Expo Go normalmente permite probar `react-native-maps`. Para una compilación nativa propia debes reemplazar las claves de ejemplo de `parchapp-frontend/parchapp/app.json` por claves válidas de **Maps SDK for Android** y **Maps SDK for iOS**. Restringe las claves por identificador de aplicación antes de distribuirla.

### Alertas por WebSocket

El endpoint local es `ws://HOST/ws/alertas`. El backend usa la firma de `@fastify/websocket` v10, que entrega el socket directamente:

```ts
app.get('/ws/alertas', { websocket: true }, async (ws) => {
  // usar ws.send(...), ws.on(...)
});
```

No uses `connection.socket`: esa forma corresponde a versiones anteriores del plugin.

---

## 8. Recorrido de prueba recomendado

1. Abre la app y crea una cuenta.
2. Autoriza el acceso a la ubicación.
3. Mantén presionado un punto del mapa o usa el botón `+`.
4. Publica un sitio con nombre, descripción y al menos una fotografía.
5. Selecciona su marcador y agrega una calificación y un comentario.
6. Usa la búsqueda y los filtros por tipo.
7. Crea una alerta y verifica que aparezca en otra instancia de la app.
8. Cierra y abre la app para confirmar que la sesión JWT se restaura.

Para comprobar el tiempo real con un solo computador, abre la app en un emulador y en un teléfono conectados al mismo backend.

---

## 9. Consola de fotografías de MinIO

La consola administrativa solo está disponible en el computador local:

```text
http://localhost:9001
```

Inicia sesión con `MINIO_ACCESS_KEY` y `MINIO_SECRET_KEY` del archivo `.env`. Las fotografías de la aplicación se guardan en el bucket `parchapp-fotos`.

---

## 10. Comandos de verificación

### Frontend

```bash
cd parchapp-frontend/parchapp
npm run typecheck
```

### Backend

```bash
cd parchapp-backend/parchapp-backend
npm ci
npm run build
```

### Infraestructura

```bash
cd parchapp-backend/parchapp-backend
docker compose config
docker compose ps
curl http://localhost/health
```

---

## 11. Detener, reiniciar o borrar el entorno

Detener los contenedores conservando los datos:

```bash
cd parchapp-backend/parchapp-backend
docker compose down
```

Volver a iniciarlos:

```bash
docker compose up -d
```

Recrear completamente la base de datos, alertas y fotografías:

```bash
docker compose down -v
docker compose up --build -d
```

> `docker compose down -v` elimina permanentemente usuarios, lugares, comentarios, calificaciones, alertas y fotos del entorno local.

---

## 12. Solución de problemas

### El puerto 80 ya está ocupado

Detén Apache, Nginx, IIS u otro servicio que use el puerto, o cambia en `docker-compose.yml` la asignación de Nginx de `80:80` a `8080:80`. Si usas `8080`, agrega `:8080` a `EXPO_PUBLIC_API_URL` y `PUBLIC_URL`.

### La app muestra que no puede conectarse

1. Ejecuta `curl http://localhost/health` en el computador.
2. Desde un teléfono, abre `http://IP_LAN_DEL_COMPUTADOR/health` en el navegador.
3. Confirma que `.env` del frontend contiene la URL correspondiente al dispositivo.
4. Reinicia Expo con `npx expo start --clear`.
5. Revisa `docker compose logs -f api nginx`.

### Las fotos se suben pero no aparecen

Comprueba que `PUBLIC_URL` sea accesible desde el dispositivo. Las URLs ya guardadas mantienen el valor anterior; para una prueba limpia puedes ejecutar `docker compose down -v` y volver a iniciar los servicios.

### El mapa aparece vacío

Verifica los permisos de ubicación, la conexión del dispositivo y las claves de Google Maps si estás usando una compilación nativa propia.

### La migración o la API no inicia

```bash
docker compose logs postgres api
docker compose restart api
```

Confirma además que `JWT_SECRET` tenga al menos 32 caracteres y que las contraseñas de PostgreSQL y MinIO coincidan con las variables del archivo `.env`.
