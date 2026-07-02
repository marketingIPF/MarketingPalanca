import AuthGate from "@/components/auth/AuthGate";
import WeeklyQuotaTracker from "@/components/series/WeeklyQuotaTracker";

export const metadata = {
  title: "3 reels/semana · RK Marketing Hub",
};

export default function SeriesPage() {
  return (
    <AuthGate allow={["superuser"]}>
      <WeeklyQuotaTracker />
    </AuthGate>
  );
}
