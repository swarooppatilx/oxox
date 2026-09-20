import { createHash } from "node:crypto";

export interface Identity {
  id: string;
  name: string;
  avatar: string;
}

export const publicIdOf = (secret: string): string =>
  createHash("sha256").update(secret).digest("hex").slice(0, 16);
