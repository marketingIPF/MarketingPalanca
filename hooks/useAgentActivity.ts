"use client";

/**
 * Activity feed for a single agent: their next recording events and
 * their assigned content items still in the pipeline.
 */

import { useEffect, useState } from "react";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ContentItem, RecordingEvent } from "@/lib/types";

export function useAgentActivity(uid: string | null) {
  const [upcomingEvents, setUpcomingEvents] = useState<RecordingEvent[] | null>(
    null
  );
  const [assignedContent, setAssignedContent] = useState<ContentItem[] | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;

    const eventsQ = query(
      collection(db, "recording_schedule"),
      where("agentId", "==", uid),
      where("startAt", ">=", Timestamp.now()),
      orderBy("startAt", "asc"),
      limit(5)
    );
    const unsubEvents = onSnapshot(
      eventsQ,
      (snap) =>
        setUpcomingEvents(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as RecordingEvent)
        ),
      (err) => {
        console.error("Agent events query error:", err);
        setError("No se han podido cargar las próximas grabaciones.");
      }
    );

    const contentQ = query(
      collection(db, "content_calendar"),
      where("assignedAgentId", "==", uid),
      where("status", "!=", "published"),
      orderBy("status"),
      orderBy("publishDate", "asc"),
      limit(10)
    );
    const unsubContent = onSnapshot(
      contentQ,
      (snap) =>
        setAssignedContent(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ContentItem)
        ),
      (err) => {
        console.error("Agent content query error:", err);
        setError("No se han podido cargar los contenidos asignados.");
      }
    );

    return () => {
      unsubEvents();
      unsubContent();
    };
  }, [uid]);

  return {
    upcomingEvents,
    assignedContent,
    loading: upcomingEvents === null || assignedContent === null,
    error,
  };
}
