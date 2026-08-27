"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { ParticleField } from "@/features/landing-page/components/particle-field";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60_000, retry: 1 },
          mutations: { retry: 0 },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ParticleField />
      {children}
      <Toaster
        richColors={true}
        theme="dark"
        position="bottom-right"
        duration={1500}
        closeButton
      />
    </QueryClientProvider>
  );
}
