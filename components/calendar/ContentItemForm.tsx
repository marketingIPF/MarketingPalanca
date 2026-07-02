"use client";

/**
 * Create/edit form for a content_calendar item. Superuser-only (rendered
 * behind a role check by the parent). Uses the same Madrid-timestamp
 * pattern as RecordingEventForm for the publish date/time fields.
 */

import { useState } from "react";
import {
  addDoc,
  collection,
  doc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRoster } from "@/hooks/useRoster";
import type { ContentItem, ContentStatus, PillarId, Platform } from "@/lib/types";
import { PILLAR_LABELS, PLATFORM_LABELS, STATUS_LABELS } from "@/lib/labels";

const TZ = "Europe/Madrid";
const PLATFORMS = Object.keys(PLATFORM_LABELS) as Platform[];
const STATUSES = Object.keys(STATUS_LABELS) as ContentStatus[];
const PILLARS = Object.keys(PILLAR_LABELS) as PillarId[];

function toMadridTimestamp(dateStr: string, timeStr: string): Timestamp {
  const [Y, M, D] = dateStr.split("-").map(Number);
  const [h, min] = timeStr.split(":").map(Number);
  const guess = Date.UTC(Y, M - 1, D, h, min);
  const offset =
    guess -
    new Date(new Date(guess).toLocaleString("en-US", { timeZone: TZ })).getTime();
  return Timestamp.fromDate(new Date(guess + offset));
}

function toDateInput(ts: Timestamp): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ts.toDate());
}

function toTimeInput(ts: Timestamp): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(ts.toDate());
}

function todayInput(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

interface Props {
  currentUserUid: string;
  item?: ContentItem;
  onSaved?: () => void;
  onCancel?: () => void;
}

export default function ContentItemForm({
  currentUserUid,
  item,
  onSaved,
  onCancel,
}: Props) {
  const { users: roster } = useRoster();
  const agents = (roster ?? []).filter((u) => u.role === "agent");

  const [title, setTitle] = useState(item?.title ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [platforms, setPlatforms] = useState<Platform[]>(
    item?.platforms ?? ["instagram_reels"]
  );
  const [status, setStatus] = useState<ContentStatus>(item?.status ?? "draft");
  const [pillarId, setPillarId] = useState<PillarId | "">(item?.pillarId ?? "");
  const [isReel, setIsReel] = useState(item?.isReel ?? true);
  const [date, setDate] = useState(item ? toDateInput(item.publishDate) : todayInput());
  const [time, setTime] = useState(item ? toTimeInput(item.publishDate) : "18:00");
  const [assignedAgentId, setAssignedAgentId] = useState(
    item?.assignedAgentId ?? ""
  );
  const [notes, setNotes] = useState(item?.notes ?? "");

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function togglePlatform(p: Platform) {
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!title.trim()) return setFormError("Indica un título.");
    if (platforms.length === 0) return setFormError("Selecciona al menos una plataforma.");
    if (!date || !time) return setFormError("Indica fecha y hora de publicación.");

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      platforms,
      status,
      pillarId: pillarId || null,
      isReel,
      publishDate: toMadridTimestamp(date, time),
      assignedAgentId: assignedAgentId || null,
      notes: notes.trim() || null,
      updatedAt: Timestamp.now(),
    };

    setSaving(true);
    try {
      if (item) {
        await updateDoc(doc(db, "content_calendar", item.id), payload);
      } else {
        await addDoc(collection(db, "content_calendar"), {
          ...payload,
          recordingEventId: null,
          createdBy: currentUserUid,
          createdAt: Timestamp.now(),
        });
      }
      onSaved?.();
    } catch (err) {
      console.error("Save content item error:", err);
      setFormError("No se ha podido guardar el contenido. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/20 p-4 backdrop-blur-sm sm:items-center">
      <form
        onSubmit={handleSubmit}
        className="max-h-[90vh] w-full max-w-lg space-y-5 overflow-y-auto rounded-2xl border border-gray-100 bg-white p-6 shadow-lg"
      >
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {item ? "Editar contenido" : "Nuevo contenido"}
          </h2>
        </div>

        {formError && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {formError}
          </div>
        )}

        <Field label="Título">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm shadow-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
          />
        </Field>

        <Field label="Descripción (opcional)">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm shadow-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
          />
        </Field>

        <Field label="Plataformas">
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => {
              const active = platforms.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePlatform(p)}
                  aria-pressed={active}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                    active
                      ? "bg-gray-900 text-white shadow-sm"
                      : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {PLATFORM_LABELS[p]}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Estado">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ContentStatus)}
            className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm shadow-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Fecha de publicación">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm shadow-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
            />
          </Field>
          <Field label="Hora">
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm shadow-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
            />
          </Field>
        </div>

        <Field label="Pilar de contenido (opcional)">
          <select
            value={pillarId}
            onChange={(e) => setPillarId(e.target.value as PillarId | "")}
            className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm shadow-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
          >
            <option value="">Sin pilar</option>
            {PILLARS.map((p) => (
              <option key={p} value={p}>
                {PILLAR_LABELS[p]}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Agente asociado (opcional)">
          <select
            value={assignedAgentId}
            onChange={(e) => setAssignedAgentId(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm shadow-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
          >
            <option value="">Sin asignar</option>
            {agents.map((a) => (
              <option key={a.uid} value={a.uid}>
                {a.displayName}
              </option>
            ))}
          </select>
        </Field>

        <label className="flex items-center gap-2.5 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={isReel}
            onChange={(e) => setIsReel(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
          />
          Cuenta para la cuota de 3 reels/semana
        </label>

        <Field label="Notas (opcional)">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm shadow-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
          />
        </Field>

        <div className="flex items-center justify-end gap-3 pt-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-gray-800 hover:shadow-md disabled:opacity-60"
          >
            {saving ? "Guardando…" : item ? "Guardar cambios" : "Crear contenido"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
      </label>
      {children}
    </div>
  );
}
