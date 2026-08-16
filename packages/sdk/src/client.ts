import createFetchClient, { type Middleware } from 'openapi-fetch';
import type { paths } from './generated/schema';

export interface CreatePocketlyClientOptions {
  /**
   * Include the API's global prefix — the generated spec's paths (e.g.
   * `/accounts`) don't include it, since they're generated against a raw
   * Nest TestingModule app that never calls `setGlobalPrefix`.
   * e.g. "http://localhost:4000/api/v1"
   */
  baseUrl: string;
  /** Supplies the Clerk session token; omit for unauthenticated calls only. */
  getToken?: () => Promise<string | null | undefined>;
}

export function createPocketlyClient({ baseUrl, getToken }: CreatePocketlyClientOptions) {
  const client = createFetchClient<paths>({ baseUrl });

  if (getToken) {
    const authMiddleware: Middleware = {
      async onRequest({ request }) {
        const token = await getToken();
        if (token) {
          request.headers.set('Authorization', `Bearer ${token}`);
        }
        return request;
      },
    };
    client.use(authMiddleware);
  }

  return client;
}

export type PocketlyClient = ReturnType<typeof createPocketlyClient>;
