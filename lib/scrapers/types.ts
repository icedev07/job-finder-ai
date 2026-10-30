export type NormalizedJob = {
  platform: string;
  title: string;
  company: string;
  url: string;
  applyUrl?: string | null;
  location?: string | null;
  description?: string | null;
  salary?: string | null;
  /** When the posting went up (ISO 8601), when the source says. */
  postedAt?: string | null;
  /** The job's country (ISO 3166 code, e.g. "DE"), when the source says. */
  country?: string | null;
  /** remote, hybrid or onsite, when the source says. */
  workplace?: "remote" | "hybrid" | "onsite" | null;
};

export type FeedFetchResult = {
  jobs: NormalizedJob[];
  warning?: string;
};

export type FeedFetchOptions = {
  maxJobs: number;
  searchUrl?: string;
  signal?: AbortSignal;
  // Optional pass-through of the full scanner config. Most feeds only need
  // searchUrl, but a few (e.g. mygreenhouse) need extra secrets like a
  // session cookie that we don't want overloaded onto the search-url field.
  config?: Record<string, string>;
};

/** One search a source runs: one of a user's roles, in one country (Settings → What to look for). */
export type FeedQuery = {
  /** The role or keywords, e.g. "Backend Developer". */
  keywords: string;
  /** ISO 3166 code of the country to search; null for sources without countries (remote boards). */
  country: string | null;
  /** Only postings from the last N days; 0 = any age. */
  maxAgeDays: number;
};

export type Feed = {
  key: string;
  label: string;
  /** The source's newest jobs (sources that cannot search, or as a fallback). */
  fetch: (opts: FeedFetchOptions) => Promise<FeedFetchResult>;
  /**
   * Sources that can search: the jobs for one query. A scan runs every user's
   * roles in each of their countries the source covers.
   */
  search?: (query: FeedQuery, opts: FeedFetchOptions) => Promise<FeedFetchResult>;
  /**
   * The countries a searching source covers (ISO codes), or "remote" for
   * remote boards searched without a country.
   */
  countries?: readonly string[] | "remote";
  /**
   * Sources whose search gives no full description: fills it in for these
   * jobs, which the scan calls only for jobs about to be judged (new, past the
   * free filter), so a details call is never spent on the rest.
   */
  describe?: (jobs: NormalizedJob[], opts: { signal?: AbortSignal; config?: Record<string, string> }) => Promise<void>;
};
