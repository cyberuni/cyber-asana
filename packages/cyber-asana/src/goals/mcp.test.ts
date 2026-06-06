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

const { registerGoalTools } = await import('./mcp.js')

type ToolHandler = (params: any) => Promise<any>

function createServer() {
	const handlers = new Map<string, ToolHandler>()
	return {
		handlers,
		tool(name: string, _description: string, _schema: unknown, handler: ToolHandler) {
			handlers.set(name, handler)
		},
	}
}

describe('goals/mcp', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	it('asana_goal_create forwards workspace gid, name, and options', async () => {
		createGoalMock.mockResolvedValue({ gid: 'goal1', name: 'Ship v1' })
		const server = createServer()
		registerGoalTools(server as any)

		await server.handlers.get('asana_goal_create')?.({
			workspace_gid: 'ws1',
			name: 'Ship v1',
			notes: 'Q2 target',
			due_on: '2026-06-30',
		})

		expect(createGoalMock).toHaveBeenCalledWith('ws1', 'Ship v1', {
			notes: 'Q2 target',
			due_on: '2026-06-30',
		})
	})

	it('asana_goal_update forwards gid and fields', async () => {
		updateGoalMock.mockResolvedValue({ gid: 'goal1', name: 'Ship v2' })
		const server = createServer()
		registerGoalTools(server as any)

		await server.handlers.get('asana_goal_update')?.({
			goal_gid: 'goal1',
			name: 'Ship v2',
		})

		expect(updateGoalMock).toHaveBeenCalledWith('goal1', { name: 'Ship v2' })
	})

	it('goal tools can use injected dependencies', async () => {
		const injectedCreateGoal = vi.fn().mockResolvedValue({ gid: 'goal1', name: 'Ship v1' })
		const server = createServer()
		registerGoalTools(server as any, {
			listGoals: vi.fn(),
			getGoal: vi.fn(),
			createGoal: injectedCreateGoal,
			updateGoal: vi.fn(),
			deleteGoal: vi.fn(),
		})

		await server.handlers.get('asana_goal_create')?.({
			workspace_gid: 'ws1',
			name: 'Ship v1',
		})

		expect(injectedCreateGoal).toHaveBeenCalledWith('ws1', 'Ship v1', { notes: undefined, due_on: undefined })
	})
})
