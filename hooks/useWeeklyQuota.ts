"use client";

/**
 * Weekly 3-reels quota tracker.
 * Counts content flagged isReel within the selected ISO week (Mon–Sun,
 * Europe/Madrid), grouped by pillar, and evaluates whether the week meets
 * the quota of 3 reels spread across distinct pillars.
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
const WEEKLY_TARGET = 3;

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
  return new Date(guess + offset);
}

export interface WeeklyQuota {
  target: number;
  reelCount: number;
  /** reels grouped by pillar (only pillars with ≥1 reel) */
  byPillar: Map<PillarId, ContentItem[]>;
  distinctPillars: number;
  /** true when reelCount ≥ target */
  meetsCount: boolean;
  /** true when the 3+ reels are spread over ≥3 distinct pillars */
  wellDistributed: boolean;
  weekStart: Civil;
  weekEnd: Civil; // inclusive Sunday
  loading: boolean;
  error: string | null;
}

export function useWeeklyQuota(anchor: Civil = civilToday()): WeeklyQuota {
  const weekStart = useMemo(() => addDays(anchor, -mondayIndex(anchor)), [
    anchor.y,
    anchor.m,
    anchor.d,
  ]);
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);

  const rangeStart = useMemo(() => madridMidnightUtc(weekStart), [weekStart]);
  const rangeEnd = useMemo(() => madridMidnightUtc(addDays(weekStart, 7)), [
    weekStart,
  ]);

  const [items, setItems] = useState<ContentItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, "content_calendar"),
      where("publishDate", ">=", Timestamp.fromDate(rangeStart)),
      where("publishDate", "<", Timestamp.fromDate(rangeEnd)),
      orderBy("publishDate", "asc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setError(null);
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ContentItem));
      },
      (err) => {
        console.error("Weekly quota query error:", err);
        setError("No se ha podido cargar el recuento semanal.");
      }
    );
    return unsub;
  }, [rangeStart.getTime(), rangeEnd.getTime()]);

  return useMemo(() => {
    const reels = (items ?? []).filter((it) => it.isReel);
    const byPillar = new Map<PillarId, ContentItem[]>();
    for (const r of reels) {
      if (!r.pillarId) continue;
      const arr = byPillar.get(r.pillarId);
      if (arr) arr.push(r);
      else byPillar.set(r.pillarId, [r]);
    }
    const distinctPillars = byPillar.size;
    return {
      target: WEEKLY_TARGET,
      reelCount: reels.length,
      byPillar,
      distinctPillars,
      meetsCount: reels.length >= WEEKLY_TARGET,
      wellDistributed:
        reels.length >= WEEKLY_TARGET && distinctPillars >= WEEKLY_TARGET,
      weekStart,
      weekEnd,
      loading: items === null,
      error,
    };
  }, [items, weekStart, weekEnd, error]);
}
