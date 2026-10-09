import { afterEach, describe, expect, it, vi } from 'vitest'

const listStatusesMock = vi.fn()
const createStatusMock = vi.fn()
const getStatusOverviewMock = vi.fn()

vi.mock('./default.js', async () => {
	const actual = await vi.importActual<typeof import('./default.js')>('./default.js')
	return {
		...actual,
		listStatuses: listStatusesMock,
		createStatus: createStatusMock,
		getStatusOverview: getStatusOverviewMock,
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

	it('asana_status_overview returns the roll-up for a parent gid', async () => {
		const overview = {
			parent: { gid: 'pf1', name: 'Q3 bets', resource_type: 'portfolio', status: null, counts: null },
			items: [],
			item_count: 0,
			item_limit: 25,
			truncated: false,
		}
		getStatusOverviewMock.mockResolvedValue(overview)
		const server = createServer()
		registerStatusTools(server as any)

		const result = await server.handlers.get('asana_status_overview')?.({ parent_gid: 'pf1' })

		expect(getStatusOverviewMock).toHaveBeenCalledWith('pf1', {})
		expect(result.content[0].text).toBe(JSON.stringify(overview))
	})

	it('asana_status_overview forwards the item cap and the parent type', async () => {
		getStatusOverviewMock.mockResolvedValue({})
		const server = createServer()
		registerStatusTools(server as any)

		await server.handlers.get('asana_status_overview')?.({ parent_gid: 'pf1', limit: 5, parent_type: 'portfolio' })

		expect(getStatusOverviewMock).toHaveBeenCalledWith('pf1', { limit: 5, parentType: 'portfolio' })
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
			getStatusOverview: vi.fn(),
		})

		await server.handlers.get('asana_status_create')?.({
			parent_gid: 'proj1',
			status_type: 'on_track',
			text: 'Hi',
		})

		expect(injectedCreateStatus).toHaveBeenCalledWith('proj1', { status_type: 'on_track', text: 'Hi' })
	})

	it('asana_status_list forwards created_since', async () => {
		const listStatuses = vi.fn().mockResolvedValue([])
		const server = createServer()
		registerStatusTools(server as any, {
			listStatuses,
			getStatus: vi.fn(),
			createStatus: vi.fn(),
			deleteStatus: vi.fn(),
			getStatusOverview: vi.fn(),
		})

		await server.handlers.get('asana_status_list')?.({
			parent_gid: 'proj1',
			created_since: '2026-01-01T00:00:00Z',
		})

		expect(listStatuses).toHaveBeenCalledWith(
			'proj1',
			expect.objectContaining({ createdSince: '2026-01-01T00:00:00Z' }),
		)
	})

	it('asana_status_list sends no createdSince when the parameter is omitted', async () => {
		const listStatuses = vi.fn().mockResolvedValue([])
		const server = createServer()
		registerStatusTools(server as any, {
			listStatuses,
			getStatus: vi.fn(),
			createStatus: vi.fn(),
			deleteStatus: vi.fn(),
			getStatusOverview: vi.fn(),
		})

		await server.handlers.get('asana_status_list')?.({ parent_gid: 'proj1' })

		expect(listStatuses.mock.calls[0][1]).not.toHaveProperty('createdSince')
	})
})
