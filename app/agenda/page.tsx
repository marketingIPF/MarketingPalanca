"use client";

import AuthGate from "@/components/auth/AuthGate";
import { useAuth } from "@/hooks/useAuth";
import AgendaView from "@/components/agenda/AgendaView";

export default function AgendaPage() {
  const { firebaseUser, profile } = useAuth();

  return (
    <AuthGate allow={["superuser", "agent"]}>
      {firebaseUser && profile && (
        <AgendaView
          isSuperuser={profile.role === "superuser"}
          currentUserUid={firebaseUser.uid}
        />
      )}
    </AuthGate>
  );
}
