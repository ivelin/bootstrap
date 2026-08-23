#!/usr/bin/env node
/**
 * Optional local helper: listen on loopback and forward to the same
 * hosted-read fetch handler used on Vercel. Production is the Vercel
 * request handler (api/mcp.ts), not this process.
 */
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import { createServer } from "node:http";
import { Readable } from "node:stream";
import { pathToFileURL } from "node:url";
import { handleHostedReadFetch } from "./hosted-handler.js";

export type HostedHttpOptions = {
  host?: string;
  port?: number;
};

async function readBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function toWebRequest(req: IncomingMessage, host: string): Promise<Request> {
  const url = `http://${req.headers.host ?? `${host}`}${req.url ?? "/"}`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    headers.set(key, Array.isArray(value) ? value.join(", ") : value);
  }
  const method = (req.method ?? "GET").toUpperCase();
  if (method === "GET" || method === "HEAD") {
    return new Request(url, { method, headers });
  }
  const body = await readBody(req);
  return new Request(url, {
    method,
    headers,
    body: body.length ? new Uint8Array(body) : undefined,
  });
}

async function sendWebResponse(webRes: Response, res: ServerResponse): Promise<void> {
  res.statusCode = webRes.status;
  webRes.headers.forEach((value, key) => {
    if (key.toLowerCase() === "transfer-encoding") return;
    res.setHeader(key, value);
  });
  if (!webRes.body) {
    res.end();
    return;
  }
  Readable.fromWeb(webRes.body as import("node:stream/web").ReadableStream).pipe(res);
}

export async function startHostedReadServer(
  opts: HostedHttpOptions = {},
): Promise<{ url: string; port: number; host: string; close: () => Promise<void> }> {
  const host = opts.host ?? process.env.BOOTSTRAP_MCP_HTTP_HOST ?? "127.0.0.1";
  const port = opts.port ?? Number(process.env.BOOTSTRAP_MCP_HTTP_PORT ?? process.env.PORT ?? 0);

  const httpServer: Server = createServer(async (req, res) => {
    try {
      const webReq = await toWebRequest(req, host);
      const webRes = await handleHostedReadFetch(webReq);
      await sendWebResponse(webRes, res);
    } catch (e) {
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            jsonrpc: "2.0",
            error: {
              code: -32603,
              message: e instanceof Error ? e.message : "Internal server error",
            },
            id: null,
          }),
        );
      }
    }
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
  console.error(`bootstrap-os hosted-read local helper listening on ${started.url}`);
  console.error("Vercel request handler is api/mcp.ts. This process is local-only.");
}

const invokedAsMain =
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]!).href;

if (invokedAsMain) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
