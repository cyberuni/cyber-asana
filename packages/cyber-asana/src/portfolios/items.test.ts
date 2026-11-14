import Asana from 'asana'
import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPortfolioApi } from './api.js'
import { portfolioCommand } from './cli.js'
import { createAsanaPortfolioGateway, type PortfolioGateway } from './gateway.js'
import { registerPortfolioTools } from './mcp.js'

function gatewayWith(items: Array<{ gid: string }>, overrides: Partial<PortfolioGateway> = {}) {
	return {
		listPortfolioItems: vi.fn().mockResolvedValue({ data: items, next_page: null, limit: 100 }),
		addPortfolioItem: vi.fn().mockResolvedValue(undefined),
		removePortfolioItem: vi.fn().mockResolvedValue(undefined),
		...overrides,
	} as unknown as PortfolioGateway
}

describe('portfolio items: gateway', () => {
	afterEach(() => vi.restoreAllMocks())

	it('addPortfolioItem posts the item with its placement to addItemForPortfolio', async () => {
		vi.spyOn(Asana.PortfoliosApi.prototype, 'addItemForPortfolio').mockResolvedValue({ data: {} } as never)
		await createAsanaPortfolioGateway({} as Asana.ApiClient).addPortfolioItem('pf1', 'p1', { insertBefore: 'p0' })
		expect(Asana.PortfoliosApi.prototype.addItemForPortfolio).toHaveBeenCalledWith(
			{ data: { item: 'p1', insert_before: 'p0' } },
			'pf1',
		)
	})

	it('removePortfolioItem posts the item to removeItemForPortfolio', async () => {
		vi.spyOn(Asana.PortfoliosApi.prototype, 'removeItemForPortfolio').mockResolvedValue({ data: {} } as never)
		await createAsanaPortfolioGateway({} as Asana.ApiClient).removePortfolioItem('pf1', 'p1')
		expect(Asana.PortfoliosApi.prototype.removeItemForPortfolio).toHaveBeenCalledWith({ data: { item: 'p1' } }, 'pf1')
	})
})

describe('portfolio items: api', () => {
	it('adds an item the portfolio lacks', async () => {
		const gateway = gatewayWith([{ gid: 'other' }])
		const result = await createPortfolioApi(gateway).addPortfolioItem('pf1', 'p1')
		expect(result).toEqual({ portfolio: 'pf1', item: 'p1', status: 'added' })
		expect(gateway.addPortfolioItem).toHaveBeenCalledWith('pf1', 'p1', undefined)
	})

	it('adding an item already there is a no-op', async () => {
		const gateway = gatewayWith([{ gid: 'p1' }])
		const result = await createPortfolioApi(gateway).addPortfolioItem('pf1', 'p1')
		expect(result.status).toBe('already_added')
		expect(gateway.addPortfolioItem).not.toHaveBeenCalled()
	})

	it('removes an item the portfolio holds', async () => {
		const gateway = gatewayWith([{ gid: 'p1' }])
		const result = await createPortfolioApi(gateway).removePortfolioItem('pf1', 'p1')
		expect(result).toEqual({ portfolio: 'pf1', item: 'p1', status: 'removed' })
		expect(gateway.removePortfolioItem).toHaveBeenCalledWith('pf1', 'p1')
	})

	it('removing an item that is not there is a no-op', async () => {
		const gateway = gatewayWith([])
		const result = await createPortfolioApi(gateway).removePortfolioItem('pf1', 'p1')
		expect(result.status).toBe('already_removed')
		expect(gateway.removePortfolioItem).not.toHaveBeenCalled()
	})
})

describe('portfolio items: cli and mcp', () => {
	afterEach(() => vi.restoreAllMocks())

	it('portfolio item add acknowledges through output() and hints the next step', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		const addPortfolioItem = vi.fn().mockResolvedValue({ portfolio: 'pf1', item: 'p1', status: 'added' })
		const program = new Command().addCommand(portfolioCommand({ addPortfolioItem } as never))
		await program.parseAsync(['node', 'test', 'portfolio', 'item', 'add', 'pf1', 'p1', '--insert-after', 'p0'], {
			from: 'node',
		})
		expect(addPortfolioItem).toHaveBeenCalledWith('pf1', 'p1', { insertAfter: 'p0' })
		const text = logSpy.mock.calls.map((c) => String(c[0])).join('\n')
		expect(text).toContain('Added p1 to portfolio pf1')
		expect(text).toContain('cyber-asana portfolio items pf1')
	})

	it('portfolio item remove says so when it was already absent', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		const removePortfolioItem = vi.fn().mockResolvedValue({ portfolio: 'pf1', item: 'p1', status: 'already_removed' })
		const program = new Command().addCommand(portfolioCommand({ removePortfolioItem } as never))
		await program.parseAsync(['node', 'test', 'portfolio', 'item', 'remove', 'pf1', 'p1'], { from: 'node' })
		expect(logSpy.mock.calls.map((c) => String(c[0])).join('\n')).toContain('was not in portfolio pf1')
	})

	it('asana_portfolio_item_add and _remove call the api', async () => {
		const handlers = new Map<string, (p: any) => Promise<any>>()
		const server = { tool: (n: string, _d: string, _s: unknown, h: any) => handlers.set(n, h) }
		const addPortfolioItem = vi.fn().mockResolvedValue({ status: 'added' })
		const removePortfolioItem = vi.fn().mockResolvedValue({ status: 'removed' })
		registerPortfolioTools(server as never, { addPortfolioItem, removePortfolioItem } as never)
		await handlers.get('asana_portfolio_item_add')?.({ portfolio_gid: 'pf1', item_gid: 'p1', insert_before: 'p0' })
		await handlers.get('asana_portfolio_item_remove')?.({ portfolio_gid: 'pf1', item_gid: 'p1' })
		expect(addPortfolioItem).toHaveBeenCalledWith('pf1', 'p1', { insertBefore: 'p0' })
		expect(removePortfolioItem).toHaveBeenCalledWith('pf1', 'p1')
	})
})
