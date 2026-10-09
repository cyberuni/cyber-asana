import { createClient } from '../platform/client.js'
import type { PaginationOptions } from '../platform/pagination.js'
import type { ReadOptions } from '../platform/read-options.js'
import { createPortfolioApi } from './api.js'
import { createAsanaPortfolioGateway, type PortfolioListOptions } from './gateway.js'

function defaultPortfolioApi() {
	return createPortfolioApi(createAsanaPortfolioGateway(createClient()))
}

export async function listPortfolios(workspaceGid: string, opts?: PortfolioListOptions) {
	return defaultPortfolioApi().listPortfolios(workspaceGid, opts)
}

export async function listPortfolioItems(portfolioGid: string, opts?: PaginationOptions) {
	return defaultPortfolioApi().listPortfolioItems(portfolioGid, opts)
}

export async function getPortfolio(portfolioGid: string, opts?: ReadOptions) {
	return defaultPortfolioApi().getPortfolio(portfolioGid, opts)
}

export async function createPortfolio(workspaceGid: string, name: string) {
	return defaultPortfolioApi().createPortfolio(workspaceGid, name)
}

export async function updatePortfolio(portfolioGid: string, fields: { name?: string }) {
	return defaultPortfolioApi().updatePortfolio(portfolioGid, fields)
}

export async function deletePortfolio(portfolioGid: string) {
	return defaultPortfolioApi().deletePortfolio(portfolioGid)
}
