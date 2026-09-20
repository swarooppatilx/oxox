export function extractCode(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const roomParam = value.match(/[?&]room=([A-Za-z0-9]{4,8})(?:[&#]|$)/i)?.[1];
  if (roomParam) return roomParam.toUpperCase();
  if (/^[A-Za-z0-9]{4,8}$/.test(value)) return value.toUpperCase();
  const lastSegment = value.match(/\/([A-Za-z0-9]{4,8})(?:\/|$)/i)?.[1];
  if (lastSegment) return lastSegment.toUpperCase();
  return null;
}
