"use client";

/**
 * Real-time subscription to content_calendar bounded to a visible date range.
 * Returns items grouped by day key (YYYY-MM-DD in Europe/Madrid) for fast
 * cell rendering, plus a flat list.
 */

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
import type { ContentItem, Platform } from "@/lib/types";

const TZ = "Europe/Madrid";

/** YYYY-MM-DD in Madrid time, used as the day-bucket key. */
export function dayKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function useContentCalendar(
  rangeStart: Date,
  rangeEnd: Date,
  platformFilter: Platform[] | null
) {
  const [items, setItems] = useState<ContentItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, "content_calendar"),
      where("publishDate", ">=", Timestamp.fromDate(rangeStart)),
      where("publishDate", "<", Timestamp.fromDate(rangeEnd)),
      orderBy("publishDate", "asc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setError(null);
        setItems(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ContentItem)
        );
      },
      (err) => {
        console.error("Calendar query error:", err);
        setError("No se ha podido cargar el calendario.");
      }
    );
    return unsubscribe;
  }, [rangeStart.getTime(), rangeEnd.getTime()]);

  const filtered = useMemo(() => {
    if (!items) return null;
    if (!platformFilter || platformFilter.length === 0) return items;
    const set = new Set(platformFilter);
    return items.filter((it) => it.platforms.some((p) => set.has(p)));
  }, [items, platformFilter]);

  const byDay = useMemo(() => {
    const map = new Map<string, ContentItem[]>();
    for (const it of filtered ?? []) {
      const key = dayKey(it.publishDate.toDate());
      const arr = map.get(key);
      if (arr) arr.push(it);
      else map.set(key, [it]);
    }
    return map;
  }, [filtered]);

  return { items: filtered, byDay, error, loading: items === null };
}
