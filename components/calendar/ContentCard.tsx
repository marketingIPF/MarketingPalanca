"use client";

/**
 * Compact content card rendered inside a calendar cell.
 * Shows a platform tag, the title, and a status badge.
 */

import type { ContentItem } from "@/lib/types";
import {
  PLATFORM_SHORT,
  PLATFORM_STYLES,
  STATUS_LABELS,
  STATUS_STYLES,
} from "@/lib/labels";

const timeFmt = new Intl.DateTimeFormat("es-ES", {
  timeZone: "Europe/Madrid",
  hour: "2-digit",
  minute: "2-digit",
});

export default function ContentCard({
  item,
  onSelect,
}: {
  item: ContentItem;
  onSelect?: (item: ContentItem) => void;
}) {
  const publish = item.publishDate.toDate();

  return (
    <button
      type="button"
      onClick={() => onSelect?.(item)}
      className="group w-full rounded-xl border border-gray-100 bg-white p-2 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-1"
    >
      <div className="mb-1 flex flex-wrap items-center justify-between gap-1">
        <div className="flex flex-wrap gap-1">
          {item.platforms.map((p) => (
            <span
              key={p}
              className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${PLATFORM_STYLES[p]}`}
            >
              {PLATFORM_SHORT[p]}
            </span>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {item.isReel && (
            <span className="text-[10px] font-medium text-gray-400">Reel</span>
          )}
          {item.isStory && (
            <span className="text-[10px] font-medium text-gray-400">Story</span>
          )}
        </div>
      </div>

      <p className="line-clamp-2 text-xs font-medium leading-snug text-gray-900">
        {item.title}
      </p>

      <div className="mt-1.5 flex items-center justify-between gap-1">
        <span
          className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${STATUS_STYLES[item.status]}`}
        >
          {STATUS_LABELS[item.status]}
        </span>
        <span className="text-[10px] tabular-nums text-gray-400">
          {timeFmt.format(publish)}
        </span>
      </div>
    </button>
  );
}
