import type Asana from 'asana'
import { type ListResult, listItems } from '../platform/pagination.js'
import type { PortfolioGateway } from '../portfolios/gateway.js'
import type { ProjectGateway } from '../projects/gateway.js'
import type { StatusGateway } from './gateway.js'

/**
 * Deterministic, parent-scoped status roll-up. Takes a project or portfolio GID
 * and composes the existing status, portfolio-item, and project-count gateways —
 * no search, no keyword matching, no new Asana endpoint. Discovery by search
 * stays routed to the official Asana MCP's `get_status_overview`.
 */

export type StatusOverviewDeps = {
	status: Pick<StatusGateway, 'listStatuses'>
	portfolios: Pick<PortfolioGateway, 'getPortfolio' | 'listPortfolioItems'>
	projects: Pick<ProjectGateway, 'getProject' | 'getProjectTaskCounts'>
}

export type StatusOverviewParentType = 'project' | 'portfolio'

export type StatusOverviewOptions = {
	/** Maximum portfolio items to roll up. Bounds the per-item fan-out. */
	limit?: number
	/** Skips parent-type detection, saving one API call. */
	parentType?: StatusOverviewParentType
}

export type StatusOverviewEntry = {
	gid: string
	name: string
	resource_type: string
	/** The most recent status update, or null when there has never been one. */
	status: Asana.StatusUpdate | null
	/** Task counts, or null for anything that is not a project. */
	counts: Asana.TaskCounts | null
}

export type StatusOverview = {
	parent: StatusOverviewEntry
	items: StatusOverviewEntry[]
	item_count: number
	item_limit: number
	/** True when the portfolio holds more items than `item_limit` rolled up. */
	truncated: boolean
}

/** Minimal default schema for the rolled-up status — principle 2. */
const STATUS_OVERVIEW_STATUS_FIELDS = 'gid,title,status_type,created_at,text'
const PORTFOLIO_ITEM_FIELDS = 'gid,name,resource_type'

/**
 * Default item cap. A portfolio roll-up costs 3 + 2N calls, so 25 items keep a
 * single roll-up under Asana's 150-requests-per-minute budget.
 */
const DEFAULT_STATUS_OVERVIEW_LIMIT = 25

async function latestStatus(deps: StatusOverviewDeps, gid: string) {
	const statuses = await deps.status.listStatuses(gid, { limit: 1, optFields: STATUS_OVERVIEW_STATUS_FIELDS })
	return listItems(statuses)[0] ?? null
}

async function taskCounts(deps: StatusOverviewDeps, gid: string, resourceType: string) {
	if (resourceType !== 'project') return null
	return await deps.projects.getProjectTaskCounts(gid)
}

async function entryFor(
	deps: StatusOverviewDeps,
	item: { gid: string; name?: string; resource_type?: string },
	resourceType: string,
): Promise<StatusOverviewEntry> {
	const [status, counts] = await Promise.all([latestStatus(deps, item.gid), taskCounts(deps, item.gid, resourceType)])
	return {
		gid: item.gid,
		name: item.name ?? '',
		resource_type: resourceType,
		status,
		counts,
	}
}

async function resolveParent(deps: StatusOverviewDeps, parentGid: string, parentType?: StatusOverviewParentType) {
	if (parentType === 'project') {
		return { resourceType: 'project' as const, parent: await deps.projects.getProject(parentGid) }
	}
	if (parentType === 'portfolio') {
		return { resourceType: 'portfolio' as const, parent: await deps.portfolios.getPortfolio(parentGid) }
	}
	// No type given: probe as a portfolio first, then fall back to a project.
	// Costs one extra call for a project parent; pass parentType to skip it.
	try {
		return { resourceType: 'portfolio' as const, parent: await deps.portfolios.getPortfolio(parentGid) }
	} catch {
		return { resourceType: 'project' as const, parent: await deps.projects.getProject(parentGid) }
	}
}

function hasMorePages<T>(result: ListResult<T>) {
	return !Array.isArray(result) && result.next_page != null
}

export async function getStatusOverview(
	deps: StatusOverviewDeps,
	parentGid: string,
	opts?: StatusOverviewOptions,
): Promise<StatusOverview> {
	const limit = opts?.limit ?? DEFAULT_STATUS_OVERVIEW_LIMIT
	const { resourceType, parent } = await resolveParent(deps, parentGid, opts?.parentType)
	const parentEntry = await entryFor(deps, { ...parent, gid: parentGid }, resourceType)

	if (resourceType !== 'portfolio') {
		return { parent: parentEntry, items: [], item_count: 0, item_limit: limit, truncated: false }
	}

	const itemsResult = await deps.portfolios.listPortfolioItems(parentGid, { limit, optFields: PORTFOLIO_ITEM_FIELDS })
	const items = listItems(itemsResult)
	const entries = await Promise.all(
		items.map((item: { gid: string; name?: string; resource_type?: string }) =>
			entryFor(deps, item, item.resource_type ?? 'project'),
		),
	)

	return {
		parent: parentEntry,
		items: entries,
		item_count: entries.length,
		item_limit: limit,
		truncated: hasMorePages(itemsResult),
	}
}
