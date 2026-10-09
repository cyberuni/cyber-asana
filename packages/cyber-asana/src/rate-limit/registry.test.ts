import { describe, expect, it } from 'vitest'
import { limitersFor } from './registry.js'

const limits = { plan: 'free', perMinute: 120, searchPerMinute: 48 } as const

describe('limitersFor', () => {
	it('shares one set of limiters across everything using the same token and budget', () => {
		expect(limitersFor('token-a', limits)).toBe(limitersFor('token-a', limits))
	})

	it('keeps a separate budget per token, as Asana does', () => {
		expect(limitersFor('token-a', limits)).not.toBe(limitersFor('token-b', limits))
	})

	it('starts a fresh budget when the configured limit changes', () => {
		expect(limitersFor('token-c', limits)).not.toBe(limitersFor('token-c', { ...limits, perMinute: 300 }))
	})
})
