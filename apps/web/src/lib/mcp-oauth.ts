/**
 * Better Auth's oauth-provider plugin redirects the browser here (top-level
 * navigation) mid-flow when an MCP client is connecting: to `loginPage` if
 * there's no session yet, to `consentPage` once there is one. Both carry
 * the same signed query string, which must be forwarded byte-for-byte back
 * to `/oauth2/authorize` (login) or `/oauth2/consent` (consent) to resume.
 */
export function isMcpOAuthRequest(searchParams: URLSearchParams): boolean {
  return searchParams.has("client_id") && searchParams.has("response_type");
}
