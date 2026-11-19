import { assertIsoDate } from '../platform/iso-date.js'
import type { PaginationOptions } from '../platform/pagination.js'
import { listItems } from '../platform/pagination.js'
import type { ReadOptions } from '../platform/read-options.js'
import type {
	PortfolioCreateFields,
	PortfolioGateway,
	PortfolioItemPlacement,
	PortfolioListOptions,
	PortfolioUpdateFields,
} from './gateway.js'
import { PORTFOLIO_COLORS, PORTFOLIO_DEFAULT_ACCESS_LEVELS, PORTFOLIO_RESOURCE_SUBTYPES } from './portfolio-enums.js'

export type { PortfolioCreateFields, PortfolioItemPlacement, PortfolioListOptions, PortfolioUpdateFields }

function assertOneOf(label: string, allowed: readonly string[], value?: string) {
	if (value !== undefined && !allowed.includes(value)) {
		throw new Error(`${label} must be one of ${allowed.join(', ')}; got "${value}"`)
	}
}

/** Checks the fields Asana would reject, so a bad value fails before any request. */
function assertWriteFields(fields?: PortfolioCreateFields) {
	if (!fields) return
	assertOneOf('color', PORTFOLIO_COLORS, fields.color)
	assertOneOf('resource_subtype', PORTFOLIO_RESOURCE_SUBTYPES, fields.resource_subtype)
	assertOneOf('default_access_level', PORTFOLIO_DEFAULT_ACCESS_LEVELS, fields.default_access_level)
	assertIsoDate('due_on', fields.due_on)
	assertIsoDate('start_on', fields.start_on)
	if (fields.start_on !== undefined) {
		if (fields.due_on === undefined) throw new Error('start_on needs due_on in the same request; pass both')
		if (fields.start_on > fields.due_on) throw new Error('start_on must not be after due_on')
	}
}

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
		async createPortfolio(workspaceGid: string, name: string, opts?: ReadOptions, fields?: PortfolioCreateFields) {
			assertWriteFields(fields)
			return gateway.createPortfolio(workspaceGid, name, opts, fields)
		},
		async updatePortfolio(portfolioGid: string, fields: PortfolioUpdateFields, opts?: ReadOptions) {
			assertWriteFields(fields)
			return gateway.updatePortfolio(portfolioGid, fields, opts)
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
