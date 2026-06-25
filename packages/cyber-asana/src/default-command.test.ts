import { afterEach, describe, expect, it, vi } from 'vitest'
import { runDefaultCommand } from './default-command.js'

describe('runDefaultCommand', () => {
	afterEach(() => vi.restoreAllMocks())

	it('shows the authenticated user as live content', async () => {
		const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
		const getMe = vi.fn().mockResolvedValue({ gid: 'me', name: 'Ada', email: 'ada@x.com' })

		await runDefaultCommand({ getMe }, ['node', 'cli'])

		expect(getMe).toHaveBeenCalledOnce()
		const lines = spy.mock.calls.map((c) => String(c[0]))
		expect(lines.some((l) => l.includes('Ada'))).toBe(true)
		expect(lines).toContain('\nNext steps:')
	})

	it('emits the user as TOON in structured mode', async () => {
		const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
		const getMe = vi.fn().mockResolvedValue({ gid: 'me', name: 'Ada' })

		await runDefaultCommand({ getMe }, ['node', 'cli', '--toon'])

		const out = spy.mock.calls.map((c) => String(c[0])).join('\n')
		expect(out).toContain('name: Ada')
		expect(out).not.toContain('Next steps')
	})
})
