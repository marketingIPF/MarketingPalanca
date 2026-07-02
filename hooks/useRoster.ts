"use client";

/**
 * Real-time roster fetch — used by pickers (agent selector, assignee selector).
 * Small collection (~26 docs), so no pagination needed.
 */

import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { UserProfile } from "@/lib/types";

export function useRoster(onlyActive = true) {
  const [users, setUsers] = useState<UserProfile[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("displayName", "asc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setError(null);
        const all = snap.docs.map((d) => d.data() as UserProfile);
        setUsers(onlyActive ? all.filter((u) => u.active) : all);
      },
      (err) => {
        console.error("Roster query error:", err);
        setError("No se ha podido cargar el listado de agentes.");
      }
    );
    return unsub;
  }, [onlyActive]);

  return { users, loading: users === null, error };
}
