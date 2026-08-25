import Image from "next/image";
import { ResumeUpload } from "./resume-upload";

const steps = [
  {
    title: "Upload your resume",
    body: "Drop in a PDF or DOCX and we tailor the questions to your actual experience.",
  },
  {
    title: "Talk it through",
    body: "A voice interviewer asks follow-ups, digs into details, and keeps the pace realistic.",
  },
  {
    title: "Get scored feedback",
    body: "See an overall score, a breakdown by dimension, and what to work on next.",
  },
];


export default function HeroSection() {
  return (
    <main className="relative flex flex-1 flex-col">
      {/* Hero fills whatever is left of the viewport under the 4rem sticky header. */}
      <section className="relative flex min-h-[calc(100svh-4rem)] flex-col items-center justify-center px-6 pt-16 pb-28">
        <div className="flex w-full max-w-2xl flex-col items-center text-center">
          <div className="flex items-center gap-2">
            <Image
              src="/logo1.png"
              alt="Dionysus logo"
              width={24}
              height={24}
              className="mx-auto"
            />
            <span className="rounded-full text-[#5a71f3]">
              Krystal - Your AI Interview Assistant
            </span>
          </div>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-balance text-zinc-900 sm:text-5xl dark:text-zinc-50">
            Practice the <span className="text-[#5a71f3]">interview</span> you actually want to have.
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-8 text-pretty text-zinc-600 dark:text-zinc-400">
            Krystal is a mock interviewer that asks questions based on your resume, listens to your answers, and gives scored feedback on your performance.
          </p>
          <div className="mt-10 flex w-full flex-col items-center">
            <ResumeUpload />
          </div>
        </div>

        <a
          href="#how-it-works"
          className="absolute bottom-8 flex flex-col items-center gap-1 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-200"
        >
          How it works
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 animate-bounce motion-reduce:animate-none"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </a>
      </section>

      <section
        id="how-it-works"
        className="relative isolate scroll-mt-16 overflow-hidden border-t border-white/[.08] bg-zinc-950 px-6 py-24 sm:py-32"
      >
        {/* Texture: a masked dot grid, a fine grain wash, and one soft accent glow. */}
        <div
          aria-hidden="true"
          className="texture-dots pointer-events-none absolute inset-0 -z-10"
        />
        <div
          aria-hidden="true"
          className="texture-grain pointer-events-none absolute inset-0 -z-10 opacity-[0.01]"
        />

        <div className="mx-auto w-full max-w-4xl">
          <h2 className="text-3xl font-semibold tracking-tight text-balance text-zinc-50">
            How it <span className="text-indigo-400">works.</span>
          </h2>
          <p className="mt-3 max-w-lg text-base leading-7 text-pretty text-zinc-400">
            Three steps, about fifteen minutes, and no scheduling with anyone.
          </p>
          <ol className="mt-12 grid gap-4 sm:grid-cols-3">
            {steps.map((step, index) => (
              <li
                key={step.title}
                className="rounded-2xl border border-white/[.08] bg-white/[.03] p-6 backdrop-blur-sm"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[.06] text-xs font-semibold text-zinc-300">
                  {index + 1}
                </span>
                <h3 className="mt-4 text-sm font-semibold text-zinc-50">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  )
}