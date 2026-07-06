"use client";

/**
 * Multi-platform content calendar.
 * - Month view: 6×7 grid, Monday-first (Spanish convention).
 * - Week view: 7 day columns for the selected week.
 * Data is pulled in real time from content_calendar, bounded to the
 * visible range, and filtered by platform.
 */

import { useMemo, useState } from "react";
import { deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import type { ContentItem, Platform } from "@/lib/types";
import { dayKey, useContentCalendar } from "@/hooks/useContentCalendar";
import ContentCard from "./ContentCard";
import PlatformFilter from "./PlatformFilter";
import ContentItemForm from "./ContentItemForm";

const TZ = "Europe/Madrid";
const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

type View = "month" | "week";

/* -------------------- Civil-date helpers (no DST drift) ------------- */

interface Civil {
  y: number;
  m: number; // 0-indexed
  d: number;
}

/** Today as a civil date in Madrid time. */
function civilToday(): Civil {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [y, m, d] = parts.split("-").map(Number);
  return { y, m: m - 1, d };
}

function civilKey({ y, m, d }: Civil): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Monday-first weekday index (0=Mon … 6=Sun) for a civil date. */
function mondayIndex(c: Civil): number {
  const js = new Date(Date.UTC(c.y, c.m, c.d)).getUTCDay(); // 0=Sun
  return (js + 6) % 7;
}

function addDays(c: Civil, n: number): Civil {
  const dt = new Date(Date.UTC(c.y, c.m, c.d + n));
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth(), d: dt.getUTCDate() };
}

/** Madrid-midnight of a civil date, expressed as a UTC Date (for queries). */
function madridMidnightUtc(c: Civil): Date {
  const guess = Date.UTC(c.y, c.m, c.d);
  const offset =
    guess -
    new Date(
      new Date(guess).toLocaleString("en-US", { timeZone: TZ })
    ).getTime();
  return new Date(guess - offset);
}

/* -------------------------------------------------------------------- */

