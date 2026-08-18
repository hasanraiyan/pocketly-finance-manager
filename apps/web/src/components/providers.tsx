"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PersonaProvider } from "@personaai/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth-provider";

function PersonaAiProviderWrapper({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();
  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, "") ??
    "http://localhost:4000";

  return (
    <PersonaProvider
      baseUrl={`${apiBaseUrl}/api/persona`}
      getAuthToken={getToken}
      defaultAgentId="6a83ea6bb3d55db9792763a6"
    >
      {children}
    </PersonaProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <PersonaAiProviderWrapper>
        <TooltipProvider>
          <Toaster>{children}</Toaster>
        </TooltipProvider>
      </PersonaAiProviderWrapper>
    </QueryClientProvider>
  );
}
