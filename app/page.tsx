import HeroSection from "@/features/landing-page/components/hero";
import { Navbar } from "@/features/shared/components/navbar";

export default function Home() {
  return (
    <>
      <Navbar />
      <HeroSection />
      <footer className="border-t border-white/[.08] bg-black px-6 py-6">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-6 sm:flex-row">
          <p className="text-sm text-zinc-500">
            &copy; {new Date().getFullYear()} Krystal. All rights reserved.
          </p>
          <p className="text-sm text-zinc-500">
            Built with Love {"<3"}
          </p>
        </div>
      </footer>
    </>
  );
}


// <div className="flex w-full max-w-2xl flex-col items-center text-center">
//             <div className="space-y-2">
//               <div className="flex items-center gap-4">
//                 {/* <Image
//                   src="/logo1.png"
//                   alt="Dionysus logo"
//                   width={58}
//                   height={58}
//                   className="mx-auto"
//                 /> */}
//                 <h1 className="text-4xl font-semibold tracking-tight text-balance text-zinc-900 sm:text-5xl dark:text-zinc-50">
//                   Dionysus
//                 </h1>
//               </div>
//               <p className="text-sm text-[#8598ff] italic">
//                 Your AI interview assistant
//               </p>
//             </div>
//             <p className="mt-5 max-w-lg text-lg leading-8 text-pretty text-zinc-600 dark:text-zinc-400">
//               Dionysus is a voice-based mock interviewer that gives scored feedback on your performance. Upload your resume, answer questions, and get actionable insights to improve your interview skills.
//             </p>
//             <div className="mt-10 flex w-full flex-col items-center">
//               <ResumeUpload />
//             </div>
//           </div>