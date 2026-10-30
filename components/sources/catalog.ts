import greenhouseCuratedSlugs from '@/lib/scrapers/feeds/greenhouse-curated-slugs.json';
import { SOURCE_META } from '@/lib/sourceMeta';

// Derived from the bundled list so the help text can never drift from reality.
const GREENHOUSE_CURATED_COUNT = (greenhouseCuratedSlugs as string[]).length;

export type SourceDef = {
  key: string;
  label: string;
  /** One line on what the source is (shown under the title). */
  summary: string;
  /** How to fill the search field (shown under it). */
  searchHelp?: string;
  defaultMax: number;
  /** Pre-filled search-url value. Empty for sources that need user input (ATS slugs). */
  defaultSearchUrl: string;
  searchPlaceholder: string;
  /** "session" sources need a pasted login cookie, "key" ones a (free) API key; the rest are public, zero-auth feeds. */
  auth: 'public' | 'session' | 'key';
  /** Searched with each user's roles in their countries (Settings → What to look for): no search field. */
  searches?: boolean;
  /** The keys a "key" source needs (app-wide settings; secret ones are write-only). */
  keys?: { configKey: string; label: string; secret: boolean; placeholder: string }[];
  /** Where to get the key, or what to know about the source. */
  note?: string;
};

const ALL_SOURCES: SourceDef[] = [
  // European search engines and public employment services: searched with each
  // user's roles in their countries.
  {
    key: 'eures',
    label: 'EURES (EU job mobility portal)',
    summary:
      'Every public employment service in the EU, the EEA and Switzerland: about 2 million jobs in 31 countries (not the UK), with their full text.',
    defaultMax: 50,
    defaultSearchUrl: '',
    searchPlaceholder: '',
    auth: 'public',
    searches: true,
    note: 'The portal’s own search (no official API): if it changes, the scan says so. Source: the European Labour Authority.',
  },
  {
    key: 'arbeitsagentur',
    label: 'Bundesagentur für Arbeit (Germany)',
    summary: 'Germany’s largest job database, about 800,000 jobs (mostly in German), with home office and salary.',
    defaultMax: 50,
    defaultSearchUrl: '',
    searchPlaceholder: '',
    auth: 'public',
    searches: true,
    note: 'The search behind arbeitsagentur.de/jobsuche (no official API): if it changes, the scan says so.',
  },
  {
    key: 'jobtech',
    label: 'Arbetsförmedlingen (Sweden)',
    summary: 'Every job in Sweden’s Platsbanken through the official, open JobTech API, with the full text and remote work.',
    defaultMax: 50,
    defaultSearchUrl: '',
    searchPlaceholder: '',
    auth: 'public',
    searches: true,
  },
  {
    key: 'reed',
    label: 'Reed (UK)',
    summary: 'The UK’s largest job board through its official API: English postings, full text.',
    defaultMax: 50,
    defaultSearchUrl: '',
    searchPlaceholder: '',
    auth: 'key',
    searches: true,
    keys: [{ configKey: 'reed_api_key', label: 'Reed API key', secret: true, placeholder: 'Your key from reed.co.uk/developers' }],
    note: 'Free key: sign up at reed.co.uk/developers/jobseeker.',
  },
  {
    key: 'adzuna',
    label: 'Adzuna',
    summary: 'Job boards and employers’ sites in 10 countries (UK, DE, FR, NL, BE, AT, CH, IT, ES, PL); short descriptions only.',
    defaultMax: 50,
    defaultSearchUrl: '',
    searchPlaceholder: '',
    auth: 'key',
    searches: true,
    keys: [
      { configKey: 'adzuna_app_id', label: 'App ID', secret: false, placeholder: 'e.g. 1a2b3c4d' },
      { configKey: 'adzuna_app_key', label: 'App key', secret: true, placeholder: 'Your key from developer.adzuna.com' },
    ],
    note: 'Free key at developer.adzuna.com. Its terms allow personal job search; a business needs a licence.',
  },
  // JSON feeds
  {
    key: 'remoteok',
    label: 'RemoteOK',
    summary: 'Public JSON feed of the newest remote jobs.',
    searchHelp: 'Ignored: the feed always returns the latest jobs.',
    defaultMax: 50,
    defaultSearchUrl: '',
    searchPlaceholder: '(no config — fetches latest jobs)',
    auth: 'public',
  },
  {
    key: 'jobicy',
    label: 'Jobicy',
    summary: 'Jobicy v2 API of remote jobs.',
    searchHelp: 'Accepts tag=react, jobGeo=anywhere, or a full Jobicy API URL.',
    defaultMax: 50,
    defaultSearchUrl: '',
    searchPlaceholder: 'tag=javascript,jobGeo=anywhere',
    auth: 'public',
  },
  {
    key: 'landingjobs',
    label: 'Landing.Jobs',
    summary: 'EU-leaning developer jobs API.',
    searchHelp: 'Accepts query params or a full landing.jobs API URL.',
    defaultMax: 50,
    defaultSearchUrl: '',
    searchPlaceholder: 'remote=true,limit=50',
    auth: 'public',
  },
  // Hidden / low-competition sources: zero-auth public APIs and feeds that
  // bypass the crowded commercial boards.
  {
    key: 'remotive',
    label: 'Remotive',
    summary: 'Public JSON of remote jobs.',
    searchHelp: 'Accepts category=software-dev, search=react, company_name=…, or a full Remotive API URL.',
    defaultMax: 50,
    defaultSearchUrl: 'category=software-dev',
    searchPlaceholder: 'category=software-dev,search=react',
    auth: 'public',
  },
  {
    key: 'workingnomads',
    label: 'Working Nomads',
    summary: 'Public JSON of curated remote jobs (one flat feed).',
    searchHelp: 'Comma-separated category keywords to keep. Blank = every category.',
    defaultMax: 50,
    defaultSearchUrl: 'Development',
    searchPlaceholder: 'Development, DevOps, Sysadmin',
    auth: 'public',
  },
  {
    key: 'arbeitnow',
    label: 'Arbeitnow (EU)',
    summary: 'Germany/DACH-leaning public JSON, rate-limited to a few pages per scan.',
    searchHelp: 'Comma-separated keywords matched on title and tags. Blank = all.',
    defaultMax: 50,
    defaultSearchUrl: '',
    searchPlaceholder: 'developer, engineer, remote',
    auth: 'public',
  },
  {
    key: 'hnwhoishiring',
    label: 'Hacker News — Who is hiring?',
    summary: 'The monthly “Ask HN: Who is hiring?” thread; each comment is a job posting.',
    searchHelp:
      'Comma-separated keywords matched on the posting text. Blank = every post; the default keeps remote ones.',
    defaultMax: 60,
    defaultSearchUrl: 'remote',
    searchPlaceholder: 'remote, europe',
    auth: 'public',
  },
  {
    key: 'themuse',
    label: 'The Muse',
    summary: 'Public JSON with real server-side filters.',
    searchHelp:
      'Accepts category=Software Engineering, level=Senior Level, location=Remote (no comma), or a full The Muse API URL for locations with commas.',
    defaultMax: 50,
    defaultSearchUrl: 'category=Software Engineering',
    searchPlaceholder: 'category=Software Engineering,level=Senior Level',
    auth: 'public',
  },
  {
    key: 'realworkfromanywhere',
    label: 'Real Work From Anywhere',
    summary: 'True work-from-anywhere remote roles via RSS, with no region locks.',
    searchHelp: 'A category slug (e.g. remote-software-developer-jobs) or a full RSS URL. Blank = all jobs.',
    defaultMax: 50,
    defaultSearchUrl: 'remote-software-developer-jobs',
    searchPlaceholder: 'remote-software-developer-jobs',
    auth: 'public',
  },
  {
    key: 'nofluffjobs',
    label: 'NoFluffJobs (PL/CEE)',
    summary: 'Poland/CEE IT board with a public search API: salary always disclosed, heavy on .NET/Java/JS B2B.',
    searchHelp: 'A keyword (e.g. .net, c#, java) plus opt-in filters: remote=true, days=14. Blank = newest across all tech.',
    defaultMax: 50,
    defaultSearchUrl: '.net,remote=true',
    searchPlaceholder: '.net,remote=true,days=14',
    auth: 'public',
  },
  {
    key: 'justremote',
    label: 'JustRemote',
    summary: 'Scraped from the page’s SSR payload (~10 jobs per page).',
    searchHelp: 'The path picks the board, e.g. remote-developer-jobs, remote-design-jobs.',
    defaultMax: 25,
    defaultSearchUrl: 'remote-developer-jobs',
    searchPlaceholder: 'remote-developer-jobs',
    auth: 'public',
  },
  // RSS feeds
  {
    key: 'weworkremotely',
    label: 'We Work Remotely',
    summary: 'RSS feed per job category.',
    searchHelp: 'Comma-separated category slugs from weworkremotely.com/categories.',
    defaultMax: 50,
    defaultSearchUrl: 'remote-programming-jobs,remote-full-stack-programming-jobs',
    searchPlaceholder: 'remote-programming-jobs,remote-full-stack-programming-jobs',
    auth: 'public',
  },
  {
    key: 'jobspresso',
    label: 'Jobspresso',
    summary: 'Remote jobs RSS feed.',
    searchHelp: 'The feed lives at /jobs/feed/ (the bare /feed/ is the empty WordPress blog feed).',
    defaultMax: 50,
    defaultSearchUrl: 'https://jobspresso.co/jobs/feed/',
    searchPlaceholder: 'https://jobspresso.co/jobs/feed/',
    auth: 'public',
  },
  {
    key: 'authenticjobs',
    label: 'Authentic Jobs',
    summary: 'Dev-leaning RSS feed.',
    defaultMax: 50,
    defaultSearchUrl: 'https://authenticjobs.com/feed',
    searchPlaceholder: 'https://authenticjobs.com/feed',
    auth: 'public',
  },
  {
    key: 'nodesk',
    label: 'Nodesk',
    summary: 'Remote-only RSS feed (Hugo-generated Atom feed).',
    defaultMax: 50,
    defaultSearchUrl: 'https://nodesk.co/remote-jobs/index.xml',
    searchPlaceholder: 'https://nodesk.co/remote-jobs/index.xml',
    auth: 'public',
  },
  // ATS multi-company: the defaults are curated lists of companies that publish
  // public job boards on each ATS. Override or extend per your watchlist.
  {
    key: 'greenhouse',
    label: 'Greenhouse (multi-company)',
    summary: 'Public job boards of many companies on the Greenhouse ATS.',
    searchHelp: `Comma-separated company slugs from boards-api.greenhouse.io. Type @curated to expand the bundled ${GREENHOUSE_CURATED_COUNT}-company list, or mix @curated,extra-slug. Optional filters: @remote, @since=7 (days), @kw=engineer, @loc=germany.`,
    defaultMax: 200,
    defaultSearchUrl:
      'stripe,anthropic,cloudflare,mongodb,samsara,roblox,airbnb,gitlab,intercom,figma,fivetran,robinhood,lyft,asana,instacart,postman,dropbox,vercel,duolingo,discord,newrelic,amplitude,mixpanel,webflow,algolia,airtable,modernhealth',
    searchPlaceholder: '@curated  (or: stripe,vercel,airbnb,figma)',
    auth: 'public',
  },
  {
    key: 'lever',
    label: 'Lever (multi-company)',
    summary:
      'Public job boards of companies on the Lever ATS. Its public API is sparse: the defaults are the few companies confirmed to expose it.',
    searchHelp: 'Comma-separated company slugs from api.lever.co.',
    defaultMax: 100,
    defaultSearchUrl: 'palantir,spotify,rover,highspot,cherre',
    searchPlaceholder: 'palantir,spotify,rover',
    auth: 'public',
  },
  {
    key: 'ashby',
    label: 'Ashby (multi-company)',
    summary: 'Public job boards of companies on the Ashby ATS.',
    searchHelp: 'Comma-separated company slugs from api.ashbyhq.com/posting-api.',
    defaultMax: 100,
    defaultSearchUrl: 'ramp,ashby,linear,posthog,watershed,replit,supabase,vapi,mintlify',
    searchPlaceholder: 'ramp,linear,posthog',
    auth: 'public',
  },
  {
    key: 'mygreenhouse',
    label: 'MyGreenhouse',
    summary:
      'Candidate-portal aggregator across every Greenhouse employer. Needs your _session_id cookie; pick the search facets below.',
    searchHelp: 'Advanced: raw extra query params. The facets above set the search.',
    defaultMax: 200,
    defaultSearchUrl: '',
    searchPlaceholder: 'advanced: raw extra query params (facets are set above)',
    auth: 'session',
  },
];

