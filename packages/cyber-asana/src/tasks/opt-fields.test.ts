import Asana from 'asana'
import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { taskCommand } from './cli.js'
import { createAsanaTaskGateway } from './gateway.js'
import { registerTaskTools } from './mcp.js'

const FIELDS = { opt_fields: 'gid,name' }

describe('task writes: gateway sends opt_fields', () => {
	afterEach(() => vi.restoreAllMocks())
	const gateway = () => createAsanaTaskGateway({} as Asana.ApiClient)
	const opts = { optFields: 'gid,name' }

	it('createTask', async () => {
		const spy = vi.spyOn(Asana.TasksApi.prototype, 'createTask').mockResolvedValue({ data: { gid: '1' } } as never)
		await gateway().createTask('w1', 'T', undefined, opts)
		expect(spy).toHaveBeenCalledWith({ data: { name: 'T', workspace: 'w1' } }, FIELDS)
	})

	it('updateTask sends them to updateTask and to setParentForTask', async () => {
		const update = vi.spyOn(Asana.TasksApi.prototype, 'updateTask').mockResolvedValue({ data: { gid: '1' } } as never)
		const setParent = vi
			.spyOn(Asana.TasksApi.prototype, 'setParentForTask')
			.mockResolvedValue({ data: { gid: '1' } } as never)
		await gateway().updateTask('1', { name: 'N', parent: 'p1' }, opts)
		expect(update).toHaveBeenCalledWith({ data: { name: 'N' } }, '1', FIELDS)
		expect(setParent).toHaveBeenCalledWith({ data: { parent: 'p1' } }, '1', FIELDS)
	})

	it('duplicateTask', async () => {
		const spy = vi.spyOn(Asana.TasksApi.prototype, 'duplicateTask').mockResolvedValue({ data: { gid: 'j' } } as never)
		await gateway().duplicateTask('1', { name: 'C' }, opts)
		expect(spy).toHaveBeenCalledWith({ data: { name: 'C' } }, '1', FIELDS)
	})

	it('createSubtask', async () => {
		const spy = vi
			.spyOn(Asana.TasksApi.prototype, 'createSubtaskForTask')
			.mockResolvedValue({ data: { gid: '2' } } as never)
		await gateway().createSubtask('1', 'S', undefined, opts)
		expect(spy).toHaveBeenCalledWith({ data: { name: 'S' } }, '1', FIELDS)
	})
})

describe('task writes: CLI --opt-fields reaches the api', () => {
	vi.spyOn(console, 'log').mockImplementation(() => {})
	const run = async (argv: string[], method: string, result: unknown = { gid: '1' }) => {
		const fn = vi.fn().mockResolvedValue(result)
		const program = new Command().addCommand(taskCommand({ [method]: fn } as never))
		await program.parseAsync(['node', 'test', 'task', ...argv, '--opt-fields', 'a,b'], { from: 'node' })
		return fn
	}

	it('task create', async () => {
		const fn = await run(['create', 'N', '--workspace-gid', 'w1', '--no-default-section'], 'createTask')
		expect(fn.mock.calls[0][3]).toEqual({ optFields: 'a,b' })
	})
	it('task update', async () => {
		const fn = await run(['update', '1', '--name', 'N'], 'updateTask')
		expect(fn.mock.calls[0][2]).toEqual({ optFields: 'a,b' })
	})
	it('task reorder', async () => {
		const fn = await run(['reorder', '1', '--insert-after', 's'], 'reorderSubtask')
		expect(fn.mock.calls[0][2]).toEqual({ optFields: 'a,b' })
	})
	it('task duplicate', async () => {
		const fn = await run(['duplicate', '1', '--name', 'C'], 'duplicateTask', { gid: 'j' })
		expect(fn.mock.calls[0][2]).toEqual({ optFields: 'a,b' })
	})
	it('task subtask create', async () => {
		const fn = await run(['subtask', 'create', '1', 'S'], 'createSubtask')
		expect(fn.mock.calls[0][3]).toEqual({ optFields: 'a,b' })
	})
})

describe('task writes: MCP opt_fields reaches the api', () => {
	const call = async (tool: string, method: string, params: Record<string, unknown>) => {
		const handlers = new Map<string, (p: unknown) => Promise<unknown>>()
		const fn = vi.fn().mockResolvedValue({ gid: '1' })
		registerTaskTools(
			{ tool: (n: string, _d: string, _s: unknown, h: never) => handlers.set(n, h) } as never,
			{ [method]: fn } as never,
		)
		await handlers.get(tool)?.({ ...params, opt_fields: 'a,b' })
		return fn
	}

	it('asana_task_create', async () => {
		const fn = await call('asana_task_create', 'createTask', { workspace_gid: 'w1', name: 'N', default_section: false })
		expect(fn.mock.calls[0][3]).toEqual({ optFields: 'a,b' })
	})
	it('asana_task_update', async () => {
		const fn = await call('asana_task_update', 'updateTask', { task_gid: '1', name: 'N' })
		expect(fn.mock.calls[0][2]).toEqual({ optFields: 'a,b' })
	})
	it('asana_task_reorder', async () => {
		const fn = await call('asana_task_reorder', 'reorderSubtask', { task_gid: '1', insert_after: 's' })
		expect(fn.mock.calls[0][2]).toEqual({ optFields: 'a,b' })
	})
	it('asana_task_duplicate', async () => {
		const fn = await call('asana_task_duplicate', 'duplicateTask', { task_gid: '1', name: 'C' })
		expect(fn.mock.calls[0][2]).toEqual({ optFields: 'a,b' })
	})
	it('asana_task_subtask_create', async () => {
		const fn = await call('asana_task_subtask_create', 'createSubtask', { task_gid: '1', name: 'S' })
		expect(fn.mock.calls[0][3]).toEqual({ optFields: 'a,b' })
	})
})
