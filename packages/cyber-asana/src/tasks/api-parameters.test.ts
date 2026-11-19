import Asana from 'asana'
import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createTaskApi } from './api.js'
import { taskCommand } from './cli.js'
import { createAsanaTaskGateway } from './gateway.js'
import { registerTaskTools } from './mcp.js'
import { searchAllPages } from './search-paging.js'
import { buildTaskCreateFields, buildTaskUpdateFields } from './write-options.js'

const WRITE_FIELDS = {
	approval_status: 'approved',
	assignee_section: 'sec1',
	custom_type_status_option: 'opt1',
	html_custom_fields: { cf1: '<body>hi</body>' },
	liked: true,
	external: { gid: 'ext1', data: 'blob' },
} as const

describe('task write fields: write-options', () => {
	const input = {
		approvalStatus: 'approved',
		assigneeSection: 'sec1',
		customTypeStatusOption: 'opt1',
		htmlCustomFields: { cf1: '<body>hi</body>' },
		liked: true,
		externalGid: 'ext1',
		externalData: 'blob',
	}

	it('create maps every new field to Asana names', () => {
		expect(buildTaskCreateFields(input)).toEqual(WRITE_FIELDS)
	})

	it('update maps every new field to Asana names', () => {
		expect(buildTaskUpdateFields(input)).toEqual(WRITE_FIELDS)
	})

	it('liked false is kept', () => {
		expect(buildTaskUpdateFields({ liked: false })).toEqual({ liked: false })
	})

	it('external takes either half alone', () => {
		expect(buildTaskCreateFields({ externalGid: 'e' })).toEqual({ external: { gid: 'e' } })
		expect(buildTaskCreateFields({ externalData: 'd' })).toEqual({ external: { data: 'd' } })
	})

	it('merges html custom field json and entries, entries winning', () => {
		expect(
			buildTaskCreateFields({
				htmlCustomFieldsJson: '{"a":"<body>1</body>","b":"<body>2</body>"}',
				htmlCustomFieldEntries: ['b=<body>3</body>'],
			}),
		).toEqual({ html_custom_fields: { a: '<body>1</body>', b: '<body>3</body>' } })
	})

	it('rejects html custom field json that is not an object of strings', () => {
		expect(() => buildTaskCreateFields({ htmlCustomFieldsJson: '[1]' })).toThrow('must be an object')
		expect(() => buildTaskCreateFields({ htmlCustomFieldsJson: '{"a":1}' })).toThrow('must be a string')
		expect(() => buildTaskCreateFields({ htmlCustomFieldEntries: ['nope'] })).toThrow('invalid html custom field entry')
	})

	it('rejects an approval status Asana does not know, on create and update', () => {
		expect(() => buildTaskCreateFields({ approvalStatus: 'maybe' })).toThrow(
			'approval status must be one of: pending, approved, rejected, changes_requested',
		)
		expect(() => buildTaskUpdateFields({ approvalStatus: 'maybe' })).toThrow('approval status must be one of')
	})
})

describe('task write fields: gateway sends Asana names', () => {
	afterEach(() => vi.restoreAllMocks())
	const gateway = () => createAsanaTaskGateway({} as Asana.ApiClient)

	it('createTask', async () => {
		const spy = vi.spyOn(Asana.TasksApi.prototype, 'createTask').mockResolvedValue({ data: { gid: '1' } } as never)
		await gateway().createTask('w1', 'T', WRITE_FIELDS as never)
		expect(spy).toHaveBeenCalledWith({ data: { name: 'T', workspace: 'w1', ...WRITE_FIELDS } }, {})
	})

	it('updateTask', async () => {
		const spy = vi.spyOn(Asana.TasksApi.prototype, 'updateTask').mockResolvedValue({ data: { gid: '1' } } as never)
		await gateway().updateTask('1', WRITE_FIELDS as never)
		expect(spy).toHaveBeenCalledWith({ data: WRITE_FIELDS }, '1', {})
	})

	it('createSubtask', async () => {
		const spy = vi
			.spyOn(Asana.TasksApi.prototype, 'createSubtaskForTask')
			.mockResolvedValue({ data: { gid: '2' } } as never)
		await gateway().createSubtask('1', 'S', {
			...WRITE_FIELDS,
			custom_type: 'ct',
			projects: ['p'],
			tags: ['t'],
		} as never)
		expect(spy).toHaveBeenCalledWith(
			{ data: { name: 'S', ...WRITE_FIELDS, custom_type: 'ct', projects: ['p'], tags: ['t'] } },
			'1',
			{},
		)
	})
})

