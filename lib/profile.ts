import { prisma } from "./prisma";
import { getUserConfigRaw, getUserSettings, invalidateUserSettings, USER_KEYS } from "./userSettings";
import { EMPTY_PROFILE, isProfileEmpty, normalizeProfile, type CandidateProfile } from "./profileModel";

// Each user has their own candidate profile, stored in their settings.

export async function getProfile(userId: number): Promise<CandidateProfile> {
  const raw = (await getUserConfigRaw(userId))[USER_KEYS.CANDIDATE_PROFILE];
  if (!raw) return { ...EMPTY_PROFILE };
  try {
    return normalizeProfile(JSON.parse(raw));
  } catch {
    return { ...EMPTY_PROFILE };
  }
}

export async function saveProfile(userId: number, profile: unknown): Promise<CandidateProfile> {
  const clean = normalizeProfile(profile);
  const value = JSON.stringify(clean);
  await prisma.userConfig.upsert({
    where: { userId_key: { userId, key: USER_KEYS.CANDIDATE_PROFILE } },
    update: { value },
    create: { userId, key: USER_KEYS.CANDIDATE_PROFILE, value },
  });
  invalidateUserSettings(userId);
  return clean;
}

// The profile is added to the matching prompts unless it is turned off for
// this user (and only once there is something in it).
export async function profileForMatching(userId: number): Promise<CandidateProfile | null> {
  if (!(await getUserSettings(userId)).profileInMatching) return null;
  const profile = await getProfile(userId);
  return isProfileEmpty(profile) ? null : profile;
}
