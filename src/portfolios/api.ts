import { createClient } from '../client.js'
import type { PaginationOptions } from '../pagination.js'
import { createAsanaPortfolioGateway, type PortfolioGateway } from './gateway.js'

export type PortfolioApi = ReturnType<typeof createPortfolioApi>

export function createPortfolioApi(gateway: PortfolioGateway) {
	return {
		listPortfolios(workspaceGid: string, opts?: PaginationOptions & { owner?: string }) {
			return gateway.listPortfolios(workspaceGid, opts)
		},
		getPortfolio(portfolioGid: string) {
			return gateway.getPortfolio(portfolioGid)
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

function defaultPortfolioApi() {
	return createPortfolioApi(createAsanaPortfolioGateway(createClient()))
}

export async function listPortfolios(workspaceGid: string, opts?: PaginationOptions & { owner?: string }) {
	return defaultPortfolioApi().listPortfolios(workspaceGid, opts)
}

export async function getPortfolio(portfolioGid: string) {
	return defaultPortfolioApi().getPortfolio(portfolioGid)
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
