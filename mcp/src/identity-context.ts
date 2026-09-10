/**
 * Per-request hosted identity. Hosted-read creates one server per fetch.
 */
import type { HostedWhoami } from "./identity.js";
import type { JourneyActor } from "./journey-auth.js";

export type HostedRequestContext = {
  whoami: HostedWhoami;
  resource?: string;
  /** Journey ACL actor. Separate from whoami labels. Owner comes from ACL, not free text. */
  actor?: JourneyActor;
  /** JWT email/sub for invite/accept. Present even when whoami is not_invited. */
  inviteActor?: { email?: string; sub?: string };
  /** Raw pirin.ai access token. Invite RPCs use it. Never log. */
  accessToken?: string;
};

export function anonymousWhoami(): HostedWhoami {
  return {
    authenticated: false,
    labels: [],
    reason: "missing_or_short_token",
    identityStore: "unset",
  };
}
