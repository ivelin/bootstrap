import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  BOOTSTRAP_BILL_URL,
  HOSTED_BILL_GROK_LINE,
  HOSTED_MCP_INSTRUCTIONS,
  detectGrokClient,
  hostedInstructionsForClient,
} from "../dist/hosted-copy.js"

describe("hosted Bill hint", () => {
  it("detects Grok-shaped client names and agents only", () => {
    assert.equal(detectGrokClient({ clientName: "Grok Bot" }), true)
    assert.equal(detectGrokClient({ userAgent: "xAI-Grok/1" }), true)
    assert.equal(detectGrokClient({ clientName: "claude-code" }), false)
    assert.equal(detectGrokClient({ clientName: "access-layer" }), false)
  })

  it("keeps Bill off the non-Grok instruction blob", () => {
    const other = hostedInstructionsForClient({ clientName: "access-layer" })
    assert.doesNotMatch(other, /x.ai\/bot/)
    assert.ok(!other.includes(HOSTED_BILL_GROK_LINE))
    const grok = hostedInstructionsForClient({ clientName: "grok-bot" })
    assert.equal(grok, HOSTED_MCP_INSTRUCTIONS)
    assert.match(grok, new RegExp(BOOTSTRAP_BILL_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
  })
})
