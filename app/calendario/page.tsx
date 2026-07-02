import AuthGate from "@/components/auth/AuthGate";
import CalendarGrid from "@/components/calendar/CalendarGrid";

export const metadata = {
  title: "Calendario · RK Marketing Hub",
};

export default function CalendarioPage() {
  return (
    <AuthGate allow={["superuser", "agent"]}>
      <CalendarGrid />
    </AuthGate>
  );
}
