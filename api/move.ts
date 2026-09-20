import { isSameSite } from "#server/origin";
import { createSharedRateLimiter } from "#server/rateLimit";
import { createSolver } from "#server/solver";
import { parseMoveRequest } from "#server/validate";

const MOVES_PER_MINUTE = 30;
const MAX_BODY_CHARS = 2048;

const solve = createSolver(process.env.TYPESAFE_API_KEY || undefined);
const checkRateLimit = createSharedRateLimiter("move", MOVES_PER_MINUTE);

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });

function isAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  return isSameSite(origin, [request.headers.get("host"), request.headers.get("x-forwarded-host")]);
}

export async function POST(request: Request): Promise<Response> {
  if (!isAllowedOrigin(request)) return json({ error: "Forbidden" }, 403);

  const client = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const retryAfter = await checkRateLimit(client);
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
