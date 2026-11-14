import type { PaginationOptions } from '../platform/pagination.js'
import { listItems } from '../platform/pagination.js'
import type { ReadOptions } from '../platform/read-options.js'
import type { PortfolioGateway, PortfolioItemPlacement, PortfolioListOptions } from './gateway.js'

export type { PortfolioItemPlacement, PortfolioListOptions }

export type PortfolioApi = ReturnType<typeof createPortfolioApi>

export function createPortfolioApi(gateway: PortfolioGateway) {
	async function holds(portfolioGid: string, itemGid: string): Promise<boolean> {
		const items = listItems(await gateway.listPortfolioItems(portfolioGid, { fetchAll: true, optFields: 'gid' }))
		return items.some((item) => item.gid === itemGid)
	}

	return {
		listPortfolios(workspaceGid: string, opts?: PortfolioListOptions) {
			return gateway.listPortfolios(workspaceGid, opts)
		},
		listPortfolioItems(portfolioGid: string, opts?: PaginationOptions) {
			return gateway.listPortfolioItems(portfolioGid, opts)
		},
		getPortfolio(portfolioGid: string, opts?: ReadOptions) {
			return gateway.getPortfolio(portfolioGid, opts)
		},
		createPortfolio(workspaceGid: string, name: string) {
			return gateway.createPortfolio(workspaceGid, name)
		},
		updatePortfolio(portfolioGid: string, fields: { name?: string }) {
			return gateway.updatePortfolio(portfolioGid, fields)
		},
		deletePortfolio(portfolioGid: string) {
			return gateway.deletePortfolio(portfolioGid)
		},
		/** Adding an item the portfolio already holds succeeds with `already_added` and writes nothing. */
		async addPortfolioItem(portfolioGid: string, itemGid: string, opts?: PortfolioItemPlacement) {
			if (await holds(portfolioGid, itemGid)) {
				return { portfolio: portfolioGid, item: itemGid, status: 'already_added' as const }
			}
			await gateway.addPortfolioItem(portfolioGid, itemGid, opts)
			return { portfolio: portfolioGid, item: itemGid, status: 'added' as const }
		},
		/** Removing an item the portfolio does not hold succeeds with `already_removed` and writes nothing. */
		async removePortfolioItem(portfolioGid: string, itemGid: string) {
			if (!(await holds(portfolioGid, itemGid))) {
				return { portfolio: portfolioGid, item: itemGid, status: 'already_removed' as const }
			}
			await gateway.removePortfolioItem(portfolioGid, itemGid)
			return { portfolio: portfolioGid, item: itemGid, status: 'removed' as const }
		},
	}
}
