/**
 * Seed script for BOTH Firebase Auth accounts and the `users` Firestore
 * collection. This is a NEW Firebase project (marketinghub-…), so unlike
 * "La Liga" no accounts exist here yet — this script creates them.
 *
 * Idempotent: re-running it updates existing accounts/profiles instead of
 * failing or duplicating them.
 *
 * Initial password = the person's phone number (same convention as
 * "La Liga"). Superusers without a real phone on file get a placeholder
 * password they should change on first login.
 *
 * Run with Node 22 from Codespaces:
 *   FIREBASE_SERVICE_ACCOUNT='...' npx tsx scripts/seed-users.ts
 */

import { Timestamp } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import type { UserProfile, UserRole } from "@/lib/types";

const adminAuth = getAdminAuth();
const adminDb = getAdminDb();

interface RosterEntry {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  title: string;
  /** Initial Auth password — the phone number, or a placeholder to change. */
  initialPassword: string;
}

const roster: RosterEntry[] = [
  // ── Super usuarios (admins / editores) ──────────────────────────
  { uid: "pedro", name: "Pedro", email: "facturacion@inmobiliariapalanca.com", role: "superuser", title: "Grabación y edición de contenido", initialPassword: "CambiarPassword2026" },
  { uid: "admin-rober", name: "Roberto", email: "marketing@inmobiliariapalanca.com", role: "superuser", title: "Responsable de marketing", initialPassword: "CambiarPassword2026" },
  { uid: "admin-almudena", name: "Almudena Gálvez", email: "agalvez@inmobiliariapalanca.com", role: "superuser", title: "Coordinadora", initialPassword: "CambiarPassword2026" },
  { uid: "686387378", name: "Jose Miguel Palanca", email: "jose@inmobiliariapalanca.com", role: "superuser", title: "Codirector", initialPassword: "696460043" },
  { uid: "686536261", name: "Javier Palanca", email: "javi@inmobiliariapalanca.com", role: "superuser", title: "Codirector", initialPassword: "649258584" },

  // ── Agentes comerciales ─────────────────────────────────────────
  { uid: "689033887", name: "Alejandro Garcia", email: "agarcia@inmobiliariapalanca.com", role: "agent", title: "Agente comercial", initialPassword: "674054152" },
  { uid: "686536270", name: "Amparo Orts Soriano", email: "aorts@inmobiliariapalanca.com", role: "agent", title: "Agente comercial", initialPassword: "663323259" },
  { uid: "686536262", name: "Asunción Marco Aparisi", email: "asun@inmobiliariapalanca.com", role: "agent", title: "Agente comercial", initialPassword: "618644856" },
  { uid: "686536303", name: "Clara Ordoñez Rubiols", email: "clara@inmobiliariapalanca.com", role: "agent", title: "Agente comercial", initialPassword: "697633537" },
  { uid: "689563574", name: "Claudia Stelling", email: "claudia@inmobiliariapalanca.com", role: "agent", title: "Agente comercial", initialPassword: "677909467" },
  { uid: "687574956", name: "Desiree López Martinez", email: "desiree@inmobiliariapalanca.com", role: "agent", title: "Agente comercial", initialPassword: "611575351" },
  { uid: "688849218", name: "Eva Vallés", email: "eva@inmobiliariapalanca.com", role: "agent", title: "Agente comercial", initialPassword: "637568603" },
  { uid: "686536265", name: "Fede Carbonell", email: "fede@inmobiliariapalanca.com", role: "agent", title: "Agente comercial", initialPassword: "655299844" },
  { uid: "689593800", name: "Fran Estelles", email: "fran@inmobiliariapalanca.com", role: "agent", title: "Agente comercial", initialPassword: "670996263" },
  { uid: "687702039", name: "Jose Gimenez", email: "josegimenez@inmobiliariapalanca.com", role: "agent", title: "Agente comercial", initialPassword: "663716921" },
  { uid: "689181578", name: "Lorena Lull", email: "lorena@inmobiliariapalanca.com", role: "agent", title: "Agente comercial", initialPassword: "644505020" },
  { uid: "686536266", name: "Mª Luisa Bellver", email: "mluisa@inmobiliariapalanca.com", role: "agent", title: "Agente comercial", initialPassword: "607067815" },
  { uid: "691027263", name: "Maria Jose Ordoñez", email: "mariajose@inmobiliariapalanca.com", role: "agent", title: "Agente comercial", initialPassword: "653840768" },
  { uid: "692352245", name: "Mariano Del Prado", email: "mariano@inmobiliariapalanca.com", role: "agent", title: "Agente comercial", initialPassword: "675992234" },
  { uid: "686536275", name: "Mavi Castillo Esteban", email: "mavi@inmobiliariapalanca.com", role: "agent", title: "Agente comercial", initialPassword: "622780656" },
  { uid: "690617934", name: "Natalia Sanfelix", email: "natalia@inmobiliariapalanca.com", role: "agent", title: "Agente comercial", initialPassword: "673647013" },
  { uid: "692352252", name: "Nuria Nuñez", email: "nuria@inmobiliariapalanca.com", role: "agent", title: "Agente comercial", initialPassword: "675992224" },
  { uid: "686536274", name: "Rosa Domenech", email: "rdomenech@inmobiliariapalanca.com", role: "agent", title: "Agente comercial", initialPassword: "621206772" },
  { uid: "686756864", name: "Sefa Gallent Bestuer", email: "sefa@inmobiliariapalanca.com", role: "agent", title: "Agente comercial", initialPassword: "697188343" },
  { uid: "686536268", name: "Virginia Corral", email: "vcorral@inmobiliariapalanca.com", role: "agent", title: "Agente comercial", initialPassword: "675984757" },
  { uid: "692352236", name: "Yvonne Vidal", email: "yvidal@inmobiliariapalanca.com", role: "agent", title: "Agente comercial", initialPassword: "675992778" },
];