// The order of "Scrape all sources" (the same as the daily scan's): Europe first.
const ORDER = [
  'eures',
  'arbeitsagentur',
  'jobtech',
  'reed',
  'adzuna',
  'arbeitnow',
  'landingjobs',
  'nofluffjobs',
  'jobicy',
  'remotive',
  'realworkfromanywhere',
  'greenhouse',
  'lever',
  'ashby',
  'remoteok',
  'workingnomads',
  'hnwhoishiring',
  'themuse',
  'weworkremotely',
  'jobspresso',
  'authenticjobs',
  'nodesk',
  'justremote',
  'mygreenhouse',
];

export const SOURCES: SourceDef[] = ORDER.map((key) => ALL_SOURCES.find((s) => s.key === key)).filter(
  (s): s is SourceDef => !!s,
);

export type SourceTab = { id: string; label: string; keys: string[] };

// By where the jobs are (lib/sourceMeta.ts): the European market first.
export const SOURCE_TABS: SourceTab[] = [
  { id: 'europe', label: 'Europe', keys: SOURCES.filter((s) => ['europe', 'country'].includes(SOURCE_META[s.key]?.region ?? '')).map((s) => s.key) },
  { id: 'remote', label: 'Remote', keys: SOURCES.filter((s) => SOURCE_META[s.key]?.region === 'remote').map((s) => s.key) },
  { id: 'companies', label: 'Companies', keys: SOURCES.filter((s) => SOURCE_META[s.key]?.region === 'companies').map((s) => s.key) },
  { id: 'us', label: 'US & worldwide', keys: SOURCES.filter((s) => SOURCE_META[s.key]?.region === 'us').map((s) => s.key) },
  { id: 'all', label: 'All sources', keys: SOURCES.map((s) => s.key) },
];

