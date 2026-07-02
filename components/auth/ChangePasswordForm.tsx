"use client";

/**
 * Password change form, reused in two contexts:
 * - "forced": full-screen, blocks the app until the person sets a new
 *   password (used right after first login with the temporary password).
 * - "voluntary": inline card in the profile page, usable any time.
 */

import { useState } from "react";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  signOut,
  updatePassword,
} from "firebase/auth";
import { doc, Timestamp, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

const MIN_LENGTH = 8;

interface Props {
  mode: "forced" | "voluntary";
  onSuccess?: () => void;
}

export default function ChangePasswordForm({ mode, onSuccess }: Props) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsReauth, setNeedsReauth] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword.length < MIN_LENGTH) {
      return setError(`La contraseña debe tener al menos ${MIN_LENGTH} caracteres.`);
    }
    if (newPassword !== confirmPassword) {
      return setError("Las contraseñas no coinciden.");
    }

    const user = auth.currentUser;
    if (!user || !user.email) {
      return setError("Sesión no válida. Vuelve a iniciar sesión.");
    }

    setSaving(true);
    try {
      // Reauthenticate first if we're asking for the current password
      // (voluntary flow), or if a previous attempt required it.
      if (mode === "voluntary" || needsReauth) {
        if (!currentPassword) {
          setSaving(false);
          return setError("Indica tu contraseña actual.");
        }
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
      }

      await updatePassword(user, newPassword);
      await updateDoc(doc(db, "users", user.uid), {
        mustChangePassword: false,
        updatedAt: Timestamp.now(),
      });

      setSuccess(true);
      onSuccess?.();
    } catch (err: any) {
      console.error("Change password error:", err);
      if (err?.code === "auth/requires-recent-login") {
        setNeedsReauth(true);
        setError("Por seguridad, indica también tu contraseña actual para continuar.");
      } else if (err?.code === "auth/wrong-password" || err?.code === "auth/invalid-credential") {
        setError("La contraseña actual no es correcta.");
      } else if (err?.code === "auth/weak-password") {
        setError(`La contraseña debe tener al menos ${MIN_LENGTH} caracteres.`);
      } else {
        setError("No se ha podido cambiar la contraseña. Inténtalo de nuevo.");
      }
    } finally {
      setSaving(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
        ✓ Contraseña actualizada correctamente.
      </div>
    );
  }

  const showCurrentPasswordField = mode === "voluntary" || needsReauth;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {showCurrentPasswordField && (
        <Field label="Contraseña actual">
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm shadow-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
          />
        </Field>
      )}

      <Field label="Nueva contraseña">
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
          className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm shadow-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
        />
      </Field>

      <Field label="Confirmar nueva contraseña">
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm shadow-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
        />
      </Field>

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-gray-800 hover:shadow-md disabled:opacity-60"
        >
          {saving ? "Guardando…" : "Cambiar contraseña"}
        </button>
        {mode === "forced" && (
          <button
            type="button"
            onClick={() => signOut(auth)}
            className="text-sm font-medium text-gray-500 transition-colors hover:text-gray-700"
          >
            Cerrar sesión
          </button>
        )}
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
