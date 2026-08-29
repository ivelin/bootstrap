/**
 * Resource-server challenge only. Authorization server is pirin.ai.
 * Do not add a login UI or a second OAuth server in this repo.
 */
export const PIRIN_ORIGIN = "https://pirin.ai";

/** Web Builder must publish RFC 9728 metadata at this URL. */
export const PIRIN_PROTECTED_RESOURCE_METADATA_URL =
  `${PIRIN_ORIGIN}/.well-known/oauth-protected-resource`;

export const HOSTED_MCP_RESOURCE = "https://bootstrap-os-mcp.vercel.app/mcp";

/** Exact challenge Web Builder and MCP clients must parse. */
export const WWW_AUTHENTICATE_CHALLENGE =
  `Bearer realm="bootstrap-os-mcp", resource_metadata="${PIRIN_PROTECTED_RESOURCE_METADATA_URL}", scope="bootstrap-os"`;

export function wwwAuthenticateChallenge(): string {
  return WWW_AUTHENTICATE_CHALLENGE;
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
