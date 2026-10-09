import { afterEach, describe, expect, it, vi } from 'vitest'

const createPortfolioMock = vi.fn()
const updatePortfolioMock = vi.fn()
const listPortfolioItemsMock = vi.fn()

vi.mock('./default.js', async () => {
	const actual = await vi.importActual<typeof import('./default.js')>('./default.js')
	return {
		...actual,
		createPortfolio: createPortfolioMock,
		updatePortfolio: updatePortfolioMock,
		listPortfolioItems: listPortfolioItemsMock,
	}
})

const { registerPortfolioTools } = await import('./mcp.js')

type ToolHandler = (params: any) => Promise<any>

function createServer() {
	const handlers = new Map<string, ToolHandler>()
	const schemas = new Map<string, Record<string, unknown>>()
	return {
		handlers,
		schemas,
		tool(name: string, _description: string, schema: Record<string, unknown>, handler: ToolHandler) {
			handlers.set(name, handler)
			schemas.set(name, schema)
		},
	}
}

describe('portfolios/mcp', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	it('asana_portfolio_create forwards workspace gid and name', async () => {
		createPortfolioMock.mockResolvedValue({ gid: 'pf1', name: 'Roadmap' })
		const server = createServer()
		registerPortfolioTools(server as any)

		await server.handlers.get('asana_portfolio_create')?.({
			workspace_gid: 'ws1',
			name: 'Roadmap',
		})

		expect(createPortfolioMock).toHaveBeenCalledWith('ws1', 'Roadmap')
	})

	it('asana_portfolio_update forwards gid and fields', async () => {
		updatePortfolioMock.mockResolvedValue({ gid: 'pf1', name: 'Updated' })
		const server = createServer()
		registerPortfolioTools(server as any)

		await server.handlers.get('asana_portfolio_update')?.({
			portfolio_gid: 'pf1',
			name: 'Updated',
		})

		expect(updatePortfolioMock).toHaveBeenCalledWith('pf1', { name: 'Updated' })
	})

	it('asana_portfolio_item_list forwards portfolio gid and pagination options', async () => {
		listPortfolioItemsMock.mockResolvedValue({ data: [{ gid: 'proj1', name: 'Website' }], next_page: null, limit: 100 })
		const server = createServer()
		registerPortfolioTools(server as any)

		await server.handlers.get('asana_portfolio_item_list')?.({
			portfolio_gid: 'pf1',
			limit: 25,
		})

		expect(listPortfolioItemsMock).toHaveBeenCalledWith('pf1', { limit: 25 })
	})

	it('portfolio tools can use injected dependencies', async () => {
		const injectedCreatePortfolio = vi.fn().mockResolvedValue({ gid: 'pf1', name: 'Roadmap' })
		const server = createServer()
		registerPortfolioTools(server as any, {
			listPortfolios: vi.fn(),
			listPortfolioItems: vi.fn(),
			getPortfolio: vi.fn(),
			createPortfolio: injectedCreatePortfolio,
			updatePortfolio: vi.fn(),
			deletePortfolio: vi.fn(),
		})

		await server.handlers.get('asana_portfolio_create')?.({
			workspace_gid: 'ws1',
			name: 'Roadmap',
		})

		expect(injectedCreatePortfolio).toHaveBeenCalledWith('ws1', 'Roadmap')
	})

	it('asana_portfolio_list forwards owner_gid as an owner filter', async () => {
		const listPortfolios = vi.fn().mockResolvedValue([])
		const server = createServer()
		registerPortfolioTools(server as any, {
			listPortfolios,
			listPortfolioItems: vi.fn(),
			getPortfolio: vi.fn(),
			createPortfolio: vi.fn(),
			updatePortfolio: vi.fn(),
			deletePortfolio: vi.fn(),
		})

		await server.handlers.get('asana_portfolio_list')?.({ workspace_gid: 'ws1', owner_gid: 'u1' })

		expect(listPortfolios).toHaveBeenCalledWith('ws1', expect.objectContaining({ owner: 'u1' }))
	})

	it('asana_portfolio_list forwards custom_type', async () => {
		const listPortfolios = vi.fn().mockResolvedValue([])
		const server = createServer()
		registerPortfolioTools(server as any, {
			listPortfolios,
			listPortfolioItems: vi.fn(),
			getPortfolio: vi.fn(),
			createPortfolio: vi.fn(),
			updatePortfolio: vi.fn(),
			deletePortfolio: vi.fn(),
		})

		await server.handlers.get('asana_portfolio_list')?.({ workspace_gid: 'ws1', custom_type: 'ct1' })

		expect(listPortfolios).toHaveBeenCalledWith('ws1', expect.objectContaining({ customType: 'ct1' }))
	})

	it('asana_portfolio_list omits the owner filter when no owner_gid is given', async () => {
		const listPortfolios = vi.fn().mockResolvedValue([])
		const server = createServer()
		registerPortfolioTools(server as any, {
			listPortfolios,
			listPortfolioItems: vi.fn(),
			getPortfolio: vi.fn(),
			createPortfolio: vi.fn(),
			updatePortfolio: vi.fn(),
			deletePortfolio: vi.fn(),
		})

		await server.handlers.get('asana_portfolio_list')?.({ workspace_gid: 'ws1' })

		expect(listPortfolios.mock.calls[0]?.[1]).not.toHaveProperty('owner')
	})

	it('asana_portfolio_list declares owner_gid as an optional parameter', async () => {
		const server = createServer()
		registerPortfolioTools(server as any)

		expect(Object.keys(server.schemas.get('asana_portfolio_list') ?? {})).toContain('owner_gid')
	})

	it('asana_portfolio_delete answers with a structured acknowledgement', async () => {
		const server = createServer()
		registerPortfolioTools(server as any, {
			listPortfolios: vi.fn(),
			listPortfolioItems: vi.fn(),
			getPortfolio: vi.fn(),
			createPortfolio: vi.fn(),
			updatePortfolio: vi.fn(),
			deletePortfolio: vi.fn().mockResolvedValue(undefined),
		})

		const result = await server.handlers.get('asana_portfolio_delete')?.({ portfolio_gid: 'pf1' })

		expect(JSON.parse(result.content[0].text)).toEqual({
			deleted: true,
			resource: 'portfolio',
			gid: 'pf1',
			already_absent: false,
		})
	})

	it('asana_portfolio_delete treats an already-deleted portfolio as done', async () => {
		const server = createServer()
		registerPortfolioTools(server as any, {
			listPortfolios: vi.fn(),
			listPortfolioItems: vi.fn(),
			getPortfolio: vi.fn(),
			createPortfolio: vi.fn(),
			updatePortfolio: vi.fn(),
			deletePortfolio: vi.fn().mockRejectedValue({ response: { status: 404, body: { errors: [{ message: 'x' }] } } }),
		})

		const result = await server.handlers.get('asana_portfolio_delete')?.({ portfolio_gid: 'pf1' })

		expect(JSON.parse(result.content[0].text)).toMatchObject({ deleted: true, already_absent: true })
	})
})
