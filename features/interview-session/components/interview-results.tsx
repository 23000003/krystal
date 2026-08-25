"use client";

import Link from "next/link";
import { useInterviewResult } from "@/features/interview-session/hooks/useInterviewResult";
import type { CompetencyStatus } from "@/features/shared/types/interview";

const STATUS_STYLE: Record<CompetencyStatus, string> = {
  Strong: "bg-emerald-500/15 text-emerald-700 ring-emerald-600/25 dark:text-emerald-400",
  Adequate: "bg-amber-500/15 text-amber-700 ring-amber-600/25 dark:text-amber-400",
  Gap: "bg-orange-500/15 text-orange-700 ring-orange-600/25 dark:text-orange-400",
  "Gap — [HIGH]": "bg-red-500/15 text-red-700 ring-red-600/25 dark:text-red-400",
};

function StatusPill({ status }: { status: CompetencyStatus }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${STATUS_STYLE[status]}`}
    >
      {status}
    </span>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-black/[.06] bg-white dark:border-white/[.08] dark:bg-zinc-900">
      <h2 className="border-b border-black/[.06] px-6 py-4 text-sm font-semibold text-zinc-900 dark:border-white/[.08] dark:text-zinc-50">
        {title}
      </h2>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

const TH = "px-6 py-3 text-left text-xs font-semibold tracking-wide text-zinc-500 uppercase";
const TD = "px-6 py-4 align-top text-sm text-zinc-700 dark:text-zinc-300";

export function InterviewResults({ sessionId }: { sessionId: string }) {
  const { 
    data: report, 
    isPending, 
    isError, 
    error, 
    refetch 
  } = useInterviewResult(sessionId);

  if (isPending) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-4 px-6 py-24">
        <span
          aria-hidden="true"
          className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-indigo-600 motion-reduce:animate-none dark:border-zinc-700 dark:border-t-indigo-400"
        />
        <p className="text-sm text-zinc-600 dark:text-zinc-400" aria-live="polite">
          Scoring your interview…
        </p>
      </main>
    );
  }

  if (isError || !report) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          We couldn&apos;t load your results
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {error instanceof Error
            ? error.message
            : "The session may have expired, or the report is not ready yet."}
        </p>
        <div className="mt-2 flex gap-3">
          <button
            type="button"
            onClick={() => void refetch()}
            className="inline-flex h-11 items-center justify-center rounded-full bg-indigo-600 px-5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-full border border-black/[.08] px-5 text-sm font-medium text-zinc-900 transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:text-zinc-50 dark:hover:bg-white/[.06]"
          >
            Start over
          </Link>
        </div>
      </main>
    );
  }

  const { candidate } = report;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {candidate.name}
        </h1>
        <p className="mt-1 text-base text-zinc-600 dark:text-zinc-400">
          {candidate.role}
          <span aria-hidden="true" className="mx-2 text-zinc-400">
            ·
          </span>
          {candidate.yearsOfExperience}{" "}
          {candidate.yearsOfExperience === 1 ? "year" : "years"} of experience
        </p>
        <p className="mt-2 font-mono text-xs text-zinc-500">
          Session {sessionId.slice(0, 8)}
        </p>
      </header>

      <Card title="Technical competencies">
        <table className="w-full min-w-3xl border-collapse bg-zinc-900">
          <thead className="border-b border-black/[.06] dark:border-white/[.08] bg-zinc-800">
            <tr>
              <th className={TH}>Competency</th>
              <th className={TH}>Evidence</th>
              <th className={TH}>Bar</th>
              <th className={TH}>Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[.06] dark:divide-white/[.08]">
            {report.technicalCompetencies.map((row) => (
              <tr key={row.competency}>
                <td className={`${TD} font-medium text-zinc-900 dark:text-zinc-50`}>
                  {row.competency}
                </td>
                <td className={TD}>{row.evidence}</td>
                <td className={`${TD} text-zinc-600 dark:text-zinc-400`}>{row.bar}</td>
                <td className={TD}>
                  <StatusPill status={row.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card title="Behavioral competencies">
        <table className="w-full min-w-2xl border-collapse">
          <thead className="border-b border-black/[.06] dark:border-white/[.08] bg-zinc-800">
            <tr>
              <th className={TH}>Competency</th>
              <th className={TH}>Evidence</th>
              <th className={TH}>Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[.06] dark:divide-white/[.08]">
            {report.behavioralCompetencies.map((row) => (
              <tr key={row.competency}>
                <td className={`${TD} font-medium text-zinc-900 dark:text-zinc-50`}>
                  {row.competency}
                </td>
                <td className={TD}>{row.evidence}</td>
                <td className={TD}>
                  <StatusPill status={row.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </main>
  );
}
