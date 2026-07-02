"use client";

import type { UserRole } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  /** If omitted, any signed-in user with a profile passes. */
  allow?: UserRole[];
  children: React.ReactNode;
}

export default function AuthGate({ allow, children }: Props) {
  const { firebaseUser, profile, loading } = useAuth();

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="h-32 animate-pulse rounded-2xl bg-gray-100" />
      </main>
    );
  }

  if (!firebaseUser || !profile) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 text-center sm:px-6">
        <p className="text-sm text-gray-500">
          Inicia sesión para acceder a esta sección.
        </p>
      </main>
    );
  }

  if (allow && !allow.includes(profile.role)) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 text-center sm:px-6">
        <p className="text-3xl">🔒</p>
        <h1 className="mt-3 text-lg font-semibold text-gray-900">
          Acceso restringido
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Esta sección solo está disponible para administradores.
        </p>
      </main>
    );
  }

  return <>{children}</>;
}
