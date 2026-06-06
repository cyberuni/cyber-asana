import { defineListPaginationAcceptanceSpecs } from '../testing/list-pagination.acceptance.js'
import type { PortfolioApi } from './api.js'

export type PortfolioListPaginationAcceptanceDeps = {
	getApi: () => Pick<PortfolioApi, 'listPortfolios'>
	workspaceGid: string
	includeFetchAll?: boolean
}

export function definePortfolioListPaginationAcceptanceSpecs(deps: PortfolioListPaginationAcceptanceDeps) {
	return defineListPaginationAcceptanceSpecs({
		list: (opts) => deps.getApi().listPortfolios(deps.workspaceGid, opts),
		includeFetchAll: deps.includeFetchAll,
	})
}