const CLI_WRITE_FLAGS = [
	'--approval-status',
	'approved',
	'--assignee-section',
	'sec1',
	'--custom-type-status-option',
	'opt1',
	'--html-custom-fields-json',
	'{"cf1":"<body>a</body>"}',
	'--html-custom-field',
	'cf2=<body>b</body>',
	'--liked',
	'--external-gid',
	'ext1',
	'--external-data',
	'blob',
]
const CLI_WRITE_EXPECTED = {
	approval_status: 'approved',
	assignee_section: 'sec1',
	custom_type_status_option: 'opt1',
	html_custom_fields: { cf1: '<body>a</body>', cf2: '<body>b</body>' },
	liked: true,
	external: { gid: 'ext1', data: 'blob' },
}

describe('task write fields: CLI', () => {
	vi.spyOn(console, 'log').mockImplementation(() => {})
	const run = async (argv: string[], method: string, result: unknown = { gid: '1' }) => {
		const fn = vi.fn().mockResolvedValue(result)
		const program = new Command().addCommand(taskCommand({ [method]: fn } as never))
		program.exitOverride()
		await program.parseAsync(['node', 'test', 'task', ...argv], { from: 'node' })
		return fn
	}

	it('task create', async () => {
		const fn = await run(
			['create', 'N', '--workspace-gid', 'w1', '--no-default-section', ...CLI_WRITE_FLAGS],
			'createTask',
		)
		expect(fn.mock.calls[0][2]).toEqual(CLI_WRITE_EXPECTED)
	})

	it('task update', async () => {
		const fn = await run(['update', '1', ...CLI_WRITE_FLAGS], 'updateTask')
		expect(fn.mock.calls[0][1]).toEqual(CLI_WRITE_EXPECTED)
	})

	it('task update --no-liked sends liked false', async () => {
		const fn = await run(['update', '1', '--no-liked'], 'updateTask')
		expect(fn.mock.calls[0][1]).toEqual({ liked: false })
	})

	it('task subtask create takes the write fields plus custom type, projects and tags', async () => {
		const fn = await run(
			[
				'subtask',
				'create',
				'1',
				'S',
				'--custom-type',
				'ct',
				'--project-gid',
				'p1,p2',
				'--tag',
				't1,t2',
				...CLI_WRITE_FLAGS,
			],
			'createSubtask',
		)
		expect(fn.mock.calls[0][2]).toEqual({
			...CLI_WRITE_EXPECTED,
			custom_type: 'ct',
			projects: ['p1', 'p2'],
			tags: ['t1', 't2'],
		})
	})

	it('task subtask create sends no project when none is given', async () => {
		const fn = await run(['subtask', 'create', '1', 'S'], 'createSubtask')
		expect(fn.mock.calls[0][2]).toEqual({})
	})

	it('rejects an unknown approval status before any request', async () => {
		await expect(run(['update', '1', '--approval-status', 'maybe'], 'updateTask')).rejects.toThrow()
	})
})

