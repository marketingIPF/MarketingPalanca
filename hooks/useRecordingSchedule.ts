"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ContentItem, RecordingEvent } from "@/lib/types";

/** Recording events whose startAt falls within [rangeStart, rangeEnd). */
export function useRecordingSchedule(rangeStart: Date, rangeEnd: Date) {
  const [events, setEvents] = useState<RecordingEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, "recording_schedule"),
      where("startAt", ">=", Timestamp.fromDate(rangeStart)),
      where("startAt", "<", Timestamp.fromDate(rangeEnd)),
      orderBy("startAt", "asc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setError(null);
        setEvents(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as RecordingEvent)
        );
      },
      (err) => {
        console.error("Recording schedule query error:", err);
        setError("No se ha podido cargar la agenda de grabación.");
      }
    );
    return unsub;
  }, [rangeStart.getTime(), rangeEnd.getTime()]);

  const byDay = useMemo(() => {
    const map = new Map<string, RecordingEvent[]>();
    for (const ev of events ?? []) {
      const key = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Madrid",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(ev.startAt.toDate());
      const arr = map.get(key);
      if (arr) arr.push(ev);
      else map.set(key, [ev]);
    }
    return map;
  }, [events]);

  return { events, byDay, loading: events === null, error };
}

/**
 * Content items available to link to a recording event: not yet recorded
 * and not already tied to another event (or tied to `currentEventId` when
 * editing an existing event).
 */
export function useLinkableContent(currentEventId?: string) {
  const [items, setItems] = useState<ContentItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, "content_calendar"),
      where("status", "in", ["draft", "scheduled", "pending_record"]),
      orderBy("publishDate", "asc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setError(null);
        const all = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as ContentItem
        );
        setItems(
          all.filter(
            (it) => !it.recordingEventId || it.recordingEventId === currentEventId
          )
        );
      },
      (err) => {
        console.error("Linkable content query error:", err);
        setError("No se han podido cargar los contenidos disponibles.");
      }
    );
    return unsub;
  }, [currentEventId]);

  return { items, loading: items === null, error };
}
