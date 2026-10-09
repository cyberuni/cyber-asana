import type { PaginationOptions } from '../platform/pagination.js'
import type { ReadOptions } from '../platform/read-options.js'
import type { PortfolioGateway, PortfolioListOptions } from './gateway.js'

export type { PortfolioListOptions }

export type PortfolioApi = ReturnType<typeof createPortfolioApi>

export function createPortfolioApi(gateway: PortfolioGateway) {
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
	}
}
