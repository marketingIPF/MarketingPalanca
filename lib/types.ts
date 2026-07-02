/**
 * Firestore data models for RK Marketing Hub.
 * Code in English; all user-facing labels live in lib/labels.ts (Spanish).
 */

import type { Timestamp } from "firebase/firestore";

/* ------------------------------------------------------------------ */
/* Enums (stored as machine-readable slugs; UI labels in labels.ts)    */
/* ------------------------------------------------------------------ */

export type UserRole = "superuser" | "agent";

export type Platform =
  | "instagram_stories"
  | "instagram_reels"
  | "tiktok"
  | "youtube_shorts"
  | "blog"
  | "facebook_reels"
  | "facebook_stories"
  | "google_business"
  | "newsletter";

export type ContentStatus =
  | "draft"            // Borrador
  | "scheduled"        // Programado
  | "pending_record"   // Pendiente de Grabar
  | "recorded"         // Grabado
  | "edited"           // Editado
  | "published";       // Publicado

export type PillarId =
  | "resenas_clientes"     // Respuestas a reseñas de clientes
  | "casos_reales"         // Casos Reales
  | "barrio"               // Barrio
  | "viviendas"            // Viviendas
  | "autoridad_educacion"  // Autoridad/Educación del vendedor
  | "temas_legales"        // Temas legales
  | "obra_nueva"           // Obra Nueva
  | "home_staging"         // Home Staging
  | "trend_virales";       // Vídeos Trend/Virales

export type RecordingEventType =
  | "listing_acquisition"  // Captación
  | "client_visit"         // Visita
  | "office_shoot"         // Grabación en oficina
  | "event";               // Evento

/* ------------------------------------------------------------------ */
/* Collection: users (doc id = Firebase Auth uid)                      */
/* ------------------------------------------------------------------ */

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  role: UserRole;
  /** Job title shown in the profile, e.g. "Agente inmobiliario", "Videógrafo" */
  title: string;
  phone?: string;
  /** Slack member id for @mentions in notifications (optional) */
  slackUserId?: string;
  stats: {
    videosRecordedThisMonth: number;
    pendingTasksThisWeek: number;
  };
  active: boolean;
  /** True until the person sets their own password for the first time. */
  mustChangePassword?: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/* ------------------------------------------------------------------ */
/* Collection: content_calendar                                        */
/* ------------------------------------------------------------------ */

export interface ContentItem {
  id: string;
  title: string;
  description?: string;
  /** Can publish to more than one platform at once (e.g. IG Reels + TikTok). */
  platforms: Platform[];
  status: ContentStatus;
  pillarId: PillarId | null;
  /** True if this piece counts toward the 3-reels-per-week quota */
  isReel: boolean;
  /** Target publication date/time */
  publishDate: Timestamp;
  /** Agent featured in the content (if any) */
  assignedAgentId: string | null;
  /** Linked recording event (recording_schedule doc id) */
  recordingEventId: string | null;
  /** Superuser who created/owns the piece */
  createdBy: string;
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/* ------------------------------------------------------------------ */
/* Collection: recording_schedule                                      */
/* ------------------------------------------------------------------ */

export interface RecordingEvent {
  id: string;
  /** Agent being recorded */
  agentId: string;
  /** Denormalized for fast Slack message building */
  agentName: string;
  type: RecordingEventType;
  /** Start date/time of the shoot */
  startAt: Timestamp;
  /** Free-text location or context, e.g. "Piso en Av. del Puerto 12" */
  location: string;
  /** Content items to be recorded during this event */
  contentItemIds: string[];
  /** Denormalized pillar/content titles for the Slack message */
  contentTitles: string[];
  notes?: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/* ------------------------------------------------------------------ */
/* Collection: content_pillars (doc id = PillarId)                     */
/* ------------------------------------------------------------------ */

export interface ContentPillar {
  id: PillarId;
  /** Spanish display name, e.g. "Casos Reales" */
  name: string;
  description?: string;
  /** Tailwind-friendly accent color token, e.g. "amber" */
  color: string;
  order: number;
  active: boolean;
}
