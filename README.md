# Job Finder

Automated job finder for Armenian developers targeting European and remote positions.

It pulls jobs from 19 job sources, has AI judge every job against your target market (and, optionally, your profile), scans LinkedIn searches through a Chrome extension, and pushes approved jobs to Google Sheets. Version 4 adds a full admin workspace (review queue, applications board, AI cost tracking), per-task AI routing with optional Claude models, your profile and resumes, and an extension side panel that fills company application forms for you.

## Upgrading from 3.x

Version 4.0 locks the admin panel down and changes how the extension connects. After you deploy it:

1. **Add the new environment variables** on Vercel (Project → Settings → Environment Variables), then redeploy:
   - `CRON_SECRET` (**required** for the daily scan): any long random string. Vercel sends it to the cron route; without it the daily scan is refused and logged in **Logs**.
   - `SESSION_SECRET` (recommended): signs admin sessions. Without it the signing key is derived from `DATABASE_URL`.
2. **Update the database**: open `https://your-app.vercel.app/api/setup` once. It adds the new tables and columns and keeps your data. (Or run `npx prisma migrate deploy`.)
3. **Sign in** at `/admin/login`. If you still use the default password `admin`, change it under **Settings → Admin password** (at least 8 characters).
4. **Reconnect the extension**. The extension API key is now required.
   1. Reload the extension in `chrome://extensions` so Chrome picks up version 2.0.0, which adds the side panel and the application-form sites.
   2. Open **Admin → Extension**, copy the server URL and the API key into the extension popup, and click **Save**.
5. Optional: add your Anthropic API key under **Admin → AI → Providers & keys** and choose which tasks use Claude under **Routes**.

Other changes to know about:

