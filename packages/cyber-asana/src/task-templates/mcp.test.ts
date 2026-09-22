import { afterEach, describe, expect, it, vi } from 'vitest'
import { registerTaskTemplateTools } from './mcp.js'

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

function taskTemplateApiStub() {
	return {
		listTaskTemplates: vi.fn(),
		getTaskTemplate: vi.fn(),
		instantiateTask: vi.fn(),
	}
}

function register(api: ReturnType<typeof taskTemplateApiStub>) {
	const server = createServer()
	registerTaskTemplateTools(server as any, api)
	return server
}

function payload(result: any) {
	return JSON.parse(result.content[0].text)
}

describe('task-templates/mcp', () => {
	afterEach(() => vi.clearAllMocks())

	it('registers the three task template tools', () => {
		const server = register(taskTemplateApiStub())

		expect([...server.handlers.keys()]).toEqual([
			'asana_task_template_list',
			'asana_task_template_get',
			'asana_task_template_instantiate',
		])
	})

	it('asana_task_template_list scopes to a project and forwards pagination', async () => {
		const api = taskTemplateApiStub()
		api.listTaskTemplates.mockResolvedValue({ data: [{ gid: 'tt1' }] })
		const server = register(api)

		const result = await server.handlers.get('asana_task_template_list')?.({ project_gid: 'p1', limit: 5 })

		expect(api.listTaskTemplates).toHaveBeenCalledWith('p1', expect.objectContaining({ limit: 5 }))
		expect(payload(result)).toEqual({ data: [{ gid: 'tt1' }] })
	})

	it('asana_task_template_get returns the template', async () => {
		const api = taskTemplateApiStub()
		api.getTaskTemplate.mockResolvedValue({ gid: 'tt1', name: 'Release checklist' })
		const server = register(api)

		const result = await server.handlers.get('asana_task_template_get')?.({ task_template_gid: 'tt1' })

		expect(api.getTaskTemplate).toHaveBeenCalledWith('tt1', undefined)
		expect(payload(result)).toEqual({ gid: 'tt1', name: 'Release checklist' })
	})

	it('asana_task_template_instantiate waits for the job by default', async () => {
		const api = taskTemplateApiStub()
		const job = { gid: 'j1', status: 'succeeded', new_task: { gid: 't1' } }
		api.instantiateTask.mockResolvedValue(job)
		const server = register(api)

		const result = await server.handlers.get('asana_task_template_instantiate')?.({
			task_template_gid: 'tt1',
			name: 'Release 1.2',
		})

		expect(api.instantiateTask).toHaveBeenCalledWith('tt1', { name: 'Release 1.2' }, expect.any(Object))
		expect(api.instantiateTask.mock.calls[0]![2].maxAttempts).toBeGreaterThan(0)
		expect(payload(result)).toEqual(job)
	})

	it('asana_task_template_instantiate honors wait: false', async () => {
		const api = taskTemplateApiStub()
		api.instantiateTask.mockResolvedValue({ gid: 'j1', status: 'in_progress' })
		const server = register(api)

		await server.handlers.get('asana_task_template_instantiate')?.({ task_template_gid: 'tt1', wait: false })

		expect(api.instantiateTask.mock.calls[0]![1]).toEqual({})
		expect(api.instantiateTask.mock.calls[0]![2].maxAttempts).toBe(0)
	})

	it('asana_task_template_instantiate bounds the wait with timeout_seconds', async () => {
		const api = taskTemplateApiStub()
		api.instantiateTask.mockResolvedValue({ gid: 'j1', status: 'succeeded' })
		const server = register(api)

		await server.handlers.get('asana_task_template_instantiate')?.({ task_template_gid: 'tt1', timeout_seconds: 4 })

		expect(api.instantiateTask.mock.calls[0]![2]).toEqual({ maxAttempts: 4, intervalMs: 1000 })
	})

	it('asana_task_template_instantiate returns a failed job as data', async () => {
		const api = taskTemplateApiStub()
		const job = { gid: 'j1', status: 'failed' }
		api.instantiateTask.mockResolvedValue(job)
		const server = register(api)

		const result = await server.handlers.get('asana_task_template_instantiate')?.({ task_template_gid: 'tt1' })

		expect(payload(result)).toEqual(job)
	})
})