describe('task write fields: MCP', () => {
	const call = async (tool: string, method: string, params: Record<string, unknown>) => {
		const handlers = new Map<string, (p: unknown) => Promise<unknown>>()
		const fn = vi.fn().mockResolvedValue({ gid: '1' })
		registerTaskTools(
			{ tool: (n: string, _d: string, _s: unknown, h: never) => handlers.set(n, h) } as never,
			{ [method]: fn } as never,
		)
		await handlers.get(tool)?.(params)
		return fn
	}
	const mcpWrite = {
		approval_status: 'approved',
		assignee_section: 'sec1',
		custom_type_status_option: 'opt1',
		html_custom_fields: { cf1: '<body>hi</body>' },
		liked: true,
		external: { gid: 'ext1', data: 'blob' },
	}

	it('asana_task_create', async () => {
		const fn = await call('asana_task_create', 'createTask', {
			workspace_gid: 'w1',
			name: 'N',
			default_section: false,
			...mcpWrite,
		})
		expect(fn.mock.calls[0][2]).toEqual(WRITE_FIELDS)
	})

	it('asana_task_update', async () => {
		const fn = await call('asana_task_update', 'updateTask', { task_gid: '1', ...mcpWrite })
		expect(fn.mock.calls[0][1]).toEqual(WRITE_FIELDS)
	})

	it('asana_task_subtask_create', async () => {
		const fn = await call('asana_task_subtask_create', 'createSubtask', {
			task_gid: '1',
			name: 'S',
			custom_type: 'ct',
			project_gids: ['p1'],
			tag_gids: ['t1'],
			...mcpWrite,
		})
		expect(fn.mock.calls[0][2]).toEqual({ ...WRITE_FIELDS, custom_type: 'ct', projects: ['p1'], tags: ['t1'] })
	})

	it('declares approval_status as an enum', async () => {
		const shapes = new Map<string, Record<string, { safeParse: (v: unknown) => { success: boolean } }>>()
		registerTaskTools({ tool: (n: string, _d: string, s: never) => shapes.set(n, s) } as never, {} as never)
		for (const tool of ['asana_task_create', 'asana_task_update', 'asana_task_subtask_create']) {
			const field = shapes.get(tool)?.approval_status
			expect(field?.safeParse('approved').success).toBe(true)
			expect(field?.safeParse('maybe').success).toBe(false)
		}
	})
})

describe('task dependency lists: limit and offset', () => {
	afterEach(() => vi.restoreAllMocks())

	it('gateway sends limit, offset and opt_fields and reports the page', async () => {
		const spy = vi.spyOn(Asana.TasksApi.prototype, 'getDependenciesForTask').mockResolvedValue({
			data: [{ gid: '1' }],
			_response: { next_page: { offset: 'n' } },
		} as never)
		const result = await createAsanaTaskGateway({} as Asana.ApiClient).getDependencies('t', {
			limit: 5,
			offset: 'o',
			optFields: 'gid',
		})
		expect(spy).toHaveBeenCalledWith('t', { limit: 5, offset: 'o', opt_fields: 'gid' })
		expect(result).toEqual({ data: [{ gid: '1' }], next_page: { offset: 'n' }, limit: 5 })
	})

	it('gateway keeps the default opt_fields and returns a plain array when no paging is asked for', async () => {
		const spy = vi
			.spyOn(Asana.TasksApi.prototype, 'getDependentsForTask')
			.mockResolvedValue({ data: [{ gid: '1' }] } as never)
		const result = await createAsanaTaskGateway({} as Asana.ApiClient).getDependents('t', {})
		expect(spy).toHaveBeenCalledWith('t', { opt_fields: 'gid,name,completed,due_on' })
		expect(result).toEqual([{ gid: '1' }])
	})

	it('CLI passes --limit and --offset', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		for (const [sub, method] of [
			['dependency', 'getDependencies'],
			['dependent', 'getDependents'],
		]) {
			const fn = vi.fn().mockResolvedValue([])
			const program = new Command().addCommand(taskCommand({ [method]: fn } as never))
			await program.parseAsync(['node', 'test', 'task', sub, 'list', 't1', '--limit', '5', '--offset', 'o'], {
				from: 'node',
			})
			expect(fn).toHaveBeenCalledWith('t1', expect.objectContaining({ limit: 5, offset: 'o' }))
		}
	})

	it('MCP passes limit and offset', async () => {
		for (const [tool, method] of [
			['asana_task_dependency_list', 'getDependencies'],
			['asana_task_dependent_list', 'getDependents'],
		]) {
			const handlers = new Map<string, (p: unknown) => Promise<unknown>>()
			const fn = vi.fn().mockResolvedValue([])
			registerTaskTools(
				{ tool: (n: string, _d: string, _s: unknown, h: never) => handlers.set(n, h) } as never,
				{ [method]: fn } as never,
			)
			await handlers.get(tool)?.({ task_gid: 't1', limit: 5, offset: 'o' })
			expect(fn).toHaveBeenCalledWith('t1', expect.objectContaining({ limit: 5, offset: 'o' }))
		}
	})
})

