export function getApiRoot(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  return envUrl.replace(/\/api\/v1\/?$/, "");
}

export interface CopilotMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

export interface StreamEvent {
  type: string;
  delta?: string;
  text?: string;
  error?: string;
  message?: string;
}

export async function* streamPersonaChat(
  token: string | null,
  options: {
    agentId?: string;
    messages: Array<{ role: "user" | "assistant"; content: string }>;
    threadId?: string;
  },
  signal?: AbortSignal,
): AsyncGenerator<string, void, unknown> {
  const apiRoot = getApiRoot();
  const response = await fetch(`${apiRoot}/api/persona/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      agentId: options.agentId || "6a83ea6bb3d55db9792763a6",
      messages: options.messages,
      threadId: options.threadId,
    }),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(
      `AI Copilot error (${response.status}): ${errorText || response.statusText}`,
    );
  }

  if (!response.body) {
    throw new Error("No response body received from stream.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data:")) continue;

        const rawData = trimmed.replace(/^data:\s*/, "");
        if (rawData === "[DONE]") return;

        try {
          const parsed = JSON.parse(rawData) as StreamEvent;
          if (parsed.type === "TEXT_MESSAGE_CHUNK" && parsed.delta) {
            yield parsed.delta;
          } else if (parsed.type === "ERROR") {
            throw new Error(parsed.message || "Streaming error from agent");
          }
        } catch (e) {
          if (e instanceof Error && e.message.startsWith("Streaming error")) {
            throw e;
          }
          // Non-JSON SSE line or malformed payload, ignore
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function fetchUserMemory(token: string | null) {
  const apiRoot = getApiRoot();
  const response = await fetch(`${apiRoot}/api/persona/memory`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!response.ok) return { user: [], agents: {} };
  return response.json();
}
