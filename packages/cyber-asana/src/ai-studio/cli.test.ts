import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { aiStudioCommand } from './cli.js'

function aiStudioApiStub() {
	return {
		listAiStudioRuns: vi.fn().mockResolvedValue([]),
		listAiStudioSeats: vi.fn().mockResolvedValue([]),
	}
}

async function run(api: ReturnType<typeof aiStudioApiStub>, args: string[]) {
	const program = new Command().addCommand(aiStudioCommand(api))
	await program.parseAsync(['node', 'test', 'ai-studio', ...args], { from: 'node' })
}

describe('ai-studio/cli', () => {
	afterEach(() => vi.restoreAllMocks())

	it('ai-studio runs forwards the workspace, usage window, and division', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const api = aiStudioApiStub()

		await run(api, [
			'runs',
			'--workspace-gid',
			'ws1',
			'--start-at',
			'2026-01-01T00:00:00Z',
			'--end-at',
			'2026-02-01T00:00:00Z',
			'--division-gid',
			'div1',
			'--limit',
			'25',
		])

		expect(api.listAiStudioRuns).toHaveBeenCalledWith('ws1', {
			limit: 25,
			offset: undefined,
			optFields: undefined,
			fetchAll: undefined,
			maxPages: undefined,
			startAt: '2026-01-01T00:00:00Z',
			endAt: '2026-02-01T00:00:00Z',
			divisionGid: 'div1',
		})
	})

	it('ai-studio runs prints a table, a count summary, and next steps', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		const api = aiStudioApiStub()
		api.listAiStudioRuns.mockResolvedValue([
			{
				gid: 'run1',
				status: 'success',
				credits_used: 12,
				model: 'claude-sonnet-4-6',
				rule: { gid: 'r1', name: 'Summarize' },
			},
		])

		await run(api, ['runs', '--workspace-gid', 'ws1'])

		const lines = logSpy.mock.calls.map((c) => String(c[0]))
		expect(lines.some((l) => l.includes('Summarize') && l.includes('12'))).toBe(true)
		expect(lines).toContain('\n1 AI Studio run(s)')
		expect(lines.some((l) => l.includes('cyber-asana ai-studio seats'))).toBe(true)
	})

	it('ai-studio runs names what was empty', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

		await run(aiStudioApiStub(), ['runs', '--workspace-gid', 'ws1'])

		const lines = logSpy.mock.calls.map((c) => String(c[0]))
		expect(lines.some((l) => l.includes('0 AI Studio runs found'))).toBe(true)
	})

	it('ai-studio runs does not offer --opt-fields', async () => {
		const runs = aiStudioCommand(aiStudioApiStub()).commands.find((c) => c.name() === 'runs')

		expect(runs?.options.map((o) => o.long)).not.toContain('--opt-fields')
	})

	it('ai-studio seats forwards the state and division filters', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const api = aiStudioApiStub()

		await run(api, ['seats', '--workspace-gid', 'ws1', '--state', 'revoked', '--division-gid', 'div1'])

		expect(api.listAiStudioSeats).toHaveBeenCalledWith(
			'ws1',
			expect.objectContaining({ state: 'revoked', divisionGid: 'div1' }),
		)
	})

	it('ai-studio seats rejects a state Asana does not filter on', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		vi.spyOn(console, 'error').mockImplementation(() => {})
		vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
		const api = aiStudioApiStub()
		const program = new Command().exitOverride().addCommand(aiStudioCommand(api).exitOverride())

		await expect(
			program.parseAsync(['node', 'test', 'ai-studio', 'seats', '--workspace-gid', 'ws1', '--state', 'expired'], {
				from: 'node',
			}),
		).rejects.toThrow()
		expect(api.listAiStudioSeats).not.toHaveBeenCalled()
	})

	it('ai-studio seats prints the seat holder and license tier', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		const api = aiStudioApiStub()
		api.listAiStudioSeats.mockResolvedValue([
			{ gid: 'seat1', user: { gid: 'u1', name: 'Ada' }, license: 'ai_studio_pro', state: 'active' },
		])

		await run(api, ['seats', '--workspace-gid', 'ws1'])

		const lines = logSpy.mock.calls.map((c) => String(c[0]))
		expect(lines.some((l) => l.includes('Ada') && l.includes('ai_studio_pro'))).toBe(true)
		expect(lines).toContain('\n1 AI Studio seat(s)')
	})
})
