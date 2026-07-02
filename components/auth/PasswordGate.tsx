"use client";

import { useAuth } from "@/hooks/useAuth";
import ChangePasswordForm from "./ChangePasswordForm";

export default function PasswordGate({ children }: { children: React.ReactNode }) {
  const { firebaseUser, profile, loading } = useAuth();

  const mustChange = !loading && firebaseUser && profile?.mustChangePassword === true;

  if (!mustChange) return <>{children}</>;

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-8 shadow-md">
        <p className="text-sm font-medium text-orange-600">Bienvenido/a</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">
          Elige tu contraseña
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Por seguridad, antes de continuar tienes que cambiar la contraseña
          temporal por una tuya.
        </p>
        <div className="mt-6">
          <ChangePasswordForm mode="forced" />
        </div>
      </div>
    </main>
  );
}
