import { getExtensionSettings, type ExtensionSettings } from "./extensionSettings";
import { activeUsers, type Role, type UserRow } from "./users";
import { getUserSettings } from "./userSettings";

// What the extension popup shows: who is signed in, whose jobs a scan saves
// ("Scan for"), where they are based and what they look for, and the
// extension settings to scan with.

export type ExtensionUserSummary = {
  id: number;
  username: string;
  name: string;
  currentLocation: string;
  targetMarket: string;
};

export type ExtensionMe = {
  signedIn: { id: number; username: string; name: string; role: Role };
  /** The user scans and autofill work for: the signed-in user, or the one an admin picked. */
  user: ExtensionUserSummary;
  settings: ExtensionSettings;
  /** Admins only: the active users they can scan for. */
  users: ExtensionUserSummary[];
};

async function summary(user: UserRow): Promise<ExtensionUserSummary> {
  const s = await getUserSettings(user.id);
  return { id: user.id, username: user.username, name: user.name, currentLocation: s.currentLocation, targetMarket: s.targetMarket };
}

export async function extensionMe(user: UserRow, signedIn: UserRow): Promise<ExtensionMe> {
  const [who, settings, users] = await Promise.all([
    summary(user),
    getExtensionSettings(user.id),
    signedIn.role === "ADMIN" ? activeUsers().then((list) => Promise.all(list.map(summary))) : Promise.resolve([]),
  ]);
  return {
    signedIn: { id: signedIn.id, username: signedIn.username, name: signedIn.name, role: signedIn.role },
    user: who,
    settings,
    users,
  };
}
