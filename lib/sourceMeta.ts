// Which part of the job market each source covers and whether it is on before
// an admin switches it, shared by the scanner and the Sources page (no server
// imports). The app searches the European market: sources whose jobs are
// mostly in the US, or remote jobs mostly closed to Europe, start off; an admin
// can switch any of them on.

export type SourceRegion =
  /** Many European countries, searched one country at a time. */
  | "europe"
  /** One country's job market. */
  | "country"
  /** Remote jobs open to Europe, or anywhere. */
  | "remote"
  /** Companies' own careers sites. */
  | "companies"
  /** Mostly US jobs, or remote jobs mostly closed to Europe. */
  | "us";

export type SourceMeta = {
  region: SourceRegion;
  /** What it covers, e.g. "Germany" or "17 European countries". */
  coverage: string;
  /** On before an admin switches it. */
  defaultOn: boolean;
};

export const SOURCE_META: Record<string, SourceMeta> = {
  eures: { region: "europe", coverage: "31 countries: the EU, the EEA and Switzerland (not the UK)", defaultOn: true },
  arbeitsagentur: { region: "country", coverage: "Germany", defaultOn: true },
  jobtech: { region: "country", coverage: "Sweden", defaultOn: true },
  reed: { region: "country", coverage: "United Kingdom", defaultOn: true },
  adzuna: { region: "europe", coverage: "10 countries: UK, DE, FR, NL, BE, AT, CH, IT, ES, PL", defaultOn: true },
  remoteok: { region: "us", coverage: "Remote, mostly US companies", defaultOn: false },
  jobicy: { region: "remote", coverage: "Remote jobs open to Europe", defaultOn: true },
  landingjobs: { region: "europe", coverage: "Tech jobs in Portugal, Spain, Germany, the Netherlands and remote", defaultOn: true },
  // Its public API now gives about 12 jobs, a day late, and allows 4 calls a day.
  remotive: { region: "remote", coverage: "Remote jobs open to Europe or worldwide (a dozen a day)", defaultOn: false },
  workingnomads: { region: "us", coverage: "Remote, mostly US", defaultOn: false },
  arbeitnow: { region: "country", coverage: "Germany and remote in Europe", defaultOn: true },
  hnwhoishiring: { region: "us", coverage: "Worldwide, mostly US", defaultOn: false },
  themuse: { region: "us", coverage: "United States", defaultOn: false },
  realworkfromanywhere: { region: "remote", coverage: "Remote from anywhere", defaultOn: true },
  nofluffjobs: { region: "country", coverage: "Poland and Central Europe, tech", defaultOn: true },
  weworkremotely: { region: "us", coverage: "Remote, mostly US", defaultOn: false },
  jobspresso: { region: "us", coverage: "Remote, mostly US", defaultOn: false },
  authenticjobs: { region: "us", coverage: "Mostly US", defaultOn: false },
  nodesk: { region: "us", coverage: "Remote, mostly US", defaultOn: false },
  justremote: { region: "us", coverage: "Remote, mostly US", defaultOn: false },
  greenhouse: { region: "companies", coverage: "Companies on Greenhouse", defaultOn: true },
  lever: { region: "companies", coverage: "Companies on Lever", defaultOn: true },
  ashby: { region: "companies", coverage: "Companies on Ashby", defaultOn: true },
  mygreenhouse: { region: "us", coverage: "Greenhouse's candidate portal, mostly US", defaultOn: false },
};

/** Whether a source is on: switched by an admin, else its default. */
export function sourceEnabled(key: string, config: Record<string, string | undefined>): boolean {
  const v = config[`${key}_enabled`];
  if (v === "true") return true;
  if (v === "false") return false;
  return SOURCE_META[key]?.defaultOn ?? true;
}