async function ensureAuthUser(r: RosterEntry): Promise<void> {
  try {
    await adminAuth.getUser(r.uid);
    // Already exists — keep email/password/displayName in sync.
    await adminAuth.updateUser(r.uid, {
      email: r.email,
      displayName: r.name,
    });
  } catch (err: any) {
    if (err?.code === "auth/user-not-found") {
      await adminAuth.createUser({
        uid: r.uid,
        email: r.email,
        password: r.initialPassword,
        displayName: r.name,
      });
    } else {
      throw err;
    }
  }
}

async function run() {
  const now = Timestamp.now();

  // Auth accounts must be created one by one (no batch API for Auth).
  for (const r of roster) {
    await ensureAuthUser(r);
  }
  console.log(`Auth: ${roster.length} cuentas creadas/actualizadas.`);

  // Firestore profiles can go in a single batch. First check which docs
  // already have `mustChangePassword` set, so re-running this script never
  // resets the flag for someone who already changed their password.
  const batch = adminDb.batch();
  for (const r of roster) {
    const ref = adminDb.collection("users").doc(r.uid);
    const existing = await ref.get();
    const alreadyTracksFlag =
      existing.exists && typeof existing.data()?.mustChangePassword === "boolean";

    const profile: UserProfile = {
      uid: r.uid,
      displayName: r.name,
      email: r.email,
      photoURL: null,
      role: r.role,
      title: r.title,
      stats: { videosRecordedThisMonth: 0, pendingTasksThisWeek: 0 },
      active: true,
      ...(alreadyTracksFlag ? {} : { mustChangePassword: true }),
      createdAt: now,
      updatedAt: now,
    };
    // merge:true so re-running never clobbers stats that already exist
    batch.set(ref, profile, { merge: true });
  }
  await batch.commit();

  const supers = roster.filter((r) => r.role === "superuser").length;
  console.log(
    `Firestore: ${roster.length} perfiles (${supers} superusuarios, ${roster.length - supers} agentes).`
  );
  console.log(
    "\nContraseña inicial = su teléfono (los admins sin teléfono real usan 'CambiarPassword2026')."
  );
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
