# Job Finder

Automated job finder for software developers: it finds remote and on-site jobs, has AI judge each one against where the candidate is based and the market they target, and tracks the applications. One install serves many job searches: each user has their own location, profile, results and Google Sheet, and admins manage all of them from one dashboard.

It pulls jobs from 19 job sources, has AI judge every job against the user's target market (and, optionally, their profile), scans LinkedIn searches through a Chrome extension, and pushes approved jobs to Google Sheets. Version 4 adds a full admin workspace (review queue, applications board, AI cost tracking), per-task AI routing with optional Claude models, profiles and resumes, and an extension side panel that fills company application forms. Version 4.1 adds user accounts: everyone signs in with a user ID and password, and admins add people on the **Users** page. Version 4.2 gives each user their own jobs and settings. Version 4.3, with extension 2.1, lets each user sign in to the Chrome extension. Version 4.4 turns Review into a list with **Mark all reviewed**, sends the jobs you approve to the Google Sheet right away and lets you turn Review off for each user. Version 4.5 puts every user's applications on one board with search, filters, bulk moves, close reasons and a timeline for each application; the Google Sheet's Stage column follows the board, and Applications can be off for each user. Version 4.6 adds **Next actions**, the list of what to do next on each application, and interviews. Version 4.7 adds **Writing**, AI drafts for each application (resume match, cover letter, intro, follow-up and interview prep), and insights into every application on the Dashboard. Version 4.8, with extension 2.2, makes the pages and the extension faster, judges LinkedIn jobs with their Remote / Hybrid / On-site label against each user's own market, and keeps each job in one row of its Google Sheet tab. Version 4.9 fills a user's profile in from their resume (also while adding the user), reads Word resumes and makes uploading a resume hard to miss; 4.9.1 reads the text of PDF and Word resumes itself, so both are ready the moment they are uploaded.

## Upgrading from 4.9.0

Version 4.9.1 needs no database change and no new extension. Deploy it, and that's it (its new library, `unpdf`, installs with the build).

- **PDF and Word resumes, both read as they are uploaded.** The app now reads a PDF's text itself (PDF.js, through `unpdf`), as it already did for Word and text files: the words, accents and all, and where its links point. Every PDF, Word or text resume with text is ready for **Writing** the moment it is uploaded, and reading its facts sends the text and asks only for the facts, which is quicker and cheaper. Only a scanned PDF (a picture, no text) still goes to Claude as a document.
- **Any provider on the Resume reading route can read a resume with text.** It stays Claude by default (the resume is personal data); a free provider added under **AI → Routes** can read resumes with text, while a scanned PDF still needs Claude. The buttons say **Read with AI** and **Read by the AI** accordingly.
- **Word files saved by other programs.** The main text is found the way Word itself finds it (some files keep it in `document2.xml`), with any XML prefix, and tab stops are no longer taken for tabs.
- **A file the AI cannot read is kept, with why.** A damaged Word file, an old `.doc` or a password-protected file renamed `.docx`, or an RTF file named `.docx`: the upload keeps it (autofill can still attach it) and says what to do, instead of refusing it.

## Upgrading from 4.8

Version 4.9 needs no database change and no new extension. Deploy it, and that's it.

- **Uploading a resume.** **Profile & resumes → Resumes** opens with a drop zone: drop the file or click **Choose a resume**, and its name becomes the variant's name. **Upload** with no file chosen opens the file dialog (before, it only said "Choose a file first"). A file the app does not take is refused before it is sent, with why. Files the browser sends without a type (Windows often does for `.md` and `.docx`) are taken by their extension.
- **Several resumes, one default.** Each user keeps as many variants as they like: the first is the default, **Make default** picks another, the pencil renames one, and deleting the default makes the newest other one the default. The extension attaches the default, or the variant whose tags fit the job.
- **Fill in the profile from a resume.** The **Profile** tab starts with **Fill in from a resume**: pick one of the user's resumes (the default first) or a new file, and Claude fills in the name, contact details, links, headline, summary, years of experience, skills, languages, experience and education. **Fill empty fields** keeps what is there, **Replace filled fields** writes over it. You review the fields and save. A resume Claude has read before fills in at once, without another AI call. Uploading a resume on the Resumes tab can fill the profile too (ticked while the profile misses key fields).
- **Add user with their resume.** **Users → Add user** takes the new user's resume: Claude reads it while you fill in the rest, and fills in their name, a user ID and where they are based. Once they are added, the resume is their default and their profile is filled in from it; **Open profile** in the message takes you there to review it.
- **Word resumes.** Claude reads `.docx` resumes too (the body, headers and footers, and where the links point), and a Word or text resume is ready for **Writing** as soon as it is uploaded. Old `.doc` files can still be attached to applications but not read: save them as PDF or `.docx`.
- **Quicker resume reading.** The **Resume reading** route now defaults to effort low (a reading has to finish within the minute a request may take), and for a Word or text resume Claude returns only the facts, not the text again. A route you saved keeps its effort: set it under **AI → Routes**.
- **A user added a moment ago.** Right after **Add user**, every page and request works on the new user at once (before, another server instance could take up to 10 seconds to know them), and the Viewing menu lists them without a reload.

## Upgrading from 4.7

Version 4.8 needs no database change. Deploy it, update the Chrome extension to 2.2.0 (below), and that's it.

