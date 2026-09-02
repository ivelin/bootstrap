/**
 * Resource-server challenge only. Authorization server is pirin.ai.
 * Do not add a login UI or a second OAuth server in this repo.
 * Login/OAuth stays Hold. This file is the 401 contract shape, not a login product.
 */
export const PIRIN_ORIGIN = "https://pirin.ai";

/** Production / main default. RFC 9728 protected-resource metadata on pirin.ai. */
export const PIRIN_PROTECTED_RESOURCE_METADATA_URL =
  `${PIRIN_ORIGIN}/.well-known/oauth-protected-resource`;

export const HOSTED_MCP_RESOURCE = "https://bootstrap-os-mcp.vercel.app/mcp";

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

/** Runtime metadata URL. Env override wins. Never a login UI on this host. */
export function protectedResourceMetadataUrl(): string {
  const override = process.env[OAUTH_RESOURCE_METADATA_ENV]?.trim();
  if (override && isAllowedProtectedResourceMetadataUrl(override)) {
    return override.replace(/\/+$/, "");
  }
  return PIRIN_PROTECTED_RESOURCE_METADATA_URL;
}

export function wwwAuthenticateChallengeFor(metadataUrl: string): string {
  return `Bearer realm="bootstrap-os-mcp", resource_metadata="${metadataUrl}", scope="bootstrap-os"`;
}

export const WWW_AUTHENTICATE_CHALLENGE = wwwAuthenticateChallengeFor(
  PIRIN_PROTECTED_RESOURCE_METADATA_URL,
);

export function wwwAuthenticateChallenge(): string {
  return wwwAuthenticateChallengeFor(protectedResourceMetadataUrl());
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
