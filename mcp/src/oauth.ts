/**
 * Resource-server challenge only. Authorization server is pirin.ai.
 * Do not add a login UI or a second OAuth server in this repo.
 */
export const PIRIN_ORIGIN = "https://pirin.ai";

/** Production / merge authorize URL. Not the bare origin — prod pirin.ai AS root is 404. */
export const PIRIN_AUTHORIZATION_SERVER = `${PIRIN_ORIGIN}/bootstrap-os/login`;

/**
 * Hold-preview authorize URL (#143 Sign in). Used when VERCEL_ENV=preview.
 * Clients that read origin well-known instead of 401 resource_metadata must land here.
 */
export const PREVIEW_PIRIN_AUTHORIZATION_SERVER =
  "https://v0-pirin-ai-founder-studio-git-be053a-ivelins-projects-9f9b7132.vercel.app/bootstrap-os/login";

/** #143 preview origin. Endpoints stay here — never on the MCP host. */
export const PREVIEW_PIRIN_LOGIN_ORIGIN =
  "https://v0-pirin-ai-founder-studio-git-be053a-ivelins-projects-9f9b7132.vercel.app";

/**
 * RFC 8414 document Cos fetched from the #143 preview login AS.
 * This host only copies the JSON. It does not serve /oauth/token or /oauth/register.
 */
export const PREVIEW_AUTHORIZATION_SERVER_METADATA = {
  issuer: PREVIEW_PIRIN_AUTHORIZATION_SERVER,
  authorization_endpoint: PREVIEW_PIRIN_AUTHORIZATION_SERVER,
  token_endpoint: `${PREVIEW_PIRIN_LOGIN_ORIGIN}/oauth/token`,
  registration_endpoint: `${PREVIEW_PIRIN_LOGIN_ORIGIN}/oauth/register`,
  response_types_supported: ["code"],
  grant_types_supported: ["authorization_code"],
  code_challenge_methods_supported: ["S256"],
  token_endpoint_auth_methods_supported: ["none"],
  scopes_supported: ["bootstrap-os", "openid", "profile", "email"],
  service_documentation: PREVIEW_PIRIN_AUTHORIZATION_SERVER,
} as const;

/** Merge / production RFC 8414. Do not emit this on VERCEL_ENV=preview. */
export const PIRIN_AUTHORIZATION_SERVER_METADATA = {
  issuer: PIRIN_AUTHORIZATION_SERVER,
  authorization_endpoint: PIRIN_AUTHORIZATION_SERVER,
  token_endpoint: `${PIRIN_ORIGIN}/oauth/token`,
  registration_endpoint: `${PIRIN_ORIGIN}/oauth/register`,
  response_types_supported: ["code"],
  grant_types_supported: ["authorization_code"],
  code_challenge_methods_supported: ["S256"],
  token_endpoint_auth_methods_supported: ["none"],
  scopes_supported: ["bootstrap-os", "openid", "profile", "email"],
  service_documentation: PIRIN_AUTHORIZATION_SERVER,
} as const;

/** Production / main default. Web Builder publishes RFC 9728 here after pirin-ai merge. */
export const PIRIN_PROTECTED_RESOURCE_METADATA_URL =
  `${PIRIN_ORIGIN}/.well-known/oauth-protected-resource`;

/**
 * Temporary preview target until pirin-ai #143 merges.
 * Used when BOOTSTRAP_OAUTH_RESOURCE_METADATA is unset and VERCEL_ENV=preview.
 * Production / main must not use this.
 */
export const PREVIEW_PIRIN_PROTECTED_RESOURCE_METADATA_URL =
  "https://v0-pirin-ai-founder-studio-git-be053a-ivelins-projects-9f9b7132.vercel.app/.well-known/oauth-protected-resource";

/** Public pin. Production / merge only. Never emit this as the resource on VERCEL_ENV=preview. */
export const HOSTED_MCP_RESOURCE = "https://bootstrap-os-mcp.vercel.app/mcp";

/** Canonical public no-SSO git preview for PR #17. */
export const PREVIEW_HOSTED_MCP_RESOURCE =
  "https://bootstrap-os-mcp-git-cursor-ho-16df4d-ivelins-projects-9f9b7132.vercel.app/mcp";

export const OAUTH_RESOURCE_METADATA_ENV = "BOOTSTRAP_OAUTH_RESOURCE_METADATA";

export function isAllowedProtectedResourceMetadataUrl(raw: string): boolean {
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "https:") return false;
    if (url.username || url.password) return false;
    return url.pathname.replace(/\/+$/, "") === "/.well-known/oauth-protected-resource";
  } catch {
    return false;
  }
}

