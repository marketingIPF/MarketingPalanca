/**
 * Spanish UI labels for every machine-readable enum in lib/types.ts.
 * Keep ALL user-facing copy here — components must never hardcode labels.
 */

import type {
  ContentStatus,
  Platform,
  PillarId,
  RecordingEventType,
} from "./types";

export const PLATFORM_LABELS: Record<Platform, string> = {
  instagram_stories: "Instagram · Stories",
  instagram_reels: "Instagram · Reels",
  tiktok: "TikTok",
  youtube_shorts: "YouTube Shorts",
  blog: "Blog Corporativo",
  facebook_reels: "Facebook · Reels",
  facebook_stories: "Facebook · Stories",
  google_business: "Google My Business",
  newsletter: "Newsletter",
};

/** Compact tags shown inside dense calendar cells */
export const PLATFORM_SHORT: Record<Platform, string> = {
  instagram_stories: "IG Stories",
  instagram_reels: "IG Reels",
  tiktok: "TikTok",
  youtube_shorts: "YT Shorts",
  blog: "Blog",
  facebook_reels: "FB Reels",
  facebook_stories: "FB Stories",
  google_business: "Google",
  newsletter: "Newsletter",
};

/** Tailwind classes per platform for tags (dot + text) */
export const PLATFORM_STYLES: Record<Platform, string> = {
  instagram_stories: "bg-pink-50 text-pink-700",
  instagram_reels: "bg-fuchsia-50 text-fuchsia-700",
  tiktok: "bg-gray-900/5 text-gray-800",
  youtube_shorts: "bg-red-50 text-red-700",
  blog: "bg-orange-50 text-orange-700",
  facebook_reels: "bg-blue-50 text-blue-700",
  facebook_stories: "bg-indigo-50 text-indigo-700",
  google_business: "bg-emerald-50 text-emerald-700",
  newsletter: "bg-amber-50 text-amber-700",
};

export const STATUS_LABELS: Record<ContentStatus, string> = {
  draft: "Borrador",
  scheduled: "Programado",
  pending_record: "Pendiente de Grabar",
  recorded: "Grabado",
  edited: "Editado",
  published: "Publicado",
};

/** Tailwind classes per status for badges */
export const STATUS_STYLES: Record<ContentStatus, string> = {
  draft: "bg-gray-100 text-gray-600",
  scheduled: "bg-blue-50 text-blue-700",
  pending_record: "bg-amber-50 text-amber-700",
  recorded: "bg-violet-50 text-violet-700",
  edited: "bg-cyan-50 text-cyan-700",
  published: "bg-emerald-50 text-emerald-700",
};

export const PILLAR_LABELS: Record<PillarId, string> = {
  resenas_clientes: "Respuestas a reseñas de clientes",
  casos_reales: "Casos Reales",
  barrio: "Barrio",
  viviendas: "Viviendas",
  autoridad_educacion: "Autoridad / Educación del vendedor",
  temas_legales: "Temas legales",
  obra_nueva: "Obra Nueva",
  home_staging: "Home Staging",
  trend_virales: "Vídeos Trend / Virales",
};

export const EVENT_TYPE_LABELS: Record<RecordingEventType, string> = {
  listing_acquisition: "Captación",
  client_visit: "Visita",
  office_shoot: "Grabación en oficina",
  event: "Evento",
};
