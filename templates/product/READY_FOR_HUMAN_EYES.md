# Ready for human eyes

**Status:** unknown  
**Date:** YYYY-MM-DD  
**Company:** [YOUR COMPANY]

Fail-closed **ship gate** before asking a mentor, beta, or stranger to use a product link.  
**What this is not:** demand, payment, or product–market fit.  
Portable checklist: Bootstrap OS `company-os/ready-for-human-eyes.md`.

---

## Founder fills this in (~2 minutes)

| Field | Your answer |
|-------|-------------|
| **Who** (one line) | |
| **Happy path** (plain steps) | |
| **Done means** | |
| **URL** (public or stable preview — not localhost-only) | |
| **Date** | |

---

## Evidence pack (cold context)

Run outside the founder’s usual session: sandbox browser, natural-language synthetic first-time user, and/or another device / incognito / phone.

| # | Check | Pass? | Notes |
|---|--------|-------|-------|
| 1 | Cold URL opens without founder-only session | ☐ | |
| 2 | Happy path reaches success end state | ☐ | |
| 3 | No blocking console / critical network errors on path | ☐ | |
| 4 | If embedded (iframe), scripts and interactivity actually run | ☐ | |
| 5 | Third-party auth / permissions (if any) grant and return work once | ☐ | |
| 6 | Optional: founder cold confirm on another device | ☐ | |

**Gate status:** ☐ unknown · ☐ blocked · ☐ **green**

If **blocked**, list blockers in plain language (one line each):

1.
2.
3.

---

## When green (fill after a real cold run)

**URL:**  
**Happy path:**  
**How verified:** sandbox browser / synthetic cold user / other device (pick)  
**Blockers found then fixed:** none | list

### Steps that passed

1.
2.

Then set `company/state/company-state.json` → `readyForHumanEyes.status` to `green` (and `checkedAt`).  
Only **then** draft “please try this” / mentor beta messages — or write a decision trace if you override a known-broken path.

Green expires when the happy path or deploy surface changes materially. Re-run before the next external ask.
