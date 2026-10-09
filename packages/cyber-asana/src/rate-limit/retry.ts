const MAX_RETRIES = 3
const BASE_BACKOFF_MS = 1_000

type RateLimitedError = {
	status?: number
	response?: { header?: Record<string, string>; headers?: Record<string, string> }
}

/**
 * How long to wait before retrying `error`, or `null` to give up. Only a 429 is
 * retried: for as long as `Retry-After` says, else a doubling backoff.
 */
export function retryDelayMs(error: unknown, attempt: number): number | null {
	if (attempt >= MAX_RETRIES) return null
	const failure = error as RateLimitedError | undefined
	if (failure?.status !== 429) return null

	const raw = failure.response?.header?.['retry-after'] ?? failure.response?.headers?.['retry-after']
	const seconds = raw === undefined || raw === '' ? Number.NaN : Number(raw)
	return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1_000 : BASE_BACKOFF_MS * 2 ** attempt
}
