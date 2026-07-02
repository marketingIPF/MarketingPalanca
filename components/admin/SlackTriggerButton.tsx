"use client";

/**
 * Admin-only button that triggers POST /api/slack to dispatch tomorrow's
 * recording agenda. Handles four visual states: idle, loading, success,
 * error — with automatic reset back to idle.
 */

import { useEffect, useRef, useState } from "react";
import { getAuth } from "firebase/auth";

type ButtonState = "idle" | "loading" | "success" | "error";

const RESET_DELAY_MS = 4000;

export default function SlackTriggerButton() {
  const [state, setState] = useState<ButtonState>("idle");
  const [feedback, setFeedback] = useState<string | null>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);

  function scheduleReset() {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => {
      setState("idle");
      setFeedback(null);
    }, RESET_DELAY_MS);
  }

  async function handleClick() {
    if (state === "loading") return;
    setState("loading");
    setFeedback(null);

    try {
      const user = getAuth().currentUser;
      if (!user) throw new Error("Sesión caducada. Vuelve a iniciar sesión.");

      const token = await user.getIdToken();
      const res = await fetch("/api/slack", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Error al enviar la agenda a Slack.");
      }

      setState("success");
      setFeedback(data.message ?? "Agenda enviada a Slack correctamente.");
    } catch (err) {
      setState("error");
      setFeedback(
        err instanceof Error ? err.message : "Error inesperado. Inténtalo de nuevo."
      );
    } finally {
      scheduleReset();
    }
  }

  const styles: Record<ButtonState, string> = {
    idle: "bg-gray-900 hover:bg-gray-800 hover:shadow-md text-white",
    loading: "bg-gray-900/80 text-white cursor-wait",
    success: "bg-emerald-600 text-white",
    error: "bg-red-600 text-white",
  };

  const labels: Record<ButtonState, React.ReactNode> = {
    idle: (
      <>
        <SlackIcon />
        Enviar agenda de mañana a Slack
      </>
    ),
    loading: (
      <>
        <Spinner />
        Enviando agenda…
      </>
    ),
    success: <>✓ Agenda enviada</>,
    error: <>✕ No se pudo enviar</>,
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={state === "loading"}
        aria-live="polite"
        className={`inline-flex items-center gap-2.5 rounded-2xl px-6 py-3.5 text-sm font-medium shadow-sm transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 active:scale-[0.98] disabled:pointer-events-none ${styles[state]}`}
      >
        {labels[state]}
      </button>

      {feedback && (
        <p
          className={`text-sm transition-opacity duration-300 ${
            state === "error" ? "text-red-600" : "text-emerald-700"
          }`}
        >
          {feedback}
        </p>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

function SlackIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M5.04 15.16a2.52 2.52 0 11-2.52-2.52h2.52v2.52zm1.27 0a2.52 2.52 0 015.04 0v6.32a2.52 2.52 0 11-5.04 0v-6.32zM8.83 5.04a2.52 2.52 0 112.52-2.52v2.52H8.83zm0 1.27a2.52 2.52 0 010 5.04H2.52a2.52 2.52 0 110-5.04h6.31zm10.13 2.52a2.52 2.52 0 112.52 2.52h-2.52V8.83zm-1.27 0a2.52 2.52 0 01-5.04 0V2.52a2.52 2.52 0 115.04 0v6.31zm-2.52 10.13a2.52 2.52 0 11-2.52 2.52v-2.52h2.52zm0-1.27a2.52 2.52 0 010-5.04h6.32a2.52 2.52 0 110 5.04h-6.32z" />
    </svg>
  );
}
