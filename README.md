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
- `FIREBASE_SERVICE_ACCOUNT` es el JSON del service account (Project Settings → Service accounts → Generate new private key), **pegado en una sola línea**.
- `SLACK_WEBHOOK_URL` sale de la app de Slack del canal donde quieras recibir la agenda (Incoming Webhooks).

### 3. Publicar las reglas de Firestore

Sube `firestore.rules` a Firebase Console → Firestore → Reglas, o:

```bash
firebase deploy --only firestore:rules
```

**Cada vez que cambies las reglas hay que repetir este paso — no es automático.**

### 4. Sembrar datos (en este orden)

```bash
npm run seed:users     # roster de agentes (reutilizado de la app "La Liga")
npm run seed:calendar  # contenidos de ejemplo, incluido el reel del 1 de julio
npm run seed:agenda    # enlaza 3 agentes a 3 contenidos pendientes de grabar
```

El seed de usuarios usa `merge: true`, así que se puede re-ejecutar sin
perder estadísticas ya acumuladas. El de agenda depende de que ya existan
los contenidos del seed de calendario.

### 5. Crear las cuentas de Firebase Auth

Los `uid` de `scripts/seed-users.ts` coinciden con los agentes de La Liga,
así que si usas el mismo proyecto de Firebase, esas cuentas ya existen.
Falta crear la de **Pedro** manualmente en Firebase Console → Authentication,
con el mismo `uid: pedro` que usa el seed (o ajusta el seed a su `uid` real).

### 6. Arrancar en local

```bash
npm run dev
```

### 7. Desplegar

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
