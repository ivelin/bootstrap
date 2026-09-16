/** Founder-facing copy for the hosted MCP pin. No Cursor, Path 3, or protocol jargon. */

export const HOSTED_MCP_INSTRUCTIONS = `You are connected to Bootstrap OS for one signed-in person.

That person can belong to several companies. A company is a team (for example pirin, zk0, totbox). Under a company there may be several ideas; each idea has its own 0-1 board. Do not blend two ideas into one story. Do not treat process docs (operating-system, first-hour, ready-for-human-eyes) as companies.

To see who is signed in and which companies they can open, call bootstrap_whoami or bootstrap_list_companies.
To work in one company for this chat, call bootstrap_use_company.
To see the shared 0-1 board, call get_journey or bootstrap_where_are_we (uses the active company if the user already chose one). Return the snapshot, mermaid, and the decision log (lastTransitions, comments, audit). Do not invent log entries. Do not paste GitHub or a website as the board.
This connector is the only Bootstrap OS membership source. Ignore any other MCP server named like user-bootstrap-os-mcp.

If the user is not signed in, tell them to sign in to Bootstrap OS and ask again.`;

export const TOOL_WHOAMI =
  "Who is signed in, and which companies they can open. Use when the user asks who they are or what companies they have access to.";

export const TOOL_LIST_COMPANIES =
  "List companies this login can open. Use when the user asks what companies or teams they have.";

export const TOOL_LIST_COMPANY_LABELS_ALIAS =
  "Same as bootstrap_list_companies. Prefer bootstrap_list_companies.";

export const TOOL_USE_COMPANY =
  "Use this company for the rest of the chat (invite and later status). The user must already belong to it. Say the company name (for example zk0).";

export const TOOL_INVITE_MEMBER =
  "Invite someone to a company you can open. Same email can join more than one company. Pass company unless you already called bootstrap_use_company.";

export const TOOL_ACCEPT_INVITE =
  "Join a company with the one-time invite token. Uses the signed-in email. Same person, additional company — not a second login.";

export const NOTE_COMPANIES =
  "Companies this login can open. A company may have several ideas; each idea is its own 0-1 board.";

export const NOTE_NOT_SIGNED_IN = "You're not signed in to Bootstrap OS.";

export const TOOL_GET_JOURNEY =
  "Where are we on a company or idea. Shared 0-1 snapshot and mermaid. Uses the active company if already chosen. Do not invent a stage. Do not use GitHub as the board.";

export const TOOL_PUT_JOURNEY =
  "Update the shared 0-1 board for an idea (phase, gate, bottleneck this week). Phase or gate change needs an explicit founder yes in this chat.";

export const TOOL_POST_COMMENT =
  "Comment on an idea. Comments never move phase or gate.";

export const NOTE_OS_INFO_HOSTED =
  "Process docs, house rules, and a shared 0-1 board per company you can open.";

export const NOTE_INVITE_SENT =
  "They'll get an email at that address. They must sign in as that email, then accept the invite in their chat. You can also send them the sign-in link.";
