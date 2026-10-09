import { describe, expect, it } from 'vitest'
import { resolveRateLimits } from './plan.js'

const env = (vars: Record<string, string>) => (name: string) => vars[name]

describe('resolveRateLimits', () => {
	it('assumes the free plan when ASANA_PLAN is unset', () => {
		expect(resolveRateLimits(env({}))).toEqual({ plan: 'free', perMinute: 120, searchPerMinute: 48 })
	})

	it('budgets the paid plan from its 1,500 per minute', () => {
		expect(resolveRateLimits(env({ ASANA_PLAN: 'paid' }))).toEqual({
			plan: 'paid',
			perMinute: 1200,
			searchPerMinute: 48,
		})
	})

	it('reads the plan name case-insensitively', () => {
		expect(resolveRateLimits(env({ ASANA_PLAN: ' Paid ' })).plan).toBe('paid')
	})

	it('falls back to free for a plan it does not know', () => {
		expect(resolveRateLimits(env({ ASANA_PLAN: 'enterprise' })).plan).toBe('free')
	})

	it('lets ASANA_RATE_LIMIT_PER_MINUTE set the budget directly', () => {
		expect(resolveRateLimits(env({ ASANA_PLAN: 'paid', ASANA_RATE_LIMIT_PER_MINUTE: '300' })).perMinute).toBe(300)
	})

	it.each(['0', '-5', '1.5', 'many', ''])('ignores the invalid override %j', (value) => {
		expect(resolveRateLimits(env({ ASANA_RATE_LIMIT_PER_MINUTE: value })).perMinute).toBe(120)
	})
})
