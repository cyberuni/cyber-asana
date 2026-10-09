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

		expect(injectedCreateGoal).toHaveBeenCalledWith('ws1', 'Ship v1', {})
	})

	it('asana_goal_create forwards a start date alongside a due date', async () => {
		createGoalMock.mockResolvedValue({ gid: 'goal1', name: 'Ship v1' })
		const server = createServer()
		registerGoalTools(server as any)

		await server.handlers.get('asana_goal_create')?.({
			workspace_gid: 'ws1',
			name: 'Ship v1',
			start_on: '2026-01-01',
			due_on: '2026-06-30',
		})

		expect(createGoalMock).toHaveBeenCalledWith('ws1', 'Ship v1', {
			start_on: '2026-01-01',
			due_on: '2026-06-30',
		})
	})

	it('asana_goal_update forwards a start date', async () => {
		updateGoalMock.mockResolvedValue({ gid: 'goal1', name: 'Ship v2' })
		const server = createServer()
		registerGoalTools(server as any)

		await server.handlers.get('asana_goal_update')?.({ goal_gid: 'goal1', start_on: '2026-01-01' })

		expect(updateGoalMock).toHaveBeenCalledWith('goal1', { start_on: '2026-01-01' })
	})

	it('asana_goal_update sends null for a cleared start date', async () => {
		updateGoalMock.mockResolvedValue({ gid: 'goal1', name: 'Ship v2' })
		const server = createServer()
		registerGoalTools(server as any)

		await server.handlers.get('asana_goal_update')?.({ goal_gid: 'goal1', clear_start_on: true })

		expect(updateGoalMock).toHaveBeenCalledWith('goal1', { start_on: null })
	})

	it('asana_goal_update sends null for a cleared due date', async () => {
		updateGoalMock.mockResolvedValue({ gid: 'goal1', name: 'Ship v2' })
		const server = createServer()
		registerGoalTools(server as any)

		await server.handlers.get('asana_goal_update')?.({ goal_gid: 'goal1', clear_due_on: true })

		expect(updateGoalMock).toHaveBeenCalledWith('goal1', { due_on: null })
	})

	it('asana_goal_update rejects a due date set and cleared at once', async () => {
		const server = createServer()
		registerGoalTools(server as any)

		await expect(
			server.handlers.get('asana_goal_update')?.({ goal_gid: 'goal1', due_on: '2026-06-30', clear_due_on: true }),
		).rejects.toThrow('--due-on and --clear-due-on are mutually exclusive')
		expect(updateGoalMock).not.toHaveBeenCalled()
	})

	it('asana_goal_create forwards rich-text notes', async () => {
		createGoalMock.mockResolvedValue({ gid: 'goal1', name: 'Ship v1' })
		const server = createServer()
		registerGoalTools(server as any)

		await server.handlers.get('asana_goal_create')?.({
			workspace_gid: 'ws1',
			name: 'Ship v1',
			html_notes: '<body>Q2</body>',
		})

		expect(createGoalMock).toHaveBeenCalledWith('ws1', 'Ship v1', { html_notes: '<body>Q2</body>' })
	})

	it('asana_goal_update forwards rich-text notes', async () => {
		updateGoalMock.mockResolvedValue({ gid: 'goal1', name: 'Ship v2' })
		const server = createServer()
		registerGoalTools(server as any)

		await server.handlers.get('asana_goal_update')?.({ goal_gid: 'goal1', html_notes: '<body>Q3</body>' })

		expect(updateGoalMock).toHaveBeenCalledWith('goal1', { html_notes: '<body>Q3</body>' })
	})

	it('asana_goal_update rejects notes and html_notes at once', async () => {
		const server = createServer()
		registerGoalTools(server as any)

		await expect(
			server.handlers.get('asana_goal_update')?.({ goal_gid: 'goal1', notes: 'plain', html_notes: '<body>r</body>' }),
		).rejects.toThrow('--notes and --html-notes are mutually exclusive')
		expect(updateGoalMock).not.toHaveBeenCalled()
	})
})
