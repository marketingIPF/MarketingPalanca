"use client";

/**
 * Toggleable platform chips. Empty selection = show all.
 */

import type { Platform } from "@/lib/types";
import { PLATFORM_LABELS, PLATFORM_STYLES } from "@/lib/labels";

const ALL_PLATFORMS = Object.keys(PLATFORM_LABELS) as Platform[];

export default function PlatformFilter({
  selected,
  onChange,
}: {
  selected: Platform[];
  onChange: (next: Platform[]) => void;
}) {
  function toggle(p: Platform) {
    onChange(
      selected.includes(p)
        ? selected.filter((x) => x !== p)
        : [...selected, p]
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => onChange([])}
        className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
          selected.length === 0
            ? "bg-gray-900 text-white shadow-sm"
            : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
        }`}
      >
        Todas
      </button>

      {ALL_PLATFORMS.map((p) => {
        const active = selected.includes(p);
        return (
          <button
            key={p}
            type="button"
            onClick={() => toggle(p)}
            aria-pressed={active}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-1 ${
              active
                ? `${PLATFORM_STYLES[p]} ring-1 ring-inset ring-current/20 shadow-sm`
                : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
            }`}
          >
            {PLATFORM_LABELS[p]}
          </button>
        );
      })}
    </div>
  );
}
