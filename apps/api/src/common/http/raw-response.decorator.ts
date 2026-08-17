import { SetMetadata } from '@nestjs/common';

export const IS_RAW_RESPONSE_KEY = 'isRawResponse';

/**
 * Opts a route out of the global `{ data: ... }` envelope.
 *
 * For routes whose body shape is dictated by a spec rather than by us --
 * OAuth/OIDC discovery documents (RFC 8414, RFC 9728), which clients parse
 * for top-level fields like `resource` and `authorization_servers`. Wrapping
 * those makes the document unreadable to every compliant client.
 */
export const RawResponse = () => SetMetadata(IS_RAW_RESPONSE_KEY, true);
