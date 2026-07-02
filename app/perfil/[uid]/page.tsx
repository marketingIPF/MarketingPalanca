"use client";

import { useParams } from "next/navigation";
import AuthGate from "@/components/auth/AuthGate";
import { useAuth } from "@/hooks/useAuth";
import ProfileView from "@/components/perfil/ProfileView";

export default function PerfilPage() {
  const params = useParams<{ uid: string }>();
  const { firebaseUser } = useAuth();

  return (
    <AuthGate allow={["superuser", "agent"]}>
      <ProfileView
        uid={params.uid}
        isOwnProfile={firebaseUser?.uid === params.uid}
      />
    </AuthGate>
  );
}
