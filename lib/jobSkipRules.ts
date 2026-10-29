import { prisma } from "./prisma";

// Skip rules drop a job before any AI is spent on it. Each user has their own
// rules; a rule without a user applies to everyone.

// The list the single-user version used while no rules were saved. An upgraded
// install that had no rules gets it as the first admin's own rules (/api/setup
// and the users migration), so their scans keep skipping the same jobs.
export const LEGACY_DEFAULT_RULES: { type: "TITLE" | "URL" | "COMPANY"; pattern: string }[] = [
  { type: "TITLE", pattern: "vice president" },
  ...[
    "nvidia", "redhat", "pinterest", "metacareer", "alignerr",
    "capitalone", "hackajob", "generalmotors", "allstate", "micro1",
    "expedia", "reddit", "horizontaltalent", "fleetai.com", "shieldai",
    "metacareers", "dayforcehcm", "griddynamics", "www.usajobs.gov",
    "usajobs.gov", "gdit", "hopper", "libertymutualgroup", "smarterdx", "caci",
  ].map((pattern) => ({ type: "URL" as const, pattern })),
  ...["Alignerr", "NVIDIA", "Pinterest", "Meta", "Innovaccer", "PathAI", "Instacart"].map((pattern) => ({
    type: "COMPANY" as const,
    pattern,
  })),
];

type ActiveRule = { userId: number | null; type: string; pattern: string };
type RuleSet = { title: string[]; url: string[]; company: string[] };

let cachedRules: ActiveRule[] | null = null;
let cacheTime = 0;
const CACHE_TTL_MS = 60_000;

async function loadActiveRules(): Promise<ActiveRule[]> {
  const now = Date.now();
  if (cachedRules && now - cacheTime < CACHE_TTL_MS) return cachedRules;
  cachedRules = await prisma.skipRule.findMany({
    where: { active: true },
    select: { userId: true, type: true, pattern: true },
  });
  cacheTime = now;
  return cachedRules;
}

// The rules that apply to one user: theirs plus the ones for everyone. On a
// database error nothing is skipped (the job is still judged by the AI).
async function rulesFor(userId: number): Promise<RuleSet> {
  const set: RuleSet = { title: [], url: [], company: [] };
  let rules: ActiveRule[];
  try {
    rules = await loadActiveRules();
  } catch {
    return set;
  }
  for (const rule of rules) {
    if (rule.userId !== null && rule.userId !== userId) continue;
    if (rule.type === "TITLE") set.title.push(rule.pattern.toLowerCase());
    else if (rule.type === "URL") set.url.push(rule.pattern.toLowerCase());
    else if (rule.type === "COMPANY") set.company.push(rule.pattern.toLowerCase());
  }
  return set;
}

export function invalidateSkipRuleCache() {
  cachedRules = null;
  cacheTime = 0;
}

export async function shouldSkipJob(params: {
  userId: number;
  title: string;
  company: string;
  externalUrl: string;
}): Promise<boolean> {
  const rules = await rulesFor(params.userId);
  const titleLower = (params.title || "").trim().toLowerCase();
  if (rules.title.some((w) => titleLower.includes(w))) return true;
  const urlLower = (params.externalUrl || "").toLowerCase();
  if (rules.url.some((s) => urlLower.includes(s))) return true;
  const companyLower = (params.company || "").toLowerCase();
  if (rules.company.some((s) => companyLower.includes(s))) return true;
  return false;
}
