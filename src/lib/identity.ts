import { PLAYER_NAME_MAX, cleanPlayerName } from "#shared/multi";

export interface MultiProfile {
  secret: string;
  salt: string;
  name: string;
  avatar: string;
}

const KEY = "oxox-profile";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isValidProfile = (value: unknown): value is MultiProfile =>
  isRecord(value) &&
  typeof value.secret === "string" &&
  value.secret.length > 0 &&
  value.secret.length <= 64 &&
  typeof value.salt === "string" &&
  value.salt.length > 0 &&
  typeof value.name === "string" &&
  value.name.length <= PLAYER_NAME_MAX;

const randomToken = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
};

export const avatarFor = (salt: string, name: string): string => `${salt}:${name}`;

export const isValidName = (name: string): boolean => cleanPlayerName(name).length > 0;

export function saveProfile(profile: MultiProfile): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {}
}

export function loadProfile(): MultiProfile {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isValidProfile(parsed)) {
        return { ...parsed, avatar: avatarFor(parsed.salt, parsed.name) };
      }
    }
  } catch {}

  const salt = randomToken().slice(0, 8);
  const profile = { secret: randomToken(), salt, name: "", avatar: avatarFor(salt, "") };
  saveProfile(profile);
  return profile;
}
