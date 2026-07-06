/**
 * Seed script for content_calendar.
 * Run once from a trusted environment (Node 22) with the Admin SDK:
 *   FIREBASE_SERVICE_ACCOUNT='...' npx tsx scripts/seed-calendar.ts
 *
 * Dates are anchored to Europe/Madrid. Adjust freely.
 */

import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import type { ContentItem } from "@/lib/types";

const adminDb = getAdminDb();

const TZ = "Europe/Madrid";

/** Build a Timestamp for a Madrid wall-clock date/time. */
function madrid(dateISO: string, time: string): Timestamp {
  const [Y, M, D] = dateISO.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  const guess = Date.UTC(Y, M - 1, D, h, min);
  const offset =
    guess -
    new Date(new Date(guess).toLocaleString("en-US", { timeZone: TZ })).getTime();
  return Timestamp.fromDate(new Date(guess - offset));
}

type Seed = Omit<ContentItem, "id" | "createdAt" | "updatedAt">;

const items: Seed[] = [
  // ── Ayer 1 de julio: reel trend/viral ya PUBLICADO ──────────────
  {
    title: "Reel trend: sonido viral con recorrido de piso reformado",
    description:
      "Adaptación del trend del momento aplicado a una vivienda de la cartera. Publicado el 1 de julio.",
    platforms: ["instagram_reels", "tiktok"],
    status: "published",
    pillarId: "trend_virales",
    isReel: true,
    isStory: false,
    publishDate: madrid("2026-07-01", "18:30"),
    assignedAgentId: null,
    recordingEventId: null,
    createdBy: "system-seed",
  },
  // ── Cola de grabación (dashboard de Pedro) ──────────────────────
  {
    title: "Caso real: familia que vendió y compró en Valencia en 45 días",
    description: "Testimonio en oficina. Formato lista/ranking de pasos.",
    platforms: ["instagram_reels"],
    status: "pending_record",
    pillarId: "casos_reales",
    isReel: true,
    isStory: false,
    publishDate: madrid("2026-07-03", "18:00"),
    assignedAgentId: null,
    recordingEventId: null,
    createdBy: "system-seed",
  },
  {
    title: "Barrio: qué ver en un paseo por el centro histórico",
    platforms: ["youtube_shorts"],
    status: "pending_record",
    pillarId: "barrio",
    isReel: true,
    isStory: false,
    publishDate: madrid("2026-07-04", "12:00"),
    assignedAgentId: null,
    recordingEventId: null,
    createdBy: "system-seed",
  },
  {
    title: "Home staging: antes y después de un salón",
    platforms: ["tiktok", "instagram_reels"],
    status: "pending_record",
    pillarId: "home_staging",
    isReel: true,
    isStory: false,
    publishDate: madrid("2026-07-05", "19:00"),
    assignedAgentId: null,
    recordingEventId: null,
    createdBy: "system-seed",
  },
  // ── Otros estados para poblar el calendario ─────────────────────
  {
    title: "Newsletter LIVING · edición de julio",
    platforms: ["newsletter"],
    status: "draft",
    pillarId: null,
    isReel: false,
    isStory: false,
    publishDate: madrid("2026-07-08", "09:00"),
    assignedAgentId: null,
    recordingEventId: null,
    createdBy: "system-seed",
  },
  {
    title: "Obra nueva: recorrido por Sagunto Fusión 1",
    platforms: ["instagram_reels", "facebook_reels"],
    status: "scheduled",
    pillarId: "obra_nueva",
    isReel: true,
    isStory: false,
    publishDate: madrid("2026-07-10", "18:00"),
    assignedAgentId: null,
    recordingEventId: null,
    createdBy: "system-seed",
  },
  {
    title: "Ficha de propiedad destacada de la semana",
    platforms: ["google_business"],
    status: "edited",
    pillarId: "viviendas",
    isReel: false,
    isStory: false,
    publishDate: madrid("2026-07-07", "10:00"),
    assignedAgentId: null,
    recordingEventId: null,
    createdBy: "system-seed",
  },
  // ── Ejemplos de stories (cuota 5/semana, lunes a viernes) ────────
  {
    title: "Story: detrás de cámaras en una captación",
    platforms: ["instagram_stories", "facebook_stories"],
    status: "scheduled",
    pillarId: null,
    isReel: false,
    isStory: true,
    publishDate: madrid("2026-07-07", "12:00"),
    assignedAgentId: null,
    recordingEventId: null,
    createdBy: "system-seed",
  },
  {
    title: "Story: encuesta rápida sobre el barrio",
    platforms: ["instagram_stories", "tiktok"],
    status: "draft",
    pillarId: "barrio",
    isReel: false,
    isStory: true,
    publishDate: madrid("2026-07-08", "12:00"),
    assignedAgentId: null,
    recordingEventId: null,
    createdBy: "system-seed",
  },
];

async function run() {
  const batch = adminDb.batch();
  const now = Timestamp.now();

  for (const item of items) {
    const ref = adminDb.collection("content_calendar").doc();
    batch.set(ref, { ...item, createdAt: now, updatedAt: now });
  }

  await batch.commit();
  console.log(`Seeded ${items.length} content items.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
