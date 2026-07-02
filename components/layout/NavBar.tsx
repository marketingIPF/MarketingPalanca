"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";

const LINKS = [
  { href: "/dashboard", label: "Grabación", roles: ["superuser"] as const },
  { href: "/calendario", label: "Calendario", roles: ["superuser", "agent"] as const },
  { href: "/series", label: "3 reels/semana", roles: ["superuser"] as const },
  { href: "/agenda", label: "Agenda", roles: ["superuser", "agent"] as const },
  { href: "/admin", label: "Admin", roles: ["superuser"] as const },
];

export default function NavBar() {
  const pathname = usePathname();
  const { firebaseUser, profile, loading } = useAuth();

  if (pathname === "/login" || loading || !firebaseUser || !profile) return null;

  const visibleLinks = LINKS.filter((l) =>
    (l.roles as readonly string[]).includes(profile.role)
  );

  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="text-sm font-semibold tracking-tight text-gray-900"
          >
            RK Marketing Hub
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            {visibleLinks.map((l) => {
              const active = pathname.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-200 ${
                    active
                      ? "bg-gray-900 text-white"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/perfil/${firebaseUser.uid}`}
            className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
          >
            {profile.displayName}
          </Link>
          <button
            type="button"
            onClick={() => signOut(auth)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            Salir
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      <nav className="flex items-center gap-1 overflow-x-auto border-t border-gray-100 px-4 py-2 sm:hidden">
        {visibleLinks.map((l) => {
          const active = pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-200 ${
                active ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
