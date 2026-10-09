import { describe, expect, it } from 'vitest'
import { retryDelayMs } from './retry.js'

const rateLimited = (header?: string) => ({
	status: 429,
	response: { header: header === undefined ? {} : { 'retry-after': header } },
})

describe('retryDelayMs', () => {
	it('waits as long as Retry-After says', () => {
		expect(retryDelayMs(rateLimited('7'), 0)).toBe(7_000)
	})

	it('reads Retry-After from headers as well as header', () => {
		expect(retryDelayMs({ status: 429, response: { headers: { 'retry-after': '3' } } }, 0)).toBe(3_000)
	})

	it('backs off exponentially when there is no usable Retry-After', () => {
		expect([0, 1, 2].map((attempt) => retryDelayMs(rateLimited(), attempt))).toEqual([1_000, 2_000, 4_000])
		expect(retryDelayMs(rateLimited('soon'), 0)).toBe(1_000)
	})

	it('gives up after three retries', () => {
		expect(retryDelayMs(rateLimited('1'), 3)).toBeNull()
	})

	it('does not retry anything but a 429', () => {
		expect(retryDelayMs({ status: 500 }, 0)).toBeNull()
		expect(retryDelayMs(new Error('boom'), 0)).toBeNull()
		expect(retryDelayMs(undefined, 0)).toBeNull()
	})
})
