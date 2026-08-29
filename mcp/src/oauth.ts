/**
 * Resource-server challenge only. Authorization server is pirin.ai.
 * Do not add a login UI or a second OAuth server in this repo.
 */
export const PIRIN_ORIGIN = "https://pirin.ai";

/** Web Builder must publish RFC 9728 metadata at this URL. */
export const PIRIN_PROTECTED_RESOURCE_METADATA_URL =
  `${PIRIN_ORIGIN}/.well-known/oauth-protected-resource`;

export const HOSTED_MCP_RESOURCE = "https://bootstrap-os-mcp.vercel.app/mcp";

export function wwwAuthenticateChallenge(): string {
  return `Bearer realm="bootstrap-os-mcp", resource_metadata="${PIRIN_PROTECTED_RESOURCE_METADATA_URL}", error="invalid_token"`;
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
