import { defineListPaginationAcceptanceSpecs } from '../testing/list-pagination.acceptance.js'
import type { PortfolioApi } from './api.js'

export type PortfolioListPaginationAcceptanceDeps = {
	getApi: () => Pick<PortfolioApi, 'listPortfolios'>
	workspaceGid: string
	/** Asana requires an `owner` to list portfolios; "me" always resolves against the calling token. */
	owner?: string
	includeFetchAll?: boolean
}

export function definePortfolioListPaginationAcceptanceSpecs(deps: PortfolioListPaginationAcceptanceDeps) {
	return defineListPaginationAcceptanceSpecs({
		list: (opts) => deps.getApi().listPortfolios(deps.workspaceGid, { ...opts, owner: deps.owner }),
		includeFetchAll: deps.includeFetchAll,
	})
}
