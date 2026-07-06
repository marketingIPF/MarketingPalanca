"use client";

/**
 * Visual tracker for the content strategy quotas:
 * - 3 reels/week, spread across the 9 content pillars.
 * - 5 stories/week, one per weekday (Monday–Friday).
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
const WEEKDAY_LABELS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];

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

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-orange-600">Estrategia</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
            Cuotas de contenido
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            3 reels repartidos por pilar + 5 stories, una por cada día laborable.
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

      {quota.error && quota.loading && (
        <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {quota.error}
        </div>
      )}

      <ReelSection quota={quota} />
      <StorySection quota={quota} />
    </main>
  );
}

/* ------------------------------- Reels ------------------------------ */

function ReelSection({ quota }: { quota: ReturnType<typeof useWeeklyQuota> }) {
  const { reels } = quota;

  return (
    <section className="mb-8">
      <h2 className="mb-3 text-base font-semibold text-gray-900">
        3 reels por semana
      </h2>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm text-gray-500">Reels esta semana</p>
            <p className="mt-1 text-4xl font-semibold tracking-tight text-gray-900">
              {reels.count}
              <span className="text-2xl text-gray-300"> / {reels.target}</span>
            </p>
          </div>
          <ReelStatusPill quota={quota} />
        </div>

        <div className="mt-5 flex items-center gap-2">
          {Array.from({ length: reels.target }).map((_, i) => (
            <span
              key={i}
              className={`h-2.5 flex-1 rounded-full transition-colors duration-300 ${
                i < reels.count ? "bg-orange-500" : "bg-gray-100"
              }`}
            />
          ))}
          {reels.count > reels.target && (
            <span className="ml-1 text-xs font-medium text-emerald-600">
              +{reels.count - reels.target}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {ALL_PILLARS.map((p) => {
          const items = reels.byPillar.get(p) ?? [];
          const covered = items.length > 0;
          return (
            <div
              key={p}
              className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                covered
                  ? "border-orange-100 bg-orange-50/50"
                  : "border-gray-100 bg-white"
              }`}
            >
              <span className={covered ? "font-medium text-gray-900" : "text-gray-400"}>
                {PILLAR_LABELS[p]}
              </span>
              <span
                className={`ml-2 inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full px-1.5 text-xs font-semibold ${
                  covered ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-400"
                }`}
              >
                {items.length}
              </span>
            </div>
          );
        })}
      </div>

      {!quota.loading && reels.count > 0 && (
        <ul className="mt-4 space-y-2">
          {[...reels.byPillar.values()].flat().map((reel) => (
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
  );
}

function ReelStatusPill({ quota }: { quota: ReturnType<typeof useWeeklyQuota> }) {
  if (quota.loading) return null;
  const { reels } = quota;

  if (reels.wellDistributed) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
        ✓ Semana completa
      </span>
    );
  }
  if (reels.meetsCount) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700">
        Cuota cumplida · concentrada
      </span>
    );
  }
  const missing = reels.target - reels.count;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-600">
      Faltan {missing} {missing === 1 ? "reel" : "reels"}
    </span>
  );
}

/* ------------------------------ Stories ------------------------------ */

function StorySection({ quota }: { quota: ReturnType<typeof useWeeklyQuota> }) {
  const { stories, weekStart } = quota;

  return (
    <section>
      <h2 className="mb-3 text-base font-semibold text-gray-900">
        5 stories por semana (lunes a viernes)
      </h2>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm text-gray-500">Días cubiertos</p>
            <p className="mt-1 text-4xl font-semibold tracking-tight text-gray-900">
              {stories.coveredDays}
              <span className="text-2xl text-gray-300"> / {stories.target}</span>
            </p>
          </div>
          <StoryStatusPill quota={quota} />
        </div>

        <div className="mt-5 grid grid-cols-5 gap-2">
          {WEEKDAY_LABELS.map((label, i) => {
            const dayItems = stories.byWeekday[i] ?? [];
            const covered = dayItems.length > 0;
            const dayDate = addDays(weekStart, i);
            return (
              <div
                key={label}
                className={`rounded-xl border px-2 py-3 text-center transition-colors ${
                  covered
                    ? "border-orange-100 bg-orange-50/50"
                    : "border-gray-100 bg-white"
                }`}
              >
                <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                  {label.slice(0, 3)}
                </p>
                <p className="mt-0.5 text-xs text-gray-400">{dayDate.d}</p>
                <p
                  className={`mt-1.5 text-lg ${
                    covered ? "text-orange-500" : "text-gray-300"
                  }`}
                >
                  {covered ? "✓" : "·"}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {!quota.loading && stories.totalCount > 0 && (
        <ul className="mt-4 space-y-2">
          {stories.byWeekday.flatMap((dayItems, i) =>
            dayItems.map((story) => (
              <li
                key={story.id}
                className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {story.title}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {WEEKDAY_LABELS[i]}
                    <span className="mx-1.5 text-gray-300">·</span>
                    {story.platforms.map((p) => PLATFORM_SHORT[p]).join(" + ")}
                  </p>
                </div>
                <span
                  className={`ml-3 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[story.status]}`}
                >
                  {STATUS_LABELS[story.status]}
                </span>
              </li>
            ))
          )}
        </ul>
      )}

      {!quota.loading && stories.totalCount === 0 && (
        <div className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          Aún no hay stories planificadas para esta semana.
        </div>
      )}
    </section>
  );
}

function StoryStatusPill({ quota }: { quota: ReturnType<typeof useWeeklyQuota> }) {
  if (quota.loading) return null;
  const { stories } = quota;

  if (stories.meetsQuota) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
        ✓ Semana completa
      </span>
    );
  }
  const missing = stories.target - stories.coveredDays;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-600">
      Faltan {missing} {missing === 1 ? "día" : "días"}
    </span>
  );
}
