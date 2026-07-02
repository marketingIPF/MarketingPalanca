/**
 * Seed script for recording_schedule.
 * Links real agents (from scripts/seed-users.ts) to the pending-record
 * content items created by scripts/seed-calendar.ts.
 *
 * Run AFTER seed-users.ts and seed-calendar.ts, with Node 22:
 *   FIREBASE_SERVICE_ACCOUNT='...' npx tsx scripts/seed-recording-schedule.ts
 */

import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import type { ContentItem, RecordingEvent } from "@/lib/types";

const adminDb = getAdminDb();

const TZ = "Europe/Madrid";

function madrid(dateISO: string, time: string): Timestamp {
  const [Y, M, D] = dateISO.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  const guess = Date.UTC(Y, M - 1, D, h, min);
  const offset =
    guess -
    new Date(new Date(guess).toLocaleString("en-US", { timeZone: TZ })).getTime();
  return Timestamp.fromDate(new Date(guess + offset));
}

/** Agents to feature, matching uids from scripts/seed-users.ts. */
const CASTING: Record<
  string,
  { uid: string; name: string; date: string; time: string; type: RecordingEvent["type"]; location: string }
> = {
  casosReales: {
    uid: "687574956",
    name: "Desiree López Martinez",
    date: "2026-07-03",
    time: "17:00",
    type: "client_visit",
    location: "Vivienda del cliente, Av. del Puerto",
  },
  barrio: {
    uid: "689033887",
    name: "Alejandro Garcia",
    date: "2026-07-04",
    time: "11:00",
    type: "event",
    location: "Centro histórico de Valencia",
  },
  homeStaging: {
    uid: "686536270",
    name: "Amparo Orts Soriano",
    date: "2026-07-05",
    time: "18:00",
    type: "listing_acquisition",
    location: "Piso en reforma, Ruzafa",
  },
};

async function findContentByTitleFragment(fragment: string): Promise<ContentItem | null> {
  const snap = await adminDb
    .collection("content_calendar")
    .where("status", "==", "pending_record")
    .get();
  const match = snap.docs.find((d) => d.data().title?.includes(fragment));
  return match ? ({ id: match.id, ...match.data() } as ContentItem) : null;
}

async function run() {
  const [casoReal, barrio, staging] = await Promise.all([
    findContentByTitleFragment("Caso real"),
    findContentByTitleFragment("Barrio"),
    findContentByTitleFragment("Home staging"),
  ]);

  const now = Timestamp.now();
  const batch = adminDb.batch();

  const plan = [
    { casting: CASTING.casosReales, content: casoReal },
    { casting: CASTING.barrio, content: barrio },
    { casting: CASTING.homeStaging, content: staging },
  ];

  for (const { casting, content } of plan) {
    if (!content) {
      console.warn("Content not found for casting:", casting.name);
      continue;
    }
    const eventRef = adminDb.collection("recording_schedule").doc();
    const event: Omit<RecordingEvent, "id"> = {
      agentId: casting.uid,
      agentName: casting.name,
      type: casting.type,
      startAt: madrid(casting.date, casting.time),
      location: casting.location,
      contentItemIds: [content.id],
      contentTitles: [content.title],
      createdBy: "admin-rober",
      createdAt: now,
      updatedAt: now,
    };
    batch.set(eventRef, event);
    // Back-link the content item to this event
    batch.update(adminDb.collection("content_calendar").doc(content.id), {
      recordingEventId: eventRef.id,
      assignedAgentId: casting.uid,
      updatedAt: now,
    });
  }

  await batch.commit();
  console.log(`Seeded ${plan.filter((p) => p.content).length} recording events.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
