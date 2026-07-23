# Safe Full-App Test Pass (with your account)

## Short answer

**Yes — give me a confirmed account, but make it a dedicated test account, not your main production login.**

A “real” account in the sense of *email confirmed on production Supabase* is fine. A *real working CRM packed with client leads/invoices* is not ideal for destructive CRUD checks (delete, bulk delete, convert, limit-fill).

## What I will / will not do

**Will do**
- Log in locally (`http://localhost:5173`) and on marketing/app domains only as needed for Phase 8
- Create a small number of clearly labeled test records (e.g. name prefix `QA FullPass …`)
- Edit / delete **only those QA records**
- Call edge functions with unauthenticated and wrong-user probes (safe; no cancelling a real subscription you care about)
- Report PASS/FAIL with evidence after each phase

**Will not do**
- Delete, bulk-edit, or convert existing non-QA leads/clients
- Cancel/change Paddle subscription, payment methods, or billing settings
- Touch `service_role`, other users’ data, or admin mass actions
- Force-push, revert, or “fix until it breaks” destructive migrations
- Exceed plan limits in a way that bricks a real paid workspace unless the account is disposable Trial/Starter test

## Account requirements (preferred)

Provide **one dedicated test user** with:

| Need | Why |
|------|-----|
| Email + password (or OTP you paste) | Session required for Phases 1–7 |
| Plan = **Trial** | Lead-limit (65) and chatbot visibility tests |
| Empty or nearly empty CRM | Safe delete/bulk/convert tests |
| **Not** admin (`role != admin`) | Phase 7 admin denial test |

Optionally later: a second **Starter** test account for AI-lock + no-chatbot checks (Phase 3.4 / 6.2). If you only have one account, we run Starter-specific items as COULDN’T-TEST.

## Execution order (unchanged)

1. Phase 1 Leads CRUD (QA-prefixed data only)
2. Phase 2 CSV import (+ Sheets only if already connected)
3. Phase 3 Templates & AI draft
4. Phase 4 Invoices & Revenue (public link + mark paid on QA invoice only)
5. Phase 5 Notes / Drawing Board
6. Phase 6 Chatbot
7. Phase 7 Limits & security (API bypass for 66th lead; edge-function 401/403; admin deny)
8. Phase 8 Domain/routing
9. Phase 9 Calendar/Sheets if connected; else COULDN’T-TEST

After each phase: short PASS/FAIL report, then continue.

## How you hand off credentials

Reply with (in chat is fine for a test account):

- Email
- Password
- Plan (trial / starter / pro)
- Confirmation it is **test-only** (OK to create/delete QA data)

If you prefer not to paste a password: confirm the existing `qa.fullpass.0723@reachdesk.test` user in Supabase Auth and paste the 6-digit OTP from email instead.

## Risk note

Even with care, UI bugs can happen. Using a disposable Trial account keeps blast radius near zero. **Do not give the admin (`dotthedart@…`) or any account with live client pipelines** unless you explicitly accept that risk and restrict me to read-only + additive QA-only actions (no deletes on existing rows).
