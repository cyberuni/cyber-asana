import { afterEach, describe, expect, it, vi } from 'vitest'

const createTaskMock = vi.fn()
const updateTaskMock = vi.fn()
const addFollowersToTaskMock = vi.fn()
const removeFollowersFromTaskMock = vi.fn()

vi.mock('./api.js', async () => {
	const actual = await vi.importActual<typeof import('./api.js')>('./api.js')
	return {
		...actual,
		createTask: createTaskMock,
		updateTask: updateTaskMock,
		addFollowersToTask: addFollowersToTaskMock,
		removeFollowersFromTask: removeFollowersFromTaskMock,
	}
})

const { registerTaskTools } = await import('./mcp.js')

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

describe('tasks/mcp', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	it('asana_task_create normalizes project aliases, followers, and custom fields', async () => {
		createTaskMock.mockResolvedValue({ gid: '1', name: 'Task' })
		const server = createServer()
		registerTaskTools(server as any)

		await server.handlers.get('asana_task_create')?.({
			workspace_gid: 'ws1',
			name: 'Task',
			project_gid: 'p1,p2',
			follower_gids: 'u1,u2',
			html_notes: '<body>Hi</body>',
			parent_gid: 'parent1',
			resource_subtype: 'milestone',
			custom_fields: { cf1: 'json' },
		})

		expect(createTaskMock).toHaveBeenCalledWith('ws1', 'Task', {
			projects: ['p1', 'p2'],
			followers: ['u1', 'u2'],
			html_notes: '<body>Hi</body>',
			parent: 'parent1',
			resource_subtype: 'milestone',
			custom_fields: { cf1: 'json' },
		})
	})

	it('asana_task_update forwards html notes, clear parent, and custom fields', async () => {
		updateTaskMock.mockResolvedValue({ gid: '1', name: 'Task' })
		const server = createServer()
		registerTaskTools(server as any)

		await server.handlers.get('asana_task_update')?.({
			task_gid: '123',
			html_notes: '<body>Updated</body>',
			clear_parent: true,
			resource_subtype: 'milestone',
			custom_fields: { cf2: 'value' },
		})

		expect(updateTaskMock).toHaveBeenCalledWith('123', {
			html_notes: '<body>Updated</body>',
			clear_parent: true,
			resource_subtype: 'milestone',
			custom_fields: { cf2: 'value' },
		})
	})

	it('asana_task_follower_remove calls follower removal helper', async () => {
		removeFollowersFromTaskMock.mockResolvedValue({ gid: '1' })
		const server = createServer()
		registerTaskTools(server as any)

		await server.handlers.get('asana_task_follower_remove')?.({
			task_gid: '123',
			follower_gids: ['u1', 'u2'],
		})

		expect(removeFollowersFromTaskMock).toHaveBeenCalledWith('123', ['u1', 'u2'])
	})
})