describe('task list: section, modified_since, assignee and workspace', () => {
	afterEach(() => vi.restoreAllMocks())
	const gateway = () => createAsanaTaskGateway({} as Asana.ApiClient)

	it('gateway reaches getTasks with a section', async () => {
		const spy = vi.spyOn(Asana.TasksApi.prototype, 'getTasks').mockResolvedValue({ data: [] } as never)
		await gateway().listTasks(undefined, { section: 's1', limit: 10 } as never)
		expect(spy).toHaveBeenCalledWith({ section: 's1', limit: 10 })
	})

	it('gateway reaches getTasks with assignee, workspace and modified_since', async () => {
		const spy = vi.spyOn(Asana.TasksApi.prototype, 'getTasks').mockResolvedValue({ data: [] } as never)
		await gateway().listTasks(undefined, {
			assignee: 'me',
			workspace: 'w1',
			modifiedSince: '2026-01-01T00:00:00Z',
		} as never)
		expect(spy).toHaveBeenCalledWith({
			assignee: 'me',
			workspace: 'w1',
			modified_since: '2026-01-01T00:00:00Z',
			limit: 100,
		})
	})

	it('gateway sends modified_since with a project through getTasks', async () => {
		const spy = vi.spyOn(Asana.TasksApi.prototype, 'getTasks').mockResolvedValue({ data: [] } as never)
		await gateway().listTasks('p1', { modifiedSince: '2026-01-01T00:00:00Z' } as never)
		expect(spy).toHaveBeenCalledWith({ project: 'p1', modified_since: '2026-01-01T00:00:00Z', limit: 100 })
	})

	it('gateway keeps the project-only path on getTasksForProject', async () => {
		const spy = vi.spyOn(Asana.TasksApi.prototype, 'getTasksForProject').mockResolvedValue({ data: [] } as never)
		await gateway().listTasks('p1', {})
		expect(spy).toHaveBeenCalledWith('p1', { limit: 100 })
	})

	describe('local validation, before any request', () => {
		const listTasks = vi.fn().mockResolvedValue([])
		const api = () => createTaskApi({ listTasks } as never)

		it('needs one of project, section, or assignee with workspace', async () => {
			await expect(api().listTasks(undefined, {})).rejects.toThrow(
				'give one of --project, --section, or --assignee with --workspace',
			)
			await expect(api().listTasks(undefined, { modifiedSince: '2026-01-01' })).rejects.toThrow('give one of')
		})

		it('takes assignee and workspace together', async () => {
			await expect(api().listTasks(undefined, { assignee: 'me' })).rejects.toThrow(
				'--assignee and --workspace must be given together',
			)
			await expect(api().listTasks('p1', { workspace: 'w1' })).rejects.toThrow(
				'--assignee and --workspace must be given together',
			)
		})

		it('takes only one filter', async () => {
			await expect(api().listTasks('p1', { section: 's1' })).rejects.toThrow('use only one of')
			await expect(api().listTasks(undefined, { section: 's1', assignee: 'me', workspace: 'w' })).rejects.toThrow(
				'use only one of',
			)
		})

		it('needs a parseable modified_since', async () => {
			await expect(api().listTasks('p1', { modifiedSince: 'yesterday' })).rejects.toThrow('--modified-since must be')
		})

		it('lets a valid filter through', async () => {
			await api().listTasks(undefined, { section: 's1', modifiedSince: '2026-01-01T00:00:00Z' })
			expect(listTasks).toHaveBeenCalledWith(undefined, { section: 's1', modifiedSince: '2026-01-01T00:00:00Z' })
		})
	})

	it('CLI passes --section, --modified-since, --assignee and --workspace-gid', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const fn = vi.fn().mockResolvedValue([])
		const program = new Command().addCommand(taskCommand({ listTasks: fn } as never))
		await program.parseAsync(
			[
				'node',
				'test',
				'task',
				'list',
				'--assignee-gid',
				'u1',
				'--workspace-gid',
				'w1',
				'--modified-since',
				'2026-01-01',
			],
			{ from: 'node' },
		)
		expect(fn).toHaveBeenCalledWith(
			undefined,
			expect.objectContaining({ assignee: 'u1', workspace: 'w1', modifiedSince: '2026-01-01' }),
		)
		await program.parseAsync(['node', 'test', 'task', 'list', '--section-gid', 's1'], { from: 'node' })
		expect(fn).toHaveBeenLastCalledWith(undefined, expect.objectContaining({ section: 's1' }))
		expect(fn.mock.calls[1][1]).not.toHaveProperty('workspace')
	})

	it('MCP passes section_gid, modified_since, assignee and workspace_gid', async () => {
		const handlers = new Map<string, (p: unknown) => Promise<unknown>>()
		const fn = vi.fn().mockResolvedValue([])
		registerTaskTools(
			{ tool: (n: string, _d: string, _s: unknown, h: never) => handlers.set(n, h) } as never,
			{ listTasks: fn } as never,
		)
		await handlers.get('asana_task_list')?.({
			assignee_gid: 'u1',
			workspace_gid: 'w1',
			modified_since: '2026-01-01',
		})
		expect(fn).toHaveBeenCalledWith(
			undefined,
			expect.objectContaining({ assignee: 'u1', workspace: 'w1', modifiedSince: '2026-01-01' }),
		)
		await handlers.get('asana_task_list')?.({ section_gid: 's1' })
		expect(fn).toHaveBeenLastCalledWith(undefined, expect.objectContaining({ section: 's1' }))
	})
})

