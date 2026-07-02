/**
 * Firebase Admin SDK — server-side only (API routes, server components).
 * Requires FIREBASE_SERVICE_ACCOUNT env var: the service-account JSON
 * stringified in a single line.
 */

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function getServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error("Missing FIREBASE_SERVICE_ACCOUNT environment variable");
  }
  return JSON.parse(raw);
}

const adminApp =
  getApps()[0] ?? initializeApp({ credential: cert(getServiceAccount()) });

export const adminDb = getFirestore(adminApp);
export const adminAuth = getAuth(adminApp);
