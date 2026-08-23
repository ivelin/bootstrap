import type { IncomingMessage, ServerResponse } from "node:http";
import { handleHostedReadFetch } from "../src/hosted-handler.js";

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const host = req.headers.host ?? "localhost";
  const proto = (req.headers["x-forwarded-proto"] as string) || "https";
  const webReq = new Request(`${proto}://${host}/health`, { method: req.method ?? "GET" });
  const webRes = await handleHostedReadFetch(webReq);
  res.statusCode = webRes.status;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end(await webRes.text());
}
