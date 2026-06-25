import { afterEach, describe, expect, it, vi } from 'vitest'

const createPortfolioMock = vi.fn()
const updatePortfolioMock = vi.fn()
const listPortfolioItemsMock = vi.fn()

vi.mock('./api.js', async () => {
	const actual = await vi.importActual<typeof import('./api.js')>('./api.js')
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
	return {
		handlers,
		tool(name: string, _description: string, _schema: unknown, handler: ToolHandler) {
			handlers.set(name, handler)
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
})
