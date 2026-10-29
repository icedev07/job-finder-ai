import { CONFIG_KEYS, getAllConfig, setConfigValue } from "./config";
import { EMPTY_PROFILE, isProfileEmpty, normalizeProfile, type CandidateProfile } from "./profileModel";

export async function getProfile(): Promise<CandidateProfile> {
  const all = await getAllConfig();
  const raw = all[CONFIG_KEYS.CANDIDATE_PROFILE];
  if (!raw) return { ...EMPTY_PROFILE };
  try {
    return normalizeProfile(JSON.parse(raw));
  } catch {
    return { ...EMPTY_PROFILE };
  }
}

export async function saveProfile(profile: unknown): Promise<CandidateProfile> {
  const clean = normalizeProfile(profile);
  await setConfigValue(CONFIG_KEYS.CANDIDATE_PROFILE, JSON.stringify(clean));
  return clean;
}

// The profile is added to the matching prompts unless the admin turned it off
// (and only once there is something in it).
export async function profileForMatching(): Promise<CandidateProfile | null> {
  const all = await getAllConfig();
  if (all[CONFIG_KEYS.PROFILE_IN_MATCHING] === "false") return null;
  const profile = await getProfile();
  return isProfileEmpty(profile) ? null : profile;
}