function stripProto(host: string): string {
  return host.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

export function normalizeMcpResource(raw: string): string {
  const host = stripProto(raw).replace(/\/mcp$/i, "");
  return `https://${host}/mcp`;
}

export function isProdPinResource(url: string): boolean {
  return normalizeMcpResource(url) === HOSTED_MCP_RESOURCE;
}

function resourceFromRequest(req?: Request): string | undefined {
  if (!req) return undefined;
  try {
    const parsed = new URL(req.url);
    const host = (
      req.headers.get("x-forwarded-host") ||
      req.headers.get("host") ||
      parsed.host ||
      ""
    )
      .split(",")[0]
      .trim();
    if (!host) return undefined;
    return normalizeMcpResource(host);
  } catch {
    return undefined;
  }
}

/**
 * Protected-resource identifier this host advertises.
 * Preview (VERCEL_ENV=preview) derives from the request host / Vercel preview URL.
 * Never the production pin on preview. Merge / production is the public pin.
 */
export function hostedMcpResource(req?: Request): string {
  if (process.env.VERCEL_ENV === "preview") {
    const fromReq = resourceFromRequest(req);
    if (fromReq && !isProdPinResource(fromReq)) return fromReq;
    const branch = process.env.VERCEL_BRANCH_URL?.trim();
    if (branch) return normalizeMcpResource(branch);
    const vercelUrl = process.env.VERCEL_URL?.trim();
    if (vercelUrl) return normalizeMcpResource(vercelUrl);
    return PREVIEW_HOSTED_MCP_RESOURCE;
  }
  return HOSTED_MCP_RESOURCE;
}

/** Runtime metadata URL. Env override wins. Preview (not production) falls back to #143. */
export function protectedResourceMetadataUrl(): string {
  const override = process.env[OAUTH_RESOURCE_METADATA_ENV]?.trim();
  if (override && isAllowedProtectedResourceMetadataUrl(override)) {
    return override.replace(/\/+$/, "");
  }
  if (process.env.VERCEL_ENV === "preview") {
    return PREVIEW_PIRIN_PROTECTED_RESOURCE_METADATA_URL;
  }
  return PIRIN_PROTECTED_RESOURCE_METADATA_URL;
}

/**
 * authorization_servers entry this origin well-known advertises.
 * Preview (VERCEL_ENV=preview, or request host is this Hold preview) → #143 login.
 * Merge / production → https://pirin.ai/bootstrap-os/login (not bare https://pirin.ai).
 */
export function isPreviewAuthorizationIssuer(req?: Request): boolean {
  if (process.env.VERCEL_ENV === "preview") return true;
  if (process.env.VERCEL_ENV === "production") return false;
  const fromReq = resourceFromRequest(req);
  return fromReq === PREVIEW_HOSTED_MCP_RESOURCE;
}

/**
 * Hold preview only: initialize / GET SSE / tools/list 401 without a Bearer.
 * Never true for the production pin hostname. Prod initialize stays HTTP 200.
 */
export function requiresPreviewHandshakeAuth(req?: Request): boolean {
  const fromReq = resourceFromRequest(req);
  if (fromReq && isProdPinResource(fromReq)) return false;
  if (process.env.VERCEL_ENV === "production") return false;
  if (process.env.VERCEL_ENV === "preview") return true;
  return fromReq === PREVIEW_HOSTED_MCP_RESOURCE;
}

export function authorizationServerUrl(req?: Request): string {
  return isPreviewAuthorizationIssuer(req)
    ? PREVIEW_PIRIN_AUTHORIZATION_SERVER
    : PIRIN_AUTHORIZATION_SERVER;
}

/** RFC 8414 metadata. Preview copies the #143 document. Endpoints stay on pirin-ai. */
export function authorizationServerMetadataDocument(req?: Request): typeof PREVIEW_AUTHORIZATION_SERVER_METADATA | typeof PIRIN_AUTHORIZATION_SERVER_METADATA {
  return isPreviewAuthorizationIssuer(req)
    ? PREVIEW_AUTHORIZATION_SERVER_METADATA
    : PIRIN_AUTHORIZATION_SERVER_METADATA;
}

export function wwwAuthenticateChallengeFor(
  metadataUrl: string,
  resourceUrl: string = HOSTED_MCP_RESOURCE,
): string {
  return `Bearer realm="bootstrap-os-mcp", resource_metadata="${metadataUrl}", resource="${resourceUrl}", scope="bootstrap-os"`;
}

/** Production / main default challenge (no env, not a Vercel preview). */
export const WWW_AUTHENTICATE_CHALLENGE = wwwAuthenticateChallengeFor(
  PIRIN_PROTECTED_RESOURCE_METADATA_URL,
  HOSTED_MCP_RESOURCE,
);

export function wwwAuthenticateChallenge(req?: Request): string {
  return wwwAuthenticateChallengeFor(protectedResourceMetadataUrl(), hostedMcpResource(req));
}

export function protectedResourceMetadataDocument(req?: Request): {
  resource: string;
  authorization_servers: string[];
  scopes_supported: string[];
  bearer_methods_supported: string[];
} {
  return {
    resource: hostedMcpResource(req),
    authorization_servers: [authorizationServerUrl(req)],
    scopes_supported: ["bootstrap-os"],
    bearer_methods_supported: ["header"],
  };
}

export function isJwtAccessToken(token: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0].length < 8) return false;
  try {
    const header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8")) as {
      typ?: string;
      alg?: string;
    };
    return Boolean(header.alg);
  } catch {
    return false;
  }
}
