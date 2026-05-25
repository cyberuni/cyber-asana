import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'

const createGoalMock = vi.fn()
const updateGoalMock = vi.fn()

vi.mock('./api.js', async () => {
	const actual = await vi.importActual<typeof import('./api.js')>('./api.js')
	return {
		...actual,
		createGoal: createGoalMock,
		updateGoal: updateGoalMock,
	}
})

const { goalCommand } = await import('./cli.js')

describe('goals/cli', () => {
	afterEach(() => {
		vi.clearAllMocks()
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

		expect(updateGoalMock).toHaveBeenCalledWith('goal1', { name: 'Ship v2', notes: undefined, due_on: undefined })
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

		expect(injectedCreateGoal).toHaveBeenCalledWith('ws1', 'Ship v1', { notes: undefined, due_on: undefined })
	})
})
