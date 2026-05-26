import { afterEach, describe, expect, it } from 'vitest'
import { isSystemTestEnabled, requireSystemEnv, systemEnv } from './system.js'

describe('testing/system', () => {
	const originalEnv = { ...process.env }

	afterEach(() => {
		process.env = { ...originalEnv }
	})

	it('isSystemTestEnabled is false without ASANA_SYSTEM_TEST', () => {
		delete process.env.ASANA_SYSTEM_TEST
		process.env.ASANA_TOKEN = 'token'

		expect(isSystemTestEnabled()).toBe(false)
	})

	it('isSystemTestEnabled is false without ASANA_TOKEN', () => {
		process.env.ASANA_SYSTEM_TEST = '1'
		delete process.env.ASANA_TOKEN
		delete process.env.ASANA_ASSESS_TOKEN

		expect(isSystemTestEnabled()).toBe(false)
	})

	it('isSystemTestEnabled is true when both env vars are set', () => {
		process.env.ASANA_SYSTEM_TEST = '1'
		process.env.ASANA_TOKEN = 'token'

		expect(isSystemTestEnabled()).toBe(true)
	})

	it('isSystemTestEnabled accepts ASANA_ASSESS_TOKEN as a fallback token env var', () => {
		process.env.ASANA_SYSTEM_TEST = '1'
		delete process.env.ASANA_TOKEN
		process.env.ASANA_ASSESS_TOKEN = 'token'

		expect(isSystemTestEnabled()).toBe(true)
	})

	it('systemEnv treats empty strings as undefined', () => {
		process.env.ASANA_SYSTEM_TEST_TASK_GID = ''

		expect(systemEnv('ASANA_SYSTEM_TEST_TASK_GID')).toBeUndefined()
	})

	it('systemEnv reads ASANA_WORKSPACE_GID as a fallback for ASANA_WORKSPACE', () => {
		delete process.env.ASANA_WORKSPACE
		process.env.ASANA_WORKSPACE_GID = 'ws1'

		expect(systemEnv('ASANA_WORKSPACE')).toBe('ws1')
	})

	it('requireSystemEnv throws when env var is missing', () => {
		delete process.env.ASANA_SYSTEM_TEST_TASK_GID

		expect(() => requireSystemEnv('ASANA_SYSTEM_TEST_TASK_GID')).toThrow(
			'Missing ASANA_SYSTEM_TEST_TASK_GID for system test',
		)
	})
})
