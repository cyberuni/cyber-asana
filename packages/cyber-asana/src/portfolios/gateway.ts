import Asana from 'asana'
import {
	collectListResponse,
	type ListResult,
	type PaginationOptions,
	toAsanaPaginationOptions,
} from '../platform/pagination.js'
import { type ReadOptions, toAsanaReadOptions } from '../platform/read-options.js'
import type { PortfolioColor, PortfolioDefaultAccessLevel, PortfolioResourceSubtype } from './portfolio-enums.js'

/** `customType` filters by custom type GID; an empty string selects portfolios with no custom type. */
export type PortfolioListOptions = PaginationOptions & { owner?: string; customType?: string }

/** The optional fields of `createPortfolio`, under Asana's names. */
export type PortfolioCreateFields = {
	archived?: boolean
	color?: PortfolioColor
	/** Asana accepts it only when `resource_subtype` is `custom`. */
	custom_type?: string
	resource_subtype?: PortfolioResourceSubtype
	default_access_level?: PortfolioDefaultAccessLevel
	/** New portfolios are private unless this is true. */
	public?: boolean
	due_on?: string
	start_on?: string
}

/** The fields of `updatePortfolio`, under Asana's names. */
export type PortfolioUpdateFields = PortfolioCreateFields & {
	name?: string
	custom_fields?: Record<string, unknown>
	html_custom_fields?: Record<string, string>
}

export type PortfolioGateway = {
	listPortfolios(workspaceGid: string, opts?: PortfolioListOptions): Promise<ListResult<Asana.Portfolio>>
	listPortfolioItems(portfolioGid: string, opts?: PaginationOptions): Promise<ListResult<Asana.AsanaResource>>
	getPortfolio(portfolioGid: string, opts?: ReadOptions): Promise<Asana.Portfolio>
	createPortfolio(
		workspaceGid: string,
		name: string,
		opts?: ReadOptions,
		fields?: PortfolioCreateFields,
	): Promise<Asana.Portfolio>
	updatePortfolio(portfolioGid: string, fields: PortfolioUpdateFields, opts?: ReadOptions): Promise<Asana.Portfolio>
	deletePortfolio(portfolioGid: string): Promise<void>
	addPortfolioItem(portfolioGid: string, itemGid: string, opts?: PortfolioItemPlacement): Promise<void>
	removePortfolioItem(portfolioGid: string, itemGid: string): Promise<void>
}

/** Where in the portfolio's item order an added item goes; Asana appends when neither is given. */
export type PortfolioItemPlacement = { insertBefore?: string; insertAfter?: string }

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
		async createPortfolio(workspaceGid, name, opts, fields) {
			const res = await portfoliosApi.createPortfolio(
				{ data: { name, workspace: workspaceGid, ...fields } },
				toAsanaReadOptions(opts),
			)
			return res.data
		},
		async updatePortfolio(portfolioGid, fields, opts) {
			const res = await portfoliosApi.updatePortfolio({ data: fields }, portfolioGid, toAsanaReadOptions(opts))
			return res.data
		},
		async deletePortfolio(portfolioGid) {
			await portfoliosApi.deletePortfolio(portfolioGid)
		},
		async addPortfolioItem(portfolioGid, itemGid, opts) {
			await portfoliosApi.addItemForPortfolio(
				{
					data: {
						item: itemGid,
						...(opts?.insertBefore !== undefined && { insert_before: opts.insertBefore }),
						...(opts?.insertAfter !== undefined && { insert_after: opts.insertAfter }),
					},
				},
				portfolioGid,
			)
		},
		async removePortfolioItem(portfolioGid, itemGid) {
			await portfoliosApi.removeItemForPortfolio({ data: { item: itemGid } }, portfolioGid)
		},
	}
}
