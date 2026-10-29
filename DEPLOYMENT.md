# Deployment & Configuration Guide

Upgrading an existing 3.x deployment? Follow [README → Upgrading from 3.x](README.md#upgrading-from-3x) first: it covers the new environment variables, the database update and reconnecting the extension.

## Services used

| Service | Purpose | Free? | Billing required? |
|---------|---------|-------|-------------------|
| Vercel | hosts the Next.js web app and the daily cron | yes, free tier | **no card required** |
| Supabase | PostgreSQL database | yes, free tier (500 MB) | no card required |
| Google Sheets API | output approved jobs (optional) | yes, completely free | no card required |
| Google Cloud service account | authenticates Sheets API | yes, completely free | no billing required |
| Google Gemini API | AI job analysis | **yes, free** | **no card required** |
| Groq API | AI job analysis | **yes, free** | **no card required** |
| Cerebras API | AI job analysis | **yes, free** | **no card required** |
| OpenRouter API | AI job analysis | **yes, free** | **no card required** |
| Cloudflare Workers AI | AI job analysis | **yes, free** (10k Neurons/day) | **no card required** |
| Anthropic Claude API | optional: best-quality verdicts, resume reading, form answers | pay as you go | yes (prepaid credits) |

**Everything except Claude is free and needs no credit card.** Each AI task (board scans, the LinkedIn extension, resume reading, form answers) has its own route: an ordered list of providers that fails over automatically when one hits its rate limit. Claude is optional, and a monthly budget cap (default $10) keeps its cost predictable.

---

## Step 1: Set up Supabase (database)

1. Go to https://supabase.com and create a free account
2. Click "New project"
3. Choose a name (e.g. `job-finder`), set a database password (use only letters and numbers, avoid special characters like `@!#`), pick a region
4. Wait for the project to be created (1-2 minutes)
5. Click the green **Connect** button at the top of the dashboard
6. Click the **Direct** tab
7. Under **Connection Method**, select **Session pooler**
8. Set **Type** to **URI**
9. Copy the connection string. It looks like:
   ```
   postgresql://postgres.[ref]:[YOUR-PASSWORD]@aws-[n]-[region].pooler.supabase.com:5432/postgres
   ```
10. Replace `[YOUR-PASSWORD]` with the database password you set
11. Save this. You'll need it as `DATABASE_URL`

**Important**: use port `5432` (session pooler), NOT `6543` (transaction pooler). The session pooler is required for Prisma to work correctly with Vercel.

The session pooler allows about 15 connections for the whole project on the free plan, and every running Vercel function instance keeps its own. The app limits each Vercel instance to 2 connections unless your `DATABASE_URL` already sets `connection_limit`, which keeps it inside that limit.

### Keep Supabase alive

Supabase free tier pauses databases after 1 week of inactivity. The app has a public `/api/health` endpoint that pings the database. Set up a free cron job to call it:

1. Go to https://cron-job.org (free, no card required)
2. Create a job: URL = `https://your-app.vercel.app/api/health`, schedule = every 10 minutes
3. This keeps Supabase active

The free database holds 500 MB. **Admin → Data** shows how much is used and offers safe clean-ups (old rejected jobs, logs, AI usage history). Resume files are stored in the database too.

---

## Step 2: Set up Google Sheets API (optional)

Skip this step if you do not need the spreadsheet: everything is also in the admin panel.

### Create a Google Cloud service account (free, no billing required)

1. Go to https://console.cloud.google.com
2. Create a new project (e.g. `job-finder`)
3. Go to **APIs & Services > Enable APIs**
4. Search for "Google Sheets API" and enable it
5. Go to **APIs & Services > Credentials**
6. Click **Create credentials > Service account**
7. Name it (e.g. `job-finder-sheets`), click Create
8. Skip the optional permissions steps, click Done
9. Click on the service account you just created
10. Go to **Keys > Add Key > Create new key > JSON**
11. Download the JSON file. This is your credentials file
12. **Important**: copy the `client_email` from the JSON (looks like `xxx@xxx.iam.gserviceaccount.com`)

### Create and share the Google Sheet

1. Go to https://docs.google.com/spreadsheets and create a new spreadsheet
2. Name it (e.g. `Job Finder Results`)
3. Create two sheet tabs: `Jobs` and `LinkedIn`
4. Click **Share** and add the `client_email` from step 12 above with **Editor** access
5. Copy the spreadsheet ID from the URL: `https://docs.google.com/spreadsheets/d/`**THIS_PART**`/edit`

---

## Step 3: Get your AI API keys

Grab as many of the free keys below as you can. Each is optional and the routes use whatever you configure. One key is enough to start, but more keys mean more daily headroom, and the scanner and the LinkedIn extension never block each other.

### Google Gemini (free, no card)

1. Go to https://aistudio.google.com/apikey
2. Sign in with your Google account
3. Click "Create API Key" and copy it

Large context window — best for the scanner's batched analysis.

### Groq (free, no card)

1. Go to https://console.groq.com/keys
2. Sign in, create an API key, and copy it

Very fast — great for the LinkedIn extension. Optional: skip it if signup is not available for you.

### Cerebras (free, no card)

1. Go to https://cloud.cerebras.ai
2. Sign in, open the API Keys page, create a key and copy it

1,000,000 tokens/day — great for the LinkedIn extension.

### OpenRouter (free, no card)

1. Go to https://openrouter.ai/settings/keys
2. Create a free key and copy it

Aggregator fallback across many free models.

### Cloudflare Workers AI (free, no card)

1. Go to https://dash.cloudflare.com and sign up (no credit card required)
2. Copy your **Account ID** — it is in the URL after `dash.cloudflare.com/` and on
   the Workers & Pages overview page
3. Go to **AI > Workers AI**, click **Use REST API**, and create an API token
4. Save both the Account ID and the token — the analyzer needs both

Free allocation is 10,000 Neurons/day (several thousand analyses).

### Claude (optional, paid)

Claude gives the most reliable verdicts (its replies are schema-checked JSON), and it is required for **Read with Claude** (turning your resume into your profile). It is also the default for drafting form answers.

1. Go to https://platform.claude.com and sign in
2. Add credits under **Billing** (Claude is prepaid)
3. Open **API keys**, create a key and copy it (`sk-ant-…`)

What it costs depends on the model you pick for each route; see [README → Claude](README.md#claude-your-anthropic-api-key-pay-as-you-go) for the price table. Claude Haiku 5.5 suits high-volume board scans; Opus 5.5 suits the LinkedIn extension, resume reading and form answers. The app tracks every call's cost and stops using Claude for the rest of the month once your budget is reached (default $10 per month).

---

## Step 4: Deploy to Vercel

1. Push the code to a GitHub repository
2. Go to https://vercel.com and sign in with GitHub (free, no card needed)
3. Click **Add New > Project**
4. Import your GitHub repository
5. Vercel auto-detects Next.js. Leave the default settings (`vercel.json` already sets the build command, the function time limits and the daily cron).
6. Under **Environment Variables**, add:
   - `DATABASE_URL`: your Supabase connection string from Step 1
   - `CRON_SECRET`: a long random string (see below). Vercel Cron sends it with the daily scan; without it the scan is refused.
   - `SESSION_SECRET`: another long random string. It signs admin sessions.
7. Click **Deploy**

To generate a random string, run one of these locally:

```bash
openssl rand -hex 32
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Create the database tables

After the first deploy, visit this URL once in your browser:

```
https://your-project.vercel.app/api/setup
```

You should see `{"status":"success","message":"All tables created and defaults seeded."}`. On an existing database it answers `"already_initialized"` and adds any missing tables and columns; your data is kept. It is safe to open again after every upgrade.

Alternatively, run the migrations from your local machine (Node.js 20.9 or newer):

```bash
npm install
npx prisma generate
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

### Sign in

1. Open `https://your-project.vercel.app`. It redirects to the admin panel and asks you to sign in.
2. Sign in with user ID `admin` and the default password `admin`.
3. The Dashboard lists the setup steps still open, starting with the default password: open **Settings → Your password** and set one with at least 8 characters.
4. To let other people in, open **System → Users** and click **Add user**: a user ID (no email needed), a name, a password and a role. **Admin** opens this dashboard; **User** signs in to the Chrome extension only (that sign-in comes with the next extension update).

---

## Step 5: Configure the admin panel

**Admin → Setup** (`/admin/setup`) is a 12-step checklist that ticks itself off as you go and links to the right page for each step. The main places:

### AI → Providers & keys

Paste a key for each provider you signed up for in Step 3 and click its **Test** button. Keys are write-only: after saving, the panel only shows that a key is set and its last characters.

| Provider | Credentials | Where to get it |
|----------|-------------|-----------------|
| Claude | `sk-ant-...` | platform.claude.com → API keys |
| Gemini | `AIzaSy...` | aistudio.google.com/apikey |
| Groq | `gsk_...` | console.groq.com/keys |
| Cerebras | `csk-...` | cloud.cerebras.ai |
| OpenRouter | `sk-or-v1-...` | openrouter.ai/settings/keys |
| Cloudflare | Account ID + API token | dash.cloudflare.com |

The model defaults (`gemini-2.5-flash`, `llama-3.1-8b-instant`, `llama-3.3-70b`, Cloudflare `@cf/meta/llama-3.1-8b-instruct`) work out of the box and are editable here. With a Claude key, **List models for this key** shows the models your key can use.

### AI → Routes

Each task has an ordered list of providers. Use **Add provider** and the up / down arrows to set the order. For Claude, pick a model and an effort level (`low` is usually enough for job matching). A provider without a key is skipped.

### AI → Usage & cost

Set the **Monthly budget** for Claude (default `$10`; `0` = no cap). The page shows calls, tokens, cost per task and model, provider health and recent errors.

### Settings

| Section | Setting | Example value |
|---------|---------|---------------|
| Target & matching | Target market | `Europe, Eastern Europe, Remote worldwide` |
| | Current location | `Armenia` |
| | Use my profile when judging jobs | on |
| | Review band | `45` – `70` |
| | Follow-up days | `7` |
| Job analysis prompt | (blank = built-in prompt) | |
| Google Sheets | Google Sheet ID | the spreadsheet ID from Step 2 |
| | Service Account JSON | paste the **entire** JSON key file content |
| | LinkedIn sheet tab | `LinkedIn` |
| | Sheet columns | leave blank for defaults |
| Your password | Current and new password | at least 8 characters |

Click **Save** (or press `Ctrl+S`).

### Profile & resumes

Fill in your profile, or upload a PDF resume and click **Read with Claude** to fill it for you. Add more resume variants with tags (for example `.net, c#` and `react, typescript`) so autofill attaches the right one. The profile is also used as a soft signal when the AI judges jobs.

### Sources and skip rules

Enable the job sources you want under **Sources** and run **Scrape all sources** once to check everything works. Add **Skip rules** for companies or titles you never want to see.

---

## Step 6: Install the Chrome extension

1. Download `job-finder-extension-v<version>.zip` from the newest release on https://github.com/icedev07/job-finder-ai/releases/latest (or use the `extension/` folder from this project)
2. Extract the zip to a folder you keep, for example `C:\JobFinder\extension`
3. Open `chrome://extensions` in Chrome (version 116 or newer)
4. Enable **Developer mode** (toggle in top-right)
5. Click **Load unpacked** and select that folder
6. The extension icon appears in your toolbar; the popup shows its version next to the title

**Updating:** extract the new zip into the same folder, replacing the files, then click the reload icon on the extension's card. Your settings stay. Loading it from a different folder adds a second copy with empty settings, so remove the old one first in that case. (Using the project folder: pull, then click the reload icon.)

### Publish a new extension version

1. Raise `"version"` in `extension/manifest.json` (for example `2.0.1` → `2.0.2`), commit and push to `main`.
2. On GitHub, **Actions → Release extension** runs by itself: it checks the manifest, zips the folder and publishes the release `extension-v2.0.2` with the file `job-finder-extension-v2.0.2.zip`, install steps and a SHA-256 checksum. It takes about a minute.
3. A push that keeps the version publishes nothing. **Run workflow** on the same Actions page starts it by hand.
4. If a run fails with "Resource not accessible by integration", open **Settings → Actions → General → Workflow permissions**, choose **Read and write permissions**, save, and re-run it.

### Connect the extension

1. In the admin panel, open **Extension** (`/admin/extension`).
2. Copy the **Server URL** and click **Reveal** to copy the **API key**.
3. Click the extension icon, paste both into the popup and click **Save**.

The key is required: without it the server refuses every extension request and the popup shows why. **New key** on the Extension page rotates the key; paste the new one into the popup afterwards.

### Scan LinkedIn

1. Go to https://www.linkedin.com/jobs/search/ and search for jobs
2. Click the extension icon
3. Choose what to do with **Easy Apply jobs**: **Skip and hide** (default) or **Analyze with AI** (optionally only approving them above a minimum score)
4. Click **Start Scan**
5. The extension checks every job on the page, sends it to your server for AI analysis, hides unsuitable jobs, and saves approved jobs (and pushes them to Google Sheets)

For LinkedIn's chat-style AI search (`/jobs/search-results/`), tick **Analyze AI search page (beta)** first. **Job scan limit** caps a run (default 100, `-1` = no limit).

### Autofill an application form

1. Open a job's application form (Greenhouse, Lever, Ashby, Workable, SmartRecruiters, Personio, Recruitee, Teamtailor, or any other form with generic matching)
2. Click the extension icon, then **Open autofill panel (application forms)**
3. Check the resume to attach, then click **Autofill this page**. On a site outside the built-in list, Chrome first asks you to allow access to that site
4. Review the highlighted fields: green = from your profile, amber = drafted by AI (read it), red = needs you
5. Submit the form yourself, then click **Mark as applied**. The job moves to **Applications** with a follow-up date

The extension never submits a form and never ticks consent boxes.

---

## Step 7: Daily scans

`vercel.json` schedules `GET /api/admin/scanners/run` every day at 06:00 UTC. Vercel adds `Authorization: Bearer <CRON_SECRET>` to the call, and the route refuses anything else, so the `CRON_SECRET` variable from Step 4 must be set.

To check it works:

- **Vercel → your project → Settings → Cron Jobs** lists the job and lets you run it once by hand.
- **Admin → Logs → Scan logs** shows each run. A run refused because `CRON_SECRET` is missing is logged there too.
- The top bar of the admin panel shows when the last scan ran.

Each scan checks every job with AI inline, stores only the suitable / not-suitable results, and syncs approved ones to Google Sheets in the same run. The **Analyze pending** button is only a fallback for clearing leftovers and normally shows `0`.

---

## How deduplication works

| Layer | What it prevents | How |
|-------|-----------------|-----|
| URL dedup | same job URL scraped twice | normalized URL check before saving |
| Title+company dedup | same job on same platform | exact match before saving |
| Cross-platform dedup | same job on Greenhouse AND LinkedIn | normalized title+company match across all platforms |
| Analysis dedup | analyzing a job already analyzed | a feed scan looks each job up first and analyzes only genuinely new ones |
| Sheet sync dedup | syncing same job to sheet twice | `sheetSynced` flag |
| Skip rules | unwanted companies/titles/URLs | checked before saving, configurable from admin |

Once a job is analyzed (approved or rejected), it is **never analyzed again automatically**, even if a later scan finds it again. To judge jobs again (for example after changing the prompt or a route), select them on the Jobs page and click **Re-analyze**.

---

## Google Sheet output

### "Jobs" tab (from scanners)

| Column | Description |
|--------|------------|
| Title | job title |
| Company | company name |
| Location | job location |
| URL | link to apply |
| Source | which platform found it |
| AI Score | suitability score 0-100 |
| Tech Stack | technologies mentioned |
| Salary | salary if found |
| Date Found | when it was scraped |

### "LinkedIn" tab (from Chrome extension)

| Column | Description |
|--------|------------|
| No | row number |
| Date | date found (YYYY-MM-DD) |
| Platform | always "LinkedIn" |
| Job Url | LinkedIn job URL |
| Company | company name |
| Country | location/country |
| Role | job title |
| Url | same as Job Url |
| Apply via | "Easy Apply" or "Company site" (added automatically to an existing tab) |

---

## Troubleshooting

**Cannot sign in**
- The first admin's user ID is `admin`. On a new install the password is `admin`; after an upgrade from 4.0 it is your old admin password.
- "Cannot sign in right now … Open /api/setup once": the database has no `User` table yet. Open `/api/setup` once (see Step 4), then sign in.
- "This account signs in to the Chrome extension only": the account has the **User** role. An admin can change it under **Users**.
- "This account is disabled": an admin can enable it again under **Users**.
- If you see "database may be unreachable", your `DATABASE_URL` is wrong. Use the Supabase **session pooler** URI (port `5432`, see Step 1).
- A `503` error from `/api/admin/auth` in the Network tab means the app cannot reach Postgres, not a wrong password.
- "Too many failed attempts. Try again in N min.": after 8 failed sign-ins, wait until the 15-minute window is over.
- Locked out? Set `ADMIN_PASSWORD` as an environment variable on Vercel and redeploy. It becomes the first admin's password (user ID `admin`) and overrides the stored one; remove it again once you have signed in and changed the password. Another admin can also set your password under **Users**.

**An admin page says "This page couldn't load" or "Can't read the database"**
- The database did not answer that request. **Admin → Setup** and the status bar at the top name the cause and the fix. For the full message, open Vercel → your project → **Logs** and search for the error id shown on the page.
- "max clients reached": Supabase's session pooler is full (about 15 connections on the free plan). Wait a minute and reload. If it keeps happening, add `connection_limit=1` to `DATABASE_URL` (`…/postgres?connection_limit=1`, or `&connection_limit=1` if the URL already has a `?`) and redeploy.
- "Can't reach database server": check `DATABASE_URL`, and whether Supabase paused the project (see **Supabase database is paused** below).
- "Authentication failed" or "Tenant or user not found": copy the session pooler URI again from Supabase → Connect, with the right password.
- A missing table or column right after an upgrade: open `/api/setup` once.

**The admin panel keeps sending me back to the sign-in page**
- Sessions last 7 days. Changing `SESSION_SECRET` (or `DATABASE_URL`, when `SESSION_SECRET` is not set) signs everyone out. Sign in again.
- An admin may have disabled your account, set a new password, changed your role or used **Sign out everywhere**; each ends your sessions.
- The session cookie needs HTTPS in production. Open the `https://` URL of your deployment.

**The daily scan does not run**
- Set `CRON_SECRET` on Vercel and redeploy. **Admin → Logs → Scan logs** shows refused runs, and **Admin → Setup** flags the missing variable.
- Cron jobs only run on the production deployment, not on preview deployments.

**Vercel function timeout**
- `vercel.json` gives the AI routes 60 seconds (30 for some quick ones); the free plan allows that.
- The scanners stop early when time runs out and pick up the rest on the next run.
- If timeouts occur, prefer the fast providers (Cerebras, Groq) or Claude Haiku in the route, or lower **Jobs per AI call** under **Sources**.

**Supabase database is paused**
- Supabase pauses free databases after 1 week of inactivity.
- Set up the cron job from Step 1 to prevent this.

**"API key not configured" or 429 quota error**
- Open **AI → Providers & keys** and add keys for more providers, then add them to the route under **AI → Routes**. The route fails over automatically when one is rate-limited.
- The more providers you key (Gemini, Groq, Cerebras, OpenRouter, Cloudflare, Claude), the more daily headroom you get.
- If every provider is rate-limited at once, the scan stops checking jobs. Unchecked jobs are simply not stored, and they are re-fetched and retried on the next scan, never wrongly rejected.
- **AI → Usage & cost** shows which provider failed and why.

**Claude errors**
- "Claude API key is invalid": paste a fresh key under **AI → Providers & keys**.
- "Claude rejected the request (400): Your credit balance is too low…": add credits under Billing in the Claude Console.
- "Claude: monthly budget reached": the route uses its other providers until the 1st of next month (UTC). Raise the cap under **AI → Usage & cost** if you want Claude back now.
- Resume reading needs Claude: without a key (or after the budget is reached) **Read with Claude** fails with a clear message. You can still fill the profile by hand.

**Gemini: `Error fetching from https://generativelanguage.googleapis.com`**
- Under **AI → Providers & keys** set the Gemini model to **`gemini-1.5-flash`** and save (newer model names are not always available for every key or region).
- Create a fresh key at https://aistudio.google.com/apikey and paste it again.
- After fixing, just run the scanners again; each scan re-fetches and checks any jobs missed earlier.

**Chrome extension not connecting**
- "Extension API key missing" or "invalid": open **Admin → Extension**, copy the key into the popup and click **Save**.
- Make sure the **Server URL** in the popup is your deployment URL (`https://your-project.vercel.app`, no trailing path).
- Reload the extension in `chrome://extensions` after every update.
- Check that you're on a LinkedIn jobs search page.

**Autofill fills nothing or misses fields**
- Make sure the page shows the application form itself (on Lever and some boards, click **Apply** first).
- On a site outside the built-in list, accept Chrome's access prompt when you click **Autofill this page**.
- Red fields had no matching profile value: add the value to your profile, or answer it once and keep **Save my answers to the answer bank** ticked.
- Workday and LinkedIn's Easy Apply modal are not supported yet.

**Resume upload fails**
- Files are limited to 4 MB (Vercel's request limit is 4.5 MB). Export a smaller PDF.

**Duplicate lines in the extension activity log**
- Reload the extension after update: `chrome://extensions` then reload "LinkedIn Job Scanner" (background relay was removed).

**Google Sheets not updating**
- Make sure the sheet tabs are named `Jobs` and `LinkedIn` (or the tab name set in Settings)
- Make sure the service account email has Editor access to the sheet
- Check that the Sheet ID is correct (from the URL)
- Use **Sync Sheets** on the Dashboard to push pending rows by hand

**Jobs are being analyzed twice**
- This should not happen. Scans only analyze new jobs, with an atomic status check. If you see duplicates, check **Admin → Logs**.
