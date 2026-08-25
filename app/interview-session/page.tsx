import type { Metadata } from "next";
import { InterviewResults } from "@/features/interview-session/components/interview-results";
import { InterviewRoom } from "@/features/interview-session/components/interview-room";
import { Navbar } from "@/features/shared/components/navbar";

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function InterviewSessionPage(
  props: PageProps<"/interview-session">,
) {
  const searchParams = await props.searchParams;
  const sessionId = firstValue(searchParams.id) || "placeholder";
  const result = firstValue(searchParams.result);
  const showResults = result !== undefined && result !== "false";

  return (
    <>
      <Navbar>
        <span className="rounded-full border border-black/[.08] px-3 py-1 text-xs font-medium text-zinc-600 dark:border-white/[.12] dark:text-zinc-400">
          {showResults ? "Results" : "Interview in progress"}
        </span>
      </Navbar>
      {showResults ? (
        <InterviewResults sessionId={sessionId} />
      ) : (
        <InterviewRoom sessionId={sessionId} />
      )}
    </>
  );
}

export async function generateMetadata(
  props: PageProps<"/interview-session">,
): Promise<Metadata> {
  const searchParams = await props.searchParams;
  const result = firstValue(searchParams.result);
  return {
    title: result !== undefined && result !== "false" ? "Results" : "Interview Session",
  };
}