- **Faster pages.** No page waits for the status bar any more, and the Dashboard shows its tiles and charts first; Next actions, interviews and insights follow as they arrive. The status bar, the Applications board, a job's panel and the Dashboard make far fewer database round trips, and the parts of the status that rarely change are kept for a minute (any change reads them again).
- **Run the app next to its database.** Every database query waits one round trip between Vercel and Supabase. The status bar's DB chip now shows that time when it is high, and **Setup → Speed** names the Vercel Function Region next to your Supabase project (for example Frankfurt, `fra1`, for `eu-central-1`). Changing it (Vercel → your project → Settings → Functions → Function Region, then redeploy) is the biggest speed-up when the two are far apart.
- **A faster extension.** The extension's call answers sooner: one query where there were three, and the job goes to the Google Sheet after the extension has its answer. Extension 2.2.0 moves on as soon as LinkedIn shows the job it clicked, instead of always waiting almost 3 seconds, and asks LinkedIn for the job's apply link while the page loads.
- **Better LinkedIn verdicts.** Extension 2.2.0 sends LinkedIn's Remote / Hybrid / On-site label with the location ("Berlin, Germany · Remote"). The built-in analysis prompt judges every location rule against the user's own location and market (its examples no longer assume someone outside the US who wants Europe), uses the work authorization, visa and relocation facts of the profile when it is used for matching, keeps the start and the end of long postings, and asks every model where the employer can hire. Users on the built-in prompt get the new one; a prompt you edited stays as it is.
- **Which AI judges LinkedIn jobs.** **Admin → Extension → AI for LinkedIn jobs** lists the LinkedIn extension route's providers with their models and keys, and which models answered in the last 7 days. The popup shows the model under each job.
- **One row per job in the Google Sheet.** **Sync Sheets** now writes only board jobs to the Jobs tab and adds every approved LinkedIn job missing from the LinkedIn tab (before, it copied LinkedIn jobs into the Jobs tab and marked them as sent, so some never reached the LinkedIn tab). A job's panel says whether it is in its user's sheet, and which tab, or why not.
- **Steadier AI failover.** A provider that fails again right after a rest rests longer each time (45 seconds, then 1.5, 3 and 6 minutes, up to 10), so a hanging provider stops holding up every LinkedIn job.

