import type { ZodError } from 'zod';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

/** Serializes any JSON-safe result as the tool's text content. */
export function textResult(data: unknown): CallToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  };
}

/**
 * Business-level tool failure (insufficient scope, not found, invalid
 * input) -- reported as a normal MCP result with `isError: true` rather
 * than a thrown exception, per MCP convention, so the client/model sees a
 * clear message instead of a generic protocol error.
 */
export function errorResult(message: string): CallToolResult {
  return {
    content: [{ type: 'text', text: message }],
    isError: true,
  };
}

/**
 * `ZodError.message` is a pretty-printed JSON dump of every issue -- clear
 * enough to act on, but the wrong shape for a chat surface. One line per
 * issue (field: problem) reads the same information as a normal sentence.
 */
export function zodErrorResult(error: ZodError): CallToolResult {
  const message = error.issues
    .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('; ');
  return errorResult(message);
}
