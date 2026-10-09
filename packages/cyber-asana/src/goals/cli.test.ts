import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'

const createGoalMock = vi.fn()
const updateGoalMock = vi.fn()

vi.mock('./default.js', async () => {
	const actual = await vi.importActual<typeof import('./default.js')>('./default.js')
	return {
		...actual,
		createGoal: createGoalMock,
		updateGoal: updateGoalMock,
	}
})

const { goalCommand } = await import('./cli.js')

describe('goals/cli', () => {
	const originalEnv = { ...process.env }
	const originalArgv = [...process.argv]

	afterEach(() => {
		vi.clearAllMocks()
		process.env = { ...originalEnv }
		process.argv = [...originalArgv]
	})

	it('goal list applies a minimal default field set, a count summary, and next steps', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		const listGoals = vi.fn().mockResolvedValue([{ gid: 'goal1', name: 'Ship v1' }])
		const program = new Command().addCommand(
			goalCommand({
				listGoals,
				getGoal: vi.fn(),
				createGoal: vi.fn(),
				updateGoal: vi.fn(),
				deleteGoal: vi.fn(),
			}),
		)

		await program.parseAsync(['node', 'test', 'goal', 'list', '--workspace-gid', 'ws1'], { from: 'node' })

		expect(listGoals).toHaveBeenCalledWith('ws1', expect.objectContaining({ optFields: 'gid,name,due_on' }))
		const lines = logSpy.mock.calls.map((c) => String(c[0]))
		expect(lines).toContain('\n1 goal(s)')
		expect(lines.some((l) => l.includes('cyber-asana goal get <gid>'))).toBe(true)
		logSpy.mockRestore()
	})

	it('goal list respects an explicit --opt-fields override', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const listGoals = vi.fn().mockResolvedValue([])
		const program = new Command().addCommand(
			goalCommand({
				listGoals,
				getGoal: vi.fn(),
				createGoal: vi.fn(),
				updateGoal: vi.fn(),
				deleteGoal: vi.fn(),
			}),
		)

		await program.parseAsync(['node', 'test', 'goal', 'list', '--workspace-gid', 'ws1', '--opt-fields', 'name'], {
			from: 'node',
		})

		expect(listGoals).toHaveBeenCalledWith('ws1', expect.objectContaining({ optFields: 'name' }))
		vi.restoreAllMocks()
	})

	it('goal delete emits a structured acknowledgement with --json', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		process.argv = ['node', 'test', '--json']
		const program = new Command().option('--json').addCommand(
			goalCommand({
				listGoals: vi.fn(),
				getGoal: vi.fn(),
				createGoal: vi.fn(),
				updateGoal: vi.fn(),
				deleteGoal: vi.fn().mockResolvedValue(undefined),
			}),
		)

		await program.parseAsync(['node', 'test', '--json', 'goal', 'delete', 'goal1'], { from: 'node' })

		expect(logSpy).toHaveBeenCalledWith(
			JSON.stringify({ deleted: true, resource: 'goal', gid: 'goal1', already_absent: false }, null, 2),
		)
		logSpy.mockRestore()
	})

	it('goal create forwards workspace gid, name, and options', async () => {
		createGoalMock.mockResolvedValue({ gid: 'goal1', name: 'Ship v1' })
		const program = new Command().addCommand(goalCommand())

		await program.parseAsync(
			[
				'node',
				'test',
				'goal',
				'create',
				'Ship v1',
				'--workspace-gid',
				'ws1',
				'--notes',
				'Q2 target',
				'--due-on',
				'2026-06-30',
			],
			{ from: 'node' },
		)

		expect(createGoalMock).toHaveBeenCalledWith('ws1', 'Ship v1', {
			notes: 'Q2 target',
			due_on: '2026-06-30',
		})
	})

	it('goal update forwards gid and fields', async () => {
		updateGoalMock.mockResolvedValue({ gid: 'goal1', name: 'Ship v2' })
		const program = new Command().addCommand(goalCommand())

		await program.parseAsync(['node', 'test', 'goal', 'update', 'goal1', '--name', 'Ship v2'], { from: 'node' })

		expect(updateGoalMock).toHaveBeenCalledWith('goal1', { name: 'Ship v2' })
	})

	it('goal command can use injected dependencies', async () => {
		const injectedCreateGoal = vi.fn().mockResolvedValue({ gid: 'goal1', name: 'Ship v1' })
		const program = new Command().addCommand(
			goalCommand({
				listGoals: vi.fn(),
				getGoal: vi.fn(),
				createGoal: injectedCreateGoal,
				updateGoal: vi.fn(),
				deleteGoal: vi.fn(),
			}),
		)

		await program.parseAsync(['node', 'test', 'goal', 'create', 'Ship v1', '--workspace-gid', 'ws1'], {
			from: 'node',
		})

		expect(injectedCreateGoal).toHaveBeenCalledWith('ws1', 'Ship v1', {})
	})

	it('goal create falls back to ASANA_WORKSPACE_GID when workspace flag is omitted', async () => {
		delete process.env.ASANA_WORKSPACE
		process.env.ASANA_WORKSPACE_GID = 'ws-alias'
		createGoalMock.mockResolvedValue({ gid: 'goal1', name: 'Ship v1' })
		const program = new Command().addCommand(goalCommand())

		await program.parseAsync(['node', 'test', 'goal', 'create', 'Ship v1'], { from: 'node' })

		expect(createGoalMock).toHaveBeenCalledWith('ws-alias', 'Ship v1', {})
	})

	it('goal create forwards a start date alongside a due date', async () => {
		createGoalMock.mockResolvedValue({ gid: 'goal1', name: 'Ship v1' })
		const program = new Command().addCommand(goalCommand())

		await program.parseAsync(
			[
				'node',
				'test',
				'goal',
				'create',
				'Ship v1',
				'--workspace-gid',
				'ws1',
				'--start-on',
				'2026-01-01',
				'--due-on',
				'2026-06-30',
			],
			{ from: 'node' },
		)

		expect(createGoalMock).toHaveBeenCalledWith('ws1', 'Ship v1', {
			start_on: '2026-01-01',
			due_on: '2026-06-30',
		})
	})

	it('goal update forwards a start date', async () => {
		updateGoalMock.mockResolvedValue({ gid: 'goal1', name: 'Ship v2' })
		const program = new Command().addCommand(goalCommand())

		await program.parseAsync(['node', 'test', 'goal', 'update', 'goal1', '--start-on', '2026-01-01'], {
			from: 'node',
		})

		expect(updateGoalMock).toHaveBeenCalledWith('goal1', { start_on: '2026-01-01' })
	})

	it('goal update clears the start date with --clear-start-on', async () => {
		updateGoalMock.mockResolvedValue({ gid: 'goal1', name: 'Ship v2' })
		const program = new Command().addCommand(goalCommand())

		await program.parseAsync(['node', 'test', 'goal', 'update', 'goal1', '--clear-start-on'], { from: 'node' })

		expect(updateGoalMock).toHaveBeenCalledWith('goal1', { start_on: null })
	})

	it('goal update clears the due date with --clear-due-on', async () => {
		updateGoalMock.mockResolvedValue({ gid: 'goal1', name: 'Ship v2' })
		const program = new Command().addCommand(goalCommand())

		await program.parseAsync(['node', 'test', 'goal', 'update', 'goal1', '--clear-due-on'], { from: 'node' })

		expect(updateGoalMock).toHaveBeenCalledWith('goal1', { due_on: null })
	})

	it('goal update rejects --due-on together with --clear-due-on', async () => {
		const program = new Command().addCommand(goalCommand())

		await expect(
			program.parseAsync(['node', 'test', 'goal', 'update', 'goal1', '--due-on', '2026-06-30', '--clear-due-on'], {
				from: 'node',
			}),
		).rejects.toThrow('--due-on and --clear-due-on are mutually exclusive')
		expect(updateGoalMock).not.toHaveBeenCalled()
	})

	it('goal create forwards rich-text notes', async () => {
		createGoalMock.mockResolvedValue({ gid: 'goal1', name: 'Ship v1' })
		const program = new Command().addCommand(goalCommand())

		await program.parseAsync(
			['node', 'test', 'goal', 'create', 'Ship v1', '--workspace-gid', 'ws1', '--html-notes', '<body>Q2</body>'],
			{ from: 'node' },
		)

		expect(createGoalMock).toHaveBeenCalledWith('ws1', 'Ship v1', { html_notes: '<body>Q2</body>' })
	})

	it('goal update forwards rich-text notes', async () => {
		updateGoalMock.mockResolvedValue({ gid: 'goal1', name: 'Ship v2' })
		const program = new Command().addCommand(goalCommand())

		await program.parseAsync(['node', 'test', 'goal', 'update', 'goal1', '--html-notes', '<body>Q3</body>'], {
			from: 'node',
		})

		expect(updateGoalMock).toHaveBeenCalledWith('goal1', { html_notes: '<body>Q3</body>' })
	})

	it('goal update rejects --notes together with --html-notes', async () => {
		const program = new Command().addCommand(goalCommand())

		await expect(
			program.parseAsync(
				['node', 'test', 'goal', 'update', 'goal1', '--notes', 'plain', '--html-notes', '<body>rich</body>'],
				{ from: 'node' },
			),
		).rejects.toThrow('--notes and --html-notes are mutually exclusive')
		expect(updateGoalMock).not.toHaveBeenCalled()
	})
})
