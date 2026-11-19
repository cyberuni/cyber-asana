import Asana from 'asana'
import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { portfolioCommand } from './cli.js'
import { createAsanaPortfolioGateway } from './gateway.js'
import { registerPortfolioTools } from './mcp.js'

// `opt_fields` on the write operations: the gateway sends it to the SDK, and the CLI flag and MCP field reach the api.

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

describe('portfolios write opt_fields', () => {
	afterEach(() => vi.restoreAllMocks())

	it('gateway create sends opt_fields to the SDK', async () => {
		const spy = vi
			.spyOn(Asana.PortfoliosApi.prototype, 'createPortfolio')
			.mockResolvedValue({ data: { gid: '1' } } as never)
		const gateway = createAsanaPortfolioGateway({} as Asana.ApiClient)

		await gateway.createPortfolio('ws1', 'Roadmap', { optFields: 'gid,name' })

		expect(spy).toHaveBeenCalledWith(...[{ data: { name: 'Roadmap', workspace: 'ws1' } }, { opt_fields: 'gid,name' }])
	})

	it('portfolios create --opt-fields reaches the api method', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const api = { createPortfolio: vi.fn().mockResolvedValue({ gid: '1' }) }

		await new Command()
			.addCommand(portfolioCommand(api as never))
			.parseAsync(
				['node', 'test', ...['portfolio', 'create', 'Roadmap', '--workspace-gid', 'ws1', '--opt-fields', 'gid,name']],
				{ from: 'node' },
			)

		expect(api.createPortfolio).toHaveBeenCalledWith(...['ws1', 'Roadmap', { optFields: 'gid,name' }, undefined])
	})

	it('asana_portfolio_create opt_fields reaches the api method', async () => {
		const api = { createPortfolio: vi.fn().mockResolvedValue({ gid: '1' }) }
		const server = createServer()
		registerPortfolioTools(server as never, api as never)

		await server.handlers.get('asana_portfolio_create')?.({
			workspace_gid: 'ws1',
			name: 'Roadmap',
			opt_fields: 'gid,name',
		})

		expect(api.createPortfolio).toHaveBeenCalledWith(...['ws1', 'Roadmap', { optFields: 'gid,name' }, undefined])
	})

	it('gateway update sends opt_fields to the SDK', async () => {
		const spy = vi
			.spyOn(Asana.PortfoliosApi.prototype, 'updatePortfolio')
			.mockResolvedValue({ data: { gid: '1' } } as never)
		const gateway = createAsanaPortfolioGateway({} as Asana.ApiClient)

		await gateway.updatePortfolio('pf1', { name: 'Renamed' }, { optFields: 'gid,name' })

		expect(spy).toHaveBeenCalledWith(...[{ data: { name: 'Renamed' } }, 'pf1', { opt_fields: 'gid,name' }])
	})

	it('portfolios update --opt-fields reaches the api method', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const api = { updatePortfolio: vi.fn().mockResolvedValue({ gid: '1' }) }

		await new Command()
			.addCommand(portfolioCommand(api as never))
			.parseAsync(
				['node', 'test', ...['portfolio', 'update', 'pf1', '--name', 'Renamed', '--opt-fields', 'gid,name']],
				{ from: 'node' },
			)

		expect(api.updatePortfolio).toHaveBeenCalledWith(...['pf1', { name: 'Renamed' }, { optFields: 'gid,name' }])
	})

	it('asana_portfolio_update opt_fields reaches the api method', async () => {
		const api = { updatePortfolio: vi.fn().mockResolvedValue({ gid: '1' }) }
		const server = createServer()
		registerPortfolioTools(server as never, api as never)

		await server.handlers.get('asana_portfolio_update')?.({
			portfolio_gid: 'pf1',
			name: 'Renamed',
			opt_fields: 'gid,name',
		})

		expect(api.updatePortfolio).toHaveBeenCalledWith(...['pf1', { name: 'Renamed' }, { optFields: 'gid,name' }])
	})
})
