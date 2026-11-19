import Asana from 'asana'
import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createTaskApi } from './api.js'
import { taskCommand } from './cli.js'
import { createAsanaTaskGateway, type TaskGateway } from './gateway.js'
import { registerTaskTools } from './mcp.js'

describe('task duplicate: gateway and api', () => {
	afterEach(() => vi.restoreAllMocks())

	it('posts the name and the comma-joined include list to duplicateTask and returns the job', async () => {
		vi.spyOn(Asana.TasksApi.prototype, 'duplicateTask').mockResolvedValue({ data: { gid: 'j1' } } as never)

		const job = await createAsanaTaskGateway({} as Asana.ApiClient).duplicateTask('t1', {
			name: 'Sprint 2 copy',
			include: ['notes', 'subtasks'],
		})

		expect(job).toEqual({ gid: 'j1' })
		expect(Asana.TasksApi.prototype.duplicateTask).toHaveBeenCalledWith(
			{ data: { name: 'Sprint 2 copy', include: 'notes,subtasks' } },
			't1',
			{},
		)
	})

	it('omits include when none is given', async () => {
		vi.spyOn(Asana.TasksApi.prototype, 'duplicateTask').mockResolvedValue({ data: { gid: 'j1' } } as never)

		await createAsanaTaskGateway({} as Asana.ApiClient).duplicateTask('t1', { name: 'Copy' })

		expect(Asana.TasksApi.prototype.duplicateTask).toHaveBeenCalledWith({ data: { name: 'Copy' } }, 't1', {})
	})

	it('the api forwards the gid and fields to the gateway', async () => {
		const duplicateTask = vi.fn().mockResolvedValue({ gid: 'j1', status: 'in_progress' })
		const api = createTaskApi({ duplicateTask } as unknown as TaskGateway)

		await expect(api.duplicateTask('t1', { name: 'Copy' })).resolves.toEqual({ gid: 'j1', status: 'in_progress' })
		expect(duplicateTask).toHaveBeenCalledWith('t1', { name: 'Copy' }, undefined)
	})
})

describe('task duplicate: cli and mcp', () => {
	afterEach(() => vi.restoreAllMocks())

	it('task duplicate returns the job and points at job get', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		const duplicateTask = vi.fn().mockResolvedValue({ gid: 'j1', status: 'in_progress' })
		const program = new Command().addCommand(taskCommand({ duplicateTask } as never))

		await program.parseAsync(
			['node', 'test', 'task', 'duplicate', 't1', '--name', 'Copy', '--include', 'notes,subtasks'],
			{ from: 'node' },
		)

		expect(duplicateTask).toHaveBeenCalledWith('t1', { name: 'Copy', include: ['notes', 'subtasks'] }, undefined)
		expect(logSpy.mock.calls.map((c) => String(c[0])).join('\n')).toContain('cyber-asana job get j1')
	})

	it('task duplicate requires --name', async () => {
		const program = new Command().exitOverride().addCommand(taskCommand({ duplicateTask: vi.fn() } as never))
		vi.spyOn(process.stderr, 'write').mockImplementation(() => true)

		await expect(program.parseAsync(['node', 'test', 'task', 'duplicate', 't1'], { from: 'node' })).rejects.toThrow()
	})

	it('asana_task_duplicate returns the job', async () => {
		const handlers = new Map<string, (p: any) => Promise<any>>()
		const server = { tool: (n: string, _d: string, _s: unknown, h: any) => handlers.set(n, h) }
		const duplicateTask = vi.fn().mockResolvedValue({ gid: 'j1', status: 'in_progress' })
		registerTaskTools(server as never, { duplicateTask } as never)

		const res = await handlers.get('asana_task_duplicate')?.({ task_gid: 't1', name: 'Copy', include: ['notes'] })

		expect(duplicateTask).toHaveBeenCalledWith('t1', { name: 'Copy', include: ['notes'] }, undefined)
		expect(JSON.parse(res.content[0].text)).toEqual({ gid: 'j1', status: 'in_progress' })
	})
})
