# 🚀 ParchApp Backend — Servidor Propio

Stack: **Fastify + PostgreSQL + Redis + MinIO + Nginx + Docker**

Todo corre en cualquier VPS o servidor con Docker Compose, usando componentes open source sin costos por usuario ni dependencia de Firebase.

---

## Arquitectura

```
Internet
    │
    ▼
 Nginx :80               ← rate limiting y proxy interno
    │
    ├──► Fastify :3000   ← API REST + WebSocket
    │        │
    │        ├──► PostgreSQL/PostGIS ← datos y consultas geográficas
    │        ├──► Redis :6379        ← alertas en tiempo real, expiración automática
    │        └──► MinIO :9000        ← fotos (compatible con S3)
    │
    └──► MinIO :9000     ← fotos publicadas por `/media/`
```

---

## Requisitos del servidor

- Ubuntu 22.04 LTS (recomendado)
- Docker + Docker Compose
- Mínimo 2 GB RAM, 20 GB disco
- Puerto 80 disponible para el proxy o túnel; PostgreSQL, Redis y la API no se exponen directamente

---

## Instalación paso a paso

### 1. Instala Docker en Ubuntu
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
```

### 2. Clona el backend en tu servidor
```bash
scp -r parchapp-backend/ usuario@TU_IP:/home/usuario/
ssh usuario@TU_IP
cd parchapp-backend
```

### 3. Configura las variables de entorno
```bash
cp .env.example .env
nano .env   # Cambia las passwords y la IP pública
```

### 4. Levanta todos los servicios
```bash
docker compose up -d
```

Las migraciones se ejecutan automáticamente al iniciar el contenedor de la API y son idempotentes.

### 5. Verifica que todo esté corriendo
```bash
curl http://localhost/health
# Respuesta esperada: {"status":"ok","postgres":true,"redis":true}
```

---

## Acceso desde la red local (desarrollo)

Desde la app móvil configura `EXPO_PUBLIC_API_URL=http://192.168.1.X`.

---

## Acceso desde internet (producción)

### Opción A: DuckDNS (DNS dinámico gratuito)
Si tu IP de casa cambia (casi siempre), usa DuckDNS:
1. Ve a https://www.duckdns.org y crea una cuenta
2. Crea un subdominio: `parchapp.duckdns.org`
3. Instala el actualizador automático en tu servidor:
```bash
mkdir -p ~/duckdns
cat > ~/duckdns/duck.sh << 'SCRIPT'
echo url="https://www.duckdns.org/update?domains=parchapp&token=TU_TOKEN&ip=" | curl -k -o ~/duckdns/duck.log -K -
SCRIPT
chmod +x ~/duckdns/duck.sh
# Ejecuta cada 5 minutos
(crontab -l; echo "*/5 * * * * ~/duckdns/duck.sh") | crontab -
```

### Opción B: Cloudflare Tunnel (recomendado, sin abrir puertos)
Más seguro — no necesitas abrir el router:
```bash
# Instala cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
chmod +x cloudflared && sudo mv cloudflared /usr/local/bin/

# Autentícate (necesitas cuenta gratuita en cloudflare.com)
cloudflared tunnel login
cloudflared tunnel create parchapp
cloudflared tunnel route dns parchapp api.TU_DOMINIO.com

# Configura el ingress del túnel con service: http://localhost:80 y arranca
cloudflared tunnel run parchapp
```

### HTTPS directo con Caddy (alternativa al túnel)

Si expones el servidor directamente, cambia el puerto de Nginx en Compose a `127.0.0.1:8080:80` y coloca Caddy delante. Caddy obtiene y renueva Let's Encrypt automáticamente:

```bash
api.tu-dominio.com {
  reverse_proxy localhost:8080
}
```

---

## Comandos útiles

```bash
# Ver logs en tiempo real
docker compose logs -f api

# Reiniciar solo la API (sin bajar la DB)
docker compose restart api

# Ver uso de recursos
docker stats

# Backup de la base de datos
docker compose exec postgres pg_dump -U parchapp parchapp > backup_$(date +%Y%m%d).sql

# Restaurar backup
cat backup_FECHA.sql | docker compose exec -T postgres psql -U parchapp parchapp
```

---

## Consola de MinIO (administrar fotos)
Por seguridad solo escucha en localhost. Abre un túnel SSH con `ssh -L 9001:localhost:9001 usuario@TU_IP` y visita `http://localhost:9001`.
- Usuario: el valor de `MINIO_ACCESS_KEY` en tu `.env`
- Password: el valor de `MINIO_SECRET_KEY`
