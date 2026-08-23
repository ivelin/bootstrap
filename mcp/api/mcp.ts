import type { IncomingMessage, ServerResponse } from "node:http";
import { Readable } from "node:stream";
import { handleHostedReadFetch } from "../src/hosted-handler.js";

async function readBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function toWebRequest(req: IncomingMessage): Promise<Request> {
  const host = req.headers.host ?? "localhost";
  const proto = (req.headers["x-forwarded-proto"] as string) || "https";
  const url = `${proto}://${host}${req.url ?? "/mcp"}`;
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

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const webReq = await toWebRequest(req);
  const webRes = await handleHostedReadFetch(webReq);
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
