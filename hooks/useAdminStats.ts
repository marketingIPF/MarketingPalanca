"use client";

/**
 * Lightweight KPI counters for the admin panel. Each listener is scoped
 * to keep reads cheap: users collection is small (~26 docs), and the two
 * content/schedule listeners are bounded by status / date range.
 */

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const TZ = "Europe/Madrid";

function madridMidnightUtc(daysFromNow: number): Date {
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .split("-")
    .map(Number);
  const guess = Date.UTC(y, m - 1, d + daysFromNow);
  const offset =
    guess -
    new Date(new Date(guess).toLocaleString("en-US", { timeZone: TZ })).getTime();
  return new Date(guess - offset);
}

export function useAdminStats() {
  const [agentCount, setAgentCount] = useState<number | null>(null);
  const [pendingRecordCount, setPendingRecordCount] = useState<number | null>(
    null
  );
  const [weekRecordingCount, setWeekRecordingCount] = useState<number | null>(
    null
  );

  const rangeStart = useMemo(() => madridMidnightUtc(0), []);
  const rangeEnd = useMemo(() => madridMidnightUtc(7), []);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "users"), where("role", "==", "agent")),
      (snap) => setAgentCount(snap.size),
      (err) => console.error("Agent count error:", err)
    );
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(
      query(
        collection(db, "content_calendar"),
        where("status", "==", "pending_record")
      ),
      (snap) => setPendingRecordCount(snap.size),
      (err) => console.error("Pending content count error:", err)
    );
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(
      query(
        collection(db, "recording_schedule"),
        where("startAt", ">=", Timestamp.fromDate(rangeStart)),
        where("startAt", "<", Timestamp.fromDate(rangeEnd))
      ),
      (snap) => setWeekRecordingCount(snap.size),
      (err) => console.error("Week recording count error:", err)
    );
    return unsub;
  }, [rangeStart, rangeEnd]);

  return {
    agentCount,
    pendingRecordCount,
    weekRecordingCount,
    loading:
      agentCount === null ||
      pendingRecordCount === null ||
      weekRecordingCount === null,
  };
}
