import AuthGate from "@/components/auth/AuthGate";
import AdminPanel from "@/components/admin/AdminPanel";

export const metadata = { title: "Admin · RK Marketing Hub" };

export default function AdminPage() {
  return (
    <AuthGate allow={["superuser"]}>
      <AdminPanel />
    </AuthGate>
  );
}
