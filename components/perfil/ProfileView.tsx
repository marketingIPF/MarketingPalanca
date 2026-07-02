"use client";

/**
 * User profile page.
 * - Anyone signed in can view any profile (read-only for others).
 * - Viewing your own profile additionally shows an action to mark an
 *   assigned content item as "Grabado" — the only Firestore mutation
 *   Firestore rules allow a plain agent to make.
 */

import { useEffect, useState } from "react";
import { doc, onSnapshot, Timestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAgentActivity } from "@/hooks/useAgentActivity";
import ChangePasswordForm from "@/components/auth/ChangePasswordForm";
import type { UserProfile } from "@/lib/types";
import {
  EVENT_TYPE_LABELS,
  PILLAR_LABELS,
  PLATFORM_SHORT,
  STATUS_LABELS,
  STATUS_STYLES,
} from "@/lib/labels";

const dateFmt = new Intl.DateTimeFormat("es-ES", {
  timeZone: "Europe/Madrid",
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export default function ProfileView({
  uid,
  isOwnProfile,
}: {
  uid: string;
  isOwnProfile: boolean;
}) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [notFound, setNotFound] = useState(false);
  const { upcomingEvents, assignedContent, loading, error } =
    useAgentActivity(uid);

  useEffect(() => {
    return onSnapshot(
      doc(db, "users", uid),
      (snap) => {
        if (!snap.exists()) return setNotFound(true);
        setProfile(snap.data() as UserProfile);
      },
      (err) => console.error("Profile fetch error:", err)
    );
  }, [uid]);

  async function markRecorded(contentId: string) {
    try {
      await updateDoc(doc(db, "content_calendar", contentId), {
        status: "recorded",
        updatedAt: Timestamp.now(),
      });
    } catch (err) {
      console.error("Mark recorded error:", err);
    }
  }

  if (notFound) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10 text-center sm:px-6">
        <p className="text-sm text-gray-500">Perfil no encontrado.</p>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div className="h-40 animate-pulse rounded-2xl bg-gray-100" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      {/* Header */}
      <section className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-orange-50 text-lg font-semibold text-orange-700">
          {initials(profile.displayName)}
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight text-gray-900">
            {profile.displayName}
          </h1>
          <p className="text-sm text-gray-500">{profile.title}</p>
          <p className="mt-0.5 truncate text-sm text-gray-400">
            {profile.email}
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="mt-4 grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-2xl font-semibold tracking-tight text-gray-900">
            {profile.stats.videosRecordedThisMonth}
          </p>
          <p className="mt-1 text-sm text-gray-500">Vídeos grabados este mes</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-2xl font-semibold tracking-tight text-gray-900">
            {profile.stats.pendingTasksThisWeek}
          </p>
          <p className="mt-1 text-sm text-gray-500">Tareas pendientes esta semana</p>
        </div>
      </section>

      {error && (
        <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Upcoming recordings */}
      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">
          Próximas grabaciones
        </h2>
        {loading ? (
          <div className="h-16 animate-pulse rounded-2xl bg-gray-100" />
        ) : !upcomingEvents || upcomingEvents.length === 0 ? (
          <p className="text-sm text-gray-400">No hay grabaciones programadas.</p>
        ) : (
          <ul className="space-y-2">
            {upcomingEvents.map((ev) => (
              <li
                key={ev.id}
                className="rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">
                    {EVENT_TYPE_LABELS[ev.type]} · {ev.location}
                  </p>
                  <span className="text-xs text-gray-400">
                    {dateFmt.format(ev.startAt.toDate())}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Assigned content */}
      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">
          Contenidos asignados
        </h2>
        {loading ? (
          <div className="h-16 animate-pulse rounded-2xl bg-gray-100" />
        ) : !assignedContent || assignedContent.length === 0 ? (
          <p className="text-sm text-gray-400">No hay contenidos asignados.</p>
        ) : (
          <ul className="space-y-2">
            {assignedContent.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {item.pillarId ? PILLAR_LABELS[item.pillarId] : "Sin pilar"}
                    <span className="mx-1.5">·</span>
                    {item.platforms.map((p) => PLATFORM_SHORT[p]).join(" + ")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[item.status]}`}
                  >
                    {STATUS_LABELS[item.status]}
                  </span>
                  {isOwnProfile && item.status === "pending_record" && (
                    <button
                      type="button"
                      onClick={() => markRecorded(item.id)}
                      className="rounded-lg bg-gray-900 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-gray-800"
                    >
                      Marcar grabado
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Change password — own profile only */}
      {isOwnProfile && (
        <section className="mt-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-gray-900">
            Contraseña
          </h2>
          <p className="mb-4 text-sm text-gray-500">
            Cambia tu contraseña cuando quieras.
          </p>
          <ChangePasswordForm mode="voluntary" />
        </section>
      )}
    </main>
  );
}
