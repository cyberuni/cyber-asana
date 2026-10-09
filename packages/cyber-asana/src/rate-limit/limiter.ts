export type RateLimiter = {
	/** Resolves once a call may go ahead, with how many milliseconds it had to wait. */
	acquire(): Promise<number>
}

export type RateLimiterOptions = {
	limit: number
	windowMs: number
	now: () => number
	sleep: (ms: number) => Promise<void>
}

/**
 * A sliding-window limiter: at most `limit` calls in any `windowMs`, the way Asana
 * counts them. Callers are served one at a time in arrival order.
 */
export function createRateLimiter({ limit, windowMs, now, sleep }: RateLimiterOptions): RateLimiter {
	const grants: number[] = []
	let tail: Promise<unknown> = Promise.resolve()

	async function take(): Promise<number> {
		const start = now()
		for (;;) {
			const t = now()
			while (grants.length > 0 && grants[0]! <= t - windowMs) grants.shift()
			if (grants.length < limit) {
				grants.push(t)
				return t - start
			}
			await sleep(grants[0]! + windowMs - t)
		}
	}

	return {
		acquire() {
			const run = tail.then(take)
			tail = run.catch(() => {})
			return run
		},
	}
}
