import { describe } from 'vitest'
import { createPortfolioApi } from './api.js'
import type { PortfolioGateway } from './gateway.js'
import { definePortfolioItemsAcceptanceSpecs } from './items.acceptance.js'

/** A gateway double that keeps portfolios and their items in memory. */
function createPortfolioItemsGateway(): PortfolioGateway {
	const portfolios = new Map<string, string[]>()
	let next = 1
	const partial: Partial<PortfolioGateway> = {
		createPortfolio: async (_ws, name) => {
			const gid = `pf${next++}`
			portfolios.set(gid, [])
			return { gid, name } as never
		},
		deletePortfolio: async (gid) => {
			portfolios.delete(gid)
		},
		listPortfolioItems: async (gid) =>
			({ data: (portfolios.get(gid) ?? []).map((item) => ({ gid: item })), next_page: null, limit: 100 }) as never,
		addPortfolioItem: async (gid, item) => {
			portfolios.get(gid)?.push(item)
		},
		removePortfolioItem: async (gid, item) => {
			portfolios.set(
				gid,
				(portfolios.get(gid) ?? []).filter((i) => i !== item),
			)
		},
	}
	return partial as PortfolioGateway
}

describe(
	'portfolios item add and remove acceptance (gateway double)',
	definePortfolioItemsAcceptanceSpecs({
		getApi: () => createPortfolioApi(createPortfolioItemsGateway()),
		workspaceGid: 'ws1',
		projectGid: 'p1',
		uniqueName: () => 'Sprints',
	}),
)
