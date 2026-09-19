import { createRateLimiter } from "../server/rateLimit.js";
import { createSolver } from "../server/solver.js";
import { parseMoveRequest } from "../server/validate.js";

const MOVES_PER_MINUTE = 20;
const MAX_BODY_CHARS = 2048;

const solve = createSolver(process.env.TYPESAFE_API_KEY || undefined);
const checkRateLimit = createRateLimiter(MOVES_PER_MINUTE);

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });

function isSameSite(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  const { host, hostname } = new URL(origin);
  const ownHosts = [request.headers.get("host"), request.headers.get("x-forwarded-host")];
  const isLocalDev = process.env.NODE_ENV !== "production" && hostname === "localhost";
  return ownHosts.includes(host) || isLocalDev;
}

export async function POST(request: Request): Promise<Response> {
  if (!isSameSite(request)) return json({ error: "Forbidden" }, 403);

  const client = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const retryAfter = checkRateLimit(client);
  if (retryAfter > 0) {
    return json({ error: "Too many moves" }, 429, { "Retry-After": String(retryAfter) });
  }

  const body = await request.text();
  if (body.length > MAX_BODY_CHARS) return json({ error: "Payload too large" }, 413);

  let move;
  try {
    move = parseMoveRequest(JSON.parse(body));
  } catch {
    move = null;
  }
  if (!move) return json({ error: "Bad request" }, 400);

  return json(await solve(move.board, move.ai));
}
