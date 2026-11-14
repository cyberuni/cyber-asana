import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { stringify } from 'yaml'

const createTaskMock = vi.fn()
const updateTaskMock = vi.fn()
const addFollowersToTaskMock = vi.fn()
const removeFollowersFromTaskMock = vi.fn()
const getTasksByGidMock = vi.fn()
const getTaskMock = vi.fn()
const getTaskWithStoriesMock = vi.fn()
const createSubtaskMock = vi.fn()
const listTagsMock = vi.fn()

vi.mock('../tags/default.js', async () => {
	const actual = await vi.importActual<typeof import('../tags/default.js')>('../tags/default.js')
	return { ...actual, listTags: listTagsMock }
})

vi.mock('./default.js', async () => {
	const actual = await vi.importActual<typeof import('./default.js')>('./default.js')
	return {
		...actual,
		createTask: createTaskMock,
		updateTask: updateTaskMock,
		addFollowersToTask: addFollowersToTaskMock,
		removeFollowersFromTask: removeFollowersFromTaskMock,
		getTasksByGid: getTasksByGidMock,
		getTask: getTaskMock,
		getTaskWithStories: getTaskWithStoriesMock,
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

	it('asana_task_update sends completed false to uncomplete a task', async () => {
		updateTaskMock.mockResolvedValue({ gid: '1', name: 'Task' })
		const server = createServer()
		registerTaskTools(server as any)

		await server.handlers.get('asana_task_update')?.({ task_gid: '123', completed: false })

		expect(updateTaskMock).toHaveBeenCalledWith('123', { completed: false })
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

	it('asana_task_get without with_stories reads the task alone', async () => {
		getTaskMock.mockResolvedValue({ gid: '1', name: 'Task' })
		const server = createServer()
		registerTaskTools(server as any)

		await server.handlers.get('asana_task_get')?.({ task_gid: '1' })

		expect(getTaskMock).toHaveBeenCalledWith('1', undefined)
		expect(getTaskWithStoriesMock).not.toHaveBeenCalled()
	})

	it('asana_task_get with with_stories returns the task and its stories in one payload', async () => {
		const payload = { gid: '1', name: 'Task', stories: [{ gid: 's1', created_at: '2026-01-02T00:00:00.000Z' }] }
		getTaskWithStoriesMock.mockResolvedValue(payload)
		const server = createServer()
		registerTaskTools(server as any)

		const result = await server.handlers.get('asana_task_get')?.({
			task_gid: '1',
			with_stories: true,
			since: '2026-01-01T00:00:00Z',
			opt_fields: 'gid,name',
		})

		expect(getTaskWithStoriesMock).toHaveBeenCalledWith('1', { since: '2026-01-01T00:00:00Z', optFields: 'gid,name' })
		expect(getTaskMock).not.toHaveBeenCalled()
		expect(result).toEqual({ content: [{ type: 'text', text: JSON.stringify(payload) }] })
	})

	it('asana_task_get treats since alone as with_stories', async () => {
		getTaskWithStoriesMock.mockResolvedValue({ gid: '1', name: 'Task', stories: [] })
		const server = createServer()
		registerTaskTools(server as any)

		await server.handlers.get('asana_task_get')?.({ task_gid: '1', since: '2026-01-01T00:00:00Z' })

		expect(getTaskWithStoriesMock).toHaveBeenCalledWith('1', { since: '2026-01-01T00:00:00Z' })
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
			getTaskWithStories: vi.fn(),
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

	it('asana_task_search maps custom_field_filters to custom field filters', async () => {
		const searchTasks = vi.fn().mockResolvedValue([])
		const server = createServer()
		registerTaskTools(server as any, { searchTasks } as any)

		await server.handlers.get('asana_task_search')?.({
			workspace_gid: 'ws1',
			custom_field_filters: ['123.value=5', '456.is_set=false'],
		})

		expect(searchTasks.mock.calls[0]?.[1]?.customFields).toEqual([
			{ gid: '123', operator: 'value', value: '5' },
			{ gid: '456', operator: 'is_set', value: 'false' },
		])
	})

	it('asana_task_search fetch_all pages past 100 and returns data with truncation', async () => {
		const full = Array.from({ length: 100 }, (_, i) => ({
			gid: String(i),
			created_at: `2026-01-${String(i + 1).padStart(3, '0')}`,
		}))
		const searchTasks = vi
			.fn()
			.mockResolvedValueOnce(full)
			.mockResolvedValueOnce([{ gid: 'x', created_at: '2026-02' }])
		const server = createServer()
		registerTaskTools(server as any, { searchTasks } as any)

		const result = await server.handlers.get('asana_task_search')?.({ workspace_gid: 'ws1', fetch_all: true })

		const body = JSON.parse(result.content[0].text)
		expect(body.data).toHaveLength(101)
		expect(body.truncated).toBe(false)
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

		const previousHome = process.env.HOME

		async function useConfig(config: unknown) {
			dir = await mkdtemp(join(tmpdir(), 'cyber-asana-mcp-project-'))
			await mkdir(join(dir, '.git'))
			vi.spyOn(process, 'cwd').mockReturnValue(dir)
			process.env.HOME = join(dir, 'home')
			const path = join(dir, 'config.json')
			await writeFile(path, JSON.stringify(config))
			process.env.CYBER_ASANA_CONFIG = path
		}

		/** Task conventions come from the task-conventions reference, so set them in a repo copy of it. */
		async function useConventions(conventions: Record<string, unknown>) {
			const path = join(dir as string, '.agents', 'references', 'cyber-asana.task-conventions.md')
			await mkdir(dirname(path), { recursive: true })
			await writeFile(path, `---\n${stringify(conventions)}---\n`)
		}

		afterEach(async () => {
			vi.mocked(process.cwd).mockRestore()
			if (previousHome === undefined) delete process.env.HOME
			else process.env.HOME = previousHome
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

			await server.handlers.get('asana_task_create')?.({ workspace_gid: 'ws1', name: 'Task', tag_gids: ['900'] })

			expect(createTaskMock).toHaveBeenCalledWith('ws1', 'Task', { tags: ['900'] })
		})

		it('resolves a tag name against the workspace', async () => {
			await useConfig({ schema_version: 2, projects: [] })
			await useConventions({ default_tags: ['High Important'] })
			createTaskMock.mockResolvedValue({ gid: '1', name: 'Task' })
			listTagsMock.mockResolvedValue({ data: [{ gid: '900', name: 'High Important' }], next_page: null })
			const server = createServer()
			registerTaskTools(server as any)

			await server.handlers.get('asana_task_create')?.({ workspace_gid: 'ws1', name: 'Task' })

			expect(createTaskMock).toHaveBeenCalledWith('ws1', 'Task', { tags: ['900'] })
		})

		it('applies conventions.default_tags and description_template', async () => {
			await useConfig({ schema_version: 2, projects: [] })
			await useConventions({ default_tags: ['900'], description_template: '## Problem' })
			createTaskMock.mockResolvedValue({ gid: '1', name: 'Task' })
			const server = createServer()
			registerTaskTools(server as any)

			await server.handlers.get('asana_task_create')?.({ workspace_gid: 'ws1', name: 'Task' })

			expect(createTaskMock).toHaveBeenCalledWith('ws1', 'Task', { notes: '## Problem', tags: ['900'] })
		})

		it('leaves conventions out when the call gives its own notes and tags', async () => {
			await useConfig({ schema_version: 2, projects: [] })
			await useConventions({ default_tags: ['900'], description_template: '## Problem' })
			createTaskMock.mockResolvedValue({ gid: '1', name: 'Task' })
			const server = createServer()
			registerTaskTools(server as any)

			await server.handlers.get('asana_task_create')?.({
				workspace_gid: 'ws1',
				name: 'Task',
				notes: 'Mine',
				tag_gids: ['909'],
			})

			expect(createTaskMock).toHaveBeenCalledWith('ws1', 'Task', { notes: 'Mine', tags: ['909'] })
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

		describe('defaults.section', () => {
			const sectionConfig = {
				schema_version: 2,
				projects: [
					{ gid: '111', name: 'Frontend', aliases: [] },
					{ gid: '999', name: 'Backend', aliases: [], default: true },
				],
				defaults: { section: '800' },
			}

			it('creates a task in the default project straight into defaults.section', async () => {
				await useConfig(sectionConfig)
				createTaskMock.mockResolvedValue({ gid: '1', name: 'Task' })
				const server = createServer()
				registerTaskTools(server as any)

				await server.handlers.get('asana_task_create')?.({ workspace_gid: 'ws1', name: 'Task' })

				expect(createTaskMock).toHaveBeenCalledWith('ws1', 'Task', {
					memberships: [{ project: '999', section: '800' }],
				})
			})

			it('leaves a task in another project out of defaults.section', async () => {
				await useConfig(sectionConfig)
				createTaskMock.mockResolvedValue({ gid: '1', name: 'Task' })
				const server = createServer()
				registerTaskTools(server as any)

				await server.handlers.get('asana_task_create')?.({ workspace_gid: 'ws1', name: 'Task', project_gid: '111' })

				expect(createTaskMock).toHaveBeenCalledWith('ws1', 'Task', { projects: ['111'] })
			})

			it('skips defaults.section when default_section is false', async () => {
				await useConfig(sectionConfig)
				createTaskMock.mockResolvedValue({ gid: '1', name: 'Task' })
				const server = createServer()
				registerTaskTools(server as any)

				await server.handlers.get('asana_task_create')?.({ workspace_gid: 'ws1', name: 'Task', default_section: false })

				expect(createTaskMock).toHaveBeenCalledWith('ws1', 'Task', { projects: ['999'] })
			})
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

describe('tasks/mcp asana_task_list', () => {
	it('forwards custom_type to listTasks', async () => {
		const listTasks = vi.fn().mockResolvedValue({ data: [] })
		const server = createServer()
		registerTaskTools(server as any, { listTasks } as never)

		await server.handlers.get('asana_task_list')?.({ project_gid: 'p1', custom_type: 'ct1' })

		expect(listTasks).toHaveBeenCalledWith('p1', expect.objectContaining({ customType: 'ct1' }))
	})
})

describe.each([
	{ tool: 'asana_task_list', method: 'listTasks', params: { project_gid: 'p1' }, gid: 'p1' },
	{ tool: 'asana_task_my_tasks', method: 'getMyTasks', params: { workspace_gid: 'ws1' }, gid: 'ws1' },
])('tasks/mcp $tool completion filters', ({ tool, method, params, gid }) => {
	async function call(extra: Record<string, unknown>) {
		const list = vi.fn().mockResolvedValue({ data: [] })
		const server = createServer()
		registerTaskTools(server as any, { [method]: list } as never)
		await server.handlers.get(tool)?.({ ...params, ...extra })
		return list
	}

	it('completed_since asks for tasks completed on or after the date only', async () => {
		const list = await call({ completed_since: '2026-11-10' })

		expect(list).toHaveBeenCalledWith(gid, expect.objectContaining({ completedSince: '2026-11-10' }))
		expect(list.mock.calls[0][1]).not.toHaveProperty('incompleteOrCompletedSince')
	})

	it('incomplete asks for incomplete tasks only', async () => {
		const list = await call({ incomplete: true })

		expect(list).toHaveBeenCalledWith(gid, expect.objectContaining({ incompleteOrCompletedSince: 'now' }))
	})

	it('incomplete_or_completed_since passes Asana’s own completed_since through', async () => {
		const list = await call({ incomplete_or_completed_since: '2026-11-10' })

		expect(list).toHaveBeenCalledWith(gid, expect.objectContaining({ incompleteOrCompletedSince: '2026-11-10' }))
		expect(list.mock.calls[0][1]).not.toHaveProperty('completedSince')
	})
})
