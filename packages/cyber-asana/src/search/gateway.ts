import Asana from 'asana'

/**
 * The resource types `GET /workspaces/{workspace_gid}/typeahead` accepts. Exactly one per
 * call — Asana does not support querying several types at once.
 */
export const TYPEAHEAD_RESOURCE_TYPES = [
	'actor',
	'agent',
	'custom_field',
	'goal',
	'portfolio',
	'project',
	'project_template',
	'tag',
	'task',
	'team',
	'user',
] as const

export type TypeaheadResourceType = (typeof TYPEAHEAD_RESOURCE_TYPES)[number]

/**
 * Typeahead is deliberately *not* a `PaginationOptions` surface: the endpoint returns a
 * single capped page and cannot be paged, so `offset` / `fetchAll` have nothing to bind to.
 */
export type TypeaheadOptions = {
	/** Search string. Omitted or empty returns the ordering's top results. */
	query?: string
	/** Results to return, 1–100. Asana defaults to 20. */
	count?: number
	/** Comma-separated optional Asana fields to include. */
	optFields?: string
}

export type SearchGateway = {
	searchObjects(
		workspaceGid: string,
		resourceType: TypeaheadResourceType,
		opts?: TypeaheadOptions,
	): Promise<Asana.AsanaResource[]>
}

export function createAsanaSearchGateway(client: Asana.ApiClient): SearchGateway {
	const typeaheadApi = new Asana.TypeaheadApi(client)

	return {
		async searchObjects(workspaceGid, resourceType, opts) {
			const res = await typeaheadApi.typeaheadForWorkspace(workspaceGid, resourceType, {
				query: opts?.query,
				count: opts?.count,
				opt_fields: opts?.optFields,
			})
			return res.data
		},
	}
}