describe('task search: limit', () => {
	afterEach(() => vi.restoreAllMocks())

	it('gateway sends limit', async () => {
		const spy = vi.spyOn(Asana.TasksApi.prototype, 'searchTasksForWorkspace').mockResolvedValue({ data: [] } as never)
		await createAsanaTaskGateway({} as Asana.ApiClient).searchTasks('w1', { limit: 7 })
		expect(spy).toHaveBeenCalledWith('w1', expect.objectContaining({ limit: 7 }))
	})

	it('CLI passes --limit', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const fn = vi.fn().mockResolvedValue([])
		const program = new Command().addCommand(taskCommand({ searchTasks: fn } as never))
		await program.parseAsync(['node', 'test', 'task', 'search', '--workspace-gid', 'w1', '--limit', '7'], {
			from: 'node',
		})
		expect(fn.mock.calls[0][1]).toMatchObject({ limit: 7 })
	})

	it('MCP passes limit', async () => {
		const handlers = new Map<string, (p: unknown) => Promise<unknown>>()
		const fn = vi.fn().mockResolvedValue([])
		registerTaskTools(
			{ tool: (n: string, _d: string, _s: unknown, h: never) => handlers.set(n, h) } as never,
			{ searchTasks: fn } as never,
		)
		await handlers.get('asana_task_search')?.({ workspace_gid: 'w1', limit: 7 })
		expect(fn.mock.calls[0][1]).toMatchObject({ limit: 7 })
	})

	it('--all treats a page shorter than limit as the last page', async () => {
		const search = vi.fn().mockResolvedValue([{ gid: '1', created_at: 'a' }])
		const result = await searchAllPages(search, 'w', { limit: 2 })
		expect(result.truncated).toBe(false)
		expect(search).toHaveBeenCalledTimes(1)
	})

	it('--all keeps walking when a page is full at a smaller limit', async () => {
		const search = vi
			.fn()
			.mockResolvedValueOnce([
				{ gid: '1', created_at: 'a' },
				{ gid: '2', created_at: 'b' },
			])
			.mockResolvedValueOnce([{ gid: '3', created_at: 'c' }])
		const result = await searchAllPages(search, 'w', { limit: 2 })
		expect(result.data.map((t) => t.gid)).toEqual(['1', '2', '3'])
		expect(search.mock.calls[1][1]).toMatchObject({ createdAtAfter: 'b', limit: 2 })
	})
})
