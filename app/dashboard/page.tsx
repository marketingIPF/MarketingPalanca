import AuthGate from "@/components/auth/AuthGate";
import PedroDashboard from "@/components/dashboard/PedroDashboard";

export const metadata = { title: "Cola de grabación · RK Marketing Hub" };

export default function DashboardPage() {
  return (
    <AuthGate allow={["superuser"]}>
      <PedroDashboard />
    </AuthGate>
  );
}
