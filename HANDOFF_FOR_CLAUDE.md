# WahalaVerse — product/implementation handoff

## The product in one sentence
**WahalaVerse** is a mobile-first Nigerian 18+ entertainment website designed to spread through funny, personalized challenges shared on WhatsApp. "Catch cruise, not feelings."

## Why build it
Acquire users through social sharing, then retain them with light fun experiences. The main initial success metric is how many people who finish somebody else's friendship challenge start creating their own; secondary metrics are play completion rate, share/link-open funnel, return sessions and optional-account conversion.

## Audience and UX
- Primary: young adults in Nigeria, mobile-first, WhatsApp Status/groups + X + TikTok referrals.
- Modern, legible, energetic, playful Nigerian slang, but clear English calls to action.
- Play without an account. Ask for name/email only when saving history or a challenge to a personal account.
- Keep load and data costs low. Avoid very heavy video or automatic downloads.

## Scope v1
1. **Predict My Wahala**: creator answers seven funny questions; player guesses creator's answers; gives a shareable link and a funny scorecard; prompts participant to make their own.
2. **Survive Naija**: short choice-based life simulation about salary / family / rent; tracks fictional balance, peace of mind, street cred; simple sharable outcome.
3. **My Corner**: recent challenges/activity with guest-local history and Supabase cloud history for signed-in users.
4. **Auth + storage**: verified email magic link and display name, 18+ beta registration confirmation; three small Supabase tables already proposed. No phone contacts, location, payment cards or unnecessary sensitive details.

## Not for the first public beta
- Real-time chat or social feed, infinite UGC, ads network integration, wagering/prizes, payment gateway, followers, public leaderboards, AI-generated content needing paid APIs, full native Android app.
- Large framework migration absent a user-visible improvement.

## Security/privacy and product caveats to resolve
- On this starter, user signup, cross-device storage and account data flows are NOT independently verified against real Supabase.
- `privacy.html` lacks final operator contact details and legal review.
- Deletion/export process not built.
- Session-local/guest activity syncing needs specific cross-user privacy audit.
- Link quiz answers are encoded client-side and technically visible; OK for casual fun, not secure competitions.
- Production email deliverability/abuse limits/deployment domain remain unconfigured.
- Database policies need real integration tests and documentation.
- Claiming "18+" in a checkbox alone is not enough to claim legal compliance.

## Collaboration model
Claude Code writes/tests code in its GitHub-backed environment. The ChatGPT reviewer provides product requirements, reviews PR diffs/test reports, and approves or requests changes together with the owner. Claude does not have autonomous permission to deploy, spend, collect real user data, or perform destructive operations. A code repository plus this brief is the source of truth. Nothing is connected automatically between Claude Code and this chat.

## First task for Claude Code
Read `CLAUDE.md`, `HANDOFF_FOR_CLAUDE.md` and `README.md`. Inventory the code and inspect actual behavior before editing. Produce a short implementation plan, then implement only **Milestone 1** in `CLAUDE.md` on a feature branch, with tests and a review summary. Do not require live Supabase credentials. Push changes as a PR, if GitHub integration supports it. When done, include a `REVIEW_NOTES.md` outlining tested functionality, known limitations and handoffs requiring human action. We will review before proceeding to account setup.

## Review report template
- Feature branch / PR link:
- Summary of changes:
- Tests run and results:
- Mobile test results:
- Security/privacy concerns:
- User action needed:
- Ready for Milestone 2? (yes/no + reason):
