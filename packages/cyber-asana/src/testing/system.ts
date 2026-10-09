import { envValue } from '../platform/env.js'
import { resolveRateLimits } from '../rate-limit/plan.js'

export function isSystemTestEnabled(): boolean {
	return Boolean(process.env.ASANA_SYSTEM_TEST && envValue('ASANA_TOKEN'))
}

export function systemEnv(name: string): string | undefined {
	return envValue(name)
}

export function requireSystemEnv(name: string): string {
	const value = systemEnv(name)
	if (!value) {
		throw new Error(`Missing ${name} for system test`)
	}
	return value
}

/** Whether `ASANA_PLAN` says paid; Asana answers Payment Required to goals, portfolios and custom fields on a free plan. */
export function isPaidPlan(): boolean {
	return resolveRateLimits(envValue).plan === 'paid'
}
