import { afterEach, describe, expect, it } from 'vitest'
import { isPaidPlan, isSystemTestEnabled, requireSystemEnv, systemEnv } from './system.js'

describe('testing/system', () => {
	const originalEnv = { ...process.env }

	afterEach(() => {
		process.env = { ...originalEnv }
	})

	it('isSystemTestEnabled is false without ASANA_SYSTEM_TEST', () => {
		delete process.env.ASANA_SYSTEM_TEST
		process.env.ASANA_ACCESS_TOKEN = 'token'

		expect(isSystemTestEnabled()).toBe(false)
	})

	it('isSystemTestEnabled is false without ASANA_ACCESS_TOKEN', () => {
		process.env.ASANA_SYSTEM_TEST = '1'
		delete process.env.ASANA_ACCESS_TOKEN

		expect(isSystemTestEnabled()).toBe(false)
	})

	it('isSystemTestEnabled is true when both env vars are set', () => {
		process.env.ASANA_SYSTEM_TEST = '1'
		process.env.ASANA_ACCESS_TOKEN = 'token'

		expect(isSystemTestEnabled()).toBe(true)
	})

	it('systemEnv treats empty strings as undefined', () => {
		process.env.ASANA_SYSTEM_TEST_TASK_GID = ''

		expect(systemEnv('ASANA_SYSTEM_TEST_TASK_GID')).toBeUndefined()
	})

	it('systemEnv reads ASANA_WORKSPACE_GID', () => {
		process.env.ASANA_WORKSPACE_GID = 'ws1'

		expect(systemEnv('ASANA_WORKSPACE_GID')).toBe('ws1')
	})

	it('requireSystemEnv throws when env var is missing', () => {
		delete process.env.ASANA_SYSTEM_TEST_TASK_GID

		expect(() => requireSystemEnv('ASANA_SYSTEM_TEST_TASK_GID')).toThrow(
			'Missing ASANA_SYSTEM_TEST_TASK_GID for system test',
		)
	})

	it('isPaidPlan is false without ASANA_PLAN, matching the free default', () => {
		delete process.env.ASANA_PLAN

		expect(isPaidPlan()).toBe(false)
	})

	it('isPaidPlan is true only when ASANA_PLAN is paid', () => {
		process.env.ASANA_PLAN = 'paid'
		expect(isPaidPlan()).toBe(true)

		process.env.ASANA_PLAN = 'free'
		expect(isPaidPlan()).toBe(false)
	})
})
