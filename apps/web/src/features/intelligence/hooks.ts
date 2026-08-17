"use client";

import { useMutation } from "@tanstack/react-query";
import type { components } from "@pocketly/sdk";
import { usePocketlyClient } from "@/lib/use-pocketly-client";

export type ScenarioInput = components["schemas"]["ScenarioDto"];
export type ScenarioKind = ScenarioInput["kind"];
export type ScenarioResult =
  components["schemas"]["ScenarioResultDto"]["data"];

/**
 * A mutation rather than a query: the route is a POST, the answer is only
 * ever wanted in response to the user asking, and caching a verdict against
 * balances that move would be actively misleading.
 */
export function useSimulateScenario() {
  const client = usePocketlyClient();
  return useMutation({
    mutationFn: async (input: ScenarioInput): Promise<ScenarioResult> => {
      const { data, error } = await client.POST("/intelligence/scenario", {
        body: input,
      });
      if (error) throw error;
      return data.data;
    },
  });
}
