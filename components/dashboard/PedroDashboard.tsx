"use client";

/**
 * Intelligent dashboard for the recording/editing role (Pedro).
 * Prioritization: queries content with status "pending_record" ordered by
 * publishDate ascending — the first item is the URGENT one, the next two
 * are backup alternatives.
 */

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ContentItem } from "@/lib/types";
import {
  PILLAR_LABELS,
  PLATFORM_LABELS,
  STATUS_LABELS,
  STATUS_STYLES,
} from "@/lib/labels";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function daysUntil(date: Date): number {
  const ms = date.getTime() - Date.now();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

function deadlineCopy(date: Date): string {
  const d = daysUntil(date);
  if (d < 0) return `Publicación vencida hace ${Math.abs(d)} día(s)`;
  if (d === 0) return "Se publica hoy";
  if (d === 1) return "Se publica mañana";
  return `Se publica en ${d} días`;
}

const dateFmt = new Intl.DateTimeFormat("es-ES", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

/* ------------------------------------------------------------------ */
/* Subcomponents                                                       */
/* ------------------------------------------------------------------ */

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {children}
    </span>
  );
}

function UrgentCard({ item }: { item: ContentItem }) {
  const publish = item.publishDate.toDate();
  const overdue = daysUntil(publish) <= 0;

  return (
    <article className="relative overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-md transition-shadow duration-300 hover:shadow-lg">
      <div className="absolute inset-x-0 top-0 h-1 bg-orange-500" />
      <div className="p-6 sm:p-8">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Badge className={overdue ? "bg-red-50 text-red-700" : "bg-orange-50 text-orange-700"}>
            {overdue ? "⚠ Prioridad máxima" : "🔥 Contenido urgente"}
          </Badge>
          {item.platforms.map((p) => (
            <Badge key={p} className="bg-gray-100 text-gray-700">
              {PLATFORM_LABELS[p]}
            </Badge>
          ))}
          <Badge className={STATUS_STYLES[item.status]}>
            {STATUS_LABELS[item.status]}
          </Badge>
        </div>

        <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
          {item.title}
        </h2>

        {item.pillarId && (
          <p className="mt-1 text-sm font-medium text-orange-600">
            {PILLAR_LABELS[item.pillarId]}
          </p>
        )}

        {item.description && (
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-gray-500">
            {item.description}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div className="text-sm text-gray-600">
            <span className="font-medium text-gray-900">
              {dateFmt.format(publish)}
            </span>
            <span className="mx-2 text-gray-300">·</span>
            <span className={overdue ? "font-medium text-red-600" : ""}>
              {deadlineCopy(publish)}
            </span>
          </div>
          <button
            type="button"
            className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-gray-800 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 active:scale-[0.98]"
          >
            Ver detalles
          </button>
        </div>
      </div>
    </article>
  );
}

function SecondaryCard({ item, index }: { item: ContentItem; index: number }) {
  const publish = item.publishDate.toDate();

  return (
    <article className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge className="bg-gray-100 text-gray-600">Alternativa {index}</Badge>
        {item.platforms.map((p) => (
          <Badge key={p} className="bg-gray-50 text-gray-500">
            {PLATFORM_LABELS[p]}
          </Badge>
        ))}
      </div>
      <h3 className="font-semibold text-gray-900 group-hover:text-orange-600 transition-colors duration-200">
        {item.title}
      </h3>
      {item.pillarId && (
        <p className="mt-0.5 text-xs font-medium text-gray-500">
          {PILLAR_LABELS[item.pillarId]}
        </p>
      )}
      <p className="mt-3 text-sm text-gray-500">
        {dateFmt.format(publish)} · {deadlineCopy(publish)}
      </p>
    </article>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center">
      <p className="text-4xl">🎉</p>
      <h2 className="mt-3 text-lg font-semibold text-gray-900">
        Todo grabado por ahora
      </h2>
      <p className="mt-1 text-sm text-gray-500">
        No hay contenidos pendientes de grabar. Revisa el calendario para
        planificar los próximos.
      </p>
    </div>
  );
}

function SkeletonCards() {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="h-56 animate-pulse rounded-2xl bg-gray-100" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-36 animate-pulse rounded-2xl bg-gray-100" />
        <div className="h-36 animate-pulse rounded-2xl bg-gray-100" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export default function PedroDashboard() {
  const [items, setItems] = useState<ContentItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, "content_calendar"),
      where("status", "==", "pending_record"),
      orderBy("publishDate", "asc"),
      limit(3)
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setItems(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ContentItem)
        );
      },
      (err) => {
        console.error("Dashboard query error:", err);
        setError("No se ha podido cargar la cola de grabación.");
      }
    );
    return unsubscribe;
  }, []);

  const [urgent, ...secondary] = useMemo(() => items ?? [], [items]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <p className="text-sm font-medium text-orange-600">Hoy toca grabar</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
          Cola de grabación
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Prioridad calculada según la fecha de publicación más cercana.
        </p>
      </header>

      {error && (
        <div className="mb-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {items === null ? (
        <SkeletonCards />
      ) : !urgent ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          <UrgentCard item={urgent} />
          {secondary.length > 0 && (
            <>
              <p className="pt-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                Si no puede grabarse el urgente
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {secondary.map((item, i) => (
                  <SecondaryCard key={item.id} item={item} index={i + 1} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </main>
  );
}
