type Plan = 'free' | 'paid'

export type RateLimits = {
	plan: Plan
	/** Requests per minute to stay under, across everything sharing the token. */
	perMinute: number
	/** The tighter budget the search endpoints get. */
	searchPerMinute: number
}

// Asana's published per-token limits. We spend only part of them so another tool
// on the same token, or a request counted late, does not tip us into a 429.
const ASANA_PER_MINUTE: Record<Plan, number> = { free: 150, paid: 1500 }
const ASANA_SEARCH_PER_MINUTE = 60
const SAFETY_MARGIN = 0.8

const budget = (limit: number) => Math.floor(limit * SAFETY_MARGIN)

/**
 * Reads `ASANA_PLAN` (`free` or `paid`; anything else counts as `free`, the safe
 * assumption) and the optional `ASANA_RATE_LIMIT_PER_MINUTE`, which sets the
 * budget directly when it is a positive whole number.
 */
export function resolveRateLimits(read: (name: string) => string | undefined): RateLimits {
	const plan: Plan = read('ASANA_PLAN')?.trim().toLowerCase() === 'paid' ? 'paid' : 'free'
	const override = read('ASANA_RATE_LIMIT_PER_MINUTE')
	const perMinute =
		override !== undefined && /^[1-9]\d*$/.test(override) ? Number(override) : budget(ASANA_PER_MINUTE[plan])
	return { plan, perMinute, searchPerMinute: budget(ASANA_SEARCH_PER_MINUTE) }
}
