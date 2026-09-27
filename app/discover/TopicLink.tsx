"use client";

import Link from "next/link";
import { trackDiscoverTopicSelect } from "@/lib/analytics";

export function TopicLink({
  topic,
  isActive,
  children,
}: {
  topic: string;
  isActive: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={`/discover?topic=${topic}`}
      onClick={() => trackDiscoverTopicSelect(topic)}
      className={`px-3 py-2 rounded-full text-xs border ${
        isActive
          ? "bg-blue-500/20 text-blue-300 border-blue-400/60"
          : "bg-zinc-900 border-zinc-700 text-zinc-200"
      } min-h-8 touch-manipulation transition-colors hover:border-blue-400/60 hover:text-blue-300`}
    >
      {children}
    </Link>
  );
}
