"use client";

/**
 * Visual tracker for the 3-reels-per-week strategy.
 * Shows a progress counter, a distribution check across the 9 pillars,
 * and the reels planned/published for the selected week.
 */

import { useState } from "react";
import { useWeeklyQuota } from "@/hooks/useWeeklyQuota";
import type { PillarId } from "@/lib/types";
import {
  PILLAR_LABELS,
  PLATFORM_SHORT,
  STATUS_LABELS,
  STATUS_STYLES,
} from "@/lib/labels";

const TZ = "Europe/Madrid";
const MONTHS = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

const ALL_PILLARS = Object.keys(PILLAR_LABELS) as PillarId[];

function civilToday() {
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

function addDays(c: { y: number; m: number; d: number }, n: number) {
  const dt = new Date(Date.UTC(c.y, c.m, c.d + n));
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth(), d: dt.getUTCDate() };
}

export default function WeeklyQuotaTracker() {
  const [anchor, setAnchor] = useState(civilToday());
  const quota = useWeeklyQuota(anchor);

  const rangeLabel = `${quota.weekStart.d} ${MONTHS[quota.weekStart.m]} – ${quota.weekEnd.d} ${MONTHS[quota.weekEnd.m]}`;
  const pct = Math.min(100, (quota.reelCount / quota.target) * 100);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-orange-600">Estrategia</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
            3 reels por semana
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Reparte los reels entre los 9 pilares de contenido.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAnchor((a) => addDays(a, -7))}
            aria-label="Semana anterior"
            className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
          >
            ‹
          </button>
          <span className="min-w-[9.5rem] text-center text-sm font-semibold text-gray-900">
            {rangeLabel}
          </span>
          <button
            type="button"
            onClick={() => setAnchor((a) => addDays(a, 7))}
            aria-label="Semana siguiente"
            className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
          >
            ›
          </button>
        </div>
      </header>

      {quota.error && (
        <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {quota.error}
        </div>
      )}

      {/* Counter card */}
      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm text-gray-500">Reels esta semana</p>
            <p className="mt-1 text-4xl font-semibold tracking-tight text-gray-900">
              {quota.reelCount}
              <span className="text-2xl text-gray-300"> / {quota.target}</span>
            </p>
          </div>
          <StatusPill quota={quota} />
        </div>

        {/* Progress dots (one per target unit; extra reels shown as +N) */}
        <div className="mt-5 flex items-center gap-2">
          {Array.from({ length: quota.target }).map((_, i) => (
            <span
              key={i}
              className={`h-2.5 flex-1 rounded-full transition-colors duration-300 ${
                i < quota.reelCount ? "bg-orange-500" : "bg-gray-100"
              }`}
            />
          ))}
          {quota.reelCount > quota.target && (
            <span className="ml-1 text-xs font-medium text-emerald-600">
              +{quota.reelCount - quota.target}
            </span>
          )}
        </div>
        <p className="sr-only">{pct}% de la cuota</p>
      </section>

      {/* Pillar distribution */}
      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">
          Distribución por pilar
        </h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {ALL_PILLARS.map((p) => {
            const reels = quota.byPillar.get(p) ?? [];
            const covered = reels.length > 0;
            return (
              <div
                key={p}
                className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                  covered
                    ? "border-orange-100 bg-orange-50/50"
                    : "border-gray-100 bg-white"
                }`}
              >
                <span
                  className={covered ? "font-medium text-gray-900" : "text-gray-400"}
                >
                  {PILLAR_LABELS[p]}
                </span>
                <span
                  className={`ml-2 inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full px-1.5 text-xs font-semibold ${
                    covered
                      ? "bg-orange-500 text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {reels.length}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* This week's reels */}
      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">
          Reels de la semana
        </h2>
        {quota.loading ? (
          <div className="h-24 animate-pulse rounded-2xl bg-gray-100" />
        ) : quota.reelCount === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
            Aún no hay reels planificados para esta semana. Añádelos desde el
            calendario para llegar a los 3.
          </div>
        ) : (
          <ul className="space-y-2">
            {[...quota.byPillar.values()].flat().map((reel) => (
              <li
                key={reel.id}
                className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {reel.title}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {reel.pillarId ? PILLAR_LABELS[reel.pillarId] : "Sin pilar"}
                    <span className="mx-1.5 text-gray-300">·</span>
                    {reel.platforms.map((p) => PLATFORM_SHORT[p]).join(" + ")}
                  </p>
                </div>
                <span
                  className={`ml-3 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[reel.status]}`}
                >
                  {STATUS_LABELS[reel.status]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function StatusPill({
  quota,
}: {
  quota: ReturnType<typeof useWeeklyQuota>;
}) {
  if (quota.loading) return null;

  if (quota.wellDistributed) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
        ✓ Semana completa
      </span>
    );
  }
  if (quota.meetsCount && !quota.wellDistributed) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700">
        Cuota cumplida · concentrada
      </span>
    );
  }
  const missing = quota.target - quota.reelCount;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-600">
      Faltan {missing} {missing === 1 ? "reel" : "reels"}
    </span>
  );
}
