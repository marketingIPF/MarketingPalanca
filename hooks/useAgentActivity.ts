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
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [contentError, setContentError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;

    let cancelled = false;
    let eventsRetried = false;
    let contentRetried = false;
    let unsubEvents: (() => void) | undefined;
    let unsubContent: (() => void) | undefined;

    function subscribeEvents() {
      const eventsQ = query(
        collection(db, "recording_schedule"),
        where("agentId", "==", uid),
        where("startAt", ">=", Timestamp.now()),
        orderBy("startAt", "asc"),
        limit(5)
      );
      unsubEvents = onSnapshot(
        eventsQ,
        (snap) => {
          if (cancelled) return;
          setEventsError(null);
          setUpcomingEvents(
            snap.docs.map((d) => ({ id: d.id, ...d.data() }) as RecordingEvent)
          );
        },
        (err) => {
          console.error("Agent events query error:", err);
          if (!eventsRetried) {
            eventsRetried = true;
            setTimeout(() => {
              if (!cancelled) subscribeEvents();
            }, 1200);
          } else if (!cancelled) {
            setEventsError("No se han podido cargar las próximas grabaciones.");
          }
        }
      );
    }

    function subscribeContent() {
      const contentQ = query(
        collection(db, "content_calendar"),
        where("assignedAgentId", "==", uid),
        where("status", "!=", "published"),
        orderBy("status"),
        orderBy("publishDate", "asc"),
        limit(10)
      );
      unsubContent = onSnapshot(
        contentQ,
        (snap) => {
          if (cancelled) return;
          setContentError(null);
          setAssignedContent(
            snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ContentItem)
          );
        },
        (err) => {
          console.error("Agent content query error:", err);
          if (!contentRetried) {
            contentRetried = true;
            setTimeout(() => {
              if (!cancelled) subscribeContent();
            }, 1200);
          } else if (!cancelled) {
            setContentError("No se han podido cargar los contenidos asignados.");
          }
        }
      );
    }

    subscribeEvents();
    subscribeContent();

    return () => {
      cancelled = true;
      unsubEvents?.();
      unsubContent?.();
    };
  }, [uid]);

  return {
    upcomingEvents,
    assignedContent,
    loading: upcomingEvents === null || assignedContent === null,
    error: eventsError ?? contentError,
  };
}
