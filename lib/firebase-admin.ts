/**
 * Firebase Admin SDK — server-side only (API routes, server components).
 * Requires FIREBASE_SERVICE_ACCOUNT env var: the service-account JSON
 * stringified in a single line.
 *
 * Initialization is LAZY (deferred to first use inside a request handler)
 * so that Next.js's build-time "collecting page data" step never touches
 * process.env before Vercel injects runtime variables — it only throws if
 * something actually calls getAdminDb()/getAdminAuth() without the env var
 * present at request time.
 */

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let cachedApp: App | null = null;

function getAdminApp(): App {
  if (cachedApp) return cachedApp;

  const existing = getApps()[0];
  if (existing) {
    cachedApp = existing;
    return cachedApp;
  }

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error("Missing FIREBASE_SERVICE_ACCOUNT environment variable");
  }

  cachedApp = initializeApp({ credential: cert(JSON.parse(raw)) });
  return cachedApp;
}

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}