export default function CalendarGrid() {
  const { firebaseUser, profile } = useAuth();
  const isSuperuser = profile?.role === "superuser";

  const [view, setView] = useState<View>("month");
  const [anchor, setAnchor] = useState<Civil>(civilToday());
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [selected, setSelected] = useState<ContentItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ContentItem | null>(null);

  const today = useMemo(() => civilKey(civilToday()), []);

  // Build the list of visible civil days for the current view.
  const days = useMemo<Civil[]>(() => {
    if (view === "week") {
      const monday = addDays(anchor, -mondayIndex(anchor));
      return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
    }
    const firstOfMonth: Civil = { y: anchor.y, m: anchor.m, d: 1 };
    const gridStart = addDays(firstOfMonth, -mondayIndex(firstOfMonth));
    return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  }, [view, anchor]);

  const rangeStart = useMemo(() => madridMidnightUtc(days[0]), [days]);
  const rangeEnd = useMemo(
    () => madridMidnightUtc(addDays(days[days.length - 1], 1)),
    [days]
  );

  const { byDay, error, loading } = useContentCalendar(
    rangeStart,
    rangeEnd,
    platforms.length ? platforms : null
  );

  function shift(dir: -1 | 1) {
    setAnchor((a) =>
      view === "week"
        ? addDays(a, dir * 7)
        : { y: a.y, m: a.m + dir, d: 1 }
    );
  }

  const headingLabel =
    view === "week"
      ? `Semana del ${days[0].d} ${MONTHS[days[0].m]}`
      : `${MONTHS[anchor.m]} ${anchor.y}`;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {/* Header */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-orange-600">Contenido</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
            Calendario multiplataforma
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {isSuperuser && (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setShowForm(true);
              }}
              className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-gray-800 hover:shadow-md"
            >
              + Nuevo contenido
            </button>
          )}
          {/* View toggle */}
          <div className="inline-flex rounded-xl border border-gray-200 bg-white p-0.5 shadow-sm">
            {(["month", "week"] as View[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                  view === v
                    ? "bg-gray-900 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {v === "month" ? "Mes" : "Semana"}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Navigation + filters */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shift(-1)}
            aria-label="Anterior"
            className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
          >
            <Chevron dir="left" />
          </button>
          <h2 className="min-w-[11rem] text-center text-base font-semibold capitalize text-gray-900">
            {headingLabel}
          </h2>
          <button
            type="button"
            onClick={() => shift(1)}
            aria-label="Siguiente"
            className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
          >
            <Chevron dir="right" />
          </button>
          <button
            type="button"
            onClick={() => setAnchor(civilToday())}
            className="ml-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
          >
            Hoy
          </button>
        </div>
      </div>

      <div className="mb-5">
        <PlatformFilter selected={platforms} onChange={setPlatforms} />
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Grid */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        {/* Weekday header */}
        <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/60">
          {WEEKDAYS.map((w) => (
            <div
              key={w}
              className="px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-gray-400"
            >
              {w}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div
          className={`grid grid-cols-7 ${view === "week" ? "min-h-[24rem]" : ""}`}
        >
          {days.map((c) => {
            const key = civilKey(c);
            const inMonth = view === "week" || c.m === anchor.m;
            const isToday = key === today;
            const cellItems = byDay.get(key) ?? [];

            return (
              <div
                key={key}
                className={`min-h-[7rem] border-b border-r border-gray-100 p-1.5 last:border-r-0 ${
                  view === "week" ? "min-h-[24rem]" : ""
                } ${inMonth ? "bg-white" : "bg-gray-50/40"}`}
              >
                <div className="mb-1 flex items-center justify-between px-0.5">
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                      isToday
                        ? "bg-orange-500 text-white"
                        : inMonth
                          ? "text-gray-700"
                          : "text-gray-300"
                    }`}
                  >
                    {c.d}
                  </span>
                  {cellItems.length > 0 && (
                    <span className="text-[10px] font-medium text-gray-400">
                      {cellItems.length}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  {cellItems.map((item) => (
                    <ContentCard
                      key={item.id}
                      item={item}
                      onSelect={setSelected}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {loading && (
          <div className="border-t border-gray-100 px-4 py-3 text-center text-xs text-gray-400">
            Cargando contenidos…
          </div>
        )}
      </div>

      {showForm && firebaseUser && (
        <ContentItemForm
          currentUserUid={firebaseUser.uid}
          item={editing ?? undefined}
          onSaved={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}

      {selected && (
        <ContentDetail
          item={selected}
          isSuperuser={isSuperuser}
          onClose={() => setSelected(null)}
          onEdit={() => {
            setEditing(selected);
            setSelected(null);
            setShowForm(true);
          }}
          onDelete={async () => {
            if (!confirm(`¿Eliminar "${selected.title}"? Esta acción no se puede deshacer.`)) {
              return;
            }
            try {
              await deleteDoc(doc(db, "content_calendar", selected.id));
              setSelected(null);
            } catch (err) {
              console.error("Delete content item error:", err);
              alert("No se ha podido eliminar el contenido.");
            }
          }}
        />
      )}
    </main>
  );
}

/* ------------------------- Detail drawer --------------------------- */

function ContentDetail({
  item,
  isSuperuser,
  onClose,
  onEdit,
  onDelete,
}: {
  item: ContentItem;
  isSuperuser: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const fmt = new Intl.DateTimeFormat("es-ES", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/20 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
        {item.description && (
          <p className="mt-2 text-sm leading-relaxed text-gray-500">
            {item.description}
          </p>
        )}
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-400">Publicación</dt>
            <dd className="font-medium capitalize text-gray-900">
              {fmt.format(item.publishDate.toDate())}
            </dd>
          </div>
        </dl>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-gray-900 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
        >
          Cerrar
        </button>

        {isSuperuser && (
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onEdit}
              className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Editar
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="flex-1 rounded-xl border border-red-100 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              Eliminar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={dir === "left" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"} />
    </svg>
  );
}
