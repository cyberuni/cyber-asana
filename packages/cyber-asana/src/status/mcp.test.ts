import { afterEach, describe, expect, it, vi } from 'vitest'

const listStatusesMock = vi.fn()
const createStatusMock = vi.fn()

vi.mock('./api.js', async () => {
	const actual = await vi.importActual<typeof import('./api.js')>('./api.js')
	return {
		...actual,
		listStatuses: listStatusesMock,
		createStatus: createStatusMock,
	}
})

const { registerStatusTools } = await import('./mcp.js')

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

describe('status/mcp', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	it('asana_status_list forwards parent gid and pagination options', async () => {
		listStatusesMock.mockResolvedValue({ data: [{ gid: 'st1' }], next_page: null, limit: 100 })
		const server = createServer()
		registerStatusTools(server as any)

		await server.handlers.get('asana_status_list')?.({ parent_gid: 'proj1', limit: 25 })

		expect(listStatusesMock).toHaveBeenCalledWith('proj1', { limit: 25 })
	})

	it('asana_status_create forwards parent gid and fields', async () => {
		createStatusMock.mockResolvedValue({ gid: 'st1', status_type: 'on_track' })
		const server = createServer()
		registerStatusTools(server as any)

		await server.handlers.get('asana_status_create')?.({
			parent_gid: 'proj1',
			status_type: 'on_track',
			text: 'All good',
		})

		expect(createStatusMock).toHaveBeenCalledWith('proj1', { status_type: 'on_track', text: 'All good' })
	})

	it('status tools can use injected dependencies', async () => {
		const injectedCreateStatus = vi.fn().mockResolvedValue({ gid: 'st1', status_type: 'on_track' })
		const server = createServer()
		registerStatusTools(server as any, {
			listStatuses: vi.fn(),
			getStatus: vi.fn(),
			createStatus: injectedCreateStatus,
			deleteStatus: vi.fn(),
		})

		await server.handlers.get('asana_status_create')?.({
			parent_gid: 'proj1',
			status_type: 'on_track',
			text: 'Hi',
		})

		expect(injectedCreateStatus).toHaveBeenCalledWith('proj1', { status_type: 'on_track', text: 'Hi' })
	})
})
