/**
 * Web-standard request handler for the hosted-read MCP surface.
 * Used by the Vercel function entry and the optional local HTTP helper.
 * Does not listen on 127.0.0.1. Does not host founder company-state.
 */
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { isHostedGatedToolName } from "./constants.js";
import { resolveHostedWhoami, type HostedWhoami } from "./identity.js";
import { wwwAuthenticateChallenge } from "./oauth.js";
import { createBootstrapServer } from "./server.js";

export function applyHostedReadEnv(): void {
  process.env.BOOTSTRAP_MCP_SURFACE = "hosted-read";
  if (!process.env.BOOTSTRAP_OS_DOCS_SOURCE) {
    process.env.BOOTSTRAP_OS_DOCS_SOURCE = "published";
  }
}

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Accept, Authorization, MCP-Session-Id, MCP-Protocol-Version, Mcp-Session-Id, Last-Event-ID",
    "Access-Control-Expose-Headers": "WWW-Authenticate",
  };
}

function gatedToolNameFromRpc(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const msg = body as { method?: unknown; params?: { name?: unknown } };
  if (msg.method !== "tools/call") return undefined;
  const name = msg.params?.name;
  return typeof name === "string" && isHostedGatedToolName(name) ? name : undefined;
}

export function unauthorizedGatedToolResponse(whoami?: HostedWhoami): Response {
  const headers = {
    ...corsHeaders(),
    "WWW-Authenticate": wwwAuthenticateChallenge(),
    "Content-Type": "application/json; charset=utf-8",
  };
  return new Response(
    JSON.stringify({
      error: "invalid_token",
      error_description:
        "Gated tools require a pirin.ai access token. Public OS tools stay open. Login lives on pirin.ai — not this host.",
      identityStore: whoami?.identityStore ?? "unset",
    }),
    { status: 401, headers },
  );
}

function withCors(res: Response): Response {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(corsHeaders())) {
    headers.set(k, v);
  }
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}

function pathnameOf(req: Request): string {
  try {
    return new URL(req.url).pathname.replace(/\/+$/, "") || "/";
  } catch {
    return "/";
  }
}

function isHealthPath(pathname: string): boolean {
  return pathname === "/health" || pathname.endsWith("/health");
}

function isMcpPath(pathname: string): boolean {
  return pathname === "/mcp" || pathname.endsWith("/mcp");
}

export async function handleHostedReadFetch(req: Request): Promise<Response> {
  applyHostedReadEnv();
  const pathname = pathnameOf(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (isHealthPath(pathname)) {
    return new Response("ok", {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8", ...corsHeaders() },
    });
  }

  if (!isMcpPath(pathname)) {
    return new Response("Preview hosted-read MCP. POST /mcp. Not mentee-ready boards.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8", ...corsHeaders() },
    });
  }

  const whoami = await resolveHostedWhoami(req.headers.get("authorization"));
  if (req.method === "POST") {
    let rpcBody: unknown = null;
    try {
      rpcBody = await req.clone().json();
    } catch {
      rpcBody = null;
    }
    if (gatedToolNameFromRpc(rpcBody) && !whoami.authenticated) {
      return unauthorizedGatedToolResponse(whoami);
    }
  }

  const server = createBootstrapServer("hosted-read", { whoami });
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
    enableDnsRebindingProtection: false,
  });
  await server.connect(transport);
  const res = await transport.handleRequest(req);
  return withCors(res);
}
