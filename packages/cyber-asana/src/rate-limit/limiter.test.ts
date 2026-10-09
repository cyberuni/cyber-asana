import { describe, expect, it } from 'vitest'
import { createRateLimiter } from './limiter.js'

function fakeClock() {
	let t = 0
	return {
		now: () => t,
		sleep: async (ms: number) => {
			t += ms
		},
	}
}

describe('createRateLimiter', () => {
	it('lets a full window of calls through without waiting', async () => {
		const clock = fakeClock()
		const limiter = createRateLimiter({ limit: 3, windowMs: 60_000, ...clock })

		const waits = [await limiter.acquire(), await limiter.acquire(), await limiter.acquire()]

		expect(waits).toEqual([0, 0, 0])
		expect(clock.now()).toBe(0)
	})

	it('holds the next call until the oldest one leaves the window', async () => {
		const clock = fakeClock()
		const limiter = createRateLimiter({ limit: 2, windowMs: 60_000, ...clock })
		await limiter.acquire()
		await clock.sleep(10_000)
		await limiter.acquire()

		const waited = await limiter.acquire()

		expect(waited).toBe(50_000)
		expect(clock.now()).toBe(60_000)
	})

	it('gives capacity back once the window has passed', async () => {
		const clock = fakeClock()
		const limiter = createRateLimiter({ limit: 1, windowMs: 1_000, ...clock })
		await limiter.acquire()
		await clock.sleep(1_000)

		expect(await limiter.acquire()).toBe(0)
	})

	it('serves concurrent callers one at a time, in order', async () => {
		const clock = fakeClock()
		const limiter = createRateLimiter({ limit: 1, windowMs: 1_000, ...clock })
		const order: number[] = []

		await Promise.all([1, 2, 3].map(async (n) => limiter.acquire().then(() => order.push(n))))

		expect(order).toEqual([1, 2, 3])
		expect(clock.now()).toBe(2_000)
	})
})
