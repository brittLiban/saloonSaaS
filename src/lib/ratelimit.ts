import { redis } from "@/lib/redis";
import { NextResponse } from "next/server";

const LIMIT_PER_MIN = 100;

export async function checkRateLimit(keyId: string): Promise<NextResponse | undefined> {
  try {
    const window = Math.floor(Date.now() / 60_000);
    const redisKey = `ratelimit:apik:${keyId}:${window}`;
    const count = await redis.incr(redisKey);
    if (count === 1) await redis.expire(redisKey, 120);
    if (count > LIMIT_PER_MIN) {
      return NextResponse.json(
        { error: "Too many requests", status: 429 },
        {
          status: 429,
          headers: {
            "Retry-After": "60",
            "X-RateLimit-Limit": String(LIMIT_PER_MIN),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }
  } catch {
    // Redis unavailable — fail open, never block legitimate traffic
  }
  return undefined;
}
