import type { RateLimiter } from './limiter.js'
import { retryDelayMs } from './retry.js'

export type RateLimitedCallOptions = {
	overall: RateLimiter
	search: RateLimiter
	sleep: (ms: number) => Promise<void>
	/** Told whenever a call has to wait, so a slow run does not look hung. */
	onWait?: (ms: number) => void
}

const isSearch = (path: string) => path.includes('/search')

/**
 * Wraps a request function whose first argument is the request path: every call
 * first takes its place in the budget (search paths in the search budget too), and a
 * 429 is retried after the wait Asana asks for.
 */
export function rateLimitCalls<A extends [path: string, ...rest: unknown[]], R>(
	call: (...args: A) => Promise<R>,
	{ overall, search, sleep, onWait }: RateLimitedCallOptions,
): (...args: A) => Promise<R> {
	const wait = (ms: number) => {
		if (ms > 0) onWait?.(ms)
	}

	return async (...args) => {
		for (let attempt = 0; ; attempt++) {
			let waited = await overall.acquire()
			if (isSearch(args[0])) waited += await search.acquire()
			wait(waited)

			try {
				return await call(...args)
			} catch (error) {
				const delay = retryDelayMs(error, attempt)
				if (delay === null) throw error
				wait(delay)
				await sleep(delay)
			}
		}
	}
}
