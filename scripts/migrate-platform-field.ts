/**
 * One-off migration: converts old ContentItem docs that still have a
 * singular `platform` field into the new `platforms: Platform[]` array.
 * Safe to run multiple times — skips docs that already have `platforms`.
 *
 * Run with Node 22 from Codespaces:
 *   npm run migrate:platform
 */

import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";

const adminDb = getAdminDb();

async function run() {
  const snap = await adminDb.collection("content_calendar").get();

  const batch = adminDb.batch();
  let migrated = 0;
  let skipped = 0;

  for (const doc of snap.docs) {
    const data = doc.data();

    if (Array.isArray(data.platforms)) {
      skipped++;
      continue;
    }
    if (typeof data.platform !== "string") {
      console.warn(`Doc ${doc.id} tiene ni 'platform' ni 'platforms' — se omite.`);
      continue;
    }

    batch.update(doc.ref, {
      platforms: [data.platform],
      platform: FieldValue.delete(),
    });
    migrated++;
  }

  if (migrated > 0) await batch.commit();
  console.log(`Migrados: ${migrated}. Ya estaban al día: ${skipped}.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
