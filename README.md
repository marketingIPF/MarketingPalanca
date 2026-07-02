# RK Marketing Hub

App interna de gestión y automatización de marketing para **RK Palanca Fontestad**.
Next.js (App Router) · React · Tailwind CSS · Firebase (Auth + Firestore) · Vercel.

Toda la interfaz, etiquetas y notificaciones están en **español**. El código
(variables, comentarios, arquitectura) está en inglés.

## Módulos

- **A. Dashboard** (`/dashboard`) — cola de grabación priorizada para Pedro (solo admins).
- **B. Calendario** (`/calendario`) — vista mes/semana multiplataforma.
- **C. Series** (`/series`) — tracker de la cuota de 3 reels/semana repartidos en 9 pilares (solo admins).
- **D. Agenda** (`/agenda`) — booking de grabaciones de agentes, enlazadas al backlog de contenido.
- **E. Perfil** (`/perfil/[uid]`) — datos del agente, stats y sus tareas asignadas.
- **F. Admin** (`/admin`) — KPIs, botón de envío de agenda a Slack, accesos rápidos (solo admins).

Detalle de arquitectura, esquema de Firestore e índices en [`docs/ESTRUCTURA.md`](./docs/ESTRUCTURA.md).

## Puesta en marcha

### 1. Instalar dependencias

```bash
npm install
```

> Requiere **Node 22**. Si Codespaces te da Node 16-18 por defecto, usa
> `nvm install 22 && nvm use 22` antes de nada — si no, `firebase-admin`
> y el CLI de Vercel fallan.

### 2. Variables de entorno

Copia `.env.local.example` a `.env.local` y rellena:

```bash
cp .env.local.example .env.local
```

- Las tres `NEXT_PUBLIC_FIREBASE_*` salen de Firebase Console → Project Settings → General.
- `FIREBASE_SERVICE_ACCOUNT` es el JSON del service account (Project Settings → Service accounts → Generate new private key).
  - **En Vercel**: puedes pegar el JSON tal cual lo descargas (con saltos de línea), la caja de texto de Environment Variables lo admite entero.
  - **En `.env.local` (Codespaces/local)**: el archivo es de una variable por línea, así que el JSON debe ir **compactado a una sola línea**. Si tienes el archivo descargado en Codespaces, cómpactalo así:
    ```bash
    node -e "console.log(JSON.stringify(require('./ruta/al/archivo-service-account.json')))"
    ```
    Copia la salida completa y pégala como valor de `FIREBASE_SERVICE_ACCOUNT` en `.env.local`, entre comillas simples si tu editor no las añade solo.
- `SLACK_WEBHOOK_URL` sale de la app de Slack del canal donde quieras recibir la agenda (Incoming Webhooks).

### 3. Publicar las reglas de Firestore

Sube `firestore.rules` a Firebase Console → Firestore → Reglas, o:

```bash
firebase deploy --only firestore:rules
```

**Cada vez que cambies las reglas hay que repetir este paso — no es automático.**

### 4. Sembrar datos (en este orden, desde Codespaces)

Como `marketinghub-…` es un proyecto de Firebase **nuevo** (no el mismo que
"La Liga"), no existe ninguna cuenta todavía. El primer script crea **tanto
las cuentas de Firebase Auth como los perfiles de Firestore** en un solo paso.

```bash
# 1. Asegúrate de tener Node 22
nvm install 22 && nvm use 22

# 2. Instala dependencias si no lo has hecho
npm install

# 3. Rellena .env.local (paso 2 de este README) si no lo has hecho ya —
#    los scripts de seed lo cargan solos, no hace falta exportar nada a mano

# 4. Ejecuta los seeds en este orden
npm run seed:users     # crea Auth + Firestore de los ~26 usuarios (admins + agentes)
npm run seed:calendar  # contenidos de ejemplo, incluido el reel del 1 de julio
npm run seed:agenda    # enlaza 3 agentes a 3 contenidos pendientes de grabar
```

`seed:users` es **idempotente**: si una cuenta ya existe, actualiza su
email/nombre en vez de fallar, y el perfil de Firestore usa `merge: true`
para no pisar estadísticas ya acumuladas.

**Contraseña inicial de cada cuenta = su número de teléfono** (misma
convención que usaste en "La Liga"). Pedro, Roberto y Almudena no tienen
un teléfono de agente asociado en el roster, así que su contraseña inicial
es `CambiarPassword2026` — coméntaselo para que la cambien en cuanto entren
(la app todavía no tiene forzado de cambio de contraseña en el primer login;
si lo quieres, es una mejora sencilla para más adelante).

El seed de agenda depende de que ya existan los contenidos del seed de
calendario, así que respeta el orden.

### 5. Arrancar en local

```bash
npm run dev
```

### 6. Desplegar

Push a GitHub → Vercel lo despliega automáticamente. Antes de la primera
build, añade las mismas variables de entorno en Vercel → Project Settings →
Environment Variables.

## Notas técnicas

- Todas las fechas se calculan en **Europe/Madrid**, con anclas UTC para
  evitar desfases por el huso horario de los servidores de Vercel.
- Las etiquetas de UI viven centralizadas en `lib/labels.ts` — no hay
  textos en español sueltos por los componentes.
- Firestore te pedirá crear varios **índices compuestos** la primera vez
  que se ejecuten ciertas queries; el enlace para crearlos sale directo
  en la consola del navegador. Ver tabla completa en `docs/ESTRUCTURA.md`.
