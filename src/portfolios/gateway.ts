import Asana from 'asana'
import {
	collectListResponse,
	type ListResult,
	type PaginationOptions,
	toAsanaPaginationOptions,
} from '../pagination.js'

export type PortfolioGateway = {
	listPortfolios(workspaceGid: string, opts?: PaginationOptions & { owner?: string }): Promise<ListResult<any>>
	getPortfolio(portfolioGid: string): Promise<any>
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
				...toAsanaPaginationOptions(opts),
			})
			return await collectListResponse(res, opts)
		},
		async getPortfolio(portfolioGid) {
			const res = await portfoliosApi.getPortfolio(portfolioGid, {})
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
