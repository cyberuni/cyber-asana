import { createRateLimiter, type RateLimiter } from './limiter.js'
import type { RateLimits } from './plan.js'

export type TokenLimiters = { overall: RateLimiter; search: RateLimiter }

const WINDOW_MS = 60_000

const limitersByBudget = new Map<string, TokenLimiters>()

const realSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * One set of limiters per token and budget for the whole process. Asana counts a
 * token's requests together, and the CLI and MCP server build many clients from the
 * same token, so a limiter owned by a client would let each of them spend the full budget.
 */
export function limitersFor(token: string, limits: RateLimits): TokenLimiters {
	const key = `${token}\u0000${limits.perMinute}\u0000${limits.searchPerMinute}`
	let limiters = limitersByBudget.get(key)
	if (!limiters) {
		const clock = { now: Date.now, sleep: realSleep, windowMs: WINDOW_MS }
		limiters = {
			overall: createRateLimiter({ limit: limits.perMinute, ...clock }),
			search: createRateLimiter({ limit: limits.searchPerMinute, ...clock }),
		}
		limitersByBudget.set(key, limiters)
	}
	return limiters
}
