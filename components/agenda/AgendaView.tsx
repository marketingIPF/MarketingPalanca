"use client";

/**
 * Agent recording schedule — booking view.
 * Shows the next 14 days grouped by day, each event listing the agent,
 * time, type, location, and linked content items.
 */

import { useMemo, useState } from "react";
import { useRecordingSchedule } from "@/hooks/useRecordingSchedule";
import type { RecordingEvent } from "@/lib/types";
import { EVENT_TYPE_LABELS } from "@/lib/labels";
import RecordingEventForm from "./RecordingEventForm";

const TZ = "Europe/Madrid";
const RANGE_DAYS = 14;

interface Props {
  /** Superusers can create/edit events; agents get a read-only view. */
  isSuperuser: boolean;
  currentUserUid: string;
}

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

function madridMidnightUtc(c: { y: number; m: number; d: number }): Date {
  const guess = Date.UTC(c.y, c.m, c.d);
  const offset =
    guess -
    new Date(new Date(guess).toLocaleString("en-US", { timeZone: TZ })).getTime();
  return new Date(guess - offset);
}

const dayHeaderFmt = new Intl.DateTimeFormat("es-ES", {
  timeZone: TZ,
  weekday: "long",
  day: "numeric",
  month: "long",
});
const timeFmt = new Intl.DateTimeFormat("es-ES", {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
});

export default function AgendaView({ isSuperuser, currentUserUid }: Props) {
  const today = useMemo(() => civilToday(), []);
  const rangeStart = useMemo(() => madridMidnightUtc(today), [today]);
  const rangeEnd = useMemo(
    () => madridMidnightUtc(addDays(today, RANGE_DAYS)),
    [today]
  );

  const { byDay, error, loading } = useRecordingSchedule(rangeStart, rangeEnd);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<RecordingEvent | null>(null);

  const days = useMemo(
    () => Array.from({ length: RANGE_DAYS }, (_, i) => addDays(today, i)),
    [today]
  );

  function dayKey(c: { y: number; m: number; d: number }) {
    return `${c.y}-${String(c.m + 1).padStart(2, "0")}-${String(c.d).padStart(2, "0")}`;
  }

  function openEdit(ev: RecordingEvent) {
    if (!isSuperuser) return;
    setEditing(ev);
    setShowForm(true);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-orange-600">Grabaciones</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
            Agenda de agentes
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Próximos {RANGE_DAYS} días · quién graba, dónde y qué.
          </p>
        </div>
        {isSuperuser && (
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-gray-800 hover:shadow-md"
          >
            + Nueva grabación
          </button>
        )}
      </header>

      {error && (
        <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {showForm && (
        <div className="mb-6">
          <RecordingEventForm
            currentUserUid={currentUserUid}
            event={editing ?? undefined}
            onSaved={() => {
              setShowForm(false);
              setEditing(null);
            }}
            onCancel={() => {
              setShowForm(false);
              setEditing(null);
            }}
          />
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {days.map((c) => {
            const key = dayKey(c);
            const events = byDay.get(key) ?? [];
            if (events.length === 0) return null;

            const isToday = key === dayKey(today);
            const label = dayHeaderFmt.format(madridMidnightUtc(c));

            return (
              <section key={key}>
                <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold capitalize text-gray-900">
                  {label}
                  {isToday && (
                    <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                      Hoy
                    </span>
                  )}
                </h2>
                <div className="space-y-2">
                  {events.map((ev) => (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => openEdit(ev)}
                      disabled={!isSuperuser}
                      className={`w-full rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-sm transition-all duration-200 ${
                        isSuperuser ? "hover:-translate-y-0.5 hover:shadow-md" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900">
                            {ev.agentName}
                          </p>
                          <p className="mt-0.5 text-sm text-gray-500">
                            {EVENT_TYPE_LABELS[ev.type]}
                            <span className="mx-1.5 text-gray-300">·</span>
                            {ev.location}
                          </p>
                          {ev.contentTitles.length > 0 && (
                            <ul className="mt-2 space-y-0.5">
                              {ev.contentTitles.map((title, i) => (
                                <li
                                  key={i}
                                  className="truncate text-xs text-gray-400"
                                >
                                  • {title}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <span className="shrink-0 rounded-lg bg-gray-50 px-2.5 py-1 text-sm font-medium tabular-nums text-gray-700">
                          {timeFmt.format(ev.startAt.toDate())}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            );
          })}

          {[...byDay.values()].flat().length === 0 && (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center">
              <p className="text-3xl">📅</p>
              <h2 className="mt-3 text-lg font-semibold text-gray-900">
                No hay grabaciones programadas
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {isSuperuser
                  ? "Crea la primera grabación para los próximos 14 días."
                  : "Vuelve a consultar más tarde."}
              </p>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
