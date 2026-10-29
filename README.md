# WahalaVerse — mobile-first web MVP 🇳🇬

A working, lightweight entertainment website for Nigerian young adults. Includes:

- **Predict My Wahala**: seven funny questions, answer-key creation, shareable friend challenge link, scoring and a replay/share loop.
- **Survive Naija**: a four-round salary-and-life-decisions mini-game, with financial, peace-of-mind and street-cred stats.
- **Assume Their Life**: a causal life-simulation where you assume a role, make decisions over a year, and live with the consequences. Pick a life from the role picker: **Founder Life** ("Zero to One" — a Lagos startup: formation, fundraising, a real **cap table** with dilution and liquidation preferences, product–market fit, hiring, scaling, survival) **CEO Life** ("Corner Office" — a hired boss of an existing company: a **board that can remove you**, activist shareholders, operating performance, acquisitions), and **Afrobeats** ("Breakout Year" — fame, credibility, fanbase). A role-agnostic engine (`atl-engine.js`) + shared sub-systems (`atl-systems.js`: cap table) + per-role packs (`atl-pack-*.js`); more core roles (CEO, Billionaire, Political) are in active scope. Each role has its own interacting meters, stakeholder memory, time progression, delayed consequences that trace back to earlier choices, and an explainable end-of-year Reckoning. **Not** a quiz — decisions are actions with trade-offs.
- **My corner**: recent activities, account state and cloud-saved challenges.
- **Guest mode**: runs with no backend, stores recent activity on that device via `localStorage`, and shares challenges as URL-encoded data.
- **Optional real accounts**: Supabase Auth email magic links with display name and verified email; Supabase PostgreSQL for profile, challenge and activity storage.

The website is a functional starter, **not a deployed live service**. Authentication and cross-device storage work once you configure Supabase. The privacy page and certain operations are intentionally marked pre-launch until an operator completes them.

## 1. Preview immediately (no install required)

From this folder:

```bash
python -m http.server 8080
```

Open `http://localhost:8080` on your computer. If you use a phone on the same network, open `http://YOUR_COMPUTER_LOCAL_IP:8080` (firewall permitting). The HTML, CSS and JS can also be placed on a static website host like Cloudflare Pages, Netlify or Vercel. No Node.js, build step, paid API or database is needed to test guest experiences.

Try creating a challenge, copy the resulting link, open it in a separate tab, finish all questions, share the score, then play Survive Naija. Real WhatsApp sharing works best once the site is deployed to HTTPS.

## 1b. Automated tests

The site ships with two lightweight test layers. Both run against **guest mode** and
need **no Supabase credentials**.

```bash
# One-time: install the test runner + a headless browser
npm install
npm run test:e2e:install     # downloads Chromium for Playwright

# Fast unit tests (Node built-in runner, no browser)
npm run test:unit            # -> 72 tests: core + account + Assume Their Life engine/systems/role packs

# End-to-end browser smoke tests (Playwright; serves the site itself)
npm run test:e2e             # -> 34 checks across Desktop Chrome + Pixel 7 viewports

# Everything
npm test
```

**What E2E covers:** guest friendship challenge create → shareable link → open in a
fresh browser context → complete → scorecard → "create your own" CTA; a full Survive
Naija round → outcome → restart; navigation + browser back/forward (popstate); input
validation (short name, unanswered questions); malformed guest links and cloud (`?c=`)
links with no backend; phone viewport (bottom nav shows, no horizontal overflow, auth
dialog focus). The unit suite also covers the account state machine (`account.js`) with a mocked,
deferred-promise Supabase client: delayed profile responses, account switching, sign-out, failed
refreshes, and cross-session guest data. The Assume Their Life suite covers deterministic state
transitions, delayed consequences that fire later and trace back, commitment enforcement at the
horizon, divergent outcomes from different early choices, player agency (declining paths), and the
Reckoning explanation. The Founder Life pack adds cap-table dilution and liquidation-preference
tests (a "sold the company" exit can still leave the founder with almost nothing). Last run
(2026-10-29): **72/72 unit, 34/34 E2E passing (106 total).**

**Untested paths (require live Supabase — Milestone 2):** email magic-link sign-in,
cloud challenge storage/retrieval, real activity upload/RLS, and profile creation.
See `STATUS.md` and `REVIEW_NOTES.md`.

## 2. Enable real sign-up and stored activity

