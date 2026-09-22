import { afterEach, describe, expect, it, vi } from 'vitest'

const getJobMock = vi.fn()

vi.mock('./api.js', async () => {
	const actual = await vi.importActual<typeof import('./api.js')>('./api.js')
	return { ...actual, getJob: getJobMock }
})

const { registerJobTools } = await import('./mcp.js')

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

describe('jobs/mcp', () => {
	afterEach(() => vi.clearAllMocks())

	it('asana_job_get returns the job record', async () => {
		getJobMock.mockResolvedValue({ gid: 'job1', status: 'succeeded', new_project: { gid: 'proj1' } })
		const server = createServer()
		registerJobTools(server as any)

		const result = await server.handlers.get('asana_job_get')?.({ job_gid: 'job1' })

		expect(getJobMock).toHaveBeenCalledWith('job1', undefined)
		expect(JSON.parse(result.content[0].text)).toEqual({
			gid: 'job1',
			status: 'succeeded',
			new_project: { gid: 'proj1' },
		})
	})
})
