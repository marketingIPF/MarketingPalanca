# RK Marketing Hub — Estructura del proyecto

App interna de gestión y automatización de marketing para RK Palanca Fontestad.
Stack: Next.js (App Router) · React · Tailwind CSS · Firebase (Auth + Firestore) · Vercel.

## Árbol de directorios

```
rk-marketing-hub/
├── app/
│   ├── layout.tsx                  # Root layout (Inter font, fondo #F9FAFB)
│   ├── page.tsx                    # Redirect → /dashboard o /login según sesión
│   ├── globals.css
│   ├── login/
│   │   └── page.tsx                # Firebase Auth (email/password o Google)
│   ├── dashboard/
│   │   └── page.tsx                # Dashboard inteligente (vista Pedro)
│   ├── calendario/
│   │   └── page.tsx                # Calendario multi-plataforma (mes/semana)
│   ├── series/
│   │   └── page.tsx                # Backlog de series + tracker 3 reels/semana
│   ├── agenda/
│   │   └── page.tsx                # Agenda de grabación de agentes
│   ├── perfil/
│   │   └── [uid]/page.tsx          # Perfil de usuario + stats
│   ├── admin/
│   │   └── page.tsx                # Panel admin (solo superusers)
│   └── api/
│       └── slack/
│           └── route.ts            # POST → envía agenda de mañana a Slack
├── components/
│   ├── ui/                         # Primitivas estilo shadcn (Button, Card, Badge, Dialog…)
│   ├── dashboard/
│   │   ├── PedroDashboard.tsx      # 1 urgente + 2 secundarios
│   │   └── ContentPriorityCard.tsx
│   ├── calendar/
│   │   ├── CalendarGrid.tsx
│   │   ├── ContentCard.tsx         # Tarjeta con tag de plataforma + estado
│   │   └── PlatformFilter.tsx
│   ├── series/
│   │   └── WeeklyQuotaTracker.tsx  # Contador visual 3 reels/semana
│   ├── agenda/
│   │   └── RecordingEventForm.tsx
│   └── admin/
│       └── SlackTriggerButton.tsx  # Botón con estados Idle/Loading/Success/Error
├── hooks/
│   ├── useAuth.ts                  # Sesión + rol (superuser/agent)
│   ├── usePendingContent.ts        # Query de priorización del dashboard
│   └── useWeeklyQuota.ts
├── lib/
│   ├── firebase.ts                 # SDK cliente (client components)
│   ├── firebase-admin.ts           # Admin SDK (solo API routes / server)
│   ├── types.ts                    # Esquema Firestore (interfaces TS)
│   ├── labels.ts                   # Mapas de etiquetas UI en español
│   └── slack.ts                    # Constructor del mensaje Block Kit
├── firestore.rules
├── .env.local                      # SLACK_WEBHOOK_URL, FIREBASE_SERVICE_ACCOUNT…
└── tailwind.config.ts
```

## Colecciones Firestore

| Colección | Documento | Uso |
|---|---|---|
| `users` | uid de Firebase Auth | Roles (superuser/agent), perfil, stats |
| `content_calendar` | autoId | Cada pieza de contenido (reel, post, blog…) |
| `recording_schedule` | autoId | Eventos de grabación de agentes |
| `content_pillars` | slug del pilar | Los 9 pilares (semilla fija, editable por admins) |

## Reglas Firestore (resumen)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() { return request.auth != null; }
    function isSuperuser() {
      return isSignedIn() &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'superuser';
    }

    match /users/{uid} {
      allow read: if isSignedIn();
      allow write: if isSuperuser() || request.auth.uid == uid;
    }
    match /content_calendar/{doc} {
      allow read: if isSignedIn();
      allow create, delete: if isSuperuser();
      // Un agente solo puede marcar como completadas SUS tareas
      allow update: if isSuperuser() ||
        (isSignedIn() && resource.data.assignedAgentId == request.auth.uid &&
         request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status', 'updatedAt']));
    }
    match /recording_schedule/{doc} {
      allow read: if isSignedIn();
      allow write: if isSuperuser();
    }
    match /content_pillars/{doc} {
      allow read: if isSignedIn();
      allow write: if isSuperuser();
    }
  }
}
```

> Recordatorio: tras editar las reglas hay que **publicarlas manualmente** en la consola de Firebase (o `firebase deploy --only firestore:rules`).

## Índices compuestos necesarios

Firestore te dará el enlace exacto en el primer error de consola, pero para no ir a ciegas:

| Colección | Campos | Usado por |
|---|---|---|
| `content_calendar` | `status` (==) + `publishDate` (asc) | Dashboard de Pedro (`pending_record`) |
| `content_calendar` | `status` (in) + `publishDate` (asc) | Selector de contenidos enlazables en el formulario de grabación |
| `content_calendar` | `assignedAgentId` (==) + `status` (!=) + `status` (asc) + `publishDate` (asc) | Contenidos asignados en el perfil del agente |
| `recording_schedule` | `agentId` (==) + `startAt` (>=) + `startAt` (asc) | Próximas grabaciones en el perfil del agente |
| `users` | `role` (==) | KPI de agentes activos en el panel admin |
| `recording_schedule` | `startAt` (>=, <) + `startAt` (asc) | Agenda de agentes y ruta de Slack (rango simple, no requiere índice compuesto) |

La query del calendario (`publishDate` >= y <) tampoco requiere índice compuesto porque es un solo campo de rango + su propio orden.

## Variables de entorno

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
# Admin SDK (API routes) — JSON del service account en una sola línea
FIREBASE_SERVICE_ACCOUNT=
# Webhook entrante de Slack (canal #contenido o similar)
SLACK_WEBHOOK_URL=
```
