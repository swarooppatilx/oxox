export function isSameSite(
  origin: string | null | undefined,
  hosts: readonly (string | null | undefined)[],
): boolean {
  if (!origin) return false;
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }
  const isLocalDev = process.env.NODE_ENV !== "production" && parsed.hostname === "localhost";
  return isLocalDev || hosts.includes(parsed.host);
}
