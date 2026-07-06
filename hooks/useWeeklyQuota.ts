"use client";

/**
 * Weekly content-quota tracker.
 * - Reels: 3/week, ideally spread across distinct pillars.
 * - Stories: 5/week, one per weekday (Monday–Friday), Europe/Madrid.
 * Both are derived from a single content_calendar listener for the
 * selected week to avoid duplicate reads.
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
import type { ContentItem, PillarId } from "@/lib/types";

const TZ = "Europe/Madrid";
const REEL_TARGET = 3;
const STORY_TARGET = 5;

interface Civil {
  y: number;
  m: number;
  d: number;
}

function civilToday(): Civil {
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .split("-")
    .map(Number);
  return { y, m: m - 1, d };
}

function dateToCivil(date: Date): Civil {
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(date)
    .split("-")
    .map(Number);
  return { y, m: m - 1, d };
}

function addDays(c: Civil, n: number): Civil {
  const dt = new Date(Date.UTC(c.y, c.m, c.d + n));
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth(), d: dt.getUTCDate() };
}

function mondayIndex(c: Civil): number {
  const js = new Date(Date.UTC(c.y, c.m, c.d)).getUTCDay();
  return (js + 6) % 7;
}

function madridMidnightUtc(c: Civil): Date {
  const guess = Date.UTC(c.y, c.m, c.d);
  const offset =
    guess -
    new Date(new Date(guess).toLocaleString("en-US", { timeZone: TZ })).getTime();
  return new Date(guess - offset);
}

function civilKey(c: Civil): string {
  return `${c.y}-${String(c.m + 1).padStart(2, "0")}-${String(c.d).padStart(2, "0")}`;
}

export interface ReelQuota {
  target: number;
  count: number;
  byPillar: Map<PillarId, ContentItem[]>;
  distinctPillars: number;
  meetsCount: boolean;
  /** true when 3+ reels are spread over 3+ distinct pillars */
  wellDistributed: boolean;
}

export interface StoryQuota {
  target: number;
  /** Index 0 = Monday … 4 = Friday */
  byWeekday: ContentItem[][];
  coveredDays: number;
  totalCount: number;
  meetsQuota: boolean;
}

export interface WeeklyQuota {
  weekStart: Civil;
  weekEnd: Civil;
  loading: boolean;
  error: string | null;
  reels: ReelQuota;
  stories: StoryQuota;
}

export function useWeeklyQuota(anchor: Civil = civilToday()): WeeklyQuota {
  const weekStart = useMemo(
    () => addDays(anchor, -mondayIndex(anchor)),
    [anchor.y, anchor.m, anchor.d]
  );
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);
  const rangeStart = useMemo(() => madridMidnightUtc(weekStart), [weekStart]);
  const rangeEnd = useMemo(
    () => madridMidnightUtc(addDays(weekStart, 7)),
    [weekStart]
  );

  const [items, setItems] = useState<ContentItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let retried = false;
    let unsub: (() => void) | undefined;

    function subscribe() {
      const q = query(
        collection(db, "content_calendar"),
        where("publishDate", ">=", Timestamp.fromDate(rangeStart)),
        where("publishDate", "<", Timestamp.fromDate(rangeEnd)),
        orderBy("publishDate", "asc")
      );
      unsub = onSnapshot(
        q,
        (snap) => {
          if (cancelled) return;
          setError(null);
          setItems(
            snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ContentItem)
          );
        },
        (err) => {
          console.error("Weekly quota query error:", err);
          if (!retried) {
            retried = true;
            setTimeout(() => {
              if (!cancelled) subscribe();
            }, 1200);
          } else if (!cancelled) {
            setError("No se ha podido cargar el recuento semanal.");
          }
        }
      );
    }
    subscribe();
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [rangeStart.getTime(), rangeEnd.getTime()]);

  return useMemo(() => {
    const reelItems = (items ?? []).filter((it) => it.isReel);
    const byPillar = new Map<PillarId, ContentItem[]>();
    for (const r of reelItems) {
      if (!r.pillarId) continue;
      const arr = byPillar.get(r.pillarId);
      if (arr) arr.push(r);
      else byPillar.set(r.pillarId, [r]);
    }
    const distinctPillars = byPillar.size;

    const reels: ReelQuota = {
      target: REEL_TARGET,
      count: reelItems.length,
      byPillar,
      distinctPillars,
      meetsCount: reelItems.length >= REEL_TARGET,
      wellDistributed:
        reelItems.length >= REEL_TARGET && distinctPillars >= REEL_TARGET,
    };

    // Stories: one slot per weekday, Monday(0)..Friday(4). Weekend items
    // (if any get flagged isStory) simply don't fill a slot.
    const weekdayKeys = Array.from({ length: 5 }, (_, i) =>
      civilKey(addDays(weekStart, i))
    );
    const byWeekday: ContentItem[][] = weekdayKeys.map(() => []);
    let totalCount = 0;
    for (const it of items ?? []) {
      if (!it.isStory) continue;
      const key = civilKey(dateToCivil(it.publishDate.toDate()));
      const idx = weekdayKeys.indexOf(key);
      if (idx >= 0) {
        byWeekday[idx].push(it);
        totalCount++;
      }
    }
    const coveredDays = byWeekday.filter((d) => d.length > 0).length;

    const stories: StoryQuota = {
      target: STORY_TARGET,
      byWeekday,
      coveredDays,
      totalCount,
      meetsQuota: coveredDays >= STORY_TARGET,
    };

    return { weekStart, weekEnd, loading: items === null, error, reels, stories };
  }, [items, weekStart, weekEnd, error]);
}