To update the extension: extract `job-finder-extension-v2.2.0.zip` from the [newest release](https://github.com/icedev07/job-finder-ai/releases/latest) over the old folder (or pull), then click the reload icon in `chrome://extensions`.

## Upgrading from 4.6

Version 4.7 adds **Writing** and the Dashboard's **Insights**. After you deploy it, open `https://your-app.vercel.app/api/setup` once: it adds the `Draft` table. (Or run `npx prisma migrate deploy`.)

- **Writing**, in a job's panel, drafts what an application needs: a **Resume match** (how the resume fits the job: strengths, gaps, keywords to add and lines to rewrite), a **Cover letter**, an **Intro message** to the recruiter, a **Follow-up** e-mail that fits where the application stands, and **Interview prep** for the next interview. The AI writes only from the user's own profile and resume and from the application: the job, your notes, its interviews and history. Pick the resume under **Write from** (one read with Claude in Profile & resumes).
- Each job keeps one draft of each kind: edit it, **Copy** it, **Rewrite** it with instructions ("shorter", "in German"), or delete it. Every change can be undone from its message.
- **The Writing route** (**AI → Routes**) runs the drafts: Claude Opus 5.5 at effort `low` by default, so a draft is ready within the minute a request may take. Like form answers, it sends personal data, so Claude is recommended.
- **Next actions**: a row's menu has **Draft a follow-up** (or **Draft a cover letter** for a saved job), and an interview has **Prepare**: the job opens on Writing and the draft is written.
- **Insights** on the Dashboard: for every application sent so far, how many got an answer, reached an interview or an offer, how soon the first answer came, and how each source and resume did, with the best of each.
- **Resume sent**, in a job's panel, records which resume went with an application, for the resume insights. The extension already records the one it attaches.

## Upgrading from 4.5

Version 4.6 adds **Next actions** and interviews. After you deploy it, open `https://your-app.vercel.app/api/setup` once: it adds the `Interview` table. (Or run `npx prisma migrate deploy`.) Your applications stay as they are.

- **Next actions**, in the sidebar under Review, lists what to do next on each application: interviews in the next two days, follow-ups that are due, applications with no answer 3 weeks after applying, and jobs saved a week ago and not applied to yet. Mark one **Followed up** (the next reminder comes your follow-up days later) or **Applied**, **Snooze** it, or close it with a reason, one at a time or several at once. Every change can be undone from its message or with `u`.
- **The sidebar badge moved** from Applications to Next actions and counts all of them. The board's strip shows each user's count as "N to do", and the Dashboard's Applications tile counts next actions instead of follow-ups due.
- **Interviews**: add them in a job's panel with the date and time, the kind (HR / recruiter, technical, final or other), the link or address, and notes. Adding one moves the application to Interview (unless it is at Offer) and its follow-up to your follow-up days after the interview. Interviews show on the timeline, on the board's cards, in Next actions and on the Dashboard's new **Upcoming interviews** card, next to a **Next actions** card.
- **Followed up** is also in the job's panel, next to the follow-up date, and goes on the timeline.
- **Snooze on a saved job sets a reminder to apply**: the job's follow-up date. The reminder ends when the job moves on.
- **Two new settings** in **Settings → Applications**: how many days a job can sit in Saved (7) and how many days an application can go without an answer (21) before it shows in Next actions. `0` turns either off.

## Upgrading from 4.4

Version 4.5 reworks **Applications**. After you deploy it, open `https://your-app.vercel.app/api/setup` once: it adds the `ApplicationEvent` table (each application's timeline) and the `closeReason` column. (Or run `npx prisma migrate deploy`.) Applications you already have get a timeline that starts with when they were applied to and the stage they are in, and the ones in Rejected count as rejected by the company.

- **Every user on one board**: each card shows whose job it is, and a strip on top shows each user's saved, applied and interview numbers and follow-ups due. Click a user to see only theirs.
- **Search and filters**: title, company, location and notes, the source, a minimum score, and **Show archived**. There is no 100-card limit any more: each column loads 100 cards at a time, with **Show more**.
- **Several cards at once**: tick cards, or a whole column, to move them, close them or set a follow-up. Every move can be undone from its message.
- **Why it closed**: moving a card to Archived asks why: you withdrew, the position closed, or no response. Rejected means rejected by the company. A card's menu has **Close as**. The reason shows on the card, in the job's panel (where you can change it) and in the CSV export.
- **A timeline for each application**, in the job's panel: every stage change, close reason, follow-up date, note and **Mark as applied**, with when and who did it (an admin, or someone in the extension).
- **The Google Sheet follows the board**: for users with Applications on, both tabs get a **Stage** column, and moving a card updates its row.
- **Applications on or off for each user**, in **Settings → Applications** or with the switch on the board. Off, jobs approved by hand stay out of Saved, there are no follow-up reminders, the sheet's Stage column is left alone, and while only that user is viewed, Applications and its badge are hidden.
- **Mark as applied** on a job already at Interview or Offer leaves it there.

## Upgrading from 4.3

Version 4.4 reworks **Review**. After you deploy it, open `https://your-app.vercel.app/api/setup` once: it adds the `reviewedAt` column, which records when a job left the Review queue. (Or run `npx prisma migrate deploy`.) The jobs waiting in Review stay there.

- **A list first**: every close call in one table, with the AI's reason under each job and **Approve**, **Reject** and **Keep AI verdict** for one row or for the selected rows. The one-card view is still there as **Focus**, where `k` now keeps the AI verdict.
- **Mark all reviewed** empties the queue (all users', or one user's with the user filter) without rating anything: every job keeps its AI verdict. Every action can be undone from its message or with **Undo** (`u`).
- **Jobs you approve go to the Google Sheet right away**, whether in Review, in Jobs or in a job's panel, instead of waiting for the next scan. A job already in the sheet is never added twice.
- **Review on or off for each user**, in **Settings → Target & matching** or with the switch on the Review page. Off, that user's close calls keep the AI verdict and stay out of Review; while only they are viewed, Review and its badge are hidden.
- LinkedIn jobs you approve by hand now go to the user's LinkedIn tab, like the ones the extension approves.

## Upgrading from 4.2

Version 4.3 and extension 2.1 let everyone sign in to the Chrome extension with their own user ID and password, so the LinkedIn jobs they scan, their extension settings and the profile autofill uses are theirs. The extension is now called **Job Finder**, with the radar logo. After you deploy it:

1. **Update the database**: open `https://your-app.vercel.app/api/setup` once. It adds the `ExtensionToken` table (one row per browser signed in to the extension). (Or run `npx prisma migrate deploy`.)
2. **Update the extension** to 2.1.0: extract `job-finder-extension-v2.1.0.zip` from the [newest release](https://github.com/icedev07/job-finder-ai/releases/latest) over the old folder (or pull), then click the reload icon in `chrome://extensions`.
3. **Sign in**: open the popup and enter the server URL, your user ID and your password. Each person signs in with their own user ID; admins can pick another user under **Scan for** to scan and fill forms for them without signing out.
4. Once every browser has signed in, turn the **Old shared key** off at the bottom of **Admin → Extension**. Until then an extension 2.0 keeps working with it, saving its jobs as the first admin's. New installs have no shared key.

## Upgrading from 4.1

Version 4.2 gives each user their own data: jobs and verdicts, Review, Applications, search options, job boards, Google Sheet, profile, resumes, saved answers and skip rules. After you deploy it:

1. **Update the database**: open `https://your-app.vercel.app/api/setup` once. Everything you have today becomes the first admin's (`admin`): every job, resume, saved answer, skip rule and log, plus the target market, location, analysis prompt, Google Sheet and profile from Settings. Nothing is deleted. (Or run `npx prisma migrate deploy`.)
2. **Pick whose data to see** in the **Viewing** menu at the top right: one user, or **All users** (the Dashboard then lists every user, and Jobs, Review and Applications show whose each job is).
3. **Set up each other user**: with them selected in Viewing, open **Settings** and fill in where they are based, their target market, their job boards and (optionally) their Google Sheet; add their profile and resumes under **Profile & resumes**. Or add new people with **Copy the set-up of** on the Users page.
4. The extension keeps working with the shared API key, saving the LinkedIn jobs it scans as the first admin's, until you update it to 2.1 and sign in (see [Upgrading from 4.2](#upgrading-from-42)).

Board scans now judge each new job once for every user who gets that board, with that user's location, target market and profile, so AI use grows with the number of users.

## Upgrading from 4.0

Version 4.1 replaces the single admin password with user accounts. After you deploy it:

1. **Update the database**: open `https://your-app.vercel.app/api/setup` once. It adds the `User` table and makes you the first admin, user ID `admin`, with your current admin password. Nothing else changes. (Or run `npx prisma migrate deploy`.)
2. **Sign in again** at `/admin/login` with user ID `admin` and your current password. Sessions from 4.0 end, so everyone signs in once.
3. **Add people** under **System → Users**: a user ID (no email), a name, a password and a role. **Admins** use this dashboard. **Users** sign in to the Chrome extension only (extension 2.1 and newer).
4. Change your own password under **Settings → Your password** (it asks for the current one). `ADMIN_PASSWORD`, when set, is now the first admin's password.

## Upgrading from 3.x

Version 4.0 locks the admin panel down and changes how the extension connects. After you deploy it:

1. **Add the new environment variables** on Vercel (Project → Settings → Environment Variables), then redeploy:
   - `CRON_SECRET` (**required** for the daily scan): any long random string. Vercel sends it to the cron route; without it the daily scan is refused and logged in **Logs**.
   - `SESSION_SECRET` (recommended): signs admin sessions. Without it the signing key is derived from `DATABASE_URL`.
2. **Update the database**: open `https://your-app.vercel.app/api/setup` once. It adds the new tables and columns and keeps your data. (Or run `npx prisma migrate deploy`.)
3. **Sign in** at `/admin/login` with user ID `admin`. If you still use the default password `admin`, change it under **Settings → Your password** (at least 8 characters).
4. **Reconnect the extension**: install the newest extension (see [Install and sign in](#install-and-sign-in)) and sign in to its popup with user ID `admin` and your password.
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
2. **Judge**: AI checks every job during the scan itself, once for each user who gets that board. Is it a software role? Can someone based where that user is be hired? Does it fit their target market (and their profile, if it is turned on)? Each AI task has its own *route*, an ordered list of providers that fails over automatically when one is rate-limited (see [AI](#ai-providers-routes-and-cost)). A scan stores a job only once it has a verdict (`APPROVED` or `REJECTED`). Jobs it could not check are retried on the next scan.
3. **Review**: close calls (score 45–70 by default) wait in **Review**. Approve or reject them (your answers also measure how often each model agrees with you, under **AI → Evaluations**), keep the AI verdict, or mark them all reviewed. Review can be off for a user; their close calls then keep the AI verdict.
4. **Apply**: open a job's application form, click **Autofill this page** in the extension side panel, check the colour-coded fields, submit the form yourself, then click **Mark as applied**.
5. **Track**: applications move through **Applications** (Saved → Applied → Interview → Offer, or closed as Rejected or Archived with a reason) with follow-up reminders, interviews and a timeline for each one, and **Next actions** lists what to do next on them. Approved jobs also go to the user's Google Sheet (optional): the AI's approvals after each scan, the ones you approve right away. The sheet's Stage column follows the board.

## Admin panel

Sign in at `/admin/login` with your user ID and password. The first admin is `admin`, with the password `admin` on a new install; change it right away. Every admin page and admin API needs a session (see [Security](#security)).

With more than one user, the **Viewing** menu at the top right picks whose data every page shows: one user, or **All users**. Pages that change one user's data (Settings, Profile & resumes, a Google Sheet test) ask you to pick a user first, and a banner reminds you while you look at someone else's data. Each browser tab keeps its own choice.

| Page | URL | What it is for |
|---|---|---|
| Dashboard | `/admin` | KPIs (found, approved, to review, applications, AI calls, Claude spend), 30-day activity, funnel, source yield, setup reminders, quick actions (run a scan pass, analyze pending, sync Sheets). Next actions, upcoming interviews and insights into every application sent (answer, interview and offer rates, time to the first answer, the best source and resume). With **All users**, a table of every user's last 7 days, applications, LinkedIn activity and AI cost |
| Jobs | `/admin/jobs` | Every stored job. Search with `"exact phrase"` and `-exclude`; filter by status, source, stage, Easy Apply, score, rating, eligibility and age; use saved views; bulk stage / approve / reject / rate / re-analyze / delete; export CSV. The detail drawer holds notes, follow-up date (with **Followed up**), the resume sent, signals, **Writing** (AI drafts of a resume match, cover letter, intro, follow-up and interview prep), what you sent, the application's interviews and its timeline |
| Review | `/admin/review` | Close calls as a list: approve, reject or keep the AI verdict for one row or the selected ones, **Mark all reviewed**, and with **All users** a user filter. Or one at a time in **Focus**: `y` or `→` good match, `n` or `←` not a match, `k` keep the AI verdict, `s` skip, `o` open the posting, `u` undo. A switch turns Review off for the viewed user |
| Next actions | `/admin/next-actions` | What to do next on each application, for the viewed user or everyone: interviews in the next two days, follow-ups that are due, no answer weeks after applying, saved jobs not applied to yet. **Followed up**, **Applied**, **Snooze** or close with a reason, one row or the selected ones; with **All users**, a user filter. A row's menu drafts a follow-up (or a cover letter), and **Prepare** writes interview prep. The sidebar badge counts them |
| Applications | `/admin/applications` | Every user's applications on one board: Saved → Applied → Interview → Offer / Rejected (+ Archived), with each user's numbers on top. Search, filter by user, source and score. Drag cards, use a card's menu, or focus one and press `1`–`6` or `←` / `→`; tick cards to move, close or follow up several at once. Moving to Archived asks why it closed. Follow-up badges turn amber when due and red when overdue, and a card shows its next interview; a card opens the job with its interviews and timeline. A switch turns Applications off for the viewed user |
| Sources | `/admin/sources` | Enable and configure each job source, run one or **Scrape all sources**, set the analyzer batch size and the MyGreenhouse cookie |
| Skip rules | `/admin/skip-rules` | Block jobs by company, title keyword or URL pattern, for one user or for everyone. Rules run before the AI, so they also save quota |
| AI | `/admin/ai` | Providers & keys, per-task routes, usage & cost, playground, evaluations |
| Profile & resumes | `/admin/profile` | Each user's candidate profile, resume files and the answer bank used by autofill |
| Extension | `/admin/extension` | Server URL and install steps, which AI judges LinkedIn jobs (and which models answered in the last 7 days), every browser signed in to the extension (sign one out), each user's extension settings, Easy Apply stats, supported form sites, the old shared key of extension 2.0 |
| Users | `/admin/users` | Everyone who can sign in: add a user (user ID, name, password, Admin or User role, where they are based, target market, optionally a copy of another user's search options, skip rules or profile), rename, change the role, set a new password, disable or enable, sign out everywhere, delete (with all their data) |
| Logs | `/admin/logs` | All jobs, AI analysis log, scan logs, extension logs |
| Data | `/admin/data` | Storage use against the Supabase free 500 MB, safe clean-ups, exports, SQL console (read-only by default) |
| Settings | `/admin/settings` | Each user's target market and location, profile in matching, Review on or off and its score band, Applications on or off with the follow-up days and when a saved or unanswered application shows in Next actions, analysis prompt, job boards and Google Sheet; the app-wide Google service account; your password |
| Setup | `/admin/setup` | 15-step checklist from database to first scan; per-user steps name who is missing what; **Speed** shows how far the database is and the Vercel Function Region next to it |

The top bar shows the last scan, AI calls in the last 24 hours, Claude spend against the budget, database size, and when the extension last reported in.

Keyboard shortcuts:

- `Ctrl+K` (`⌘K` on macOS) opens the command palette: jump to any page, run a scan pass, analyze pending jobs, sync Sheets, switch the theme, or sign out.
- On the Jobs page, `/` focuses search, `j` / `k` move, `Enter` opens a job and `x` selects it.
- In the Review list, `j` / `k` move, `x` selects, `Enter` opens a job and `u` undoes the last action. Focus has its own keys (see the table).
- On the Applications board, focus a card and press `1`–`6` to move it to that column (or `←` / `→` to the next one), `x` to select it and `Enter` to open it; `Esc` clears the selection. With several cards selected, the keys move them all.
- In Next actions, `j` / `k` move, `x` selects, `Enter` opens a job, `u` undoes the last change and `Esc` clears the selection.
- `Ctrl+S` saves on Settings, Profile and the AI providers and routes tabs.

## AI: providers, routes and cost

### Tasks and routes

Each AI task has its own route: an ordered list of providers. The first provider with a key and spare quota answers. On a rate limit, error or timeout the next one is tried, and a failing provider cools down for a while. Configure routes under **AI → Routes**.

| Task | Used by | Default route |
|---|---|---|
| Board scans | the daily cron and **Scrape all sources** (batched verdicts) | free providers in the order Gemini → OpenRouter → Cerebras → Groq → Cloudflare |
| LinkedIn extension | the extension, one job at a time while it scans | free providers in the order Cerebras → Groq → Cloudflare → Gemini → OpenRouter |
| Resume reading | **Fill in from a resume**, **Read with AI** on an uploaded resume, and **Add user** with a resume | Claude (needed for scanned PDFs; any provider can read a resume with text) |
| Form answers | free-text answers drafted by the autofill side panel | Claude (you can add free providers) |
| Writing | **Writing** in a job's panel: resume match, cover letter, intro, follow-up and interview prep | Claude (you can add free providers) |

The **Board scans** and **LinkedIn extension** routes start with the free providers that were ticked in Settings before the upgrade. A fresh install ticks Gemini, Groq, Cerebras and OpenRouter; add Cloudflare in **Routes** once you have its key. The defaults keep the high-volume tasks on the free providers. Once you have a Claude key, add Claude where quality matters, for example first on **LinkedIn extension**, or Haiku on **Board scans**.

### Free providers (no card)

Gemini, Groq, Cerebras, OpenRouter and Cloudflare Workers AI. Keys and models live under **AI → Providers & keys**; see [DEPLOYMENT.md](DEPLOYMENT.md#step-3-get-your-ai-api-keys) for where to get each key.

### Claude (your Anthropic API key, pay as you go)

Create a key in the Claude Console (https://platform.claude.com → API keys), paste it under **AI → Providers & keys**, then pick a model and an effort level for each route.

| Model | Input / output, per 1M tokens | Good for |
|---|---|---|
| Claude Haiku 5.5 | $0.10 / $0.50 (prompts over 100K tokens: $0.50 / $2.50) | Board scans and other high-volume classification |
| Claude Sonnet 5.5 | $2 / $10 | Balanced quality and price |
| Claude Opus 5.5 | $4 / $20 | Anthropic's default and the strongest everyday model: LinkedIn extension, resume reading, form answers, writing |
| Claude Fable 5.1 | $10 / $50 | The most capable model; rarely worth it for job matching |

These are Anthropic's list prices, checked 2026-10-29. Cached prompt reads cost a tenth of the input price or less.

**Effort** (`low`, `medium`, `high`, `xhigh`, `max`) trades speed and cost for more careful reasoning. `low` is usually enough for a yes/no job match.

- **Strict JSON**: Claude answers through a JSON schema, so its verdicts always parse.
- **Prompt caching**: the shared instructions are cached, so repeated calls during a scan cost less.
- **Refusal fallback**: for Opus, Sonnet and Fable the app opts into Anthropic's server-side fallback, so a policy decline is retried on Anthropic's recommended substitute model inside the same call. A refusal never puts Claude on cooldown.
- **Monthly budget**: set a cap under **AI → Usage & cost** (default **$10 per month**; `0` means no cap). Spend is computed from token counts and list prices; your Anthropic invoice is the source of truth. At the cap, Claude is skipped until the 1st of the next month (UTC), and each route falls back to its free providers. Claude-only tasks (resume reading, and form answers and writing unless you add a free provider) pause until then.

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

The `extension/` folder holds **Job Finder**, a Manifest V3 Chrome extension (Chrome 116 or newer) that scans LinkedIn job searches:

1. Open LinkedIn and search for jobs.
2. Click the extension icon, then **Start Scan**.
3. The extension opens each job and sends it, with LinkedIn's Remote / Hybrid / On-site label next to the location, to your server, where the **LinkedIn extension** route judges it against the location, target market and profile of the user it works for. The popup shows the verdict and which model gave it.
4. Rejected jobs are hidden on LinkedIn (tick **Also hide approved jobs on LinkedIn** to hide those too).
5. Approved jobs are saved as that user's and pushed to the "LinkedIn" tab of their Google Sheet.

Everyone signs in to the popup with their own user ID and password. Admins also get **Scan for**, to scan LinkedIn and fill forms for any user: that user's settings and profile are used and the jobs are saved as theirs. The popup's settings (Easy Apply jobs, scan limit, hide approved, AI search page, send logs) are kept on the server for each user, so every browser uses the same ones, and admins can change them under **Admin → Extension → Extension settings**.

### Easy Apply jobs

Choose in the popup under **Easy Apply jobs**:

- **Skip and hide (default)**: Easy Apply jobs are rejected without an AI call and hidden, as in earlier versions.
- **Analyze with AI**: Easy Apply jobs are judged like every other job and marked "Easy Apply" in the popup, on the Jobs page and in the sheet's **Apply via** column. The optional **Approve Easy Apply only at score ≥** keeps only strong Easy Apply matches.

Jobs that were auto-rejected earlier only for being Easy Apply are judged properly the next time you scan them in analyze mode. A job that already has a verdict is never overwritten.

### AI search page and scan limit

The extension supports both the classic `/jobs/search/` results and LinkedIn's newer AI / natural-language search (`/jobs/search-results/`, the chat-style search). The two pages use completely different layouts, so when you scan the AI search page, tick **Analyze AI search page (beta)** in the popup first. The scanner then switches to the matching extractor, with the same flow: per-job AI analysis, external apply-link capture, pagination, and hide-on-reject. Leave it off for the classic page.

Use the **Job scan limit** field to cap how many jobs a run scans across all pages. It defaults to **100**; set it to **-1** to scan every job with no limit. The count includes every job the scanner opens (approved, rejected, skipped, or already processed). The limit is honored across pagination, including the full-page-reload fallback, so a run stops cleanly as soon as it is reached. The field works the same in classic and AI-search (beta) modes.

### Install and sign in

1. Download `job-finder-extension-v<version>.zip` from the [newest release](https://github.com/icedev07/job-finder-ai/releases/latest) and extract it to a folder you keep (or use the `extension/` folder of a clone).
2. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and select that folder. The popup shows the version next to its title.
3. Click the extension icon and enter the **Server URL** (shown on **Admin → Extension**), a **user ID** and **password** from **System → Users**, then click **Sign in**.

To update, extract the new zip into the same folder, replacing the files, and click the reload icon on the extension card; you stay signed in. (From a clone: pull, then click the reload icon.)

A sign-in is required: without one the server refuses every extension request, and the popup says so. Each browser gets its own token; the server keeps only its hash, and the password is never stored in the browser. A sign-in ends when you click **Sign out** in the popup, when an admin signs that browser out under **Admin → Extension → Signed-in browsers**, and when the user is disabled, gets a new password or is signed out everywhere on the Users page.

Extension 2.0 and older had no sign-in: they send the **old shared key** from **Admin → Extension** and save every job as the first admin's. Update them to 2.1, sign in, then turn the key off; new installs have no shared key.

### Publishing a new version

The **Release extension** workflow (`.github/workflows/release-extension.yml`) publishes the extension as a GitHub release:

1. Raise `"version"` in `extension/manifest.json`, for example from `2.2.0` to `2.2.1`.
2. Commit and push to `main`.
3. The workflow checks the manifest, zips `extension/` as `job-finder-extension-v2.1.1.zip` and publishes the release `extension-v2.1.1`. The release notes have install and update steps, a link to the changes since the previous release, and the zip's SHA-256 checksum.

A push that keeps the version publishes nothing; the run notes that the version is already released. **Actions → Release extension → Run workflow** starts it by hand.

## Autofill application forms

The extension's side panel fills company application forms from the profile and resumes of the user it works for (the one signed in, or the one an admin picked under **Scan for**). It never submits anything: you review the form and click Submit yourself.

1. Open a job's application form (for example from **Apply** in a job's drawer).
2. Click the extension icon, then **Open autofill panel (application forms)**.
3. Pick the resume to attach. It is preselected by tags (see [Profile & resumes](#profile--resumes)).
4. Click **Autofill this page**. Every field is outlined and listed by source:
   - **green**: filled from your profile or resume;
   - **amber**: drafted by AI or worth a check (read it before you submit);
   - **red**: missing; it needs you.
5. Submit the form yourself, then click **Mark as applied**. The job (created if it was not stored yet) moves to **Applied** with a follow-up date (7 days by default); a job already at Interview or Offer stays there. The resume and answers you sent are kept in the job drawer under "What you sent", and its timeline shows who applied and when. With **Save my answers to the answer bank** ticked, your free-text answers are reused on the next form.

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
- **Fill in from a resume** (top of the Profile tab): the AI reads one of the user's resumes, or a new file, and fills in the name, contact details, links, headline, summary, years of experience, skills, languages, experience and education, into the empty fields or over what is there. Review them and save. It uses the **Resume reading** route (Claude by default). A resume read before fills in at once. **Users → Add user** does the same with the new user's resume.
- **Resumes**: keep one file per variant (for example ".NET backend" and "Full-stack JS"). Drop a file on the upload card or choose one: PDF, DOCX, DOC, TXT or Markdown, up to 4 MB each. Files are stored in the database, so they count toward Supabase's 500 MB. The first resume is the default; **Make default** picks another. Tags pick the variant for a job: the resume whose tags appear most in the job text wins, else the default. The app reads the text of PDF, Word (`.docx`) and text resumes itself as they are uploaded, so **Writing** in a job's panel drafts from them at once; a scanned PDF has no text, and Claude reads it as a picture. **Read with AI** shows the facts the AI finds in a resume and copies them into the profile (**Fill profile** once it has been read). A file the AI cannot read (an old `.doc`, a damaged or password-protected file) is still kept for autofill to attach, with what to do.
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

- **Sign-in**: everyone signs in with a user ID and password; only users with the **Admin** role can open the dashboard. Every `/admin` page and `/api/admin` endpoint needs a session: an HttpOnly, SameSite=Lax cookie that lasts 7 days, signed with `SESSION_SECRET` (or a key derived from `DATABASE_URL`). Rotating `SESSION_SECRET` signs everyone out.
- **Ending sessions**: disabling a user, setting their password, changing their role or **Sign out everywhere** on the Users page ends their sessions within seconds. Nobody can disable, demote or delete themselves, so the dashboard always keeps an admin.
- **Passwords**: stored as scrypt hashes; a new password needs at least 8 characters, and changing your own asks for the current one. A failed sign-in says "Wrong user ID or password." without saying which. After 8 failed sign-ins from one client, further attempts are refused until 15 minutes after the first failure. The `ADMIN_PASSWORD` environment variable, when set, is the first admin's password and overrides the stored one; it can then not be changed in the panel.
- **Secrets are write-only**: the AI provider keys, the Google service account and the old shared extension key are never sent back to the browser; the panel only shows whether one is set and its last characters. Leaving a secret field blank keeps the stored value. Only the old shared extension key can be revealed, because an extension 2.0 needs it pasted into its popup.
- **Extension API**: every `/api/extension/*` request needs a sign-in: the browser's own token (`Authorization: Bearer …`, from signing in to the popup with a user ID and password) or, for extension 2.0, the old shared key in `X-API-Key`. The server stores only a SHA-256 hash of each token, and a token stops working when its user is disabled, gets a new password or is signed out everywhere. Only admins may send `X-JF-For` ("Scan for") to work on another user's data. Extension sign-ins share the dashboard's throttle of 8 failures per 15 minutes.
- **Cron**: the daily scan needs `CRON_SECRET` (see above).
- **SQL console** (**Admin → Data**): queries run in a read-only transaction with a 15-second timeout. A write needs an explicit confirmation plus your own password.
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
| - Extension API (per-browser sign-in) |----->+---------------+
+---------------------------------------+      | Google Sheets |
                         |                     +---------------+
                         v
+-------------------+       +---------------------------------------+
| PostgreSQL        |       | Chrome extension 2.2 (Job Finder)     |
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

# 5. Open http://localhost:3000/admin and sign in as user ID admin, password admin
#    Then follow the checklist on /admin/setup.
```

Other scripts: `npm run build`, `npm run lint`, `npm run typecheck`, `npm run prisma:studio`.

## Deploy to Vercel

1. Push to GitHub.
2. Import the repo on https://vercel.com (free, no card needed).
3. Add the environment variables `DATABASE_URL` (Supabase session pooler URI, port `5432`), `CRON_SECRET` and `SESSION_SECRET`.
4. Deploy.
5. Visit `https://your-app.vercel.app/api/setup` once to create the database tables.
6. Sign in at `/admin` and work through **Setup**. Its **Speed** step names the Vercel Function Region next to your database.

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed step-by-step instructions.

## Supabase connection

Use the **Session pooler** connection string from Supabase (Connect > Direct > Session pooler):

```
postgresql://postgres.[ref]:[PASSWORD]@aws-[n]-[region].pooler.supabase.com:5432/postgres
```

Important: use port `5432` (session pooler), not `6543` (transaction pooler).

Run the app in the same region as the database: every query waits one round trip between them. In Vercel → your project → Settings → Functions, set the **Function Region** to the one next to your Supabase project's region (`eu-central-1` → Frankfurt `fra1`, `us-east-1` → Washington `iad1`, …) and redeploy. **Setup → Speed** shows the round trip and names the region.

The session pooler allows about 15 connections for the whole project (free plan), and on Vercel every running function instance keeps its own. The app therefore limits each Vercel instance to 2 connections unless `DATABASE_URL` sets `connection_limit` itself. If **Admin → Setup** or the status bar ever reports "max clients reached", add `connection_limit=1` to the URL (`…/postgres?connection_limit=1`) and redeploy.

## Google Sheet output

Each user's approved jobs go to their own spreadsheet (**Settings → Google Sheet**, with that user selected). One Google service account writes every sheet (**Settings → Google service account**); share each spreadsheet with its `client_email` as Editor. Several users can share one spreadsheet by giving each their own tab names; a missing tab is created on the first export.

The AI's approvals are sent at the end of each scan (LinkedIn ones as the extension finds them). A job you approve by hand, in Review, Jobs or a job's panel, is sent right away. Board jobs go to the Jobs tab and LinkedIn jobs to the LinkedIn tab. Each job gets one row: rows are never deleted, so a job you reject later keeps its row, and approving it again does not add another. **Sync Sheets** rewrites the Jobs tab with the approved board jobs only, and adds to the LinkedIn tab every approved LinkedIn job it does not have yet (found by its link). A job's panel says whether it is in the sheet, or why not.

For users with Applications on, both tabs have a **Stage** column that follows the board: Saved, Applied, Interview, Offer, Rejected, or Archived with its reason, for example "Archived (no response)". A new row is written with the job's stage, and moving the job (on the board, in Jobs, in a job's panel, by approving it in Review, or with **Mark as applied** in the extension) updates its cell right away. The column is found by its header, so you can move it; a tab without one gets it next to its last column. The row is found by the job's link (the URL column), or by its title and company when the tab has no URL column. With Applications off, the column is left alone.

### "Jobs" tab (from scanners)

Default columns (configurable under **Settings → Google Sheet**):

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
| First admin | user ID `admin`, password `admin` | Settings → Your password; more people on **Users** |
| AI routes | see [Tasks and routes](#tasks-and-routes) | AI → Routes |
| Gemini model | `gemini-2.5-flash` | AI → Providers & keys |
| Groq model | `llama-3.1-8b-instant` | AI → Providers & keys |
| Cerebras model | `llama-3.3-70b` | AI → Providers & keys |
| OpenRouter model | `auto` (free models) | AI → Providers & keys |
| Cloudflare model | `@cf/meta/llama-3.1-8b-instruct` | AI → Providers & keys |
| Claude model / effort | Opus 5.5; effort `low` for scans, the extension and writing, `medium` for resumes and answers | AI → Routes |
| Claude monthly budget | `$10` (`0` = no cap) | AI → Usage & cost |
| Target market, where a user is based | none: asked when you add a user (Setup flags users without them) | Settings → Target & matching |
| Use the profile when judging jobs | on (applies once the profile has content) | Settings → Target & matching |
| Job boards per user | every board | Settings → Job boards |
| Review | on for every user | Settings → Target & matching, or the switch on Review |
| Review band | scores `45`–`70` | Settings → Target & matching |
| Applications | on for every user | Settings → Applications, or the switch on Applications |
| Follow-up after applying or an interview | `7` days | Settings → Applications |
| Next actions: a saved job not applied to | after `7` days (`0` = never) | Settings → Applications |
| Next actions: no answer after applying | after `21` days (`0` = never) | Settings → Applications |
| Analyzer batch size | `5` jobs per AI call (max 12) | Sources |
| Jobs / LinkedIn sheet tabs | `Jobs` / `LinkedIn` | Settings → Google Sheet |
| Sheet columns | see JSON above | Settings → Google Sheet |
| Extension settings per user | Easy Apply jobs skipped and hidden, scan limit `100`, nothing else on | Extension → Extension settings, or the popup |
| Old shared extension key (extension 2.0) | none on new installs; an upgraded install keeps its key | Extension → Old shared key |
| Job analysis prompt | built-in (`lib/defaultPrompt.ts`) | Settings → Job analysis prompt |

### Job analysis prompt

Leave **Settings → Job analysis prompt** blank to use the built-in prompt, a strict classifier with hard reject rules (not a software role, location or work-authorization blockers, region-locked remote), soft signals and a scoring rubric (approve at 60 or more). The Settings page shows it so you can copy and adapt it.

Available placeholders: `{{JOB_TITLE}}`, `{{COMPANY}}`, `{{LOCATION}}`, `{{DESCRIPTION}}`, `{{TARGET_MARKET}}`, `{{CURRENT_LOCATION}}`, and `{{CANDIDATE_PROFILE}}` (empty unless your profile is used in matching).

The prompt asks for one JSON object: `approved`, `score` (0–100), `reason` and `techStack`. Board scans also ask for `eligibility`. With Claude, the same rules become the system prompt and a JSON schema enforces the reply, eligibility included.

## Database schema

- **User**: everyone who signs in (user ID, name, scrypt password hash, Admin or User role, active, session version).
- **UserConfig**: each user's own settings, one row per key: target market, location, analysis prompt, Review on or off and its band, Applications on or off, the follow-up days and the Next actions days, job boards, Google Sheet, extension settings and the candidate profile.
- **ScrapedJob**: every stored job (approved/rejected) of one user with its verdict, eligibility, apply method (Easy Apply or company site) and LinkedIn signals, plus the pipeline data: stage, why it closed, applied and follow-up dates, notes, 👍 / 👎 feedback, when it left the Review queue, the resume used and the application answers. The same posting found for two users is two rows, each with its own verdict.
- **ApplicationEvent**: each application's timeline: stage changes, close reasons, follow-up dates, **Followed up**, interviews, notes and **Mark as applied**, with when and who (an admin on the dashboard, or whoever was signed in to the extension).
- **Interview**: each application's interviews: when, the kind (HR, technical, final or other), the link or address, and notes.
- **Draft**: what the AI wrote for each application (Writing), one draft of each kind: the text, the instructions it was written with, the resume it drew on, who wrote it, and whether it was edited by hand.
- **AppConfig**: app-wide key/value settings (AI providers and keys, routes, budget, the Google service account, board set-up; secrets never returned to the browser).
- **SkipRule**: company/title/url block rules, for one user or for everyone.
- **ScanLog**: scan history.
- **AnalysisLog**: AI analysis results per job.
- **ExtensionLog**: logs sent by the extension.
- **AiUsage**: one row per AI call (user, task, provider, model, tokens, cost, latency, outcome). It drives Usage & cost, provider health and the Claude budget.
- **Resume**: each user's resume files (stored in the database) with tags and the parsed profile.
- **SavedAnswer**: each user's answer bank used by autofill.

Migrations live in `prisma/migrations`. `/api/setup` applies the same changes idempotently, for deployments that cannot run `prisma migrate deploy`.

## Environment variables

Only `DATABASE_URL` is required to boot. Everything else is configured in the admin panel.

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string (Supabase session pooler, port 5432) |
| `CRON_SECRET` | for the daily scan | Bearer token Vercel Cron sends to `/api/admin/scanners/run` |
| `SESSION_SECRET` | recommended | Signs admin sessions; rotating it signs everyone out |
| `ADMIN_PASSWORD` | no | The first admin's password: overrides the stored one (and locks changing it in the panel) |
| `ANTHROPIC_BASE_URL` | no | Send Claude calls through a proxy or gateway instead of `https://api.anthropic.com` |

The Anthropic API key itself is stored in the database (**AI → Providers & keys**), not in the environment. See `.env.example`.
