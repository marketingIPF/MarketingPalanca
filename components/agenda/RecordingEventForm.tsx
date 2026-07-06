"use client";

/**
 * Create/edit form for a recording event.
 * Superuser-only (rendered behind role checks by the parent page).
 * On save, denormalizes agentName and contentTitles so the Slack route
 * never has to join collections at send time.
 */

import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRoster } from "@/hooks/useRoster";
import { useLinkableContent } from "@/hooks/useRecordingSchedule";
import type { RecordingEvent, RecordingEventType } from "@/lib/types";
import { EVENT_TYPE_LABELS, PLATFORM_SHORT } from "@/lib/labels";

const TZ = "Europe/Madrid";
const EVENT_TYPES = Object.keys(EVENT_TYPE_LABELS) as RecordingEventType[];

/** Combine a YYYY-MM-DD + HH:mm (interpreted as Madrid time) into a Timestamp. */
function toMadridTimestamp(dateStr: string, timeStr: string): Timestamp {
  const [Y, M, D] = dateStr.split("-").map(Number);
  const [h, min] = timeStr.split(":").map(Number);
  const guess = Date.UTC(Y, M - 1, D, h, min);
  const offset =
    guess -
    new Date(new Date(guess).toLocaleString("en-US", { timeZone: TZ })).getTime();
  return Timestamp.fromDate(new Date(guess - offset));
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

interface Props {
  currentUserUid: string;
  /** Pass an existing event to edit it; omit to create a new one. */
  event?: RecordingEvent;
  onSaved?: (eventId: string) => void;
  onCancel?: () => void;
}

export default function RecordingEventForm({
  currentUserUid,
  event,
  onSaved,
  onCancel,
}: Props) {
  const { users: roster, loading: rosterLoading } = useRoster();
  const { items: linkable, loading: contentLoading } = useLinkableContent(
    event?.id
  );

  const agents = (roster ?? []).filter((u) => u.role === "agent");

  const [agentId, setAgentId] = useState(event?.agentId ?? "");
  const [type, setType] = useState<RecordingEventType>(
    event?.type ?? "listing_acquisition"
  );
  const [date, setDate] = useState(
    event ? toDateInput(event.startAt) : ""
  );
  const [time, setTime] = useState(event ? toTimeInput(event.startAt) : "10:00");
  const [location, setLocation] = useState(event?.location ?? "");
  const [notes, setNotes] = useState(event?.notes ?? "");
  const [contentIds, setContentIds] = useState<string[]>(
    event?.contentItemIds ?? []
  );

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!date) {
      setDate(
        new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date())
      );
    }
  }, [date]);

  function toggleContent(id: string) {
    setContentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!agentId) return setFormError("Selecciona un agente.");
    if (!date || !time) return setFormError("Indica fecha y hora.");
    if (!location.trim()) return setFormError("Indica el lugar o contexto.");

    const agent = agents.find((a) => a.uid === agentId);
    if (!agent) return setFormError("El agente seleccionado no es válido.");

    const selectedContent = (linkable ?? []).filter((c) =>
      contentIds.includes(c.id)
    );

    const payload = {
      agentId,
      agentName: agent.displayName,
      type,
      startAt: toMadridTimestamp(date, time),
      location: location.trim(),
      contentItemIds: contentIds,
      contentTitles: selectedContent.map((c) => c.title),
      notes: notes.trim() || null,
      createdBy: currentUserUid,
      updatedAt: Timestamp.now(),
    };

    setSaving(true);
    try {
      if (event) {
        await updateDoc(doc(db, "recording_schedule", event.id), payload);
        onSaved?.(event.id);
      } else {
        const ref = await addDoc(collection(db, "recording_schedule"), {
          ...payload,
          createdAt: Timestamp.now(),
        });
        onSaved?.(ref.id);
      }
    } catch (err) {
      console.error("Save recording event error:", err);
      setFormError("No se ha podido guardar el evento. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
    >
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          {event ? "Editar grabación" : "Nueva grabación"}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Asigna un agente, indica dónde y cuándo, y enlaza los contenidos a
          grabar.
        </p>
      </div>

      {formError && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {formError}
        </div>
      )}

      {/* Agent */}
      <Field label="Agente">
        <select
          value={agentId}
          onChange={(e) => setAgentId(e.target.value)}
          disabled={rosterLoading}
          className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm transition-colors focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
        >
          <option value="">Selecciona un agente…</option>
          {agents.map((a) => (
            <option key={a.uid} value={a.uid}>
              {a.displayName}
            </option>
          ))}
        </select>
      </Field>

      {/* Type */}
      <Field label="Tipo de grabación">
        <div className="flex flex-wrap gap-2">
          {EVENT_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              aria-pressed={type === t}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-all duration-200 ${
                type === t
                  ? "bg-gray-900 text-white shadow-sm"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
              }`}
            >
              {EVENT_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </Field>

      {/* Date / time */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Fecha">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm transition-colors focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
          />
        </Field>
        <Field label="Hora">
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm transition-colors focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
          />
        </Field>
      </div>

      {/* Location */}
      <Field label="Lugar o contexto">
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Ej. Piso en Av. del Puerto 12, captación"
          className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
        />
      </Field>

      {/* Linked content */}
      <Field label="Contenidos a grabar">
        {contentLoading ? (
          <div className="h-20 animate-pulse rounded-xl bg-gray-100" />
        ) : !linkable || linkable.length === 0 ? (
          <p className="text-sm text-gray-400">
            No hay contenidos disponibles para enlazar ahora mismo.
          </p>
        ) : (
          <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-xl border border-gray-100 p-2">
            {linkable.map((c) => {
              const checked = contentIds.includes(c.id);
              return (
                <label
                  key={c.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    checked ? "bg-orange-50" : "hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleContent(c.id)}
                    className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                  />
                  <span className="min-w-0 flex-1 truncate text-gray-900">
                    {c.title}
                  </span>
                  <span className="shrink-0 text-xs text-gray-400">
                    {c.platforms.map((p) => PLATFORM_SHORT[p]).join(" + ")}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </Field>

      {/* Notes */}
      <Field label="Notas (opcional)">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm transition-colors focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
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
          {saving ? "Guardando…" : event ? "Guardar cambios" : "Crear grabación"}
        </button>
      </div>
    </form>
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
