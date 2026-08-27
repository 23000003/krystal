"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useSessionHistory,
  type CompletedSession,
} from "@/features/shared/stores/session-history.store";
import { dayLabel, timeLabel } from "../lib/date-formatting";


/** Keeps insertion order, which the store already guarantees is newest first. */
function groupByDay(sessions: CompletedSession[]) {
  const groups = new Map<string, CompletedSession[]>();
  for (const session of sessions) {
    const label = dayLabel(session.completedAt);
    const bucket = groups.get(label);

    if (bucket) 
      bucket.push(session);
    else 
      groups.set(label, [session]);
  }
  return [...groups.entries()];
}

export function SessionHistoryMenu() {
  const router = useRouter();
  const sessions = useSessionHistory((state) => state.sessions);
  const hasHydrated = useSessionHistory((state) => state.hasHydrated);
  const forget = useSessionHistory((state) => state.forget);

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Close on an outside click or Escape to close the menu
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!hasHydrated || sessions.length === 0) return null;

  const navigateToResult = (sessionId: string) => {
    setOpen(false);
    router.push(`/interview-session?id=${encodeURIComponent(sessionId)}&result=true`);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex h-9 cursor-pointer items-center gap-2 rounded-full border border-white/[.12] px-4 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/[.08]"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <path d="M12 8v4l3 2" />
          <circle cx="12" cy="12" r="9" />
        </svg>
        Past results
        <span className="rounded-full bg-white/[.12] px-2 py-0.5 text-xs tabular-nums">
          {sessions.length}
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-2 max-h-96 w-80 overflow-y-auto overscroll-contain rounded-2xl border border-white/[.08] bg-zinc-950 p-2 shadow-2xl shadow-black/50"
        >
          {groupByDay(sessions).map(([label, group]) => (
            <div key={label}>
              <p className="px-3 pt-2 pb-1 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                {label}
              </p>

              {group.map((session) => (
                <div
                  key={session.sessionId}
                  className="group flex items-center gap-1 rounded-xl hover:bg-white/[.06]"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => navigateToResult(session.sessionId)}
                    className="min-w-0 flex-1 px-3 py-2 text-left cursor-pointer"
                  >
                    <p className="truncate text-sm font-medium text-zinc-100">
                      {session.candidateName}
                    </p>
                    <p className="truncate text-xs text-zinc-500">
                      {session.role} · {timeLabel(session.completedAt)}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => forget(session.sessionId)}
                    title="Remove from history"
                    className="mr-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-zinc-500 opacity-0 transition hover:bg-white/[.08] hover:text-zinc-200 group-hover:opacity-100 focus-visible:opacity-100"
                  >
                    <span className="sr-only">
                      Remove {session.candidateName} from history
                    </span>
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      className="h-3.5 w-3.5"
                    >
                      <path d="m6 6 12 12M18 6 6 18" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
