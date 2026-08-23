#!/usr/bin/env node
/**
 * Preview Streamable HTTP transport for the same MCP server.
 * Hosted-read surface only: OS info / docs / house-rule pins.
 * Does not host founder company-state. Write/init/use-company stays stdio (path 3).
 */
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import { createServer } from "node:http";
import { pathToFileURL } from "node:url";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createBootstrapServer } from "./server.js";

export type HostedHttpOptions = {
  host?: string;
  port?: number;
};

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on("end", () => {
      if (chunks.length === 0) {
        resolve(undefined);
        return;
      }
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw.trim()) {
        resolve(undefined);
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

async function handleMcp(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const server = createBootstrapServer("hosted-read");
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  await server.connect(transport);
  const parsedBody = req.method === "POST" ? await readJsonBody(req) : undefined;
  res.on("close", () => {
    void transport.close();
    void server.close();
  });
  await transport.handleRequest(req, res, parsedBody);
}

export async function startHostedReadServer(
  opts: HostedHttpOptions = {},
): Promise<{ url: string; port: number; host: string; close: () => Promise<void> }> {
  process.env.BOOTSTRAP_MCP_SURFACE = "hosted-read";
  const host = opts.host ?? process.env.BOOTSTRAP_MCP_HTTP_HOST ?? "127.0.0.1";
  const port = opts.port ?? Number(process.env.BOOTSTRAP_MCP_HTTP_PORT ?? process.env.PORT ?? 0);

  const httpServer: Server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://${host}`);
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Accept, MCP-Session-Id, MCP-Protocol-Version",
      });
      res.end();
      return;
    }
    if (url.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("ok");
      return;
    }
    if (url.pathname === "/mcp") {
      try {
        await handleMcp(req, res);
      } catch (e) {
        if (!res.headersSent) {
          sendJson(res, 500, {
            jsonrpc: "2.0",
            error: {
              code: -32603,
              message: e instanceof Error ? e.message : "Internal server error",
            },
            id: null,
          });
        }
      }
      return;
    }
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Preview hosted-read MCP. POST /mcp. Not mentee-ready boards.");
  });

  await new Promise<void>((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(port, host, () => resolve());
  });

  const address = httpServer.address();
  if (!address || typeof address === "string") {
    throw new Error("HTTP server failed to bind");
  }
  const boundPort = address.port;
  const url = `http://${host}:${boundPort}/mcp`;

  return {
    url,
    port: boundPort,
    host,
    close: () =>
      new Promise((resolve, reject) => {
        httpServer.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}

async function main() {
  const started = await startHostedReadServer({
    port: Number(process.env.BOOTSTRAP_MCP_HTTP_PORT ?? process.env.PORT ?? 8787),
  });
  console.error(`bootstrap-os hosted-read preview listening on ${started.url}`);
  console.error("Read adapter only. No founder company-state. Path 1 stays the front door.");
}

const invokedAsMain =
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]!).href;

if (invokedAsMain) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
