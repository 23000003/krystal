import Image from "next/image";
import Link from "next/link";
import { SessionHistoryMenu } from "@/features/shared/components/session-history-menu";

export function Navbar({ children }: { children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-10 border-b border-white/[.08] bg-zinc-950">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/logo1.png"
            alt="Dionysus logo"
            width={32}
            height={32}
          />
          <span className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Krystal
          </span>
        </Link>
        <div className="flex items-center gap-3">
          {children}
          <SessionHistoryMenu />
        </div>
      </div>
    </header>
  );
}
