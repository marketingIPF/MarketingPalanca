"use client";

import Link from "next/link";
import { useAdminStats } from "@/hooks/useAdminStats";
import SlackTriggerButton from "./SlackTriggerButton";

function KpiCard({
  value,
  label,
  loading,
}: {
  value: number | null;
  label: string;
  loading: boolean;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      {loading ? (
        <div className="h-8 w-10 animate-pulse rounded bg-gray-100" />
      ) : (
        <p className="text-3xl font-semibold tracking-tight text-gray-900">
          {value}
        </p>
      )}
      <p className="mt-1 text-sm text-gray-500">{label}</p>
    </div>
  );
}

const QUICK_LINKS = [
  { href: "/calendario", label: "Calendario", desc: "Ver y filtrar todos los contenidos" },
  { href: "/series", label: "3 reels/semana", desc: "Comprobar la cuota y su reparto" },
  { href: "/agenda", label: "Agenda de agentes", desc: "Crear o editar grabaciones" },
];

export default function AdminPanel() {
  const { agentCount, pendingRecordCount, weekRecordingCount, loading } =
    useAdminStats();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <p className="text-sm font-medium text-orange-600">Solo administradores</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
          Panel de administración
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Vista general del contenido, las grabaciones y el aviso diario a
          Slack.
        </p>
      </header>

      {/* KPIs */}
      <section className="grid grid-cols-3 gap-4">
        <KpiCard value={agentCount} label="Agentes activos" loading={loading} />
        <KpiCard
          value={pendingRecordCount}
          label="Pendiente de grabar"
          loading={loading}
        />
        <KpiCard
          value={weekRecordingCount}
          label="Grabaciones esta semana"
          loading={loading}
        />
      </section>

      {/* Slack trigger */}
      <section className="mt-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">
          Agenda de mañana
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Envía a Slack quién graba mañana, con quién, a qué hora y qué
          contenidos toca grabar.
        </p>
        <div className="mt-4">
          <SlackTriggerButton />
        </div>
      </section>

      {/* Quick links */}
      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">
          Accesos rápidos
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {QUICK_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="group rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <p className="font-medium text-gray-900 group-hover:text-orange-600 transition-colors">
                {l.label}
              </p>
              <p className="mt-1 text-xs text-gray-500">{l.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
