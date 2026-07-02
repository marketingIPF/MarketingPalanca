/**
 * Seed script for the `users` collection.
 *
 * Roster reused from the "La Liga" app (RK Palanca Fontestad).
 * Role mapping for this marketing app:
 *   La Liga "Codirector"       → "superuser"
 *   La Liga "Agente Comercial" → "agent"
 * Pedro (videographer) is added here because he isn't part of La Liga.
 *
 * Run once with the Admin SDK (Node 22):
 *   FIREBASE_SERVICE_ACCOUNT='...' npx tsx scripts/seed-users.ts
 *
 * NOTE: this only writes Firestore profile docs. Firebase Auth accounts
 * are managed separately (they already exist for La Liga users; create
 * Pedro's Auth account with the same uid used below).
 */

import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import type { UserProfile, UserRole } from "@/lib/types";

interface RosterEntry {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  title: string;
}

const roster: RosterEntry[] = [
  // ── Super usuarios (admins / editores) ──────────────────────────
  { uid: "pedro", name: "Pedro", email: "pedro@inmobiliariapalanca.com", role: "superuser", title: "Grabación y edición de contenido" },
  { uid: "admin-rober", name: "Roberto", email: "marketing@inmobiliariapalanca.com", role: "superuser", title: "Responsable de marketing" },
  { uid: "admin-almudena", name: "Almudena Gálvez", email: "agalvez@inmobiliariapalanca.com", role: "superuser", title: "Coordinadora" },
  { uid: "686387378", name: "Jose Miguel Palanca", email: "jose@inmobiliariapalanca.com", role: "superuser", title: "Codirector" },
  { uid: "686536261", name: "Javier Palanca", email: "javi@inmobiliariapalanca.com", role: "superuser", title: "Codirector" },

  // ── Agentes comerciales ─────────────────────────────────────────
  { uid: "689033887", name: "Alejandro Garcia", email: "agarcia@inmobiliariapalanca.com", role: "agent", title: "Agente comercial" },
  { uid: "686536270", name: "Amparo Orts Soriano", email: "aorts@inmobiliariapalanca.com", role: "agent", title: "Agente comercial" },
  { uid: "686536262", name: "Asunción Marco Aparisi", email: "asun@inmobiliariapalanca.com", role: "agent", title: "Agente comercial" },
  { uid: "686536303", name: "Clara Ordoñez Rubiols", email: "clara@inmobiliariapalanca.com", role: "agent", title: "Agente comercial" },
  { uid: "689563574", name: "Claudia Stelling", email: "claudia@inmobiliariapalanca.com", role: "agent", title: "Agente comercial" },
  { uid: "687574956", name: "Desiree López Martinez", email: "desiree@inmobiliariapalanca.com", role: "agent", title: "Agente comercial" },
  { uid: "688849218", name: "Eva Vallés", email: "eva@inmobiliariapalanca.com", role: "agent", title: "Agente comercial" },
  { uid: "686536265", name: "Fede Carbonell", email: "fede@inmobiliariapalanca.com", role: "agent", title: "Agente comercial" },
  { uid: "689593800", name: "Fran Estelles", email: "fran@inmobiliariapalanca.com", role: "agent", title: "Agente comercial" },
  { uid: "687702039", name: "Jose Gimenez", email: "josegimenez@inmobiliariapalanca.com", role: "agent", title: "Agente comercial" },
  { uid: "689181578", name: "Lorena Lull", email: "lorena@inmobiliariapalanca.com", role: "agent", title: "Agente comercial" },
  { uid: "686536266", name: "Mª Luisa Bellver", email: "mluisa@inmobiliariapalanca.com", role: "agent", title: "Agente comercial" },
  { uid: "691027263", name: "Maria Jose Ordoñez", email: "mariajose@inmobiliariapalanca.com", role: "agent", title: "Agente comercial" },
  { uid: "692352245", name: "Mariano Del Prado", email: "mariano@inmobiliariapalanca.com", role: "agent", title: "Agente comercial" },
  { uid: "686536275", name: "Mavi Castillo Esteban", email: "mavi@inmobiliariapalanca.com", role: "agent", title: "Agente comercial" },
  { uid: "690617934", name: "Natalia Sanfelix", email: "natalia@inmobiliariapalanca.com", role: "agent", title: "Agente comercial" },
  { uid: "692352252", name: "Nuria Nuñez", email: "nuria@inmobiliariapalanca.com", role: "agent", title: "Agente comercial" },
  { uid: "686536274", name: "Rosa Domenech", email: "rdomenech@inmobiliariapalanca.com", role: "agent", title: "Agente comercial" },
  { uid: "686756864", name: "Sefa Gallent Bestuer", email: "sefa@inmobiliariapalanca.com", role: "agent", title: "Agente comercial" },
  { uid: "686536268", name: "Virginia Corral", email: "vcorral@inmobiliariapalanca.com", role: "agent", title: "Agente comercial" },
  { uid: "692352236", name: "Yvonne Vidal", email: "yvidal@inmobiliariapalanca.com", role: "agent", title: "Agente comercial" },
];

async function run() {
  const batch = adminDb.batch();
  const now = Timestamp.now();

  for (const r of roster) {
    const profile: Omit<UserProfile, "uid"> & { uid: string } = {
      uid: r.uid,
      displayName: r.name,
      email: r.email,
      photoURL: null,
      role: r.role,
      title: r.title,
      stats: { videosRecordedThisMonth: 0, pendingTasksThisWeek: 0 },
      active: true,
      createdAt: now,
      updatedAt: now,
    };
    // merge:true so re-running never clobbers stats that already exist
    batch.set(adminDb.collection("users").doc(r.uid), profile, { merge: true });
  }

  await batch.commit();
  const supers = roster.filter((r) => r.role === "superuser").length;
  console.log(
    `Seeded ${roster.length} users (${supers} superusers, ${roster.length - supers} agents).`
  );
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
