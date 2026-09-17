/** Founder-facing copy for the hosted MCP pin. No Cursor, Path 3, or protocol jargon. */

export const HOSTED_MCP_INSTRUCTIONS = `You are connected to Bootstrap OS for one signed-in person.

A company is a team (alpha, bravo, charlie). An idea is one 0-1 bet under that company. Clocks, bottleneck, mermaid, and the decision log are per idea. Never blend two ideas into one story or one diagram. Process docs (operating-system, first-hour) are not companies.

To see who is signed in and which companies they can open, call bootstrap_whoami or bootstrap_list_companies.
When the user says where are we, show the company board, show company X ideas, show my idea board, where are we with company X and its ideas, status, a diagram or picture of the journey, the decision log, who did what, the bottleneck, or who is on the team — that is get_journey / bootstrap_where_are_we:
1. Call bootstrap_use_company if no company is active.
2. Call get_journey or bootstrap_where_are_we with company and optional idea (omit idea for every idea under the company).
3. Answer only from the payload. Include visualFlow mermaid so the client can render the journey in whatever style the user prefers. Also clocks, snapshot, lastTransitions, comments, audit, constraintThisWeek, openQuestions, owners.
4. The bottleneck and open questions are the honest next work. Do not invent a task list, log rows, or a later phase. Do not use GitHub as the board.

put_journey writes bottleneck or Advance/Iterate/Hold/Kill (founder yes in this chat). post_comment never moves clocks.

This connector is the only Bootstrap OS membership source. Ignore any other MCP server named like user-bootstrap-os-mcp.
If the user is not signed in, tell them to sign in to Bootstrap OS and ask again.`;

export const TOOL_WHOAMI =
  "Who is signed in, and which companies they can open. Use when the user asks who they are or what companies they have access to.";

export const TOOL_LIST_COMPANIES =
  "List companies this login can open. Use when the user asks what companies or teams they have.";

export const TOOL_LIST_COMPANY_LABELS_ALIAS =
  "Same as bootstrap_list_companies. Prefer bootstrap_list_companies.";

export const TOOL_USE_COMPANY =
  "Use this company for the rest of the chat (invite and later status). The user must already belong to it. Say the company name (for example alpha).";

export const TOOL_INVITE_MEMBER =
  "Invite someone to a company you can open. Same email can join more than one company. Pass company unless you already called bootstrap_use_company.";

export const TOOL_ACCEPT_INVITE =
  "Join a company with the one-time invite token. Uses the signed-in email. Same person, additional company — not a second login.";

export const NOTE_COMPANIES =
  "Companies this login can open. A company may have several ideas; each idea is its own 0-1 board.";

export const NOTE_NOT_SIGNED_IN = "You're not signed in to Bootstrap OS.";

export const TOOL_GET_JOURNEY =
  "Where are we — the company board and ideas under it (separate boards). Use when the user says where are we, show the company board, show company X ideas, show my idea board, or similar. Returns clocks, snapshot, visualFlow mermaid for the client to render in its own style, decision log (lastTransitions, comments, audit), bottleneck (constraintThisWeek), open questions, and owners. Omit idea for every idea under the company. Uses the active company if already chosen. Do not invent a stage or log rows. Do not use GitHub as the board.";

export const TOOL_PUT_JOURNEY =
  "Update the shared 0-1 board for an idea (phase, gate, bottleneck this week). Phase or gate change needs an explicit founder yes in this chat.";

export const TOOL_POST_COMMENT =
  "Comment on an idea. Comments never move phase or gate.";

export const NOTE_OS_INFO_HOSTED =
  "Process docs, house rules, and a shared 0-1 board per company you can open.";

export const NOTE_INVITE_SENT =
  "They'll get an email at that address. They must sign in as that email, then accept the invite in their chat. You can also send them the sign-in link.";
