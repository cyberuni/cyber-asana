import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'

const triggerRuleMock = vi.fn()

vi.mock('./default.js', async () => {
	const actual = await vi.importActual<typeof import('./default.js')>('./default.js')
	return { ...actual, triggerRule: triggerRuleMock }
})

const { ruleCommand } = await import('./cli.js')

function ack(overrides: Record<string, unknown> = {}) {
	return { triggered: true, rule_trigger_gid: 'rt1', ...overrides }
}

describe('rules/cli', () => {
	const originalArgv = [...process.argv]

	afterEach(() => {
		vi.clearAllMocks()
		process.argv = [...originalArgv]
	})

	it('rule trigger forwards the trigger gid and resource', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const triggerRule = vi.fn().mockResolvedValue(ack({ resource: 'task1' }))
		const program = new Command().addCommand(ruleCommand({ triggerRule }))

		await program.parseAsync(['node', 'test', 'rule', 'trigger', 'rt1', '--resource', 'task1'], { from: 'node' })

		expect(triggerRule).toHaveBeenCalledWith('rt1', { resource: 'task1' })
	})

	it('rule trigger parses --action-data-json into the request body', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const triggerRule = vi.fn().mockResolvedValue(ack())
		const program = new Command().addCommand(ruleCommand({ triggerRule }))

		await program.parseAsync(
			['node', 'test', 'rule', 'trigger', 'rt1', '--action-data-json', '{"deploy":"v2","build":41}'],
			{ from: 'node' },
		)

		expect(triggerRule).toHaveBeenCalledWith('rt1', { action_data: { deploy: 'v2', build: 41 } })
	})

	it('rule trigger rejects action data that is not a JSON object', async () => {
		const program = new Command().addCommand(ruleCommand({ triggerRule: vi.fn() }))

		await expect(
			program.parseAsync(['node', 'test', 'rule', 'trigger', 'rt1', '--action-data-json', '[1,2]'], {
				from: 'node',
			}),
		).rejects.toThrow('action data JSON must be an object')
	})

	it('rule trigger acknowledges the run and points at the affected task', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		const triggerRule = vi.fn().mockResolvedValue(ack({ resource: 'task1' }))
		const program = new Command().addCommand(ruleCommand({ triggerRule }))

		await program.parseAsync(['node', 'test', 'rule', 'trigger', 'rt1', '--resource', 'task1'], { from: 'node' })

		const lines = logSpy.mock.calls.map((c) => String(c[0]))
		expect(lines.some((l) => l.includes('rt1'))).toBe(true)
		expect(lines.some((l) => l.includes('cyber-asana task get <gid>'))).toBe(true)
		logSpy.mockRestore()
	})

	it('rule trigger honors --json', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		const triggerRule = vi.fn().mockResolvedValue(ack({ resource: 'task1' }))
		process.argv = ['node', 'test', '--json']
		const program = new Command().addCommand(ruleCommand({ triggerRule }))

		await program.parseAsync(['node', 'test', 'rule', 'trigger', 'rt1', '--resource', 'task1'], { from: 'node' })

		expect(JSON.parse(logSpy.mock.calls.map((c) => String(c[0])).join('\n'))).toEqual({
			triggered: true,
			rule_trigger_gid: 'rt1',
			resource: 'task1',
		})
		logSpy.mockRestore()
	})

	it('rule trigger help names the incoming-web-request requirement and the beta limits', () => {
		const trigger = ruleCommand({ triggerRule: vi.fn() }).commands.find((c) => c.name() === 'trigger')
		let help = ''
		trigger?.configureOutput({
			writeOut: (chunk) => {
				help += chunk
			},
		})
		trigger?.outputHelp()

		expect(help).toContain('incoming web request')
		expect(help).toContain('Asana UI')
		expect(help).toContain('beta')
		expect(help).toContain('402')
	})

	it('rule command can use injected dependencies', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const triggerRule = vi.fn().mockResolvedValue(ack())
		const program = new Command().addCommand(ruleCommand(() => ({ triggerRule })))

		await program.parseAsync(['node', 'test', 'rule', 'trigger', 'rt1'], { from: 'node' })

		expect(triggerRule).toHaveBeenCalledWith('rt1', {})
		expect(triggerRuleMock).not.toHaveBeenCalled()
	})
})
