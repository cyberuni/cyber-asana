import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

const createTaskMock = vi.fn()
const updateTaskMock = vi.fn()
const addFollowersToTaskMock = vi.fn()
const removeFollowersFromTaskMock = vi.fn()
const getTasksByGidMock = vi.fn()
const createSubtaskMock = vi.fn()

vi.mock('./api.js', async () => {
	const actual = await vi.importActual<typeof import('./api.js')>('./api.js')
	return {
		...actual,
		createTask: createTaskMock,
		updateTask: updateTaskMock,
		addFollowersToTask: addFollowersToTaskMock,
		removeFollowersFromTask: removeFollowersFromTaskMock,
		getTasksByGid: getTasksByGidMock,
		createSubtask: createSubtaskMock,
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

	it('asana_task_create passes start_on through', async () => {
		createTaskMock.mockResolvedValue({ gid: '1', name: 'Task' })
		const server = createServer()
		registerTaskTools(server as any)

		await server.handlers.get('asana_task_create')?.({
			workspace_gid: 'ws1',
			name: 'Task',
			start_on: '2026-09-01',
			due_on: '2026-10-31',
		})

		expect(createTaskMock).toHaveBeenCalledWith('ws1', 'Task', {
			start_on: '2026-09-01',
			due_on: '2026-10-31',
		})
	})

	it('asana_task_create passes due_at and start_at through', async () => {
		createTaskMock.mockResolvedValue({ gid: '1', name: 'Task' })
		const server = createServer()
		registerTaskTools(server as any)

		await server.handlers.get('asana_task_create')?.({
			workspace_gid: 'ws1',
			name: 'Task',
			start_at: '2026-09-01T09:00:00.000Z',
			due_at: '2026-10-31T17:00:00.000Z',
		})

		expect(createTaskMock).toHaveBeenCalledWith('ws1', 'Task', {
			start_at: '2026-09-01T09:00:00.000Z',
			due_at: '2026-10-31T17:00:00.000Z',
		})
	})

	it('asana_task_update maps the clear date-time flags to null', async () => {
		updateTaskMock.mockResolvedValue({ gid: '1', name: 'Task' })
		const server = createServer()
		registerTaskTools(server as any)

		await server.handlers.get('asana_task_update')?.({
			task_gid: '123',
			clear_due_at: true,
			clear_start_at: true,
		})

		expect(updateTaskMock).toHaveBeenCalledWith('123', {
			due_at: null,
			start_at: null,
		})
	})

	it('asana_task_update maps clear assignee flag to assignee null', async () => {
		updateTaskMock.mockResolvedValue({ gid: '1', name: 'Task' })
		const server = createServer()
		registerTaskTools(server as any)

		await server.handlers.get('asana_task_update')?.({ task_gid: '123', clear_assignee: true })

		expect(updateTaskMock).toHaveBeenCalledWith('123', {
			assignee: null,
		})
	})

	it('asana_task_create passes completed through', async () => {
		createTaskMock.mockResolvedValue({ gid: '1', name: 'Task' })
		const server = createServer()
		registerTaskTools(server as any)

		await server.handlers.get('asana_task_create')?.({ workspace_gid: 'ws1', name: 'Task', completed: true })

		expect(createTaskMock).toHaveBeenCalledWith('ws1', 'Task', { completed: true })
	})

	it('asana_task_subtask_create forwards the same write fields as asana_task_create', async () => {
		createSubtaskMock.mockResolvedValue({ gid: '2', name: 'Sub Task' })
		const server = createServer()
		registerTaskTools(server as any)

		await server.handlers.get('asana_task_subtask_create')?.({
			task_gid: '123',
			name: 'Sub Task',
			html_notes: '<body>Sub</body>',
			start_on: '2026-05-01',
			due_on: '2026-06-01',
			resource_subtype: 'milestone',
			custom_fields: { cf1: 'value' },
			follower_gids: ['u1'],
		})

		expect(createSubtaskMock).toHaveBeenCalledWith('123', 'Sub Task', {
			html_notes: '<body>Sub</body>',
			start_on: '2026-05-01',
			due_on: '2026-06-01',
			resource_subtype: 'milestone',
			custom_fields: { cf1: 'value' },
			followers: ['u1'],
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

	it('asana_task_update maps clear due flag to due_on null', async () => {
		updateTaskMock.mockResolvedValue({ gid: '1', name: 'Task' })
		const server = createServer()
		registerTaskTools(server as any)

		await server.handlers.get('asana_task_update')?.({
			task_gid: '123',
			clear_due_on: true,
		})

		expect(updateTaskMock).toHaveBeenCalledWith('123', {
			due_on: null,
		})
	})

	it('asana_task_update passes start_on through', async () => {
		updateTaskMock.mockResolvedValue({ gid: '1', name: 'Task' })
		const server = createServer()
		registerTaskTools(server as any)

		await server.handlers.get('asana_task_update')?.({
			task_gid: '123',
			start_on: '2026-09-01',
		})

		expect(updateTaskMock).toHaveBeenCalledWith('123', {
			start_on: '2026-09-01',
		})
	})

	it('asana_task_update maps clear start flag to start_on null', async () => {
		updateTaskMock.mockResolvedValue({ gid: '1', name: 'Task' })
		const server = createServer()
		registerTaskTools(server as any)

		await server.handlers.get('asana_task_update')?.({
			task_gid: '123',
			clear_start_on: true,
		})

		expect(updateTaskMock).toHaveBeenCalledWith('123', {
			start_on: null,
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

	it('asana_task_get_many forwards gids and opt_fields to batch lookup', async () => {
		getTasksByGidMock.mockResolvedValue([{ gid: '123', ok: true, task: { gid: '123', name: 'Task 1' } }])
		const server = createServer()
		registerTaskTools(server as any)

		const result = await server.handlers.get('asana_task_get_many')?.({
			task_gids: ['123', '456'],
			opt_fields: 'gid,name,completed',
		})

		expect(getTasksByGidMock).toHaveBeenCalledWith(['123', '456'], {
			optFields: 'gid,name,completed',
		})
		expect(result).toEqual({
			content: [
				{
					type: 'text',
					text: JSON.stringify([{ gid: '123', ok: true, task: { gid: '123', name: 'Task 1' } }]),
				},
			],
		})
	})

	it('task tools can use injected dependencies', async () => {
		const injectedCreateTask = vi.fn().mockResolvedValue({ gid: '1', name: 'New Task' })
		const server = createServer()
		registerTaskTools(server as any, {
			listTasks: vi.fn(),
			listTasksForSection: vi.fn(),
			getTask: vi.fn(),
			getTasksByGid: vi.fn(),
			createTask: injectedCreateTask,
			updateTask: vi.fn(),
			deleteTask: vi.fn(),
			getMyTasks: vi.fn(),
			listSubtasks: vi.fn(),
			createSubtask: vi.fn(),
			addTaskToProject: vi.fn(),
			removeTaskFromProject: vi.fn(),
			addFollowersToTask: vi.fn(),
			removeFollowersFromTask: vi.fn(),
			getDependencies: vi.fn(),
			getDependents: vi.fn(),
			addDependencies: vi.fn(),
			addDependents: vi.fn(),
			removeDependencies: vi.fn(),
			removeDependents: vi.fn(),
			searchTasks: vi.fn(),
		})

		await server.handlers.get('asana_task_create')?.({
			workspace_gid: 'ws1',
			name: 'New Task',
		})

		expect(injectedCreateTask).toHaveBeenCalledWith('ws1', 'New Task', {})
	})

	describe('assignee resolves through the repo user registry', () => {
		let dir: string | undefined
		const previousConfig = process.env.CYBER_ASANA_CONFIG

		async function useRegistry() {
			dir = await mkdtemp(join(tmpdir(), 'cyber-asana-mcp-assignee-'))
			const path = join(dir, 'config.json')
			await writeFile(
				path,
				JSON.stringify({
					schema_version: 1,
					projects: [],
					users: [{ gid: '100', name: 'Alice Anderson', email: 'alice@example.com', aliases: ['ali'] }],
				}),
			)
			process.env.CYBER_ASANA_CONFIG = path
		}

		afterEach(async () => {
			if (previousConfig === undefined) delete process.env.CYBER_ASANA_CONFIG
			else process.env.CYBER_ASANA_CONFIG = previousConfig
			if (dir) await rm(dir, { recursive: true, force: true })
			dir = undefined
		})

		it('asana_task_create resolves an alias', async () => {
			await useRegistry()
			createTaskMock.mockResolvedValue({ gid: '1', name: 'Task' })
			const server = createServer()
			registerTaskTools(server as any)

			await server.handlers.get('asana_task_create')?.({ workspace_gid: 'ws1', name: 'Task', assignee: 'ali' })

			expect(createTaskMock).toHaveBeenCalledWith('ws1', 'Task', { assignee: '100' })
		})

		it('asana_task_update resolves an email', async () => {
			await useRegistry()
			updateTaskMock.mockResolvedValue({ gid: '1', name: 'Task' })
			const server = createServer()
			registerTaskTools(server as any)

			await server.handlers.get('asana_task_update')?.({ task_gid: '123', assignee: 'alice@example.com' })

			expect(updateTaskMock).toHaveBeenCalledWith('123', { assignee: '100' })
		})

		it('asana_task_subtask_create resolves a name', async () => {
			await useRegistry()
			createSubtaskMock.mockResolvedValue({ gid: '2', name: 'Sub' })
			const server = createServer()
			registerTaskTools(server as any)

			await server.handlers.get('asana_task_subtask_create')?.({
				task_gid: '1',
				name: 'Sub',
				assignee: 'Alice Anderson',
			})

			expect(createSubtaskMock).toHaveBeenCalledWith('1', 'Sub', { assignee: '100' })
		})

		it('assignee_gid wins over assignee and skips the registry', async () => {
			createTaskMock.mockResolvedValue({ gid: '1', name: 'Task' })
			const server = createServer()
			registerTaskTools(server as any)

			await server.handlers.get('asana_task_create')?.({
				workspace_gid: 'ws1',
				name: 'Task',
				assignee_gid: '555',
				assignee: 'not-registered',
			})

			expect(createTaskMock).toHaveBeenCalledWith('ws1', 'Task', { assignee: '555' })
		})
	})
	describe('asana_task_create resolves through the repo project registry', () => {
		let dir: string | undefined
		const previousConfig = process.env.CYBER_ASANA_CONFIG

		async function useConfig(config: unknown) {
			dir = await mkdtemp(join(tmpdir(), 'cyber-asana-mcp-project-'))
			const path = join(dir, 'config.json')
			await writeFile(path, JSON.stringify(config))
			process.env.CYBER_ASANA_CONFIG = path
		}

		afterEach(async () => {
			if (previousConfig === undefined) delete process.env.CYBER_ASANA_CONFIG
			else process.env.CYBER_ASANA_CONFIG = previousConfig
			if (dir) await rm(dir, { recursive: true, force: true })
			dir = undefined
		})

		it('sends tag_gids as a tag list', async () => {
			await useConfig({ schema_version: 2, projects: [] })
			createTaskMock.mockResolvedValue({ gid: '1', name: 'Task' })
			const server = createServer()
			registerTaskTools(server as any)

			await server.handlers.get('asana_task_create')?.({ workspace_gid: 'ws1', name: 'Task', tag_gids: ['t1'] })

			expect(createTaskMock).toHaveBeenCalledWith('ws1', 'Task', { tags: ['t1'] })
		})

		it('applies conventions.default_tags and description_template', async () => {
			await useConfig({
				schema_version: 2,
				projects: [],
				conventions: { default_tags: ['t1'], description_template: '## Problem' },
			})
			createTaskMock.mockResolvedValue({ gid: '1', name: 'Task' })
			const server = createServer()
			registerTaskTools(server as any)

			await server.handlers.get('asana_task_create')?.({ workspace_gid: 'ws1', name: 'Task' })

			expect(createTaskMock).toHaveBeenCalledWith('ws1', 'Task', { notes: '## Problem', tags: ['t1'] })
		})

		it('leaves conventions out when the call gives its own notes and tags', async () => {
			await useConfig({
				schema_version: 2,
				projects: [],
				conventions: { default_tags: ['t1'], description_template: '## Problem' },
			})
			createTaskMock.mockResolvedValue({ gid: '1', name: 'Task' })
			const server = createServer()
			registerTaskTools(server as any)

			await server.handlers.get('asana_task_create')?.({
				workspace_gid: 'ws1',
				name: 'Task',
				notes: 'Mine',
				tag_gids: ['t9'],
			})

			expect(createTaskMock).toHaveBeenCalledWith('ws1', 'Task', { notes: 'Mine', tags: ['t9'] })
		})

		it('resolves a project alias', async () => {
			await useConfig({ schema_version: 2, projects: [{ gid: '999', name: 'Backend', aliases: ['api'] }] })
			createTaskMock.mockResolvedValue({ gid: '1', name: 'Task' })
			const server = createServer()
			registerTaskTools(server as any)

			await server.handlers.get('asana_task_create')?.({ workspace_gid: 'ws1', name: 'Task', project: 'api' })

			expect(createTaskMock).toHaveBeenCalledWith('ws1', 'Task', { projects: ['999'] })
		})

		it('falls back to the project marked default when none is given', async () => {
			await useConfig({
				schema_version: 2,
				projects: [{ gid: '999', name: 'Backend', aliases: [], default: true }],
			})
			createTaskMock.mockResolvedValue({ gid: '1', name: 'Task' })
			const server = createServer()
			registerTaskTools(server as any)

			await server.handlers.get('asana_task_create')?.({ workspace_gid: 'ws1', name: 'Task' })

			expect(createTaskMock).toHaveBeenCalledWith('ws1', 'Task', { projects: ['999'] })
		})

		it('prefers an explicit project_gid over the default', async () => {
			await useConfig({
				schema_version: 2,
				projects: [{ gid: '999', name: 'Backend', aliases: [], default: true }],
			})
			createTaskMock.mockResolvedValue({ gid: '1', name: 'Task' })
			const server = createServer()
			registerTaskTools(server as any)

			await server.handlers.get('asana_task_create')?.({ workspace_gid: 'ws1', name: 'Task', project_gid: '777' })

			expect(createTaskMock).toHaveBeenCalledWith('ws1', 'Task', { projects: ['777'] })
		})

		it('falls back to defaults.assignee when no assignee is given', async () => {
			await useConfig({
				schema_version: 2,
				projects: [],
				users: [{ gid: '100', name: 'Alice Anderson', aliases: ['ali'] }],
				defaults: { assignee: 'ali' },
			})
			createTaskMock.mockResolvedValue({ gid: '1', name: 'Task' })
			const server = createServer()
			registerTaskTools(server as any)

			await server.handlers.get('asana_task_create')?.({ workspace_gid: 'ws1', name: 'Task' })

			expect(createTaskMock).toHaveBeenCalledWith('ws1', 'Task', { assignee: '100' })
		})

		it('leaves asana_task_update alone when only defaults.assignee is set', async () => {
			await useConfig({
				schema_version: 2,
				projects: [],
				users: [{ gid: '100', name: 'Alice Anderson', aliases: ['ali'] }],
				defaults: { assignee: 'ali' },
			})
			updateTaskMock.mockResolvedValue({ gid: '1', name: 'Task' })
			const server = createServer()
			registerTaskTools(server as any)

			await server.handlers.get('asana_task_update')?.({ task_gid: '123', name: 'Renamed' })

			expect(updateTaskMock).toHaveBeenCalledWith('123', { name: 'Renamed' })
		})
	})
})