1. Create a Supabase project at https://supabase.com/.
2. Paste `supabase-schema.sql` into Supabase **SQL Editor** and run it once. It creates exactly three app tables: `profiles`, `challenges` and `activities`.
3. Open **Project Settings → API** and copy your project URL and **publishable** key (or legacy `anon` key).
4. Edit `config.js` to set `supabaseUrl` and `supabasePublishableKey`.
5. In **Authentication → URL Configuration**, set the app's production Site URL, and explicitly allow any development callback URL you need (e.g., `http://localhost:8080/**`).
6. Configure and test email deliverability with a proper SMTP sender before a public launch; default trial email limits are not sufficient for large-scale acquisition.
7. Deploy all static files together. The sign-in modal will now send real email magic links, and signed-in users will have cloud-saved challenges and game history.

**Safety:** Only the Supabase public URL and publishable/anon key belong in a browser config file. **NEVER** add a `service_role`, secret API key, SMTP password, or other server-side credential to this site. Row-level security and scoped SQL grants protect cloud rows. Get them reviewed/tested before launch.

## 3. Data model

| Table | Columns (core) | Access |
|---|---|---|
| `profiles` | `user_id`, `display_name`, `created_at` | Logged-in owner can read and create only |
| `challenges` | `id`, `owner_id`, `owner_name`, `title`, `answers`, `created_at` | Public reads; owner inserts/deletes |
| `activities` | `id`, `user_id`, `kind`, `details`, `created_at` | Logged-in owner reads and inserts only |

Supabase Auth stores account email separately. Guest links encode the quiz answer key into the URL; they are openly inspectable by technical users, so don't use for competitions with prizes. Guest results remain browser-local, but are synced to the player's account upon successful future login on the same browser.

## 4. Product decisions

**Why not force signup immediately?** Share recipients can play within seconds. Save real accounts for people who want permanent identity/history; this keeps sharing friction low. The sign-up asks for a display name, email and 18+ confirmation — no phone number or password.

**Growth loop:** Create your answers → send to your friend → they get a funny score → they create their own challenge. Measure the number of challenge creators per 100 plays, completion rate and share link clicks before monetization.

**Monetization after traction:** Sell transparent sponsored challenge editions, then consider ads or premium packs. No speculative revenue estimates are baked into the MVP.

## 5. Important pre-launch checklist

- Replace the **draft** `privacy.html` with a proper public privacy notice containing the legal operator identity, support/privacy contact, hosting region, retention schedule and data rights process. Have a local legal/privacy professional review Nigerian Data Protection Act compliance.
- Build a documented user-facing account deletion/data export route, handled securely server-side (auth admin API credentials must not be shipped to the browser). Provide an owner contact channel until self-service exists.
- Review age restrictions. The sign-up currently asks visitors to confirm that they are at least 18. The website is targeting **young adults (18+)** for beta because minors' data needs additional protections.
- Test Supabase RLS for anon/unauthorized/authenticated insert/read/delete. The schema assumes an empty app database; for revisions, use versioned migrations instead of rerunning unchanged policy creation.
- Add rate limiting / anti-spam for sign-in links, abuse controls for user-generated names, error tracking, uptime alerts and a production email sender.
- The game score is calculated by the browser; do not use it for monetary prizes, lotteries or anything security-sensitive.
- Add an authorized `og:image` and proper favicon for better social sharing previews when deployed. Meta title/description are included already.
- Add responsible, opt-in analytics **after** putting a privacy notice and consent controls in place where required; the current MVP uses no third-party analytics tracker.
- Review CDN dependencies: the interface optionally loads the Supabase JS library from `esm.sh` when credentials are configured, and uses Google Fonts for typography. Self-host dependencies if you want to minimize third-party network requests.

## 6. Files

- `index.html` — application shell and meta tags.
- `styles.css` — responsive dark visual design.
- `app.js` — UI, navigation, experiences, sharing, local activity, optional sign-in wiring.
- `core.js` — pure, framework-free logic (challenge encode/decode, scoring, sim math, sync filter); shared by the app and the Node tests.
- `account.js` — signed-in profile/activity/challenge state machine (dependency-injected so it is deterministically testable with a mocked backend).
- `config.js` — public credentials (blank for local demo).
- `supabase-schema.sql` — PostgreSQL schema and row-level permissions.
- `privacy.html` — **draft**, requires operator edits prior to collecting live personal data.

The source is plain JavaScript to keep costs and development setup low. It can later be converted to React/Next.js if the product needs more complex routing or admin dashboards.
