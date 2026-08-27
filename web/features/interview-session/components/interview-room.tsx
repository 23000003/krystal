"use client";

import { useEffect, useState } from "react";
import {
  useInterviewSession,
  type InterviewPhase,
  type MicState,
} from "@/features/interview-session/hooks/useInterviewSession";
import { toastr } from "@/features/shared/lib/toastr";

const ACCENT = "#5a71f3";

/** Reused so repeated saves update one toast rather than stacking. */
const TRANSCRIBING_TOAST_ID = "transcribing";

const PHASE_LABEL: Record<InterviewPhase, string> = {
  connecting: "Connecting…",
  starting: "Starting in a moment…",
  introduction: "Krystal is introducing the session",
  awaiting_ready: 'Say "Ready" when you want to begin',
  beginning: "Here we go",
  waiting: "Preparing the next question…",
  question: "Krystal is asking",
  answering: "Listening — press Done when you finish",
  sending: "Sending your answer…",
  finishing: "Finishing up…",
  conclusion: "Wrapping up",
  ended: "Taking you to your results…",
  failed: "Something went wrong",
};


/** Reflects the browser's own microphone state — not a toggle we own. */
const MIC_PRESENTATION: Record<
  MicState,
  { label: string; slashed: boolean; className: string }
> = {
  live: {
    label: "Microphone live",
    slashed: false,
    className: "bg-red-500/15 text-red-400",
  },
  muted: {
    label: "Microphone muted by your system",
    slashed: true,
    className: "bg-amber-500/15 text-amber-400",
  },
  blocked: {
    label: "Microphone access blocked",
    slashed: true,
    className: "bg-red-500/15 text-red-400",
  },
  idle: {
    label: "Microphone off",
    slashed: true,
    className: "bg-white/10 text-zinc-400",
  },
};

function MicIndicator({ state }: { state: MicState }) {
  const { label, slashed, className } = MIC_PRESENTATION[state];

  return (
    <div
      title={label}
      aria-live="polite"
      className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${className}`}
    >
      {state === "live" ? (
        <span
          aria-hidden="true"
          className="absolute inset-0 animate-ping rounded-full bg-current opacity-20 motion-reduce:animate-none"
        />
      ) : null}
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="relative h-6 w-6"
      >
        <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" />
        <path d="M19 11a7 7 0 0 1-14 0" />
        <path d="M12 18v3" />
        {slashed ? <path d="m4 4 16 16" /> : null}
      </svg>
      <span className="sr-only">{label}</span>
    </div>
  );
}

function formatElapsed(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function InterviewRoom({ sessionId }: { sessionId: string }) {
  const {
    phase,
    completed,
    speakingRingRef,
    total,
    savingCount,
    micState,
    needsGesture,
    confirmReady,
    repeatQuestion,
    canRepeat,
    finishAnswer,
    resumeAudio,
    speechSupported,
  } = useInterviewSession(sessionId);

  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setElapsed((seconds) => seconds + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const isTranscribing = savingCount > 0;

  useEffect(() => {
    if (!isTranscribing) {
      toastr.dismiss(TRANSCRIBING_TOAST_ID);
      return;
    }

    toastr.loading(
      `Transcribing ${savingCount} answer${savingCount > 1 ? "s" : ""} in the background…`,
      undefined,
      TRANSCRIBING_TOAST_ID,
    );
  }, [isTranscribing, savingCount]);

  useEffect(() => () => toastr.dismiss(TRANSCRIBING_TOAST_ID), []);

  return (
    <main className="flex min-h-[calc(100svh-4rem)] flex-1 flex-col">
      <div className="flex flex-1 justify-center p-4 sm:p-6">
        <div className="relative isolate flex w-full max-w-5xl items-center justify-center overflow-hidden rounded-3xl border border-white/[.08] bg-zinc-900">
          <div
            role="timer"
            className="absolute top-4 left-4 flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 text-sm font-medium text-zinc-200 tabular-nums backdrop-blur-sm"
          >
            <span
              className={`h-2 w-2 rounded-full ${micState === "live" ? "bg-red-500" : "bg-zinc-500"}`}
            />
            {formatElapsed(elapsed)}
          </div>

          {total > 0 ? (
            <div className="absolute top-4 right-4 rounded-full bg-black/50 px-3 py-1.5 text-sm font-medium text-zinc-200 backdrop-blur-sm">
              {Math.min(completed + 1, total)} of {total}
            </div>
          ) : null}

          <div className="absolute bottom-4 left-4 rounded-full bg-black/50 px-3 py-1.5 text-sm font-medium text-zinc-200 backdrop-blur-sm">
            Krystal · AI Interviewer
          </div>

          <div className="absolute right-4 bottom-4 rounded-full bg-black/50 px-3 py-1.5 font-mono text-xs text-zinc-400 backdrop-blur-sm">
            {sessionId.slice(0, 8)}
          </div>

          <div className="flex flex-col items-center gap-10 px-6 py-16">
            <div className="relative flex items-center justify-center">
              <div
                ref={speakingRingRef}
                aria-hidden="true"
                className="pointer-events-none absolute flex items-center justify-center will-change-transform "
                style={{ transition: "opacity 300ms" }}
              >
                <svg viewBox="0 0 160 160" className="h-40 w-40 -rotate-90">
                  <circle
                    cx="80"
                    cy="80"
                    r="72"
                    fill="none"
                    stroke="#1f3ff3"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              <span
                className="relative flex h-32 w-32 items-center justify-center rounded-full text-3xl font-semibold text-white"
                style={{ backgroundColor: ACCENT }}
              >
                AI
              </span>
            </div>

            {PHASE_LABEL[phase] === "failed" ? (
              <p className="max-w-xl text-center text-sm text-zinc-400" aria-live="polite">
                {PHASE_LABEL[phase]}
              </p>
            ) : null}

            {needsGesture ? (
              <button
                type="button"
                onClick={resumeAudio}
                className="inline-flex h-11 items-center justify-center rounded-full bg-white/10 px-5 text-sm font-medium text-zinc-100 transition-colors hover:bg-white/20"
              >
                Tap to enable audio
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 px-6 pb-6">
        <div className="flex items-center justify-center gap-3 sm:gap-4">
          <MicIndicator state={micState} />

          <button
            type="button"
            onClick={confirmReady}
            disabled={phase !== "awaiting_ready"}
            className="inline-flex h-14 items-center justify-center rounded-full bg-zinc-200 px-6 text-base font-medium text-zinc-800 transition-colors hover:bg-zinc-300 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          >
            {"I'm Ready"}
          </button>

          <button
            type="button"
            onClick={repeatQuestion}
            disabled={!canRepeat}
            title="Play the question again"
            className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-zinc-200 px-6 text-base font-medium text-zinc-800 transition-colors hover:bg-zinc-300 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <path d="M3 12a9 9 0 0 1 15.3-6.4L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-15.3 6.4L3 16" />
              <path d="M3 21v-5h5" />
            </svg>
            Repeat Question
          </button>

          <button
            type="button"
            onClick={finishAnswer}
            disabled={phase !== "answering"}
            className="inline-flex h-14 items-center justify-center rounded-full px-7 text-base font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            style={{ backgroundColor: ACCENT }}
          >
            {phase === "sending" ? "Sending…" : "Done Answering"}
          </button>
        </div>

        {phase === "awaiting_ready" && !speechSupported ? (
          <p className="text-xs text-zinc-500">
            Voice detection is not available in this browser — use the button instead.
          </p>
        ) : null}
      </div>
    </main>
  );
}