- `/` now redirects to `/admin/jobs`. The old public job list and its API (`/api/scraped-jobs`) are gone: job data is only available after you sign in.
- Old admin URLs redirect: `/admin/scanners` → `/admin/sources`, `/admin/database` → `/admin/data`.
- AI keys and models moved from Settings to the **AI** page.
- The Google Sheet "LinkedIn" tab gains an **Apply via** column (column I). An existing 8-column header gets the new heading added automatically.
- Easy Apply jobs are still skipped and hidden by default; the extension popup can now analyze them instead (see [LinkedIn extension](#linkedin-extension)).
- The stack moved to Next.js 16, React 19, Tailwind CSS 4 and ESLint 9. Local development needs Node.js 20.9 or newer.

## How it works

1. **Find**: server-side scanners pull jobs from public job-board APIs, RSS feeds and page payloads, plus your MyGreenhouse session (see [Job sources](#job-sources)). They run daily on Vercel Cron or on demand from **Sources**. The Chrome extension scans LinkedIn searches while you watch.
2. **Judge**: AI checks every job during the scan itself. Is it a software role? Can someone in your location be hired? Does it fit your target market (and your profile, if you turn that on)? Each AI task has its own *route*, an ordered list of providers that fails over automatically when one is rate-limited (see [AI](#ai-providers-routes-and-cost)). A scan stores a job only once it has a verdict (`APPROVED` or `REJECTED`). Jobs it could not check are retried on the next scan.
3. **Review**: close calls (score 45–70 by default) wait in **Review** for a quick 👍 / 👎. Your ratings also measure how often each model agrees with you (**AI → Evaluations**).
4. **Apply**: open a job's application form, click **Autofill this page** in the extension side panel, check the colour-coded fields, submit the form yourself, then click **Mark as applied**.
5. **Track**: applied jobs move through **Applications** (Saved → Applied → Interview → Offer / Rejected) with follow-up reminders. Approved jobs are also pushed to Google Sheets (optional).

## Admin panel

Sign in at `/admin/login`. The default password is `admin`; change it right away. Every admin page and admin API needs a session (see [Security](#security)).

| Page | URL | What it is for |
|---|---|---|
| Dashboard | `/admin` | KPIs (found, approved, to review, applications, AI calls, Claude spend), 30-day activity, funnel, source yield, setup reminders, quick actions (run a scan pass, analyze pending, sync Sheets) |
| Jobs | `/admin/jobs` | Every stored job. Search with `"exact phrase"` and `-exclude`; filter by status, source, stage, Easy Apply, score, rating, eligibility and age; use saved views; bulk stage / approve / reject / rate / re-analyze / delete; export CSV. The detail drawer holds notes, follow-up date, signals and what you sent |
| Review | `/admin/review` | Close calls one card at a time: `y` or `→` good match, `n` or `←` not a match, `s` skip, `u` undo, `o` open the posting |
| Applications | `/admin/applications` | Kanban pipeline Saved → Applied → Interview → Offer / Rejected (+ Archived). Drag cards, or focus one and press `1`–`6` or `←` / `→`. Follow-up badges turn amber when due and red when overdue |
| Sources | `/admin/sources` | Enable and configure each job source, run one or **Scrape all sources**, set the analyzer batch size and the MyGreenhouse cookie |
| Skip rules | `/admin/skip-rules` | Block jobs by company, title keyword or URL pattern. Rules run before the AI, so they also save quota |
| AI | `/admin/ai` | Providers & keys, per-task routes, usage & cost, playground, evaluations |
| Profile & resumes | `/admin/profile` | Your candidate profile, resume files and the answer bank used by autofill |
| Extension | `/admin/extension` | Server URL and API key for the popup, install steps, Easy Apply stats, supported form sites |
| Logs | `/admin/logs` | All jobs, AI analysis log, scan logs, extension logs |
| Data | `/admin/data` | Storage use against the Supabase free 500 MB, safe clean-ups, exports, SQL console (read-only by default) |
| Settings | `/admin/settings` | Target market and location, profile in matching, review band, follow-up days, analysis prompt, Google Sheets, admin password |
| Setup | `/admin/setup` | 12-step checklist from database to first scan |

The top bar shows the last scan, AI calls in the last 24 hours, Claude spend against the budget, database size, and when the extension last reported in.

Keyboard shortcuts:

- `Ctrl+K` (`⌘K` on macOS) opens the command palette: jump to any page, run a scan pass, analyze pending jobs, sync Sheets, switch the theme, or sign out.
- On the Jobs page, `/` focuses search, `j` / `k` move, `Enter` opens a job and `x` selects it.
- `Ctrl+S` saves on Settings, Profile and the AI providers and routes tabs.

## AI: providers, routes and cost

### Tasks and routes

Each AI task has its own route: an ordered list of providers. The first provider with a key and spare quota answers. On a rate limit, error or timeout the next one is tried, and a failing provider cools down for a while. Configure routes under **AI → Routes**.

| Task | Used by | Default route |
|---|---|---|
| Board scans | the daily cron and **Scrape all sources** (batched verdicts) | free providers in the order Gemini → OpenRouter → Cerebras → Groq → Cloudflare |
| LinkedIn extension | the extension, one job at a time while it scans | free providers in the order Cerebras → Groq → Cloudflare → Gemini → OpenRouter |
| Resume reading | **Read with Claude** on an uploaded resume | Claude (required: it reads PDFs) |
| Form answers | free-text answers drafted by the autofill side panel | Claude (you can add free providers) |

The **Board scans** and **LinkedIn extension** routes start with the free providers that were ticked in Settings before the upgrade. A fresh install ticks Gemini, Groq, Cerebras and OpenRouter; add Cloudflare in **Routes** once you have its key. The defaults keep the high-volume tasks on the free providers. Once you have a Claude key, add Claude where quality matters, for example first on **LinkedIn extension**, or Haiku on **Board scans**.

### Free providers (no card)

Gemini, Groq, Cerebras, OpenRouter and Cloudflare Workers AI. Keys and models live under **AI → Providers & keys**; see [DEPLOYMENT.md](DEPLOYMENT.md#step-3-get-your-ai-api-keys) for where to get each key.

### Claude (your Anthropic API key, pay as you go)

Create a key in the Claude Console (https://platform.claude.com → API keys), paste it under **AI → Providers & keys**, then pick a model and an effort level for each route.

| Model | Input / output, per 1M tokens | Good for |
|---|---|---|
| Claude Haiku 5.5 | $0.10 / $0.50 (prompts over 100K tokens: $0.50 / $2.50) | Board scans and other high-volume classification |
| Claude Sonnet 5.5 | $2 / $10 | Balanced quality and price |
| Claude Opus 5.5 | $4 / $20 | Anthropic's default and the strongest everyday model: LinkedIn extension, resume reading, form answers |
| Claude Fable 5.1 | $10 / $50 | The most capable model; rarely worth it for job matching |

These are Anthropic's list prices, checked 2026-10-29. Cached prompt reads cost a tenth of the input price or less.

**Effort** (`low`, `medium`, `high`, `xhigh`, `max`) trades speed and cost for more careful reasoning. `low` is usually enough for a yes/no job match.

- **Strict JSON**: Claude answers through a JSON schema, so its verdicts always parse.
- **Prompt caching**: the shared instructions are cached, so repeated calls during a scan cost less.
- **Refusal fallback**: for Opus, Sonnet and Fable the app opts into Anthropic's server-side fallback, so a policy decline is retried on Anthropic's recommended substitute model inside the same call. A refusal never puts Claude on cooldown.
- **Monthly budget**: set a cap under **AI → Usage & cost** (default **$10 per month**; `0` means no cap). Spend is computed from token counts and list prices; your Anthropic invoice is the source of truth. At the cap, Claude is skipped until the 1st of the next month (UTC), and each route falls back to its free providers. Claude-only tasks (resume reading, and form answers unless you add a free provider) pause until then.

The other AI tabs:

- **Usage & cost** shows calls, tokens, cache hits, average latency and cost per task and model, plus daily charts, provider health and recent errors.
- **Playground** runs any stored or pasted job through any provider, model and effort so you can compare verdict, speed and cost. Nothing is saved except the usage log. **Try other models** in a job's drawer opens it here.
- **Evaluations** re-judges a balanced sample of the jobs you rated 👍 / 👎 with a model and effort you choose, and reports how often it agrees with you, next to the live verdicts as a baseline. Rate 20 or more of each for reliable numbers.

### Eligibility and job signals

Verdicts also record **eligibility**, meaning where the employer can hire: `worldwide`, `europe`, `emea`, `americas`, `specific` (named countries only) or `unclear`. Board scans and every Claude verdict fill it in; LinkedIn verdicts from the free providers leave it empty. It shows as a chip and a filter on the Jobs page (try the **Hires worldwide** view).

The job drawer adds signals that help you spot ghost or stale postings:

- how many other jobs the same company posted in the last 90 days, with a warning at 8 or more;
- LinkedIn's "reposted" flag;
- the applicant count and posting age that the extension reads from LinkedIn.

## LinkedIn extension

The `extension/` folder holds a Manifest V3 Chrome extension (version 2.0.0, Chrome 116 or newer) that scans LinkedIn job searches:

1. Open LinkedIn and search for jobs.
2. Click the extension icon, then **Start Scan**.
3. The extension opens each job and sends it to your server, where the **LinkedIn extension** route judges it.
4. Rejected jobs are hidden on LinkedIn (tick **Also hide approved jobs on LinkedIn** to hide those too).
5. Approved jobs are saved and pushed to the "LinkedIn" tab in Google Sheets.

### Easy Apply jobs

Choose in the popup under **Easy Apply jobs**:

- **Skip and hide (default)**: Easy Apply jobs are rejected without an AI call and hidden, as in earlier versions.
- **Analyze with AI**: Easy Apply jobs are judged like every other job and marked "Easy Apply" in the popup, on the Jobs page and in the sheet's **Apply via** column. The optional **Approve Easy Apply only at score ≥** keeps only strong Easy Apply matches.

Jobs that were auto-rejected earlier only for being Easy Apply are judged properly the next time you scan them in analyze mode. A job that already has a verdict is never overwritten.

### AI search page and scan limit

The extension supports both the classic `/jobs/search/` results and LinkedIn's newer AI / natural-language search (`/jobs/search-results/`, the chat-style search). The two pages use completely different layouts, so when you scan the AI search page, tick **Analyze AI search page (beta)** in the popup first. The scanner then switches to the matching extractor, with the same flow: per-job AI analysis, external apply-link capture, pagination, and hide-on-reject. Leave it off for the classic page.

Use the **Job scan limit** field to cap how many jobs a run scans across all pages. It defaults to **100**; set it to **-1** to scan every job with no limit. The count includes every job the scanner opens (approved, rejected, skipped, or already processed). The limit is honored across pagination, including the full-page-reload fallback, so a run stops cleanly as soon as it is reached. The field works the same in classic and AI-search (beta) modes.

### Install and connect

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and select the `extension/` folder. After pulling an update, click the reload icon on the extension card.
3. Open **Admin → Extension**, then copy the **Server URL** and **API key** into the extension popup and click **Save**.

The key is required: without it the server refuses every extension request, and the popup says so. **New key** on the Extension page rotates it; paste the new key into the popup afterwards.

## Autofill application forms

The extension's side panel fills company application forms from your profile and resumes. It never submits anything: you review the form and click Submit yourself.

1. Open a job's application form (for example from **Apply** in a job's drawer).
2. Click the extension icon, then **Open autofill panel (application forms)**.
3. Pick the resume to attach. It is preselected by tags (see [Profile & resumes](#profile--resumes)).
4. Click **Autofill this page**. Every field is outlined and listed by source:
   - **green**: filled from your profile or resume;
   - **amber**: drafted by AI or worth a check (read it before you submit);
   - **red**: missing; it needs you.
5. Submit the form yourself, then click **Mark as applied**. The job (created if it was not stored yet) moves to **Applied** with a follow-up date (7 days by default). The resume and answers you sent are kept in the job drawer under "What you sent". With **Save my answers to the answer bank** ticked, your free-text answers are reused on the next form.

| Form | Sites |
|---|---|
| Greenhouse | `boards` / `job-boards.greenhouse.io` and embedded Greenhouse forms |
| Lever | `jobs.lever.co` |
| Ashby | `jobs.ashbyhq.com` |
| Workable | `apply.workable.com` |
| SmartRecruiters | `jobs.smartrecruiters.com` |
| Personio | `*.jobs.personio.de` / `.com` |
| Recruitee | `*.recruitee.com` |
| Teamtailor | `*.teamtailor.com` |
| Any other form | generic label matching; check the result more carefully. Chrome asks for access to that site the first time |

What autofill does and does not do:

- It never ticks consent or privacy boxes.
- It leaves fields that already have a value alone unless you tick **Replace fields that already have a value**.
- It handles searchable dropdowns (react-select) and file inputs.
- Free-text questions come from the answer bank when a close match exists; otherwise they are drafted with the **Form answers** route (untick **Draft free-text answers with AI** to skip that).
- Workday and LinkedIn's own Easy Apply modal are not filled yet; they use multi-step custom widgets.

## Profile & resumes

**Admin → Profile & resumes** holds what autofill and matching know about you:

- **Profile**: name and contact details, links (LinkedIn, GitHub, portfolio), headline and summary, years of experience, work authorization and sponsorship, contractor and relocation preferences, remote preference, notice period, salary expectation, skills, languages, experience, education, optional EEO answers (decline by default), and extra facts.
- **Resumes**: keep one file per variant (for example ".NET backend" and "Full-stack JS"). PDF, DOCX, DOC, TXT or Markdown, up to 4 MB each. Files are stored in the database, so they count toward Supabase's 500 MB. Tags pick the variant for a job: the resume whose tags appear most in the job text wins, else the default. **Read with Claude** turns a PDF or plain-text resume into your profile so you do not have to type it (this needs a Claude key; it uses the **Resume reading** route). Word files can be attached to applications but not read; upload a PDF copy to extract your profile.
- **Answer bank**: your answers to questions that forms keep asking. Autofill reuses them, and the AI copies your voice from them.

Once your profile has content, a short summary of it is added to the job analysis prompt as soft signals: stack overlap and seniority fit. It never overrides a hard reject rule. Turn it off with **Settings → Target & matching → Use my profile when judging jobs** (on by default). A custom prompt can place it with the `{{CANDIDATE_PROFILE}}` placeholder.

## Job sources

All sources below are free for applicants. Configure each one from **Admin → Sources** (search params, max jobs, enabled/disabled).

| Key | Source | Auth | Notes |
|---|---|---|---|
| `remoteok` | [RemoteOK](https://remoteok.com) | none | public JSON feed |
| `jobicy` | [Jobicy](https://jobicy.com) | none | v2 JSON API; supports tag/jobGeo filters |
| `landingjobs` | [Landing.Jobs](https://landing.jobs) | none | EU-leaning developer API |
| `remotive` | [Remotive](https://remotive.com) | none | public JSON; `category=`/`search=`/`company_name=` filters |
| `workingnomads` | [Working Nomads](https://workingnomads.com) | none | public JSON (one flat feed); client-side category filter |
| `arbeitnow` | [Arbeitnow](https://www.arbeitnow.com) | none | Germany/DACH-leaning JSON; paginated, rate-limited (5 req/min) |
| `hnwhoishiring` | [Hacker News “Who is hiring?”](https://news.ycombinator.com) | none | the monthly thread via the HN Algolia API; each comment is a job |
| `themuse` | [The Muse](https://www.themuse.com) | none | public JSON; server-side `category=`/`location=`/`level=` filters |
| `realworkfromanywhere` | [Real Work From Anywhere](https://www.realworkfromanywhere.com) | none | RSS of true work-from-anywhere roles; per-category feeds |
| `nofluffjobs` | [NoFluffJobs](https://nofluffjobs.com) | none | Poland/CEE IT board via the public search API; salary always disclosed, opt-in `keyword`/`remote=true`/`days=N` filters |
| `weworkremotely` | [We Work Remotely](https://weworkremotely.com) | none | RSS per category slug |
| `jobspresso` | [Jobspresso](https://jobspresso.co) | none | RSS at `/jobs/feed/` |
| `authenticjobs` | [Authentic Jobs](https://authenticjobs.com) | none | dev-leaning RSS |
| `nodesk` | [Nodesk](https://nodesk.co) | none | Atom feed |
| `justremote` | [JustRemote](https://justremote.co) | none | scraped from SSR payload (~10 jobs/page) |
| `greenhouse` | [Greenhouse boards](https://boards-api.greenhouse.io) | none | per-company public ATS API. Supports `@curated` to expand the bundled live-only slug list, a comma-separated custom slug list, and opt-in filter tokens (`@remote`, `@since=N`, `@kw=…`, `@loc=…`). |
| `lever` | [Lever](https://api.lever.co) | none | per-company public API |
| `ashby` | [Ashby](https://api.ashbyhq.com/posting-api) | none | per-company public API |
| `mygreenhouse` | [MyGreenhouse candidate portal](https://my.greenhouse.io) | session cookie | aggregator across every employer opted into MyGreenhouse. See below. |

### Hidden sources ("Hidden gems" tab)

`remotive`, `workingnomads`, `arbeitnow`, `hnwhoishiring`, `themuse`, `realworkfromanywhere`, and `nofluffjobs` are low-competition, zero-auth sources that bypass the crowded commercial boards. They are grouped under the **Hidden gems** tab in **Admin → Sources**, each with its own enable/disable toggle, and run as part of **Scrape all sources** like every other feed. No login or API key is required.

- `hnwhoishiring` resolves the latest monthly *"Ask HN: Who is hiring?"* thread via the HN Algolia API, then parses each top-level comment. The job link stored is the HN comment permalink (stable + unique for dedup); the employer's own apply link, when present, is captured separately as the manual apply URL.
- `arbeitnow` is rate-limited to 5 requests/min, so it pulls only a few pages per scan and paces requests.
- `nofluffjobs` queries the public NoFluffJobs search API (`POST /api/search/posting`) in a single call — its pagination params are ignored, so one request returns the freshest slab (~80-190 postings), which we sort newest-first and slice. Salary is always disclosed (PLN/month), and the reliable `fullyRemote` flag powers the `remote=true` filter. The search field is an opt-in pre-filter: a bare keyword (e.g. `.net`, `c#`, `java`) plus optional `remote=true`, `days=N` tokens; blank keeps every technology. The endpoint serves the Poland/CEE catalogue and ignores a region param, so region is not exposed as a filter.
- The search field for the client-filtered feeds (`workingnomads`, `arbeitnow`, `hnwhoishiring`) is a comma-separated keyword/category include filter; `remotive` and `themuse` accept real server-side query params (or a full API URL). `realworkfromanywhere` takes a category slug or a full RSS URL.

Some well-known "hidden" boards were evaluated and **excluded** because they cannot be fetched zero-auth from a serverless function: **Himalayas** (Cloudflare JS challenge blocks datacenter IPs on both its JSON and RSS endpoints), **Wellfound/AngelList** (DataDome + Cloudflare), **StillHiring.today** (data lives only inside an authenticated Airtable embed), and **Dynamite Jobs / Remote.co** (no machine-readable feed). GitHub company directories (yanirs/established-remote, remoteintech/remote-jobs, etc.) are company lists rather than job feeds, so they are better used to extend the Greenhouse/Lever/Ashby slug lists than as standalone scanners.

### MyGreenhouse session cookie

MyGreenhouse is a passwordless candidate portal aggregating every employer who opted in. There is no public API, so the scanner replays your browser session.

1. Sign in once at https://my.greenhouse.io (enter email, paste the one-time code from your inbox).
2. In your browser, open DevTools → **Application → Cookies → `https://my.greenhouse.io`**.
3. Copy the entire Cookie header value as the browser sends it (right-click any cookie → "Copy as cURL" and lift the `-H 'Cookie: …'` value, or build the string `_session_id=…; MYGREENHOUSE-XSRF-TOKEN=…`).
4. Paste it into the **MyGreenhouse session cookie** input on **Admin → Sources**.
5. (Optional) Paste just the `MYGREENHOUSE-XSRF-TOKEN` value into the X-CSRF-Token field — only needed if scans start failing with 403.

The cookie lives ~14 days (Greenhouse sets `_session_id` with a 14-day Expires). When the scanner reports `session expired`, repeat steps 1–4.

### MyGreenhouse location filter

The MyGreenhouse tile has a **Locations** field. Leave it blank to search every location, or list comma-separated places to keep (e.g. `Germany, Netherlands, Remote`). The one-click **Europe** button matches every EU/EEA country plus remote roles. Jobs whose location is a confirmed mismatch are dropped before AI analysis, which also saves free-tier AI quota.

### Bulk Greenhouse coverage without auth

For the public `greenhouse` scanner, type `@curated` in its search-params field. That expands to a bundled, pre-pruned list of live Greenhouse company slugs (every entry currently returns jobs) drawn from the community [awesome-easy-apply](https://github.com/sample-resume/awesome-easy-apply) index. You can mix it with custom slugs:

```
@curated, mycompany, another-slug
```

You can also paste full board URLs (classic `boards.greenhouse.io/slug`, modern `job-boards.greenhouse.io/slug`, the EU host, or an `…/embed/job_board?for=slug` embed) — the slug is extracted automatically.

**Opt-in filters** (applied before AI analysis, so they also save free-tier AI quota) can be mixed into the same field as extra tokens:

```
@curated, @remote, @since=7, @kw=engineer, @loc=germany
```

- `@remote` — keep only remote / work-from-anywhere roles.
- `@since=N` (alias `@days=N`) — keep only jobs first published within the last N days; also drops postings whose application deadline has passed.
- `@kw=term` — keep only jobs whose title or department contains `term` (repeatable; matches are OR'd).
- `@loc=keyword` — keep only jobs whose location or office contains `keyword` (repeatable).

With no filter tokens the scanner behaves as before (newest jobs per company, spread fairly across all configured slugs).

## Running scans

- **Daily**: Vercel Cron calls `GET /api/admin/scanners/run` every day at 06:00 UTC (see `vercel.json`) and sends `Authorization: Bearer $CRON_SECRET`. Without `CRON_SECRET` the run is refused and logged, so nobody else can trigger scans that spend your AI quota.
- **On demand**: **Scrape all sources** on **Admin → Sources** for a full pass, **Run** on a single source, or **Run a scan pass** on the Dashboard or in the command palette.

Each scan checks every job with AI as it runs, stores only the suitable / not-suitable results, and syncs approved ones to Google Sheets; there is no separate analyze step. **Analyze pending** stays available only to clear leftovers (a rescan reset, or a pre-upgrade backlog) and normally shows `0`. To judge stored jobs again (for example after changing the prompt or the route), select them on the Jobs page and click **Re-analyze** (up to 60 at a time).

## Security

- **Sign-in**: every `/admin` page and `/api/admin` endpoint needs a session. The session is an HttpOnly, SameSite=Lax cookie that lasts 7 days, signed with `SESSION_SECRET` (or a key derived from `DATABASE_URL`). Rotating `SESSION_SECRET` signs everyone out.
- **Password**: stored as an scrypt hash; a new password needs at least 8 characters. After 8 failed sign-ins from one client, further attempts are refused until 15 minutes after the first failure. The `ADMIN_PASSWORD` environment variable, when set, overrides the stored password, and the password can then not be changed in the panel.
- **Secrets are write-only**: the AI provider keys, the Google service account and the extension key are never sent back to the browser; the panel only shows whether one is set and its last characters. Leaving a secret field blank keeps the stored value. Only the extension API key can be revealed, because you need to copy it into the popup.
- **Extension API**: every `/api/extension/*` request needs the `X-API-Key` header with the extension key.
- **Cron**: the daily scan needs `CRON_SECRET` (see above).
- **SQL console** (**Admin → Data**): queries run in a read-only transaction with a 15-second timeout. A write needs an explicit confirmation plus your admin password.
- **Clean-ups and exports**: clean-ups only delete rows older than a minimum age (rejected jobs: 7 days, logs: 1 day, AI usage: 35 days, so this month's budget stays correct). Wiping all jobs needs the typed phrase `DELETE ALL JOBS`. The settings export never contains secrets.
- **Without a session**, only `/admin/login`, the sign-in API, `/api/health` and `/api/setup` respond. `/api/setup` is idempotent: it creates or updates tables and seeds defaults, and never returns your data. The extension API and the cron route check their own keys.

## Architecture

```
            Admin panel (/admin, sign-in required)
                         |
                         v
+---------------------------------------+      +--------------------------------+
| Next.js 16 app (Vercel free)          |----->| AI routes per task             |
|                                       |      |  Claude (your key, budget cap) |
| - Scanners (Vercel Cron, daily)       |      |  Gemini, Groq, Cerebras,       |
| - AI analyzer, usage + cost tracking  |      |  OpenRouter, Cloudflare (free) |
| - Review, applications, profile       |      +--------------------------------+
| - Extension API (X-API-Key)           |----->+---------------+
+---------------------------------------+      | Google Sheets |
                         |                     +---------------+
                         v
+-------------------+       +---------------------------------------+
| PostgreSQL        |       | Chrome extension 2.0                  |
| (Supabase free)   |       |  - LinkedIn scanner (popup)           |
+-------------------+       |  - Autofill side panel (ATS forms)    |
                            +---------------------------------------+
```

## Services

| Service | Purpose | Cost |
|---------|---------|------|
| Vercel | Host the Next.js web app and the daily cron | Free |
| Supabase | PostgreSQL database | Free (500 MB) |
| Google Sheets API | Output approved jobs | Free |
| Google Gemini API | AI job analysis | Free, no card |
| Groq API | AI job analysis | Free, no card |
| Cerebras API | AI job analysis | Free, no card |
| OpenRouter API | AI job analysis | Free, no card |
| Cloudflare Workers AI | AI job analysis | Free, no card (10k Neurons/day) |
| Anthropic Claude API | Optional: best-quality verdicts, resume reading, form answers | Pay as you go, capped by your monthly budget |

## Quick start (local)

You need Node.js 20.9 or newer and a Postgres database (the Supabase free tier works).

```bash
# 1. Install
npm install

# 2. Configure: set DATABASE_URL (Supabase session pooler, port 5432)
cp .env.example .env

# 3. Generate the Prisma client and create the tables
npx prisma generate
npx prisma migrate deploy

# 4. Start the dev server
npm run dev

# 5. Open http://localhost:3000/admin and sign in with the default password: admin
#    Then follow the checklist on /admin/setup.
```

Other scripts: `npm run build`, `npm run lint`, `npm run typecheck`, `npm run prisma:studio`.

## Deploy to Vercel

1. Push to GitHub.
2. Import the repo on https://vercel.com (free, no card needed).
3. Add the environment variables `DATABASE_URL` (Supabase session pooler URI, port `5432`), `CRON_SECRET` and `SESSION_SECRET`.
4. Deploy.
5. Visit `https://your-app.vercel.app/api/setup` once to create the database tables.
6. Sign in at `/admin` and work through **Setup**.

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed step-by-step instructions.

## Supabase connection

Use the **Session pooler** connection string from Supabase (Connect > Direct > Session pooler):

```
postgresql://postgres.[ref]:[PASSWORD]@aws-[n]-[region].pooler.supabase.com:5432/postgres
```

Important: use port `5432` (session pooler), not `6543` (transaction pooler).

## Google Sheet output

### "Jobs" tab (from scanners)

Default columns (configurable under **Settings → Google Sheets**):

| Title | Company | Location | URL | Source | AI Score | Tech Stack | Salary | Date Found |
|-------|---------|----------|-----|--------|----------|------------|--------|------------|

Default column config JSON:

```json
[
  {"key":"title","label":"Title"},
  {"key":"company","label":"Company"},
  {"key":"location","label":"Location"},
  {"key":"url","label":"URL"},
  {"key":"platform","label":"Source"},
  {"key":"aiScore","label":"AI Score"},
  {"key":"techStack","label":"Tech Stack"},
  {"key":"salary","label":"Salary"},
  {"key":"createdAt","label":"Date Found"}
]
```

### "LinkedIn" tab (from Chrome extension)

| No | Date | Platform | Job Url | Company | Country | Role | Url | Apply via |
|----|------|----------|---------|---------|---------|------|-----|-----------|

**Apply via** is "Easy Apply" or "Company site" (empty for jobs saved before 4.0).

## Default settings

`/api/setup` seeds these values. It never overwrites a value you have changed.

| Setting | Default value | Where to change it |
|---------|---------------|--------------------|
| Admin password | `admin` | Settings → Admin password |
| AI routes | see [Tasks and routes](#tasks-and-routes) | AI → Routes |
| Gemini model | `gemini-2.5-flash` | AI → Providers & keys |
| Groq model | `llama-3.1-8b-instant` | AI → Providers & keys |
| Cerebras model | `llama-3.3-70b` | AI → Providers & keys |
| OpenRouter model | `auto` (free models) | AI → Providers & keys |
| Cloudflare model | `@cf/meta/llama-3.1-8b-instruct` | AI → Providers & keys |
| Claude model / effort | Opus 5.5; effort `low` for scans and the extension, `medium` for resumes and answers | AI → Routes |
| Claude monthly budget | `$10` (`0` = no cap) | AI → Usage & cost |
| Target market | `Europe, Eastern Europe, Remote worldwide` | Settings → Target & matching |
| Current location | `Armenia` | Settings → Target & matching |
| Use my profile when judging jobs | on (applies once your profile has content) | Settings → Target & matching |
| Review band | scores `45`–`70` | Settings → Target & matching |
| Follow-up after applying | `7` days | Settings → Target & matching |
| Analyzer batch size | `5` jobs per AI call (max 12) | Sources |
| LinkedIn sheet tab | `LinkedIn` | Settings → Google Sheets |
| Sheet columns | see JSON above | Settings → Google Sheets |
| Extension API key | random `jf_…` key | Extension |
| Job analysis prompt | built-in (`lib/defaultPrompt.ts`) | Settings → Job analysis prompt |

### Job analysis prompt

Leave **Settings → Job analysis prompt** blank to use the built-in prompt, a strict classifier with hard reject rules (not a software role, location or work-authorization blockers, region-locked remote), soft signals and a scoring rubric (approve at 60 or more). The Settings page shows it so you can copy and adapt it.

Available placeholders: `{{JOB_TITLE}}`, `{{COMPANY}}`, `{{LOCATION}}`, `{{DESCRIPTION}}`, `{{TARGET_MARKET}}`, `{{CURRENT_LOCATION}}`, and `{{CANDIDATE_PROFILE}}` (empty unless your profile is used in matching).

The prompt asks for one JSON object: `approved`, `score` (0–100), `reason` and `techStack`. Board scans also ask for `eligibility`. With Claude, the same rules become the system prompt and a JSON schema enforces the reply, eligibility included.

## Database schema

- **ScrapedJob**: every stored job (approved/rejected) with its verdict, eligibility, apply method (Easy Apply or company site) and LinkedIn signals, plus your pipeline data: stage, applied and follow-up dates, notes, 👍 / 👎 feedback, the resume used and the application answers.
- **AppConfig**: key/value settings store (secrets included, never returned to the browser).
- **SkipRule**: company/title/url block rules.
- **ScanLog**: scan history.
- **AnalysisLog**: AI analysis results per job.
- **ExtensionLog**: logs sent by the extension.
- **AiUsage**: one row per AI call (task, provider, model, tokens, cost, latency, outcome). It drives Usage & cost, provider health and the Claude budget.
- **Resume**: your resume files (stored in the database) with tags and the parsed profile.
- **SavedAnswer**: the answer bank used by autofill.

Migrations live in `prisma/migrations`. `/api/setup` applies the same changes idempotently, for deployments that cannot run `prisma migrate deploy`.

## Environment variables

Only `DATABASE_URL` is required to boot. Everything else is configured in the admin panel.

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string (Supabase session pooler, port 5432) |
| `CRON_SECRET` | for the daily scan | Bearer token Vercel Cron sends to `/api/admin/scanners/run` |
| `SESSION_SECRET` | recommended | Signs admin sessions; rotating it signs everyone out |
| `ADMIN_PASSWORD` | no | Overrides the stored admin password (and locks password changes in the panel) |
| `ANTHROPIC_BASE_URL` | no | Send Claude calls through a proxy or gateway instead of `https://api.anthropic.com` |

The Anthropic API key itself is stored in the database (**AI → Providers & keys**), not in the environment. See `.env.example`.
