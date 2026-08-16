import { Controller, Get, Header, Query } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { apiBaseURL } from '../auth/auth.config';
import { Public } from '../common/auth/public.decorator';

const AUTH_BASE = `${apiBaseURL}/api/auth`;

const PAGE_STYLES = `
  body { font-family: Georgia, 'Times New Roman', serif; background: #f6f2ea; color: #23201b;
    display: flex; min-height: 100vh; align-items: center; justify-content: center; margin: 0; }
  .card { background: #fffdf9; border: 1px solid #e2dccd; border-radius: 4px; padding: 2rem;
    width: 100%; max-width: 360px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
  h1 { font-size: 1.25rem; margin: 0 0 0.25rem; color: #193b24; }
  p.sub { font-size: 0.85rem; color: #6b6154; margin: 0 0 1.5rem; }
  label { display: block; font-size: 0.8rem; margin-bottom: 0.25rem; }
  input { width: 100%; box-sizing: border-box; padding: 0.5rem; margin-bottom: 1rem;
    border: 1px solid #cfc7b4; border-radius: 3px; font-size: 0.95rem; font-family: inherit; }
  button { width: 100%; padding: 0.6rem; border: none; border-radius: 3px; font-size: 0.9rem;
    cursor: pointer; font-family: inherit; }
  button.primary { background: #193b24; color: #fdfaf3; margin-bottom: 0.5rem; }
  button.secondary { background: transparent; color: #6b6154; border: 1px solid #cfc7b4; }
  .scopes { list-style: none; padding: 0; margin: 0 0 1.5rem; font-size: 0.85rem; }
  .scopes li { padding: 0.35rem 0; border-bottom: 1px solid #f0ebe0; }
  .error { color: #a3432f; font-size: 0.85rem; margin-bottom: 1rem; }
`;

const SCOPE_DESCRIPTIONS: Record<string, string> = {
  'pocketly:read':
    'View your accounts, records, budgets, categories, and analysis',
  'pocketly:write': 'Create, edit, and delete records on your behalf',
  openid: 'Confirm your identity',
  profile: 'Read your name',
  email: 'Read your email address',
  offline_access: 'Stay connected between sessions',
};

/**
 * Same-origin login/consent screens for the MCP OAuth flow, served directly
 * by the API (not apps/web) -- see the MCP plan's design decision on why:
 * the authorize step is a top-level browser redirect that needs a
 * same-origin session cookie, and apps/web deliberately avoids relying on
 * Better Auth's native cookie for its own (bearer-token) auth flow.
 */
@Controller('mcp')
@Public()
@ApiExcludeController()
export class McpPagesController {
  @Get('login')
  @Header('Content-Type', 'text/html')
  login(@Query() query: Record<string, string>): string {
    const search = new URLSearchParams(query).toString();
    return `<!doctype html>
<html><head><meta charset="utf-8"><title>Sign in - Pocketly</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>${PAGE_STYLES}</style></head>
<body>
  <div class="card">
    <h1>Pocketly</h1>
    <p class="sub">Sign in to connect this app to your ledger.</p>
    <div id="error" class="error" style="display:none"></div>
    <form id="form">
      <label for="email">Email</label>
      <input id="email" type="email" required autocomplete="email">
      <label for="password">Password</label>
      <input id="password" type="password" required autocomplete="current-password">
      <button type="submit" class="primary">Sign in</button>
    </form>
  </div>
  <script>
    const search = ${JSON.stringify(search)};
    const form = document.getElementById('form');
    const errorEl = document.getElementById('error');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorEl.style.display = 'none';
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const res = await fetch(${JSON.stringify(`${AUTH_BASE}/sign-in/email`)}, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        errorEl.textContent = "Couldn't sign you in. Check your details.";
        errorEl.style.display = 'block';
        return;
      }
      window.location.href = ${JSON.stringify(`${AUTH_BASE}/oauth2/authorize`)} + '?' + search;
    });
  </script>
</body></html>`;
  }

  @Get('consent')
  @Header('Content-Type', 'text/html')
  consent(@Query() query: Record<string, string>): string {
    const search = new URLSearchParams(query).toString();
    const clientId = query.client_id ?? 'This app';
    const scopes = (query.scope ?? '').split(' ').filter(Boolean);
    const scopeItems = scopes
      .map(
        (scope) => `<li>${escapeHtml(SCOPE_DESCRIPTIONS[scope] ?? scope)}</li>`,
      )
      .join('');

    return `<!doctype html>
<html><head><meta charset="utf-8"><title>Connect an app - Pocketly</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>${PAGE_STYLES}</style></head>
<body>
  <div class="card">
    <h1>Connect ${escapeHtml(clientId)}</h1>
    <p class="sub">This app is asking for permission to:</p>
    <ul class="scopes">${scopeItems}</ul>
    <div id="error" class="error" style="display:none"></div>
    <button id="allow" class="primary">Allow</button>
    <button id="deny" class="secondary">Deny</button>
  </div>
  <script>
    const search = ${JSON.stringify(search)};
    const scope = ${JSON.stringify(query.scope ?? '')};
    const errorEl = document.getElementById('error');

    async function respond(accept) {
      const res = await fetch(${JSON.stringify(`${AUTH_BASE}/oauth2/consent`)}, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ accept, scope, oauth_query: search }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.url) {
        errorEl.textContent = "Something went wrong completing the connection.";
        errorEl.style.display = 'block';
        return;
      }
      window.location.href = data.url;
    }

    document.getElementById('allow').addEventListener('click', () => respond(true));
    document.getElementById('deny').addEventListener('click', () => respond(false));
  </script>
</body></html>`;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
