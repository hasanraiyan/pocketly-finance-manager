// Must be imported before anything else so Sentry can instrument all modules.
import './instrument';

import { RequestMethod } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { toNodeHandler } from 'better-auth/node';
import {
  oauthProviderAuthServerMetadata,
  oauthProviderOpenIdConfigMetadata,
} from '@better-auth/oauth-provider';
import express from 'express';
import {
  apiBaseURL,
  auth,
  mcpResourceClientActions,
  mcpResourceUri,
} from './auth/auth.config';
import { AppModule } from './app.module';
import { requestIdMiddleware } from './common/logging/request-id.middleware';
import { buildOpenApiDocument } from './swagger';

async function bootstrap() {
  // Body parsing is off by default here so Better Auth's handler (mounted
  // below) can read the raw request body itself -- Nest's own json/urlencoded
  // parsers are added back further down, scoped to everything except
  // /api/auth, so they never race Better Auth for the request stream.
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(requestIdMiddleware);

  const corsOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({ origin: corsOrigins, credentials: true });

  // OAuth discovery documents (RFC 8414, RFC 9728) -- our issuer is
  // `${apiBaseURL}/api/auth` (Better Auth's baseURL + basePath), not bare
  // root, so both the legacy root-relative well-known paths AND the
  // path-aware variants RFC 8414/OIDC Discovery define for non-root
  // issuers need to resolve. The two conventions insert the issuer's path
  // differently (well-known-segment-then-path for the AS metadata doc,
  // path-then-well-known-segment for OIDC config), and the path-aware
  // openid-configuration route falls *under* /api/auth, so it must be
  // mounted before the catch-all auth handler below or the splat would
  // swallow it first.
  app.use(
    '/.well-known/oauth-authorization-server',
    toNodeHandler(oauthProviderAuthServerMetadata(auth)),
  );
  app.use(
    '/.well-known/oauth-authorization-server/api/auth',
    toNodeHandler(oauthProviderAuthServerMetadata(auth)),
  );
  app.use(
    '/.well-known/openid-configuration',
    toNodeHandler(oauthProviderOpenIdConfigMetadata(auth)),
  );
  app.use(
    '/api/auth/.well-known/openid-configuration',
    toNodeHandler(oauthProviderOpenIdConfigMetadata(auth)),
  );
  const serveProtectedResourceMetadata = (
    _req: express.Request,
    res: express.Response,
  ) => {
    void mcpResourceClientActions
      .getProtectedResourceMetadata({
        resource: mcpResourceUri,
        authorization_servers: [apiBaseURL],
      })
      .then((metadata) => res.json(metadata));
  };
  app.use(
    '/.well-known/oauth-protected-resource',
    serveProtectedResourceMetadata,
  );
  // Path-aware variant (RFC 9728) for a resource with a path component
  // (/mcp) -- confirmed needed: the plugin's own WWW-Authenticate header on
  // a failed verification points here specifically, not the bare form.
  app.use(
    '/.well-known/oauth-protected-resource/mcp',
    serveProtectedResourceMetadata,
  );

  app.use('/api/auth', toNodeHandler(auth));

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.setGlobalPrefix('api/v1', {
    exclude: [{ path: 'mcp', method: RequestMethod.ALL }],
  });

  const document = buildOpenApiDocument(app);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(process.env.PORT ?? 4000);
}
void bootstrap();
