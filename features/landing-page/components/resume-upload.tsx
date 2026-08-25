"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ACCEPT_ATTR, ACCEPTED_EXTENSIONS } from "@/config/constants";
import { useUploadResume } from "@/features/landing-page/hooks/useUploadResume";
import { toastr } from "@/features/shared/lib/toastr";

const UNSUPPORTED_MESSAGE = "Please choose a PDF or DOCX file.";

function isSupported(file: File) {
  return ACCEPTED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext));
}

export function ResumeUpload() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [revealed, setRevealed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const upload = useUploadResume({
    onSuccess: ({ sessionId }) => {
      router.push(`/interview-session?id=${encodeURIComponent(sessionId)}`);
    },
    onError: setError,
  });

  const isUploading = upload.isPending || upload.isSuccess;

  function acceptFile(file: File | undefined) {
    if (!file || isUploading) return;
    if (!isSupported(file)) {
      setError(UNSUPPORTED_MESSAGE);
      toastr.error(UNSUPPORTED_MESSAGE);
      return;
    }

    setError(null);
    setFileName(file.name);
    upload.mutate(file);
  }

  if (!revealed) {
    return (
      <button
        type="button"
        onClick={() => setRevealed(true)}
        className="inline-flex cursor-pointer h-13 items-center justify-center rounded-full bg-indigo-600 px-8 text-base font-medium text-white transition-colors hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      >
        Start a Mock Interview
      </button>
    );
  }

  return (
    <div className="w-full max-w-xl">
      <button
        type="button"
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          acceptFile(event.dataTransfer.files[0]);
        }}
        className={`flex w-full flex-col cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${
          isDragging
            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40"
            : "border-zinc-300 bg-white hover:border-indigo-400 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:bg-zinc-900"
        }`}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6"
          >
            <path d="M12 16V4" />
            <path d="m7 9 5-5 5 5" />
            <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
          </svg>
        </span>
        <span className="text-base font-medium text-zinc-900 dark:text-zinc-50">
          Drag &amp; drop your resume here
        </span>
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          or <span className="font-medium text-indigo-600 dark:text-indigo-400">browse files</span> · PDF or DOCX
        </span>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTR}
          className="hidden"
          onChange={(event) => acceptFile(event.target.files?.[0])}
        />
      </button>

      {isUploading && !error ? (
        <p className="mt-3 flex items-center justify-center gap-2 text-center text-sm text-zinc-600 dark:text-zinc-400">
          <span
            aria-hidden="true"
            className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
          />
          Reading <span className="font-medium">{fileName}</span> and writing your
          questions…
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 text-center text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
    </div>
  );
}
