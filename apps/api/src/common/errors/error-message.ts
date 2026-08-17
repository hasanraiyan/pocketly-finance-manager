/**
 * Pulls a printable message out of a caught value.
 *
 * `catch (err)` hands back `unknown`, and typing it `any` to reach
 * `err.message` silently opts the whole expression out of type checking.
 * This narrows once so log lines stay type-safe.
 */
export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return String(err);
}