export const DEFAULT_SOURCE_TAB = 'europe';

export function isSourceTab(id: string): boolean {
  return SOURCE_TABS.some((t) => t.id === id);
}

/** The tab's sources in catalog order. */
export function sourcesInTab(id: string): SourceDef[] {
  const tab = SOURCE_TABS.find((t) => t.id === id);
  return tab ? SOURCES.filter((s) => tab.keys.includes(s.key)) : SOURCES;
}

// MyGreenhouse search facets: the value tokens are exactly what my.greenhouse.io
// uses in its own job-search query string (see lib/scrapers/feeds/mygreenhouse.ts).
export const MYGH_DATE_POSTED = [
  { value: 'past_day', label: 'Within 1 day' },
  { value: 'past_five_days', label: 'Within 5 days' },
  { value: 'past_ten_days', label: 'Within 10 days' },
  { value: 'past_thirty_days', label: 'Within 30 days' },
];
export const MYGH_SALARY = [
  { value: 'less_than_40k', label: '< $40,000' },
  { value: 'more_than_40k', label: '$40,000+' },
  { value: 'more_than_60k', label: '$60,000+' },
  { value: 'more_than_80k', label: '$80,000+' },
  { value: 'more_than_100k', label: '$100,000+' },
  { value: 'more_than_120k', label: '$120,000+' },
  { value: 'more_than_140k', label: '$140,000+' },
  { value: 'more_than_160k', label: '$160,000+' },
  { value: 'more_than_180k', label: '$180,000+' },
  { value: 'more_than_200k', label: '$200,000+' },
];
export const MYGH_WORK_TYPES = [
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'in_person', label: 'In person' },
];
export const MYGH_EMPLOYMENT_TYPES = [
  { value: 'full_time', label: 'Full time' },
  { value: 'part_time', label: 'Part time' },
  { value: 'contract', label: 'Contract' },
  { value: 'temporary', label: 'Temporary' },
];

export function splitCsv(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}
