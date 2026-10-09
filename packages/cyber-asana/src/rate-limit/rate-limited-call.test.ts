import { describe, expect, it } from 'vitest'
import { createRateLimiter } from './limiter.js'
import { rateLimitCalls } from './rate-limited-call.js'

function fakeClock() {
	let t = 0
	return {
		now: () => t,
		sleep: async (ms: number) => {
			t += ms
		},
	}
}

function setup(opts: { limit?: number; searchLimit?: number } = {}) {
	const clock = fakeClock()
	const waits: number[] = []
	const calls: string[] = []
	const wrap = (impl: (path: string) => Promise<unknown>) =>
		rateLimitCalls(
			async (path: string) => {
				calls.push(path)
				return impl(path)
			},
			{
				overall: createRateLimiter({ limit: opts.limit ?? 100, windowMs: 60_000, ...clock }),
				search: createRateLimiter({ limit: opts.searchLimit ?? 100, windowMs: 60_000, ...clock }),
				sleep: clock.sleep,
				onWait: (ms) => waits.push(ms),
			},
		)
	return { clock, waits, calls, wrap }
}

describe('rateLimitCalls', () => {
	it('retries a 429 after the Retry-After wait and returns the later success', async () => {
		const { wrap, waits, calls, clock } = setup()
		let attempts = 0
		const call = wrap(async () => {
			if (++attempts === 1) throw { status: 429, response: { header: { 'retry-after': '5' } } }
			return 'ok'
		})

		await expect(call('/tasks')).resolves.toBe('ok')

		expect(calls).toEqual(['/tasks', '/tasks'])
		expect(waits).toEqual([5_000])
		expect(clock.now()).toBe(5_000)
	})

	it('rethrows the 429 once the retries are spent', async () => {
		const { wrap, calls } = setup()
		const error = { status: 429, response: { header: { 'retry-after': '1' } } }
		const call = wrap(async () => {
			throw error
		})

		await expect(call('/tasks')).rejects.toBe(error)

		expect(calls).toHaveLength(4)
	})

	it('passes any other error straight through without retrying', async () => {
		const { wrap, calls } = setup()
		const error = { status: 404 }
		const call = wrap(async () => {
			throw error
		})

		await expect(call('/tasks/1')).rejects.toBe(error)

		expect(calls).toHaveLength(1)
	})

	it('holds calls past the per-minute budget until the window frees up', async () => {
		const { wrap, waits } = setup({ limit: 2 })
		const call = wrap(async () => 'ok')

		await call('/tasks/1')
		await call('/tasks/2')
		await call('/tasks/3')

		expect(waits).toEqual([60_000])
	})

	it('applies the tighter search budget to search paths only', async () => {
		const { wrap, waits } = setup({ searchLimit: 1 })
		const call = wrap(async () => 'ok')

		await call('/workspaces/{workspace_gid}/tasks/search')
		await call('/tasks/{task_gid}')
		expect(waits).toEqual([])

		await call('/workspaces/{workspace_gid}/tasks/search')
		expect(waits).toEqual([60_000])
	})
})
