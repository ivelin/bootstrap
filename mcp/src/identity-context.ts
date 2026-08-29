/**
 * Per-request hosted identity. Hosted-read creates one server per fetch.
 */
import type { HostedWhoami } from "./identity.js";

export type HostedRequestContext = {
  whoami: HostedWhoami;
};

export function anonymousWhoami(): HostedWhoami {
  return {
    authenticated: false,
    labels: [],
    reason: "missing_or_short_token",
    identityStore: "unset",
  };
}
