import Asana from 'asana'
import {
	collectListResponse,
	type ListResult,
	type PaginationOptions,
	toAsanaPaginationOptions,
} from '../platform/pagination.js'
import { type ReadOptions, toAsanaReadOptions } from '../platform/read-options.js'

/** `customType` filters by custom type GID; an empty string selects portfolios with no custom type. */
export type PortfolioListOptions = PaginationOptions & { owner?: string; customType?: string }

export type PortfolioGateway = {
	listPortfolios(workspaceGid: string, opts?: PortfolioListOptions): Promise<ListResult<any>>
	listPortfolioItems(portfolioGid: string, opts?: PaginationOptions): Promise<ListResult<any>>
	getPortfolio(portfolioGid: string, opts?: ReadOptions): Promise<any>
	createPortfolio(workspaceGid: string, name: string): Promise<any>
	updatePortfolio(portfolioGid: string, fields: { name?: string }): Promise<any>
	deletePortfolio(portfolioGid: string): Promise<void>
}

export function createAsanaPortfolioGateway(client: Asana.ApiClient): PortfolioGateway {
	const portfoliosApi = new Asana.PortfoliosApi(client)

	return {
		async listPortfolios(workspaceGid, opts) {
			const res = await portfoliosApi.getPortfolios(workspaceGid, {
				owner: opts?.owner,
				...(opts?.customType !== undefined && { custom_type: opts.customType }),
				...toAsanaPaginationOptions(opts),
			})
			return await collectListResponse(res, opts)
		},
		async listPortfolioItems(portfolioGid, opts) {
			const res = await portfoliosApi.getItemsForPortfolio(portfolioGid, toAsanaPaginationOptions(opts))
			return await collectListResponse(res, opts)
		},
		async getPortfolio(portfolioGid, opts) {
			const res = await portfoliosApi.getPortfolio(portfolioGid, toAsanaReadOptions(opts))
			return res.data
		},
		async createPortfolio(workspaceGid, name) {
			const res = await portfoliosApi.createPortfolio({ data: { name, workspace: workspaceGid } })
			return res.data
		},
		async updatePortfolio(portfolioGid, fields) {
			const res = await portfoliosApi.updatePortfolio({ data: fields }, portfolioGid, {})
			return res.data
		},
		async deletePortfolio(portfolioGid) {
			await portfoliosApi.deletePortfolio(portfolioGid)
		},
	}
}
