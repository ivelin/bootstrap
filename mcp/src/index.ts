#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createBootstrapServer } from "./server.js";

async function main() {
  const transport = new StdioServerTransport();
  const server = createBootstrapServer("full");
  await server.connect(transport);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
