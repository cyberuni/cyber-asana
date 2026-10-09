import { resolveRateLimits } from './plan.js'
import { rateLimitCalls } from './rate-limited-call.js'
import { limitersFor } from './registry.js'

export type RateLimitClientOptions = {
	token: string
	read: (name: string) => string | undefined
	/** Called for a wait of a second or more; shorter ones are not worth a message. */
	onWait?: (ms: number, plan: string) => void
	sleep?: (ms: number) => Promise<void>
}

const MIN_REPORTED_WAIT_MS = 1_000
const realSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * Puts a client's `callApi` behind the shared limiter for its token. Every generated
 * API class, and `Collection.nextPage()`, reaches Asana through `callApi`, so this one
 * seam covers each gateway without any of them knowing about rate limits.
 */
export function rateLimitClient<C extends { callApi: (path: string, ...rest: never[]) => Promise<unknown> }>(
	client: C,
	{ token, read, onWait, sleep = realSleep }: RateLimitClientOptions,
): C {
	const limits = resolveRateLimits(read)
	const { overall, search } = limitersFor(token, limits)
	const original = client.callApi.bind(client)

	client.callApi = rateLimitCalls(original, {
		overall,
		search,
		sleep,
		onWait: (ms) => {
			if (ms >= MIN_REPORTED_WAIT_MS) onWait?.(ms, limits.plan)
		},
	}) as C['callApi']
	return client
}
